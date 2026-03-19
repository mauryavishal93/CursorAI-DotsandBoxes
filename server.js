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
const adminRoutes = require('./src/backend/routes/admin');
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
      
      await this.bootstrapAdminUser();

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

  async bootstrapAdminUser() {
    const raw = process.env.ADMIN_BOOTSTRAP_EMAIL;
    if (!raw || global.useInMemoryStorage) return;
    const email = String(raw).trim().toLowerCase();
    try {
      const User = require('./src/backend/models/User');
      const result = await User.updateOne({ email }, { $set: { isAdmin: true } });
      if (result.matchedCount === 0) {
        console.log(`⚠️  ADMIN_BOOTSTRAP_EMAIL: no user found with email "${email}" (create account first)`);
      } else {
        console.log(`✅ ADMIN_BOOTSTRAP_EMAIL: isAdmin set for "${email}"`);
      }
    } catch (e) {
      console.warn('⚠️  Admin bootstrap failed:', e.message);
    }
  }

  setupRoutes() {
    // API routes
    this.app.use('/api', apiRoutes);
    
    // Authentication routes
    this.app.use('/api/auth', authRoutes);

    // Admin API (JWT + isAdmin)
    this.app.use('/api/admin', adminRoutes);

    // Admin panel (static HTML — API still requires admin token)
    this.app.get('/admin', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
    });

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

// Start the server
const server = new ProductionServer();
server.start();

module.exports = ProductionServer;
