const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Function to get the appropriate User model
function getUserModel() {
  if (global.useInMemoryStorage) {
    return require('../models/InMemoryUser');
  } else {
    return require('../models/User');
  }
}

const { generateToken, authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Register new user
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    const User = getUserModel();
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 
          'Email already registered' : 'Username already taken'
      });
    }

    // Create new user
    let user;
    console.log('Creating user, useInMemoryStorage:', global.useInMemoryStorage);
    if (global.useInMemoryStorage) {
      console.log('Creating user in in-memory storage');
      user = await User.create({
        username,
        email,
        password,
        isGuest: false
      });
      console.log('User created with ID:', user._id);
    } else {
      console.log('Creating user in MongoDB');
      user = new User({
        username,
        email,
        password,
        isGuest: false
      });
      await user.save();
      console.log('User created with ID:', user._id);
    }

    // Generate token
    const token = generateToken(user._id);

    // Set session
    req.session.token = token;
    req.session.userId = user._id;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isGuest: user.isGuest,
        stats: user.getStats()
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Login user
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const User = getUserModel();
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = generateToken(user._id);

    // Set session
    req.session.token = token;
    req.session.userId = user._id;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isGuest: user.isGuest,
        stats: user.getStats()
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Guest login
router.post('/guest', async (req, res) => {
  try {
    let { username } = req.body;

    // If no username provided, generate a temporary one
    if (!username || username.trim().length < 3) {
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000);
      username = `Guest_${timestamp}_${randomNum}`;
    } else {
      username = username.trim();
    }

    // Check if username is already taken
    const User = getUserModel();
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      // If username is taken, append timestamp to make it unique
      const timestamp = Date.now();
      username = `${username}_${timestamp}`;
    }

    // Create guest user
    let guestUser;
    if (global.useInMemoryStorage) {
      guestUser = await User.create({
        username,
        email: `guest_${Date.now()}@temp.com`, // Temporary email
        password: 'guest_password_' + Date.now(), // Will be hashed
        isGuest: true
      });
    } else {
      guestUser = new User({
        username,
        email: `guest_${Date.now()}@temp.com`, // Temporary email
        password: 'guest_password_' + Date.now(), // Will be hashed
        isGuest: true
      });
      await guestUser.save();
    }

    // Generate token
    const token = generateToken(guestUser._id);

    // Set session
    req.session.token = token;
    req.session.userId = guestUser._id;

    res.status(201).json({
      success: true,
      message: 'Guest login successful',
      token,
      user: {
        id: guestUser._id,
        username: guestUser.username,
        email: guestUser.email,
        isGuest: guestUser.isGuest,
        stats: guestUser.getStats()
      }
    });

  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during guest login'
    });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        isGuest: req.user.isGuest,
        stats: req.user.getStats()
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get user profile with detailed statistics
router.get('/profile', authenticate, async (req, res) => {
  try {
    const stats = req.user.getStats();
    res.json({
      success: true,
      profile: {
        username: stats.username,
        gamesPlayed: stats.gamesPlayed,
        gamesWon: stats.gamesWon,
        totalScore: stats.totalScore,
        winRate: stats.winRate,
        createdAt: stats.createdAt,
        lastLogin: stats.lastLogin,
        isGuest: req.user.isGuest,
        avatar: stats.avatar
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error during logout'
      });
    }
    res.json({
      success: true,
      message: 'Logout successful'
    });
  });
});

// Update user stats (after game completion)
router.post('/update-stats', authenticate, async (req, res) => {
  try {
    const { won, score } = req.body;

    if (typeof won !== 'boolean' || typeof score !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Invalid stats data'
      });
    }

    await req.user.updateGameStats(won, score);

    res.json({
      success: true,
      message: 'Stats updated successfully',
      stats: req.user.getStats()
    });

  } catch (error) {
    console.error('Update stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating stats'
    });
  }
});

// Update user avatar
console.log('Registering avatar route: PUT /avatar');
router.put('/avatar', async (req, res) => {
  try {
    console.log('Avatar update request received');
    console.log('Request body:', req.body);
    
    const { avatar } = req.body;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!avatar) {
      console.log('No avatar provided');
      return res.status(400).json({
        success: false,
        message: 'Avatar is required'
      });
    }

    // Validate avatar selection - Enhanced with 3D avatars
    const validAvatars = [
      // Classic avatars
      'default-1', 'default-2', 'default-3', 'default-4', 'default-5', 'default-6',
      
      // Fantasy avatars
      '3d-warrior', '3d-mage', '3d-archer', '3d-knight', '3d-ninja', '3d-wizard', 
      '3d-witch', '3d-vampire', '3d-werewolf', '3d-samurai', '3d-viking', '3d-pirate',
      
      // Profession avatars
      '3d-doctor', '3d-teacher', '3d-artist', '3d-musician', '3d-scientist', '3d-engineer',
      '3d-pilot', '3d-firefighter', '3d-police', '3d-chef', '3d-astronaut', '3d-superhero',
      
      // Futuristic avatars
      '3d-robot', '3d-cyber', '3d-alien', '3d-digital', '3d-virtual', '3d-hologram',
      '3d-cyberpunk', '3d-steampunk', '3d-futuristic', '3d-space', '3d-quantum', '3d-neural',
      
      // Mythical avatars
      '3d-dragon', '3d-unicorn', '3d-phoenix', '3d-ghost', '3d-divine', '3d-celestial',
      '3d-cosmic', '3d-stellar', '3d-galactic', '3d-legend', '3d-myth', '3d-legendary',
      
      // Master avatars
      '3d-master', '3d-grandmaster', '3d-legendary-master', '3d-divine-master', '3d-cosmic-master',
      '3d-quantum-master', '3d-digital-master', '3d-virtual-master', '3d-holographic-master',
      '3d-cyberpunk-master', '3d-futuristic-master', '3d-ultimate-master', '3d-supreme-master'
    ];
    
    if (!validAvatars.includes(avatar)) {
      console.log('Invalid avatar selection:', avatar);
      return res.status(400).json({
        success: false,
        message: 'Invalid avatar selection'
      });
    }

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token and find user
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'dots-and-boxes-secret-key-2024';
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.log('Invalid token:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Try to find user in both storage systems
    let user = null;
    
    // Try in-memory storage first
    try {
      const InMemoryUser = require('../models/InMemoryUser');
      const allUsers = InMemoryUser.getAllUsers();
      console.log('Total users in in-memory storage:', allUsers.length);
      console.log('User IDs in storage:', allUsers.map(u => u._id));
      user = await InMemoryUser.findById(decoded.userId);
      console.log('User found in in-memory storage:', user ? 'Yes' : 'No');
    } catch (error) {
      console.log('In-memory storage search failed:', error.message);
    }
    
    // Try MongoDB if not found in in-memory
    if (!user) {
      try {
        const User = require('../models/User');
        const mongoose = require('mongoose');
        
        // Try to convert the ID to ObjectId if it's a valid ObjectId format
        let objectId;
        try {
          objectId = new mongoose.Types.ObjectId(decoded.userId);
          user = await User.findById(objectId);
        } catch (objectIdError) {
          // If it's not a valid ObjectId format (like UUID), skip MongoDB search
          console.log('User ID is not a valid ObjectId format, skipping MongoDB search');
          user = null;
        }
        
        console.log('User found in MongoDB:', user ? 'Yes' : 'No');
      } catch (error) {
        console.log('MongoDB search failed:', error.message);
      }
    }

    if (!user) {
      console.log('User not found in any storage system');
      return res.status(401).json({
        success: false,
        message: 'User session expired. Please log in again.'
      });
    }

    console.log('Updating user avatar to:', avatar);
    console.log('User:', user.username);
    
    // Update user avatar
    user.avatar = avatar;
    await user.save();

    console.log('Avatar updated successfully for user:', user.username);

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: avatar
    });
  } catch (error) {
    console.error('Avatar update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update avatar'
    });
  }
});

module.exports = router;
