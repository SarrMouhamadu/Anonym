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
app.use(helmet());
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
// app.use('/api/posts',    require('./routes/posts'));
// app.use('/api/comments', require('./routes/comments'));
// app.use('/api/messages', require('./routes/messages'));
// app.use('/api/chat',     require('./routes/chat'));
// app.use('/api/admin',    require('./routes/admin'));

// Socket.io — messagerie temps réel
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // vérifier JWT ici
  next();
});

io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(userId));
  socket.on('message', (data) => {
    io.to(data.receiverId).emit('message', data);
  });
  socket.on('disconnect', () => {});
});

// Servir le front sur toutes les routes non-API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Anonyme démarré sur le port ${PORT}`));
