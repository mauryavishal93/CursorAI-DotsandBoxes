/**
 * Database Helper Utilities
 * Provides functions to check database connection status and get the correct model
 */

/**
 * Check if MongoDB is connected and ready
 * @returns {boolean} True if MongoDB is connected
 */
function isMongoDBConnected() {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1; // 1 = connected
}

/**
 * Get the appropriate User model based on connection status
 * This function ensures we use MongoDB when available, even if global.useInMemoryStorage is incorrectly set
 * @returns {Object} User model (MongoDB or InMemory)
 */
function getUserModel() {
  // First check if MongoDB is actually connected
  if (isMongoDBConnected()) {
    // MongoDB is connected, use MongoDB model
    global.useInMemoryStorage = false;
    return require('../models/User');
  }
  
  // MongoDB not connected, check global flag
  if (global.useInMemoryStorage === false) {
    // Flag says MongoDB but connection failed, log warning
    console.warn('⚠️  Warning: global.useInMemoryStorage is false but MongoDB is not connected. Using in-memory storage.');
    global.useInMemoryStorage = true;
  }
  
  // Use in-memory storage
  if (global.useInMemoryStorage !== false) {
    global.useInMemoryStorage = true;
  }
  
  return require('../models/InMemoryUser');
}

/**
 * Verify database connection before operations
 * @param {Function} operation - Operation to perform
 * @returns {Promise} Result of operation
 */
async function ensureDatabaseConnection(operation) {
  if (!isMongoDBConnected() && !global.useInMemoryStorage) {
    // Wait a bit for connection
    const mongoose = require('mongoose');
    let waited = 0;
    const maxWait = 5000; // 5 seconds
    
    while (mongoose.connection.readyState !== 1 && waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
      waited += 100;
    }
    
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not available');
    }
  }
  
  return operation();
}

module.exports = {
  isMongoDBConnected,
  getUserModel,
  ensureDatabaseConnection
};
