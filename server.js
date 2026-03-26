require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST'] }
});

// Middlewares
// Configure CSP for local validation with inline scripts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
      "script-src-attr": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "*"], // allow all media URLs locally
      "media-src": ["'self'", "data:", "*"],
      "connect-src": ["'self'", "https://generativelanguage.googleapis.com"]
    }
  }
}));
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes, réessayez dans une minute.' }
});
app.use('/api/', limiter);

// Routes
// Note: les routes seront bouchonnées pour l'instant car elles nécessitent d'être créées plus tard
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/posts',    require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/chat',     require('./routes/chat'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/reports',  require('./routes/reports'));
app.use('/api/verifications', require('./routes/verifications'));

// Socket.io — messagerie temps réel
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Auth token missing'));
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_temporaire');
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Auth failed'));
  }
});

io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(userId));
  socket.on('message', (data) => {
    io.to(data.receiverId).emit('message', data);
  });
  socket.on('disconnect', () => {});
});

// Servir le front sur toutes les routes non-API (SPA fallback)
app.get('*path', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Anonyme démarré sur le port ${PORT}`));
