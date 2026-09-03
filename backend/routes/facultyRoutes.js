const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const notificationService = require('../services/notificationService');

// =====================================================
// MULTER STORAGE
// =====================================================

const uploadsDir = path.join(__dirname, '../uploads/');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const diskStorageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },

  filename: (req, file, cb) => {
    const uniqueTimeIndex =
      Date.now() + '-' + Math.round(Math.random() * 1E9);

    cb(null, `${uniqueTimeIndex}-${file.originalname}`);
  }
});

const upload = multer({
  storage: diskStorageConfig
});


// =====================================================
// JWT
// =====================================================

const JWT_SECRET_TOKEN =
  'UNIVERSITY_ERP_SECURE_TOKEN_MESH_2026';


// =====================================================
// FACULTY AUTHENTICATION
// =====================================================

function authenticateToken(req, res, next) {

  const authHeader = req.headers['authorization'];

  const token =
    authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token absent."
    });
  }

  require('jsonwebtoken').verify(
    token,
    JWT_SECRET_TOKEN,
    (err, user) => {

      if (err || user.role !== 'faculty') {

        return res.status(403).json({
          success: false,
          message: "Access denied. Faculty role required."
        });
      }

      req.user = user;

      next();
    }
  );
}


// =====================================================
// 1. MANUAL ATTENDANCE
// =====================================================

router.post(
  '/api/attendance/submit',
  authenticateToken,
  async (req, res) => {

    const {
      subject,
      date,
      records
    } = req.body;

    try {

      for (let record of records) {

        await db.query(
          `
          INSERT INTO attendance
          (student_id, subject_name, date, status)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          status = ?
          `,
          [
            record.studentId,
            subject,
            date,
            record.status,
            record.status
          ]
        );

        // Send absence notification
        if (record.status === 'Absent') {

          const [sRes] = await db.query(
            'SELECT username FROM students WHERE student_id = ?',
            [record.studentId]
          );

          if (sRes.length > 0) {

            await notificationService.sendSystemNotification({
              targetUsername: sRes[0].username,
              title: "Absence Logged",
              message:
                `You were marked Absent for ${subject} on ${date}.`,
              type: "ATTENDANCE_ALERT"
            });

          }
        }
      }

      await notificationService.broadcastDashboardMutation();

      res.json({
        success: true
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        message: "Roster commit fault encountered."
      });
    }
  }
);


// =====================================================
// 2. FACE ATTENDANCE
// =====================================================

router.post(
  '/api/attendance/face',
  authenticateToken,
  upload.single('image'),
  async (req, res) => {

    try {

      // -------------------------------------------------
      // Validate image
      // -------------------------------------------------

      if (!req.file) {

        return res.status(400).json({
          success: false,
          message: "No classroom image uploaded."
        });
      }


      const {
        subject,
        date
      } = req.body;


      if (!subject || !date) {

        return res.status(400).json({
          success: false,
          message: "Subject and date are required."
        });
      }


      console.log(
        `Face attendance request received: ${subject} ${date}`
      );


      // -------------------------------------------------
      // Send image to Flask AI server
      // -------------------------------------------------

      const formData = new FormData();

      formData.append(
        'image',
        fs.createReadStream(req.file.path)
      );


      console.log(
        "Sending classroom image to face recognition server..."
      );


      const aiResponse = await axios.post(
        'http://127.0.0.1:5001/recognize',
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },

          maxContentLength: Infinity,
          maxBodyLength: Infinity,

          timeout: 120000
        }
      );


      const recognizedStudents =
        aiResponse.data.recognized_students || [];


      const facesDetected =
        aiResponse.data.faces_detected || 0;


      console.log(
        "Faces detected:",
        facesDetected
      );

      console.log(
        "Recognized students:",
        recognizedStudents
      );


      // -------------------------------------------------
      // Get students belonging to this faculty/subject
      // -------------------------------------------------

      const [studentRows] = await db.query(
        `
        SELECT DISTINCT
          s.student_id,
          s.username,
          s.name,
          s.section
        FROM students s
        JOIN assignments a
          ON s.section = a.section
        WHERE a.subject_name = ?
        `,
        [subject]
      );


      // -------------------------------------------------
      // Convert recognized IDs to strings
      // -------------------------------------------------

          const recognizedSet = new Set(
          recognizedStudents.map(id =>
            String(id).trim().toUpperCase()
          )
        );

      const attendanceResults = [];


      // -------------------------------------------------
      // Mark every student
      // -------------------------------------------------

      for (const student of studentRows) {

        const studentId = String(student.student_id).trim();

        const status = recognizedSet.has(studentId)
          ? 'Present'
          : 'Absent';


        // Save attendance
        await db.query(
          `
          INSERT INTO attendance
          (student_id, subject_name, date, status)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          status = ?
          `,
          [
            studentId,
            subject,
            date,
            status,
            status
          ]
        );


        attendanceResults.push({
          studentId: studentId,
          name: student.name,
          status: status
        });


        // -------------------------------------------------
        // Notify absent students
        // -------------------------------------------------

        if (status === 'Absent') {

          if (student.username) {

            await notificationService.sendSystemNotification({

              targetUsername:
                student.username,

              title:
                "Absence Logged",

              message:
                `You were marked Absent for ${subject} on ${date} through face attendance.`,

              type:
                "ATTENDANCE_ALERT"

            });

          }
        }
      }


      // -------------------------------------------------
      // Remove uploaded temporary image
      // -------------------------------------------------

      try {

        fs.unlinkSync(req.file.path);

      } catch (deleteError) {

        console.error(
          "Could not remove temporary image:",
          deleteError
        );

      }


      // -------------------------------------------------
      // Update dashboard
      // -------------------------------------------------

      await notificationService.broadcastDashboardMutation();


      // -------------------------------------------------
      // Send response to React
      // -------------------------------------------------

      res.json({

        success: true,

        facesDetected,

        recognizedStudents,

        attendance: attendanceResults

      });

    } catch (err) {

      console.error(
        "FACE ATTENDANCE ERROR:",
        err
      );


      // Remove uploaded file if something failed
      if (req.file) {

        try {

          fs.unlinkSync(req.file.path);

        } catch (deleteError) {

          console.error(
            "Temporary file cleanup failed:",
            deleteError
          );

        }
      }


      // Flask server unavailable
      if (err.code === 'ECONNREFUSED') {

        return res.status(503).json({

          success: false,

          message:
            "Face recognition server is not running. Start the Flask server on port 5001."

        });
      }


      res.status(500).json({

        success: false,

        message:
          "Face attendance processing failed.",

        error:
          err.response?.data || err.message

      });

    }
  }
);


// =====================================================
// 3. PROCESS STUDENT LEAVE REQUEST
// =====================================================

router.post(
  '/api/faculty/leave-action',
  authenticateToken,
  async (req, res) => {

    const {
      leaveId,
      status
    } = req.body;

    try {

      const [leaveRows] = await db.query(
        'SELECT student_id FROM leave_requests WHERE id = ?',
        [leaveId]
      );


      if (leaveRows.length === 0) {

        return res.status(404).json({
          success: false,
          message: "Leave request missing."
        });
      }


      const targetStudentId =
        leaveRows[0].student_id;


      await db.query(
        'UPDATE leave_requests SET status = ? WHERE id = ?',
        [
          status,
          leaveId
        ]
      );


      const [sRows] = await db.query(
        'SELECT username FROM students WHERE student_id = ?',
        [targetStudentId]
      );


      if (sRows.length > 0) {

        await notificationService.sendSystemNotification({

          targetUsername:
            sRows[0].username,

          title:
            `Leave Request ${status}`,

          message:
            `Your requested leave exemption status updated to: ${status}.`,

          type:
            "LEAVE_STATUS"

        });
      }


      await notificationService.broadcastDashboardMutation();


      res.json({
        success: true
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        message: "Exemption rewrite dropped."
      });
    }
  }
);


// =====================================================
// 4. POST STUDY MATERIALS / NOTES
// =====================================================

router.post(
  '/api/faculty/post-note',
  authenticateToken,
  upload.single('attachedFile'),
  async (req, res) => {

    const {
      title,
      subject
    } = req.body;


    const currentDate =
      new Date().toISOString().split('T')[0];


    const sizeString =
      req.file
        ? `${(req.file.size / 1024).toFixed(1)} KB`
        : '0 KB';


    const filePath =
      req.file
        ? `/uploads/${req.file.filename}`
        : null;


    try {

      await db.query(
        `
        INSERT INTO notes
        (subject_name, title, date_posted, size, file_path)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          subject,
          title,
          currentDate,
          sizeString,
          filePath
        ]
      );


      const [studentRows] = await db.query(
        `
        SELECT DISTINCT
          s.username
        FROM students s
        JOIN assignments a
          ON s.section = a.section
        WHERE a.subject_name = ?
        `,
        [subject]
      );


      for (let student of studentRows) {

        await notificationService.sendSystemNotification({

          targetUsername:
            student.username,

          title:
            "New Study Material Shared",

          message:
            `Professor ${req.user.username} uploaded a document for ${subject}: "${title}".`,

          type:
            "ACADEMIC_UPDATE"

        });
      }


      await notificationService.broadcastDashboardMutation();


      res.json({
        success: true
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        message: "Asset reference registration failed."
      });
    }
  }
);


module.exports = router;