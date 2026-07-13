const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const notificationService = require('./services/notificationService');

const app = express();
const server = http.createServer(app);

app.use(cors()); 
app.use(express.json());

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Initialize Real-Time WebSockets Engine
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
notificationService.init(io);

// Modular Routes Registration
app.use(require('./routes/authRoutes'));
app.use(require('./routes/adminRoutes'));
app.use(require('./routes/facultyRoutes'));
app.use(require('./routes/studentRoutes'));
app.use(require('./routes/notificationRoutes'));

const COMPONENT_PORT = 5000;
server.listen(COMPONENT_PORT, () => {
  console.log(`🚀 Modular ERP Backend Engine Online on port: ${COMPONENT_PORT}`);
});