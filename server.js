/**
 * Production Server for Dots and Boxes Game
 * Deploys the project to port 3000
 * Version: 3.0.0
 */

// Load environment variables from .env file
require('dotenv').config();

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
    this.dbConnected = false;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocket();
    // Initialize database connection (non-blocking)
    this.connectDatabase();
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
      this.dbConnected = true;
      console.log('📊 Using MongoDB Atlas storage system');
      console.log('💾 Database: dots-and-boxes');
      console.log(`🔗 Connection State: ${mongoose.connection.readyState} (1=connected)`);
      console.log(`🌐 Host: ${mongoose.connection.host}`);
      
      // Verify the flag is set correctly
      if (global.useInMemoryStorage === false) {
        console.log('✅ global.useInMemoryStorage correctly set to FALSE');
      } else {
        console.warn('⚠️  WARNING: global.useInMemoryStorage is not FALSE! Current value:', global.useInMemoryStorage);
        global.useInMemoryStorage = false; // Force it to false
      }
      
      // Test the connection with read/write operations
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      console.log(`📋 Available collections: ${collections.length > 0 ? collections.map(c => c.name).join(', ') : 'None (will be created as needed)'}`);
      
      // Test database read operation
      try {
        const User = require('./src/backend/models/User');
        const userCount = await User.countDocuments();
        console.log(`👥 Users in database: ${userCount}`);
      } catch (readError) {
        console.log(`⚠️  Read test warning: ${readError.message}`);
      }
      
      // Test database write operation
      try {
        const User = require('./src/backend/models/User');
        const testUser = new User({
          username: `connection_test_${Date.now()}`,
          email: `test_${Date.now()}@connection.test`,
          password: 'test_password',
          isGuest: true
        });
        await testUser.save();
        console.log(`✅ Write test successful - Test user created with ID: ${testUser._id}`);
        // Clean up test user
        await User.deleteOne({ _id: testUser._id });
        console.log(`🧹 Test user cleaned up`);
      } catch (writeError) {
        console.log(`⚠️  Write test warning: ${writeError.message}`);
        // Don't fail connection if write test fails (might be permissions issue)
      }
      
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
      this.dbConnected = false;
      console.log('⚠️  Falling back to in-memory storage');
      console.log('📝 Note: Data will be lost on server restart');
    }
  }
  
  async waitForDatabase(maxWaitTime = 30000) {
    const startTime = Date.now();
    while (!this.dbConnected && !global.useInMemoryStorage && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.dbConnected || global.useInMemoryStorage;
  }

  setupMiddleware() {
    // CORS configuration for production deployment
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' ? 
        [process.env.FRONTEND_URL || 'http://localhost:3000'] : 
        true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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

    // Serve static files from public directory with proper headers
    this.app.use(express.static(path.join(__dirname, 'public'), {
      maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        // Set proper MIME types for different file types
        if (path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
        if (path.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
        if (path.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
        if (path.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
        }
        if (path.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
        if (path.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
        }
      }
    }));
    
    // Serve root HTML file
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });

    // Ensure JavaScript files are served with correct MIME type
    this.app.get('*.js', (req, res, next) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      next();
    });

    // Ensure CSS files are served with correct MIME type
    this.app.get('*.css', (req, res, next) => {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      next();
    });
  }

  setupRoutes() {
    // API routes
    this.app.use('/api', apiRoutes);
    
    // Authentication routes
    this.app.use('/api/auth', authRoutes);

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const mongoose = require('mongoose');
      const isConnected = mongoose.connection.readyState === 1;
      
      res.json({
        status: 'OK',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: {
          type: global.useInMemoryStorage ? 'in-memory' : 'mongodb',
          connected: isConnected,
          readyState: mongoose.connection.readyState,
          name: mongoose.connection.name,
          host: mongoose.connection.host
        }
      });
    });
    
    // Database diagnostic endpoint
    this.app.get('/api/db-status', async (req, res) => {
      try {
        const mongoose = require('mongoose');
        const User = require('./src/backend/models/User');
        const Game = require('./src/backend/models/Game');
        
        const isConnected = mongoose.connection.readyState === 1;
        const useInMemory = global.useInMemoryStorage;
        
        let userCount = 0;
        let gameCount = 0;
        let sampleUsers = [];
        
        if (isConnected && !useInMemory) {
          try {
            userCount = await User.countDocuments();
            gameCount = await Game.countDocuments();
            sampleUsers = await User.find().limit(5).select('username email points wins gamesPlayed');
          } catch (error) {
            console.error('Error reading database:', error);
          }
        }
        
        res.json({
          success: true,
          database: {
            type: useInMemory ? 'in-memory' : 'mongodb',
            connected: isConnected,
            readyState: mongoose.connection.readyState,
            name: mongoose.connection.name,
            host: mongoose.connection.host,
            port: mongoose.connection.port
          },
          statistics: {
            users: userCount,
            games: gameCount,
            sampleUsers: sampleUsers.map(u => ({
              username: u.username,
              email: u.email,
              points: u.points,
              wins: u.wins,
              gamesPlayed: u.gamesPlayed
            }))
          },
          globalFlag: {
            useInMemoryStorage: global.useInMemoryStorage
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Specific routes for static files to ensure proper MIME types
    this.app.get('/js/*', (req, res, next) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      next();
    });

    this.app.get('/css/*', (req, res, next) => {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      next();
    });

    this.app.get('/assets/*', (req, res, next) => {
      const filePath = req.path;
      if (filePath.endsWith('.wav') || filePath.endsWith('.mp3')) {
        res.setHeader('Content-Type', 'audio/wav');
      }
      next();
    });

    // Catch-all handler for SPA routing (must be last)
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

// Start the server with async initialization
async function startServer() {
  const server = new ProductionServer();
  
  // Wait a bit for database connection to establish
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check database status
  if (mongoose.connection.readyState === 1) {
    console.log('✅ Database ready - Starting server...');
  } else if (global.useInMemoryStorage) {
    console.log('⚠️  Using in-memory storage - Starting server...');
  } else {
    console.log('⏳ Waiting for database connection...');
    // Wait up to 10 seconds for connection
    let waited = 0;
    while (mongoose.connection.readyState !== 1 && !global.useInMemoryStorage && waited < 10000) {
      await new Promise(resolve => setTimeout(resolve, 500));
      waited += 500;
    }
  }
  
  server.start();
}

startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

module.exports = ProductionServer;
