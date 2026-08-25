const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const notificationService = require('../services/notificationService');
const adminService = require('../services/adminService');

const JWT_SECRET_TOKEN = 'UNIVERSITY_ERP_SECURE_TOKEN_MESH_2026';
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: "Token absent." });
  require('jsonwebtoken').verify(token, JWT_SECRET_TOKEN, (err, user) => {
    if (err || user.role !== 'admin') return res.status(403).json({ success: false, message: "Unauthorized access." });
    req.user = user;
    next();
  });
}

router.post('/api/admin/add-student', authenticateToken, async (req, res) => {
  // 1. Destructure parentPhone from the incoming request body
  const { studentId, name, username, password, classCohort, section, email, parentPhone } = req.body;
  try {
    // 2. Pass the entire object (including parentPhone) to your adminService
    await adminService.addStudent({ studentId, name, username, password, classCohort, section, email, parentPhone });
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: "Collisions matched or database write halted." });
  }
});

router.post('/api/admin/add-faculty', authenticateToken, async (req, res) => {
  const { name, username, password } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({
      success: false,
      message: "Name, username and password are required."
    });
  }

  try {
    await adminService.addFaculty({
      name,
      username,
      password
    });

    res.json({
      success: true,
      message: "Faculty account created successfully."
    });

  } catch (err) {
    console.error("Add faculty error:", err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: "Username already exists."
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create faculty account."
    });
  }
});

router.delete('/api/admin/student/:id', authenticateToken, async (req, res) => {
  try {
    const [results] = await db.query('SELECT username FROM students WHERE student_id = ?', [req.params.id]);
    if (results.length === 0) return res.status(404).json({ success: false, message: "No tracking record found." });
    
    const linkedUsername = results[0].username;
    await db.query('DELETE FROM users WHERE username = ?', [linkedUsername]);
    await db.query('DELETE FROM students WHERE student_id = ?', [req.params.id]);
    
    await notificationService.broadcastDashboardMutation();
    res.json({ success: true, message: "Purge complete." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database deletion failure." });
  }
});

router.post('/api/admin/assign-faculty', authenticateToken, async (req, res) => {
  const { section, subject, facultyUsername } = req.body;
  try {
    await db.query('INSERT INTO assignments (section, subject_name, faculty_username) VALUES (?, ?, ?)', [section, subject, facultyUsername]);
    
    await notificationService.sendSystemNotification({
      targetUsername: facultyUsername,
      title: "New Lecture Assignment",
      message: `You have been allocated to teach ${subject} for Section ${section}.`,
      type: "ACADEMIC_UPDATE"
    });

    await notificationService.broadcastDashboardMutation();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to map allocation logic." });
  }
});

router.post('/api/admin/trigger-parent-alerts', authenticateToken, async (req, res) => {
  // Ensure only admins can trigger bulk automated text dispatches
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Root authorization failed." });
  }

  try {
    const report = await adminService.scanAndAlertLowAttendance();
    res.json({ 
      success: true, 
      message: `Attendance scanning completed. Parent warning dispatches initiated.`,
      alertsSent: report.alertsSent
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to run automated system broadcast." });
  }
});

module.exports = router;