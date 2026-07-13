const db = require('../db');
const notificationService = require('./notificationService');

class FacultyService {
  async submitAttendance(subject, date, records) {
    for (let record of records) {
      await db.query(
        'INSERT INTO attendance (student_id, subject_name, date, status) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = ?',
        [record.studentId, subject, date, record.status, record.status]
      );
      
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
    return true;
  }

  async handleLeaveAction(leaveId, status) {
    const [leaveRows] = await db.query('SELECT student_id FROM leave_requests WHERE id = ?', [leaveId]);
    if (leaveRows.length === 0) throw new Error("Leave request missing.");

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
    return true;
  }

  async postNote({ title, subject, filename, size, facultyUsername }) {
    const currentDate = new Date().toISOString().split('T')[0];
    const sizeString = filename ? `${(size / 1024).toFixed(1)} KB` : '0 KB';
    const filePath = filename ? `/uploads/${filename}` : null;

    await db.query(
      'INSERT INTO notes (subject_name, title, date_posted, size, file_path) VALUES (?, ?, ?, ?, ?)', 
      [subject, title, currentDate, sizeString, filePath]
    );
    
    const [studentRows] = await db.query(
      'SELECT DISTINCT s.username FROM students s JOIN assignments a ON s.section = a.section WHERE a.subject_name = ?', 
      [subject]
    );

    for (let student of studentRows) {
      await notificationService.sendSystemNotification({
        targetUsername: student.username,
        title: "New Study Material Shared",
        message: `Professor ${facultyUsername} uploaded a document for ${subject}: "${title}".`,
        type: "ACADEMIC_UPDATE"
      });
    }
    
    await notificationService.broadcastDashboardMutation();
    return true;
  }
}

module.exports = new FacultyService();