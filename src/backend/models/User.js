const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  // Legacy fields for backward compatibility
  gamesPlayed: {
    type: Number,
    default: 0
  },
  gamesWon: {
    type: Number,
    default: 0
  },
  totalScore: {
    type: Number,
    default: 0
  },
  // New separate statistics for online and AI games
  onlineStats: {
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 }
  },
  aiStats: {
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  avatar: {
    type: String,
    default: 'default-1'
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get user stats
userSchema.methods.getStats = function() {
  // Calculate win rates for each game mode
  const onlineWinRate = this.onlineStats.gamesPlayed > 0 ? 
    (this.onlineStats.gamesWon / this.onlineStats.gamesPlayed * 100).toFixed(1) : 0;
  const aiWinRate = this.aiStats.gamesPlayed > 0 ? 
    (this.aiStats.gamesWon / this.aiStats.gamesPlayed * 100).toFixed(1) : 0;
  
  return {
    username: this.username,
    // Legacy stats for backward compatibility
    gamesPlayed: this.gamesPlayed,
    gamesWon: this.gamesWon,
    totalScore: this.totalScore,
    winRate: this.gamesPlayed > 0 ? (this.gamesWon / this.gamesPlayed * 100).toFixed(1) : 0,
    // New separate stats
    online: {
      gamesPlayed: this.onlineStats.gamesPlayed,
      gamesWon: this.onlineStats.gamesWon,
      totalScore: this.onlineStats.totalScore,
      winRate: parseFloat(onlineWinRate)
    },
    ai: {
      gamesPlayed: this.aiStats.gamesPlayed,
      gamesWon: this.aiStats.gamesWon,
      totalScore: this.aiStats.totalScore,
      winRate: parseFloat(aiWinRate)
    },
    createdAt: this.createdAt,
    lastLogin: this.lastLogin,
    avatar: this.avatar
  };
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Update game stats (legacy method for backward compatibility)
userSchema.methods.updateGameStats = function(won, score) {
  this.gamesPlayed += 1;
  if (won) this.gamesWon += 1;
  this.totalScore += score;
  return this.save();
};

// Update online game stats
userSchema.methods.updateOnlineStats = function(won, score) {
  this.onlineStats.gamesPlayed += 1;
  if (won) this.onlineStats.gamesWon += 1;
  this.onlineStats.totalScore += score;
  
  // Also update legacy stats for backward compatibility
  this.gamesPlayed += 1;
  if (won) this.gamesWon += 1;
  this.totalScore += score;
  
  return this.save();
};

// Update AI game stats
userSchema.methods.updateAIStats = function(won, score) {
  this.aiStats.gamesPlayed += 1;
  if (won) this.aiStats.gamesWon += 1;
  this.aiStats.totalScore += score;
  
  // Also update legacy stats for backward compatibility
  this.gamesPlayed += 1;
  if (won) this.gamesWon += 1;
  this.totalScore += score;
  
  return this.save();
};

// Update AI game stats with new scoring system
userSchema.methods.updateAIStatsNew = function(won, scoreChange) {
  console.log('🎯 updateAIStatsNew called with:', { won, scoreChange });
  console.log('Stats before update:', {
    aiStats: this.aiStats,
    gamesPlayed: this.gamesPlayed,
    gamesWon: this.gamesWon,
    totalScore: this.totalScore
  });
  
  // Both players: gamesPlayed incremented by 1
  this.aiStats.gamesPlayed += 1;
  
  // Winner: gamesWon incremented by 1, totalScore incremented by 5
  // Loser: totalScore decremented by 2 (but not below 0)
  if (won) {
    this.aiStats.gamesWon += 1;
    this.aiStats.totalScore += 5;
  } else {
    // Loser: decrement by 2, but not below 0
    this.aiStats.totalScore = Math.max(0, this.aiStats.totalScore - 2);
  }
  
  // Also update legacy stats for backward compatibility
  this.gamesPlayed += 1;
  if (won) {
    this.gamesWon += 1;
    this.totalScore += 5;
  } else {
    this.totalScore = Math.max(0, this.totalScore - 2);
  }
  
  console.log('Stats after update:', {
    aiStats: this.aiStats,
    gamesPlayed: this.gamesPlayed,
    gamesWon: this.gamesWon,
    totalScore: this.totalScore
  });
  
  return this.save();
};

// Static method to delete user by ID
userSchema.statics.deleteById = async function(id) {
  try {
    const result = await this.findByIdAndDelete(id);
    return !!result;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
};

module.exports = mongoose.model('User', userSchema);
