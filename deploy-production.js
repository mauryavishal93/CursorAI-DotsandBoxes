/**
 * Production Deployment Script
 * Sets all environment variables and starts the server for production
 */

console.log('🚀 Starting Production Deployment...');

// Set all required environment variables
process.env.MONGODB_URI = "mongodb+srv://mauryavishal93_db_user:j2mFtqt7kKN6B2G0@dotsandboxes.wmzzcle.mongodb.net/dots-and-boxes?retryWrites=true&w=majority";
process.env.SESSION_SECRET = "dots-and-boxes-super-secret-session-key-2024";
process.env.NODE_ENV = "production";
process.env.PORT = process.env.PORT || 3000;
process.env.DEFAULT_LUCKY_WHEEL_ENABLED = "true";

// Optional: Set frontend URL if deploying to a specific domain
// process.env.FRONTEND_URL = "https://your-domain.com";

console.log('✅ Environment variables set:');
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Missing'}`);
console.log(`   SESSION_SECRET: ${process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   PORT: ${process.env.PORT}`);
console.log(`   LUCKY_WHEEL: ${process.env.DEFAULT_LUCKY_WHEEL_ENABLED}`);

console.log('🔧 Starting server...');

// Start the server
require('./server.js');
