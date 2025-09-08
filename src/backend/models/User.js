const mongoose = require('mongoose');

const scoreHistorySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  points: {
    type: Number,
    required: true,
    min: 0
  },
  gameResult: {
    type: String,
    enum: ['win', 'loss', 'initial'],
    default: 'initial'
  },
  opponent: {
    type: String,
    default: null
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  // Game Statistics
  points: {
    type: Number,
    default: 100,
    min: 0
  },
  wins: {
    type: Number,
    default: 0,
    min: 0
  },
  losses: {
    type: Number,
    default: 0,
    min: 0
  },
  gamesPlayed: {
    type: Number,
    default: 0,
    min: 0
  },
  currentStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  highestStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  scoreHistory: [scoreHistorySchema],
  // Profile Information
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  lastGamePlayed: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for win rate calculation
userSchema.virtual('winRate').get(function() {
  if (this.gamesPlayed === 0) return 0;
  return Math.round((this.wins / this.gamesPlayed) * 100);
});

// Virtual for loss rate calculation
userSchema.virtual('lossRate').get(function() {
  if (this.gamesPlayed === 0) return 0;
  return Math.round((this.losses / this.gamesPlayed) * 100);
});

// Index for leaderboard queries
userSchema.index({ points: -1 });
userSchema.index({ wins: -1 });
userSchema.index({ highestStreak: -1 });

// Methods
userSchema.methods.addScoreHistory = function(points, gameResult = 'initial', opponent = null) {
  this.scoreHistory.push({
    timestamp: new Date(),
    points: points,
    gameResult: gameResult,
    opponent: opponent
  });
  
  // Keep only last 100 score history entries to prevent document bloat
  if (this.scoreHistory.length > 100) {
    this.scoreHistory = this.scoreHistory.slice(-100);
  }
};

userSchema.methods.processGameWin = function(opponent = null) {
  // Winner gains +5 points
  this.points += 5;
  this.wins += 1;
  this.gamesPlayed += 1;
  this.currentStreak += 1;
  this.lastGamePlayed = new Date();
  
  // Update highest streak if needed
  if (this.currentStreak > this.highestStreak) {
    this.highestStreak = this.currentStreak;
  }
  
  // Add to score history
  this.addScoreHistory(this.points, 'win', opponent);
  
  console.log(`🏆 ${this.username} won! New stats: ${this.points} points, ${this.wins} wins, ${this.currentStreak} streak`);
};

userSchema.methods.processGameLoss = function(opponent = null) {
  // Loser loses -2 points (minimum 0)
  this.points = Math.max(0, this.points - 2);
  this.losses += 1;
  this.gamesPlayed += 1;
  this.currentStreak = 0; // Reset streak on loss
  this.lastGamePlayed = new Date();
  
  // Add to score history
  this.addScoreHistory(this.points, 'loss', opponent);
  
  console.log(`😞 ${this.username} lost! New stats: ${this.points} points, ${this.losses} losses, streak reset`);
};

userSchema.methods.resetStats = function() {
  this.points = 100;
  this.wins = 0;
  this.losses = 0;
  this.gamesPlayed = 0;
  this.currentStreak = 0;
  this.highestStreak = 0;
  this.scoreHistory = [];
  this.lastGamePlayed = null;
  
  // Add initial score to history
  this.addScoreHistory(100, 'initial');
  
  console.log(`🔄 ${this.username} stats reset to default values`);
};

userSchema.methods.getPublicProfile = function() {
  return {
    username: this.username,
    points: this.points,
    wins: this.wins,
    losses: this.losses,
    gamesPlayed: this.gamesPlayed,
    currentStreak: this.currentStreak,
    highestStreak: this.highestStreak,
    winRate: this.winRate,
    lossRate: this.lossRate,
    avatar: this.avatar,
    createdAt: this.createdAt,
    lastGamePlayed: this.lastGamePlayed
  };
};

// Method to get full stats (including score history)
userSchema.methods.getStats = function() {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    points: this.points,
    wins: this.wins,
    losses: this.losses,
    gamesPlayed: this.gamesPlayed,
    currentStreak: this.currentStreak,
    highestStreak: this.highestStreak,
    winRate: this.winRate,
    lossRate: this.lossRate,
    scoreHistory: this.scoreHistory,
    avatar: this.avatar,
    isGuest: this.isGuest,
    isAdmin: this.isAdmin,
    createdAt: this.createdAt,
    lastLogin: this.lastLogin,
    lastGamePlayed: this.lastGamePlayed
  };
};

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update last login timestamp
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return await this.save();
};

// Method to update game stats (legacy compatibility)
userSchema.methods.updateGameStats = async function(won, score) {
  this.gamesPlayed += 1;
  if (won) this.wins += 1;
  this.points += score;
  this.lastGamePlayed = new Date();
  return await this.save();
};

// Method to update AI game statistics with new scoring system
userSchema.methods.updateAIStatsNew = async function(won, scoreChange) {
  console.log('🎯 MongoDB User updateAIStatsNew called with:', { won, scoreChange });
  console.log('Stats before update:', {
    gamesPlayed: this.gamesPlayed,
    wins: this.wins,
    points: this.points
  });
  
  // Both players: gamesPlayed incremented by 1
  this.gamesPlayed += 1;
  
  // Winner: wins incremented by 1, points incremented by 5
  // Loser: points decremented by 2 (but not below 0)
  if (won) {
    this.wins += 1;
    this.points += 5;
  } else {
    // Loser: decrement by 2, but not below 0
    this.points = Math.max(0, this.points - 2);
  }
  
  this.lastGamePlayed = new Date();
  
  console.log('Stats after update:', {
    gamesPlayed: this.gamesPlayed,
    wins: this.wins,
    points: this.points
  });
  
  return await this.save();
};

// Static methods for leaderboards
userSchema.statics.getLeaderboard = async function(limit = 10, sortBy = 'points') {
  const validSortFields = ['points', 'wins', 'highestStreak', 'winRate'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'points';
  
  // Always use aggregation to calculate winRate for all users
  const sortQuery = {};
  sortQuery[sortField] = -1;
  
  // Add secondary sort by points for tie-breaking (except when sorting by points)
  if (sortField !== 'points') {
    sortQuery.points = -1;
  }
  
  return await this.aggregate([
    { $match: { gamesPlayed: { $gt: 0 } } }, // Only users who played games
    {
      $addFields: {
        winRate: {
          $cond: [
            { $eq: ['$gamesPlayed', 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ['$wins', '$gamesPlayed'] }, 100] }, 0] }
          ]
        }
      }
    },
    { $sort: sortQuery },
    { $limit: limit },
    {
      $project: {
        username: 1,
        points: 1,
        wins: 1,
        losses: 1,
        gamesPlayed: 1,
        currentStreak: 1,
        highestStreak: 1,
        winRate: 1,
        avatar: 1
      }
    }
  ]);
};

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    const bcrypt = require('bcryptjs');
    // Hash password with cost of 10
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Initialize score history on first save
userSchema.pre('save', function(next) {
  if (this.isNew && this.scoreHistory.length === 0) {
    this.addScoreHistory(this.points, 'initial');
  }
  next();
});

module.exports = mongoose.model('User', userSchema);