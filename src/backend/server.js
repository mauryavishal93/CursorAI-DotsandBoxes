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

const config = require('./config');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const SocketController = require('./controllers/socketController');

class GameServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server);
  }

  async initialize() {
    await this.connectDatabase();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocket();
  }

  async connectDatabase() {
    try {
      // Use MongoDB Atlas (or fallback to local if MONGODB_URI not set)
      const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://mauryavishal93_db_user:j2mFtqt7kKN6B2G0@dotsandboxes.wmzzcle.mongodb.net/dots-and-boxes?authSource=admin';
      
      console.log('🔄 Attempting to connect to MongoDB...');
      console.log(`📍 Connection URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);
      
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      
      console.log('✅ Successfully connected to MongoDB');
      global.useInMemoryStorage = false;
      console.log('📊 Using MongoDB storage system');
      
      // Test database connection by creating a test document
      await this.testDatabaseConnection();
      
    } catch (error) {
      console.log('❌ MongoDB connection failed:', error.message);
      console.log('⚠️  Falling back to in-memory storage');
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

  async testDatabaseConnection() {
    if (global.useInMemoryStorage) return;
    
    try {
      console.log('🧪 Testing database write operations...');
      const User = require('./models/User');
      const testUser = new User({
        username: 'connection_test_' + Date.now(),
        email: 'test@test.com',
        password: 'testpassword',
        isGuest: true
      });
      
      await testUser.save();
      console.log('✅ Database write test successful - User created with ID:', testUser._id);
      
      // Clean up test user
      await User.deleteOne({ _id: testUser._id });
      console.log('🧹 Test user cleaned up successfully');
      console.log('💾 Database is ready for production writes');
      
    } catch (error) {
      console.error('❌ Database write test failed:', error.message);
      console.log('⚠️  Switching to in-memory storage due to write test failure');
      global.useInMemoryStorage = true;
    }
  }

  setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' ? false : true,
      credentials: true
    }));

    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Session configuration
    const sessionConfig = {
      secret: process.env.SESSION_SECRET || 'dots-and-boxes-session-secret-2024',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      }
    };

    // Use memory session store for now (will be updated after database connection)
    console.log('⚠️  Using memory session store (sessions will be lost on restart)');

    this.app.use(session(sessionConfig));

    // Serve static files from public directory
    this.app.use('/js', express.static(path.join(__dirname, '../../public', 'js')));
    this.app.use('/css', express.static(path.join(__dirname, '../../public', 'css')));
    this.app.use('/assets', express.static(path.join(__dirname, '../../public', 'assets')));
    this.app.use('/socket.io', express.static(path.join(__dirname, '../../../node_modules', 'socket.io', 'client-dist')));
  }

  setupRoutes() {
    // API routes
    this.app.use('/api', apiRoutes);
    this.app.use('/api/auth', authRoutes);
    
    // Serve index.html from root directory
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../index.html'));
    });
  }

  setupSocket() {
    new SocketController(this.io);
  }

  start() {
    this.server.listen(config.PORT, '0.0.0.0', () => {
      console.log(`Dots and Boxes app running at http://localhost:${config.PORT}`);
      
      // Start automatic cleanup of inactive lobbies every 5 minutes
      setInterval(() => {
        const lobbyService = require('./services/lobbyService');
        const cleanedCount = lobbyService.cleanupAllInactiveLobbies();
        if (cleanedCount > 0) {
          console.log(`🧹 Cleaned up ${cleanedCount} inactive lobbies`);
        }
      }, 5 * 60 * 1000); // Every 5 minutes
    });
  }
}

// Start the server
async function startServer() {
  try {
    console.log('🚀 Starting Dots and Boxes server...');
    const gameServer = new GameServer();
    await gameServer.initialize();
    gameServer.start();
    console.log('🎮 Server initialization complete!');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = GameServer;
