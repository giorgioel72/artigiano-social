const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configurazione CORS SEMPLIFICATA (permette tutte le origini)
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
}));

// CORS per Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.options('*', cors());

app.use(express.json());

// Connessione a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connesso a MongoDB'))
  .catch(err => console.error('❌ Errore connessione MongoDB:', err.message));

// Import route
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const workRoutes = require('./routes/workRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const chatRoutes = require('./routes/chatRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const adRoutes = require('./routes/adRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/works', workRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/ads', adRoutes);

// Socket.io per chat in tempo reale
const connectedUsers = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Token non fornito'));
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('./models/User');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('Utente non trovato'));
    }

    socket.user = user;
    socket.userId = user._id.toString();
    next();
  } catch (error) {
    next(new Error('Token non valido'));
  }
});

io.on('connection', (socket) => {
  console.log(`🔵 Utente connesso: ${socket.user?.nome || socket.userId}`);
  
  connectedUsers.set(socket.userId, socket.id);
  
  socket.on('join-conversations', (conversationIds) => {
    conversationIds.forEach(convId => {
      socket.join(`conv:${convId}`);
    });
  });

  socket.on('join-conversation', (conversationId) => {
    socket.join(`conv:${conversationId}`);
  });

  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`conv:${conversationId}`);
  });

  socket.on('send-message', async (data) => {
    try {
      const { conversationId, text } = data;
      
      const Message = require('./models/Message');
      const Conversation = require('./models/Conversation');
      
      const message = new Message({
        conversation: conversationId,
        sender: socket.userId,
        text,
        read: false
      });
      
      await message.save();
      await message.populate('sender', 'nome cognome avatar');
      
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        updatedAt: Date.now()
      });
      
      io.to(`conv:${conversationId}`).emit('new-message', message);
      
    } catch (error) {
      console.error('Errore invio messaggio:', error);
      socket.emit('message-error', { error: error.message });
    }
  });

  socket.on('typing', ({ conversationId, isTyping }) => {
    socket.to(`conv:${conversationId}`).emit('user-typing', {
      userId: socket.userId,
      userName: socket.user?.nome,
      isTyping
    });
  });

  socket.on('mark-read', async ({ conversationId, messageIds }) => {
    try {
      const Message = require('./models/Message');
      
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { read: true, $addToSet: { readBy: socket.userId } }
      );
      
      io.to(`conv:${conversationId}`).emit('messages-read', {
        userId: socket.userId,
        messageIds
      });
      
    } catch (error) {
      console.error('Errore mark-read:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Utente disconnesso: ${socket.user?.nome || socket.userId}`);
    connectedUsers.delete(socket.userId);
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: '✅ Backend Artigiano Social funzionante!',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server in esecuzione su http://localhost:${PORT}`);
  console.log(`🔌 Socket.io attivo`);
});
