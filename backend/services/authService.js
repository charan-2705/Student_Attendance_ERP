const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const notificationService = require('./notificationService');

const JWT_SECRET_TOKEN = 'UNIVERSITY_ERP_SECURE_TOKEN_MESH_2026';

class AuthService {
  async login(username, password) {
    const [users] = await db.query(
      'SELECT username, password_hash, role, name, student_id FROM users WHERE username = ?', 
      [username]
    );
    if (users.length === 0) throw new Error("Invalid access parameters.");

    const matchedUser = users[0];
    let isMatch = false;

    if (matchedUser.password_hash.startsWith('$2b$') || matchedUser.password_hash.startsWith('$2a$')) {
      isMatch = await bcrypt.compare(password, matchedUser.password_hash);
    } else {
      isMatch = (matchedUser.password_hash === password);
    }

    if (!isMatch) throw new Error("Invalid access parameters.");

    const token = jwt.sign(
      { username: matchedUser.username, role: matchedUser.role }, 
      JWT_SECRET_TOKEN, 
      { expiresIn: '6h' }
    );

    return {
      token,
      user: {
        name: matchedUser.name,
        role: matchedUser.role,
        username: matchedUser.username,
        studentId: matchedUser.student_id
      }
    };
  }

  async updatePassword(username, currentPassword, newPassword) {
    const [results] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (results.length === 0) throw new Error("User not found.");

    const matchedUser = results[0];
    let isMatch = false;

    if (matchedUser.password_hash.startsWith('$2b$') || matchedUser.password_hash.startsWith('$2a$')) {
      isMatch = await bcrypt.compare(currentPassword, matchedUser.password_hash);
    } else {
      isMatch = (matchedUser.password_hash === currentPassword);
    }

    if (!isMatch) throw new Error("Current password incorrect.");

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE username = ?', [hashedNewPassword, username]);
    
    await notificationService.sendSystemNotification({
      targetUsername: username,
      title: "Security Settings Modified",
      message: "Your account password was successfully updated.",
      type: "ACADEMIC_UPDATE"
    });

    return true;
  }
}

module.exports = new AuthService();