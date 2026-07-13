const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const notificationService = require('../services/notificationService');

// Multer storage setup for faculty notes
const diskStorageConfig = multer.diskStorage({
  destination: (req, file, cb) => { 
    cb(null, path.join(__dirname, '../uploads/')); 
  },
  filename: (req, file, cb) => {
    const uniqueTimeIndex = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueTimeIndex}-${file.originalname}`);
  }
});
const upload = multer({ storage: diskStorageConfig });

const JWT_SECRET_TOKEN = 'UNIVERSITY_ERP_SECURE_TOKEN_MESH_2026';

// Middleware to authenticate Faculty requests
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ success: false, message: "Token absent." });
  
  require('jsonwebtoken').verify(token, JWT_SECRET_TOKEN, (err, user) => {
    if (err || user.role !== 'faculty') {
      return res.status(403).json({ success: false, message: "Access denied. Faculty role required." });
    }
    req.user = user;
    next();
  });
}

// 1. Submit Attendance Roster
router.post('/api/attendance/submit', authenticateToken, async (req, res) => {
  const { subject, date, records } = req.body;
  try {
    for (let record of records) {
      // Upsert attendance record using Promise-based syntax
      await db.query(
        'INSERT INTO attendance (student_id, subject_name, date, status) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = ?',
        [record.studentId, subject, date, record.status, record.status]
      );
      
      // Dispatch alert notification to student if marked absent
      if (record.status === 'Absent') {
        const [sRes] = await db.query('SELECT username FROM students WHERE student_id = ?', [record.studentId]);
        if (sRes.length > 0) {
          await notificationService.sendSystemNotification({
            targetUsername: sRes[0].username,
            title: "Absence Logged",
            message: `You were marked Absent for ${subject} on ${date}.`,
            type: "ATTENDANCE_ALERT"
          });
        }
      }
    }
    await notificationService.broadcastDashboardMutation();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Roster commit fault encountered." });
  }
});

// 2. Process Student Leave Request (Approve / Reject)
router.post('/api/faculty/leave-action', authenticateToken, async (req, res) => {
  const { leaveId, status } = req.body;
  try {
    const [leaveRows] = await db.query('SELECT student_id FROM leave_requests WHERE id = ?', [leaveId]);
    if (leaveRows.length === 0) return res.status(404).json({ success: false, message: "Leave request missing." });

    const targetStudentId = leaveRows[0].student_id;
    await db.query('UPDATE leave_requests SET status = ? WHERE id = ?', [status, leaveId]);

    const [sRows] = await db.query('SELECT username FROM students WHERE student_id = ?', [targetStudentId]);
    if (sRows.length > 0) {
      await notificationService.sendSystemNotification({
        targetUsername: sRows[0].username,
        title: `Leave Request ${status}`,
        message: `Your requested leave exemption status updated to: ${status}.`,
        type: "LEAVE_STATUS"
      });
    }
    await notificationService.broadcastDashboardMutation();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Exemption rewrite dropped." });
  }
});

// 3. Post Study Materials/Notes
router.post('/api/faculty/post-note', authenticateToken, upload.single('attachedFile'), async (req, res) => {
  const { title, subject } = req.body;
  const currentDate = new Date().toISOString().split('T')[0];
  const sizeString = req.file ? `${(req.file.size / 1024).toFixed(1)} KB` : '0 KB';
  const filePath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    await db.query('INSERT INTO notes (subject_name, title, date_posted, size, file_path) VALUES (?, ?, ?, ?, ?)', [subject, title, currentDate, sizeString, filePath]);
    
    // Broadcast notification to all students assigned to this subject's section
    const [studentRows] = await db.query('SELECT DISTINCT s.username FROM students s JOIN assignments a ON s.section = a.section WHERE a.subject_name = ?', [subject]);
    for (let student of studentRows) {
      await notificationService.sendSystemNotification({
        targetUsername: student.username,
        title: "New Study Material Shared",
        message: `Professor ${req.user.username} uploaded a document for ${subject}: "${title}".`,
        type: "ACADEMIC_UPDATE"
      });
    }
    await notificationService.broadcastDashboardMutation();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Asset reference registration failed." });
  }
});

module.exports = router;