const express = require('express');
const router = express.Router();
const db = require('../db');
const notificationService = require('../services/notificationService');

// Authentication Helper Inline to prevent file dependencies
const JWT_SECRET_TOKEN = 'UNIVERSITY_ERP_SECURE_TOKEN_MESH_2026';
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: "Token absent." });
  require('jsonwebtoken').verify(token, JWT_SECRET_TOKEN, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: "Token validation failed." });
    req.user = user;
    next();
  });
}

router.get('/api/dashboard-data', authenticateToken, async (req, res) => {
  try {
    const metrics = await notificationService.compileDashboardMetrics();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to assemble metrics array." });
  }
});

router.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT n.id, n.title, n.message, n.type, n.is_read, n.created_at FROM system_notifications n JOIN users u ON n.user_id = u.id WHERE u.username = ? ORDER BY n.created_at DESC',
      [req.user.username]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load notification history." });
  }
});

router.post('/api/notifications/mark-read', authenticateToken, async (req, res) => {
  try {
    await db.query(
      'UPDATE system_notifications n JOIN users u ON n.user_id = u.id SET n.is_read = 1 WHERE u.username = ? AND n.is_read = 0',
      [req.user.username]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to clear notifications." });
  }
});

module.exports = router;