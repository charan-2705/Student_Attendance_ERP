const db = require('../db');

class NotificationService {
  constructor() {
    this.activeUserSockets = new Map();
    this.io = null;
  }

  init(io) {
    this.io = io;
    this.io.on('connection', (socket) => {
      console.log(`📡 Socket connected: ${socket.id}`);
      
      socket.on('register_user', (username) => {
        if (username) {
          this.activeUserSockets.set(username, socket.id);
          console.log(`👤 User registered to socket mesh: ${username} -> ${socket.id}`);
        }
      });

      socket.on('disconnect', () => {
        for (let [username, id] of this.activeUserSockets.entries()) {
          if (id === socket.id) {
            this.activeUserSockets.delete(username);
            console.log(`🔌 Connection dropped for user: ${username}`);
            break;
          }
        }
      });
    });
  }

  async sendSystemNotification({ targetUsername, title, message, type }) {
    try {
      const [users] = await db.query('SELECT id FROM users WHERE username = ?', [targetUsername]);
      if (users.length === 0) return;
      const userId = users[0].id;

      const [result] = await db.query(
        'INSERT INTO system_notifications (user_id, title, message, type, delivery_channel) VALUES (?, ?, ?, ?, "BOTH")',
        [userId, title, message, type]
      );

      const clientSocketId = this.activeUserSockets.get(targetUsername);
      if (clientSocketId && this.io) {
        this.io.to(clientSocketId).emit('new_notification', {
          id: result.insertId,
          title,
          message,
          type,
          is_read: 0,
          created_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Notification database persistence failure:", err);
    }
  }

  async broadcastDashboardMutation() {
    try {
      const comprehensiveMetrics = await this.compileDashboardMetrics();
      if (this.io) {
        this.io.emit('dashboard_mutation', comprehensiveMetrics);
      }
    } catch (err) {
      console.error("Dashboard broadcast crash:", err);
    }
  }

  async compileDashboardMetrics() {
    const datasetStructure = {};

    const [subjectRows] = await db.query('SELECT name FROM subjects');
    datasetStructure.subjects = subjectRows.map(row => row.name);

    const [students] = await db.query('SELECT student_id AS id, name, section, email FROM students');
    datasetStructure.studentRecords = students;

    const [notes] = await db.query('SELECT id, subject_name AS subject, title, DATE_FORMAT(date_posted, "%Y-%m-%d") AS date, size, file_path AS filePath FROM notes');
    datasetStructure.sharedNotes = notes;

    const [leaves] = await db.query('SELECT l.id, l.student_id AS studentId, s.name AS studentName, l.reason, DATE_FORMAT(l.start_date, "%Y-%m-%d") AS startDate, DATE_FORMAT(l.end_date, "%Y-%m-%d") AS endDate, l.status FROM leave_requests l LEFT JOIN students s ON l.student_id = s.student_id');
    datasetStructure.leaveRequests = leaves;

    const [faculty] = await db.query('SELECT faculty_id, username, name FROM faculty');
    datasetStructure.facultyList = faculty;

    const [assign] = await db.query('SELECT id, section, subject_name, faculty_username FROM assignments');
    datasetStructure.assignments = assign;

    const [logs] = await db.query('SELECT student_id AS studentId, subject_name AS subject, DATE_FORMAT(date, "%Y-%m-%d") AS date, status FROM attendance');
    datasetStructure.attendanceLogs = logs;

    return datasetStructure;
  }
}

module.exports = new NotificationService();