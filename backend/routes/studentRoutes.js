const express = require('express');
const router = express.Router();
const db = require('../db');
const notificationService = require('../services/notificationService');

const JWT_SECRET_TOKEN = 'UNIVERSITY_ERP_SECURE_TOKEN_MESH_2026';
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: "Token absent." });
  require('jsonwebtoken').verify(token, JWT_SECRET_TOKEN, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: "Forbidden." });
    req.user = user;
    next();
  });
}

router.post('/api/student/apply-leave', authenticateToken, async (req, res) => {
  const { studentId, reason, startDate, endDate } = req.body;
  try {
    await db.query('INSERT INTO leave_requests (student_id, reason, start_date, end_date, status) VALUES (?, ?, ?, ?, "Pending")', [studentId, reason, startDate, endDate]);
    
    const [sRes] = await db.query('SELECT username FROM students WHERE student_id = ?', [studentId]);
    if (sRes.length > 0) {
      const studentUser = sRes[0].username;
      const [facultyRows] = await db.query('SELECT DISTINCT faculty_username FROM assignments a JOIN students s ON a.section = s.section WHERE s.username = ?', [studentUser]);
      for (let fac of facultyRows) {
        await notificationService.sendSystemNotification({
          targetUsername: fac.faculty_username,
          title: "Pending Leave Request Action Needed",
          message: `Student @${studentUser} applied for leave context from ${startDate} to ${endDate}.`,
          type: "LEAVE_STATUS"
        });
      }
    }
    await notificationService.broadcastDashboardMutation();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to dispatch leave queue entry." });
  }
});

router.post('/api/ai/predict-attendance', authenticateToken, async (req, res) => {
  const { studentId, additionalProjectedAbsences } = req.body;
  const hypotheticalAbsencesCount = parseInt(additionalProjectedAbsences) || 0;

  try {
    const [logs] = await db.query('SELECT status FROM attendance WHERE student_id = ?', [studentId]);
    const logHistoryCount = logs.length;
    if (logHistoryCount === 0) {
      return res.json({ currentRate: "100", predictedRate: "100", modelInsights: "No historical registration patterns found." });
    }

    const totalDaysPresent = logs.filter(l => l.status === 'Present').length;
    const computedCurrentRate = Math.round((totalDaysPresent / logHistoryCount) * 100);
    const simulatedTotalHistorySpan = logHistoryCount + hypotheticalAbsencesCount;
    const projectedAttendanceRate = Math.round((totalDaysPresent / simulatedTotalHistorySpan) * 100);

    let insight = projectedAttendanceRate < 75 
      ? `⚠️ ATTENDANCE REGRESSION CRITICAL PROFILE: Simulating ${hypotheticalAbsencesCount} extra absences will drop your current rate down to ${projectedAttendanceRate}%. This crosses the institutional compliance threshold (75%).`
      : `✅ ATTENDANCE PROFILE COMPLIANT: Your simulated profile parameters (${projectedAttendanceRate}%) sit safely above standard tracking thresholds.`;

    res.json({ currentRate: String(computedCurrentRate), predictedRate: String(projectedAttendanceRate), modelInsights: insight });
  } catch (err) {
    res.status(500).json({ success: false, message: "AI pipeline analysis dropped." });
  }
});

module.exports = router;