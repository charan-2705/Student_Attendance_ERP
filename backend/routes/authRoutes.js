const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const notificationService = require('../services/notificationService');

const JWT_SECRET_TOKEN = 'UNIVERSITY_ERP_SECURE_TOKEN_MESH_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: "Token absent." });
  jwt.verify(token, JWT_SECRET_TOKEN, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: "Token validation failed." });
    req.user = user;
    next();
  });
}

router.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [users] = await db.query('SELECT username, password_hash, role, name, student_id FROM users WHERE username = ?', [username]);
    if (users.length === 0) return res.status(401).json({ success: false, message: "Invalid access parameters." });

    const matchedUser = users[0];
    let isMatch = false;
    if (matchedUser.password_hash.startsWith('$2b$') || matchedUser.password_hash.startsWith('$2a$')) {
      isMatch = await bcrypt.compare(password, matchedUser.password_hash);
    } else {
      isMatch = (matchedUser.password_hash === password);
    }

    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid access parameters." });

    const generatedToken = jwt.sign({ username: matchedUser.username, role: matchedUser.role }, JWT_SECRET_TOKEN, { expiresIn: '6h' });
    res.json({ 
      success: true, 
      token: generatedToken, 
      user: { name: matchedUser.name, role: matchedUser.role, username: matchedUser.username, studentId: matchedUser.student_id } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Encryption evaluation fault." });
  }
});

router.post('/api/user/update-password', authenticateToken, async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  try {
    const [results] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (results.length === 0) return res.status(401).json({ success: false, message: "User not found." });

    const matchedUser = results[0];
    let isMatch = false;
    if (matchedUser.password_hash.startsWith('$2b$') || matchedUser.password_hash.startsWith('$2a$')) {
      isMatch = await bcrypt.compare(currentPassword, matchedUser.password_hash);
    } else {
      isMatch = (matchedUser.password_hash === currentPassword);
    }

    if (!isMatch) return res.status(401).json({ success: false, message: "Current password incorrect." });

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE username = ?', [hashedNewPassword, username]);
    
    await notificationService.sendSystemNotification({
      targetUsername: username,
      title: "Security Settings Modified",
      message: "Your account password was successfully updated.",
      type: "ACADEMIC_UPDATE"
    });

    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server data modification fault." });
  }
});

module.exports = router;