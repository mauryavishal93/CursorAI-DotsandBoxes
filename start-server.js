/**
 * Production Server Startup Script
 * Sets environment variables and starts the server
 */

// Set environment variables for production
process.env.MONGODB_URI = "mongodb+srv://mauryavishal93_db_user:j2mFtqt7kKN6B2G0@dotsandboxes.wmzzcle.mongodb.net/dots-and-boxes?retryWrites=true&w=majority";
process.env.SESSION_SECRET = "dots-and-boxes-super-secret-session-key-2024";
process.env.NODE_ENV = "production";
process.env.PORT = process.env.PORT || 3000;
process.env.DEFAULT_LUCKY_WHEEL_ENABLED = "true";

console.log('🔧 Setting up production environment...');
console.log('✅ Environment variables configured');
console.log('🚀 Starting server...');

// Start the server
require('./server.js');
