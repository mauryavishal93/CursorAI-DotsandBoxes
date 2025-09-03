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
      // Check if MONGODB_URI environment variable is set
      const mongoUri = process.env.MONGODB_URI;
      
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }
      
      console.log('🔄 Connecting to MongoDB Atlas...');
      console.log(`📍 Connection URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs
      
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000, // Increased timeout for Atlas
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        retryWrites: true,
        w: 'majority'
      });
      
      console.log('✅ Successfully connected to MongoDB Atlas');
      global.useInMemoryStorage = false;
      console.log('📊 Using MongoDB Atlas storage system');
      console.log('💾 Database: dots-and-boxes');
      
      // Test the connection
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      console.log(`📋 Available collections: ${collections.length > 0 ? collections.map(c => c.name).join(', ') : 'None (will be created as needed)'}`);
      
      // Set up connection event handlers
      mongoose.connection.on('connected', () => {
        console.log('🔗 Mongoose connected to MongoDB Atlas');
      });
      
      mongoose.connection.on('error', (err) => {
        console.log('❌ Mongoose connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('🔌 Mongoose disconnected from MongoDB Atlas');
      });
      
    } catch (error) {
      console.log('❌ Failed to connect to MongoDB Atlas');
      console.log('🔍 Error details:', error.message);
      
      if (error.message.includes('MONGODB_URI environment variable is not set')) {
        console.log('💡 To connect to MongoDB Atlas:');
        console.log('   1. Set the MONGODB_URI environment variable');
        console.log('   2. Example: $env:MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/dots-and-boxes"');
        console.log('   3. Or create a .env file with MONGODB_URI=your_connection_string');
      } else if (error.message.includes('authentication failed')) {
        console.log('💡 Authentication failed - check your username and password');
      } else if (error.message.includes('network')) {
        console.log('💡 Network error - check your internet connection and Atlas network access settings');
      } else {
        console.log('💡 Check your MongoDB Atlas connection string and network access settings');
      }
      
      // Use in-memory storage as fallback
      global.useInMemoryStorage = true;
      console.log('⚠️  Falling back to in-memory storage');
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

    // Use MongoDB Atlas store if available, otherwise use memory store
    if (!global.useInMemoryStorage && process.env.MONGODB_URI) {
      sessionConfig.store = MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        touchAfter: 24 * 3600, // lazy session update
        ttl: 24 * 60 * 60, // 24 hours
        autoIndex: false // disable auto-indexing for better performance
      });
      console.log('🔐 Using MongoDB Atlas session store');
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
