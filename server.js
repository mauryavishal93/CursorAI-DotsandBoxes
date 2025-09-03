/**
 * Production Server for Dots and Boxes Game
 * Deploys the project to port 3000
 * Version: 3.0.0
 */

const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const cors = require('cors');

// Import backend modules
const config = require('./src/backend/config');
const apiRoutes = require('./src/backend/routes/api');
const authRoutes = require('./src/backend/routes/auth');
const SocketController = require('./src/backend/controllers/socketController');

class ProductionServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server);
    this.connectDatabase();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocket();
  }

  async connectDatabase() {
    try {
      // Try local MongoDB first, then Atlas
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dots-and-boxes';
      
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
      });
      console.log('✅ Connected to MongoDB');
      global.useInMemoryStorage = false;
      console.log('📊 Using MongoDB storage system');
      
    } catch (error) {
      console.log('⚠️  MongoDB not available, using in-memory storage');
      console.log('💡 To use MongoDB:');
      console.log('   1. Install MongoDB locally: https://www.mongodb.com/try/download/community');
      console.log('   2. Start MongoDB service: net start MongoDB');
      console.log('   3. Or set up MongoDB Atlas and set MONGODB_URI environment variable');
      
      // Use in-memory storage as fallback
      global.useInMemoryStorage = true;
      console.log('📊 Using in-memory storage system');
      console.log('📝 Note: Data will be lost on server restart');
    }
  }

  setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' ? false : true,
      credentials: true
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Session configuration
    const sessionConfig = {
      secret: process.env.SESSION_SECRET || 'dots-and-boxes-secret-key-2024',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    };

    // Use MongoDB store if available, otherwise use memory store
    if (!global.useInMemoryStorage) {
      sessionConfig.store = MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/dots-and-boxes',
        touchAfter: 24 * 3600 // lazy session update
      });
    } else {
      console.log('⚠️  Using memory session store (sessions will be lost on restart)');
    }

    this.app.use(session(sessionConfig));

    // Serve static files from public directory
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // Serve root HTML file
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });
  }

  setupRoutes() {
    // API routes
    this.app.use('/api', apiRoutes);
    
    // Authentication routes
    this.app.use('/api/auth', authRoutes);

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: global.useInMemoryStorage ? 'in-memory' : 'mongodb'
      });
    });

    // Catch-all handler for SPA routing
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });
  }

  setupSocket() {
    // Initialize Socket.IO controller
    const socketController = new SocketController(this.io);
    console.log('🔌 Socket.IO controller initialized');
  }

  start() {
    const PORT = process.env.PORT || 3000;
    
    this.server.listen(PORT, '0.0.0.0', () => {
      console.log('🎮 Dots and Boxes Game Server');
      console.log('================================');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Access your game at: http://localhost:${PORT}`);
      console.log(`📊 Lucky Wheel: ${config.DEFAULT_LUCKY_WHEEL_ENABLED ? 'ENABLED' : 'DISABLED'}`);
      console.log(`💾 Database: ${global.useInMemoryStorage ? 'In-Memory' : 'MongoDB'}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('================================');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      this.server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, shutting down gracefully');
      this.server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
  }
}

// Start the server
const server = new ProductionServer();
server.start();

module.exports = ProductionServer;
