import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // In-memory store for prototype
  let students = [
    { id: '1', name: 'Alex Johnson', grade: '10th', status: 'normal', lastUpdate: new Date().toISOString(), riskScore: 12 },
    { id: '2', name: 'Sarah Parker', grade: '11th', status: 'normal', lastUpdate: new Date().toISOString(), riskScore: 8 },
    { id: '3', name: 'Michael Chen', grade: '9th', status: 'risk', lastUpdate: new Date().toISOString(), riskScore: 65 },
  ];

  let alertLogs: any[] = [];

  app.use(express.json());

  // API Routes
  app.get('/api/students', (req, res) => {
    res.json(students);
  });

  app.get('/api/alerts', (req, res) => {
    res.json(alertLogs);
  });

  app.post('/api/report-risk', (req, res) => {
    const { studentId, riskScore, emotion, textSentiment, behavioralNotes } = req.body;
    const alert = {
      id: Math.random().toString(36).substr(2, 9),
      studentId,
      timestamp: new Date().toISOString(),
      riskScore,
      emotion,
      textSentiment,
      behavioralNotes,
      level: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low'
    };
    
    alertLogs.unshift(alert);
    
    // Update student status
    const student = students.find(s => s.id === studentId);
    if (student) {
      student.status = alert.level === 'high' ? 'critical' : alert.level === 'medium' ? 'risk' : 'normal';
      student.riskScore = riskScore;
      student.lastUpdate = alert.timestamp;
    }

    // Broadcast alert to all dashboards
    io.emit('new-alert', alert);
    io.emit('students-update', students);

    // Simulate SMS/External Notification for High Risk
    if (alert.level === 'high') {
      console.log(`[EXTERNAL_ALERT_SIM] SMS sent to Counselor and Parent for Student: ${student?.name || studentId}. Risk: HIGH. Emotion: ${emotion}`);
    }

    res.status(201).json(alert);
  });

  // Socket.io connection
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.emit('initial-data', { students, alerts: alertLogs });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`MindGuard AI Server running at http://localhost:${PORT}`);
  });
}

startServer();
