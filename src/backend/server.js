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
    });
  }
}

// Start the server
const gameServer = new GameServer();
gameServer.start();

module.exports = GameServer;
