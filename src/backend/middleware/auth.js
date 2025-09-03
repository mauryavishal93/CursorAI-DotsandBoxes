const jwt = require('jsonwebtoken');

// Function to get the appropriate User model
function getUserModel() {
  console.log('getUserModel called, useInMemoryStorage:', global.useInMemoryStorage);
  if (global.useInMemoryStorage) {
    console.log('Using InMemoryUser model');
    return require('../models/InMemoryUser');
  } else {
    console.log('Using MongoDB User model');
    return require('../models/User');
  }
}

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'dots-and-boxes-secret-key-2024';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.session?.token;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }

    const User = getUserModel();
    console.log('Looking for user with ID:', decoded.userId);
    
    let user;
    try {
      // Try to find user in current storage system
      if (global.useInMemoryStorage) {
        // InMemoryUser doesn't support .select(), so get the full user and remove password manually
        user = await User.findById(decoded.userId);
        if (user && user.password) {
          delete user.password; // Remove password from the object
        }
      } else {
        // Mongoose User supports .select()
        user = await User.findById(decoded.userId).select('-password');
      }
      console.log('User found:', user ? 'Yes' : 'No');
      
      // If user not found in current storage system, try the other one
      if (!user) {
        console.log('User not found in current storage, trying alternative...');
        const AlternativeUser = global.useInMemoryStorage ? 
          require('../models/User') : 
          require('../models/InMemoryUser');
        
        try {
          if (global.useInMemoryStorage) {
            // Try Mongoose User - but only if the ID is a valid ObjectId format
            const mongoose = require('mongoose');
            try {
              const objectId = new mongoose.Types.ObjectId(decoded.userId);
              user = await AlternativeUser.findById(objectId).select('-password');
            } catch (objectIdError) {
              console.log('User ID is not a valid ObjectId format, skipping MongoDB search');
              user = null;
            }
          } else {
            // Try InMemoryUser
            user = await AlternativeUser.findById(decoded.userId);
            if (user && user.password) {
              delete user.password; // Remove password from the object
            }
          }
          console.log('User found in alternative storage:', user ? 'Yes' : 'No');
        } catch (altError) {
          console.log('Alternative storage also failed:', altError.message);
        }
      }
    } catch (error) {
      console.error('Error finding user:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error during authentication.' 
      });
    }
    
    if (!user) {
      console.log('User not found in any storage system');
      return res.status(401).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during authentication.' 
    });
  }
};

// Optional authentication (for guest users)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.session?.token;

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const User = getUserModel();
    const user = await User.findById(decoded.userId).select('-password');
        if (user) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); // Continue without authentication
  }
};

// Check if user is guest
const requireRegisteredUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required.' 
    });
  }

  if (req.user.isGuest) {
    return res.status(403).json({ 
      success: false, 
      message: 'This feature requires a registered account.' 
    });
  }

  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  optionalAuth,
  requireRegisteredUser
};
