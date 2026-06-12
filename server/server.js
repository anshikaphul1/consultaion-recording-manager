require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const Astrologer = require('./models/Astrologer');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// HTTP & Socket.io Initialization
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Import routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const astrologerRoutes = require('./routes/astrologers');
const consultationRoutes = require('./routes/consultations');
const dashboardRoutes = require('./routes/dashboard');
const walletRoutes = require('./routes/wallet');
const reviewRoutes = require('./routes/reviews');
const sessionRoutes = require('./routes/sessions');

// Apply routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/astrologers', astrologerRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/sessions', sessionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// Seed default astrologers if database is empty
async function seedDefaultAstrologers() {
  try {
    const defaultAstrologers = [
      { 
        name: 'Pandit Sri Raman', 
        specialization: 'Vedic Astrology & Gemology',
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop'
      },
      { 
        name: 'Dr. Anjali Sharma', 
        specialization: 'KP Astrology & Numerology',
        photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=250&auto=format&fit=crop'
      },
      { 
        name: 'Karthik Iyer', 
        specialization: 'Western Astrology & Horary',
        photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=250&auto=format&fit=crop'
      }
    ];

    const count = await Astrologer.countDocuments();
    if (count === 0) {
      await Astrologer.insertMany(defaultAstrologers);
      console.log('seeded default astrologers successfully.');
    } else {
      // Ensure existing astrologers have photoUrl populated
      for (const astro of defaultAstrologers) {
        await Astrologer.updateOne(
          { name: astro.name },
          { $set: { photoUrl: astro.photoUrl } }
        );
      }
      console.log('updated existing default astrologers with photo URLs.');
    }
  } catch (error) {
    console.error('Failed to seed default astrologers:', error);
  }
}

// Seed default admin user if database has no users
async function seedDefaultUsers() {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const defaultAdmin = new User({
        username: 'admin',
        password: hashedPassword,
        name: 'Administrator',
        role: 'admin'
      });
      await defaultAdmin.save();
      console.log('Seeded default admin user successfully.');
    }
  } catch (error) {
    console.error('Failed to seed default admin user:', error);
  }
}

// Socket.io Real-time connection handlers
const connectedUsers = {}; // userId -> socket.id

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Register client/astrologer user ID
  socket.on('register-user', ({ userId }) => {
    if (userId) {
      connectedUsers[userId] = socket.id;
      socket.userId = userId;
      console.log(`User registered: ${userId} -> Socket: ${socket.id}`);
    }
  });

  // Astrologer Status Change
  socket.on('astrologer-status-change', async ({ astrologerId, status }) => {
    const isOnline = status === 'online';
    console.log(`Astrologer ${astrologerId} status change request: ${status}`);
    try {
      await Astrologer.findByIdAndUpdate(astrologerId, { isOnline });
      io.emit('astrologer-status-update', { astrologerId, status });
    } catch (e) {
      console.error('Failed to change astrologer status:', e);
    }
  });

  // Call Signaling
  socket.on('call-request', async ({ clientUserId, clientName, astrologerId }) => {
    console.log(`Call request from ${clientName} (${clientUserId}) to Astrologer: ${astrologerId}`);
    try {
      const astroUser = await User.findOne({ astrologerRef: astrologerId });
      if (!astroUser) {
        return socket.emit('call-error', { message: 'Astrologer account not found.' });
      }

      const targetSocketId = connectedUsers[astroUser._id.toString()];
      if (!targetSocketId) {
        return socket.emit('call-error', { message: 'Astrologer is currently offline.' });
      }

      io.to(targetSocketId).emit('incoming-call', {
        clientId: clientUserId,
        clientName,
        astrologerId
      });
    } catch (e) {
      socket.emit('call-error', { message: 'Failed to initiate call.' });
    }
  });

  socket.on('call-accept', async ({ clientId, astrologerId }) => {
    console.log(`Call accepted by Astrologer ${astrologerId} for Client: ${clientId}`);
    try {
      const clientUser = await User.findById(clientId);
      if (!clientUser) {
        return socket.emit('call-error', { message: 'Client account not found.' });
      }

      // Create a Live Consultation record immediately so we have a sessionId for real-time chat
      const Consultation = require('./models/Consultation');
      const session = new Consultation({
        client: clientUser.clientRef || clientId,
        astrologer: astrologerId,
        date: new Date(),
        duration: 0,
        amount: 0,
        status: 'Live',
        notes: 'Live call consultation session initiated.'
      });
      await session.save();

      // Send sessionId back to both participants
      const clientSocketId = connectedUsers[clientId];
      if (clientSocketId) {
        io.to(clientSocketId).emit('call-accepted', { astrologerId, sessionId: session._id.toString() });
      }

      const astroUser = await User.findOne({ astrologerRef: astrologerId });
      if (astroUser) {
        const astroSocketId = connectedUsers[astroUser._id.toString()];
        if (astroSocketId) {
          io.to(astroSocketId).emit('call-started', { clientId, sessionId: session._id.toString() });
        }
      }
    } catch (err) {
      console.error('Failed to initialize live session:', err);
      socket.emit('call-error', { message: 'Failed to start live call session.' });
    }
  });

  socket.on('call-reject', ({ clientId }) => {
    console.log(`Call rejected for Client: ${clientId}`);
    const targetSocketId = connectedUsers[clientId];
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-rejected');
    }
  });

  socket.on('call-end', async ({ clientId, astrologerId }) => {
    console.log(`Call ended between Client: ${clientId} and Astrologer: ${astrologerId}`);
    
    // Notify client
    const clientSocketId = connectedUsers[clientId];
    if (clientSocketId) {
      io.to(clientSocketId).emit('call-terminated');
    }

    // Notify astrologer
    try {
      const astroUser = await User.findOne({ astrologerRef: astrologerId });
      if (astroUser) {
        const astroSocketId = connectedUsers[astroUser._id.toString()];
        if (astroSocketId) {
          io.to(astroSocketId).emit('call-terminated');
        }
      }
    } catch (e) {
      console.error(e);
    }
  });

  // Real-time Chat Messaging
  socket.on('chat-message', async ({ sessionId, message, senderId, senderRole }) => {
    console.log(`Chat message in session ${sessionId} from ${senderId} (${senderRole}): ${message}`);
    try {
      const ChatMessage = require('./models/ChatMessage');
      const Consultation = require('./models/Consultation');
      
      const chatMsg = new ChatMessage({
        sessionId,
        senderId,
        senderRole,
        message
      });
      await chatMsg.save();

      // Update session to flag that chat transcript is available
      await Consultation.findByIdAndUpdate(sessionId, { chatTranscriptAvailable: true });

      const session = await Consultation.findById(sessionId);
      if (session) {
        const clientUser = await User.findOne({ clientRef: session.client });
        const astroUser = await User.findOne({ astrologerRef: session.astrologer });

        const payload = {
          _id: chatMsg._id,
          sessionId,
          message,
          senderId,
          senderRole,
          timestamp: chatMsg.timestamp
        };

        if (clientUser && clientUser._id.toString() !== senderId) {
          const clientSocket = connectedUsers[clientUser._id.toString()];
          if (clientSocket) io.to(clientSocket).emit('chat-message-receive', payload);
        }

        if (astroUser && astroUser._id.toString() !== senderId) {
          const astroSocket = connectedUsers[astroUser._id.toString()];
          if (astroSocket) io.to(astroSocket).emit('chat-message-receive', payload);
        }
      }
    } catch (e) {
      console.error('Failed to process chat message:', e);
    }
  });

  socket.on('disconnect', async () => {
    console.log(`Socket disconnected: ${socket.id}`);
    if (socket.userId) {
      delete connectedUsers[socket.userId];
      
      // Auto toggle offline if user was an astrologer
      try {
        const user = await User.findById(socket.userId);
        if (user && user.role === 'astrologer' && user.astrologerRef) {
          await Astrologer.findByIdAndUpdate(user.astrologerRef, { isOnline: false });
          io.emit('astrologer-status-update', { astrologerId: user.astrologerRef.toString(), status: 'offline' });
          console.log(`Offline: Astrologer ${user.astrologerRef} disconnected.`);
        }
      } catch (e) {
        console.error(e);
      }
    }
  });
});

// Connect to MongoDB & Start Server
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully.');
    await seedDefaultUsers();
    await seedDefaultAstrologers();
    // Start HTTP + Socket Server
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
