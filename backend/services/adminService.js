const db = require('../db');
const bcrypt = require('bcrypt');
const notificationService = require('./notificationService');
const smsService = require('./smsService'); 

class AdminService {
  async addStudent({ studentId, name, username, password, classCohort, section, email, parentPhone }) {
  const securePasswordHash = await bcrypt.hash(password, 10);

  // Insert authentication credentials
  await db.query(
    'INSERT INTO users (username, password_hash, role, name, student_id) VALUES (?, ?, "student", ?, ?)', 
    [username, securePasswordHash, name, studentId]
  );

  // Updated SQL query: Added parent_phone column mapping
  await db.query(
    'INSERT INTO students (student_id, name, username, class_cohort, section, email, parent_phone) VALUES (?, ?, ?, ?, ?, ?, ?)', 
    [studentId, name, username, classCohort, section, email, parentPhone]
  );
  
  await notificationService.broadcastDashboardMutation();
  return true;
}
  async addFaculty({ name, username, password }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Hash faculty password
    const securePasswordHash = await bcrypt.hash(password, 10);

    // Create login account
    await connection.query(
      `INSERT INTO users 
       (username, password_hash, role, name, student_id)
       VALUES (?, ?, 'faculty', ?, NULL)`,
      [username, securePasswordHash, name]
    );

    // Create faculty profile
    await connection.query(
      `INSERT INTO faculty (username, name)
       VALUES (?, ?)`,
      [username, name]
    );

    await connection.commit();

    await notificationService.broadcastDashboardMutation();

    return true;

  } catch (err) {
    await connection.rollback();
    throw err;

  } finally {
    connection.release();
  }
}

  async deleteStudent(targetId) {
    const [results] = await db.query('SELECT username FROM students WHERE student_id = ?', [targetId]);
    if (results.length === 0) throw new Error("No tracking record found.");
    
    const linkedUsername = results[0].username;
    await db.query('DELETE FROM users WHERE username = ?', [linkedUsername]);
    await db.query('DELETE FROM students WHERE student_id = ?', [targetId]);
    
    await notificationService.broadcastDashboardMutation();
    return true;
  }

  async assignFaculty({ section, subject, facultyUsername }) {
    await db.query(
      'INSERT INTO assignments (section, subject_name, faculty_username) VALUES (?, ?, ?)', 
      [section, subject, facultyUsername]
    );
    
    await notificationService.sendSystemNotification({
      targetUsername: facultyUsername,
      title: "New Lecture Assignment",
      message: `You have been allocated to teach ${subject} for Section ${section}.`,
      type: "ACADEMIC_UPDATE"
    });

    await notificationService.broadcastDashboardMutation();
    return true;
}

// Inside class AdminService { ...
async scanAndAlertLowAttendance() {
  try {
    // 1. Fetch all students along with their parent contact info
    const [students] = await db.query('SELECT student_id, name, parent_phone FROM students');
    
    let alertsSentCount = 0;

    for (let student of students) {
      // 2. Fetch attendance logs for this student
      const [logs] = await db.query('SELECT status FROM attendance WHERE student_id = ?', [student.student_id]);
      
      if (logs.length === 0) continue; // Skip if no attendance logged yet

      const totalDays = logs.length;
      const daysPresent = logs.filter(l => l.status === 'Present').length;
      const attendanceRate = Math.round((daysPresent / totalDays) * 100);

      // 3. If below 75%, trigger the message
      if (attendanceRate < 75) {
        await smsService.sendParentAlert(student.parent_phone, student.name, attendanceRate);
        alertsSentCount++;
      }
    }

    return { success: true, alertsSent: alertsSentCount };
  } catch (err) {
    console.error("Critical failure during low attendance scan:", err);
    throw err;
  }
}
}

module.exports = new AdminService();