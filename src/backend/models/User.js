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

// Static methods for leaderboards
userSchema.statics.getLeaderboard = async function(limit = 10, sortBy = 'points') {
  const validSortFields = ['points', 'wins', 'highestStreak', 'winRate'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'points';
  
  let sortQuery = {};
  if (sortField === 'winRate') {
    // For win rate, we need to sort by a calculated field
    return await this.aggregate([
      { $match: { gamesPlayed: { $gt: 0 } } }, // Only users who played games
      {
        $addFields: {
          winRate: {
            $cond: [
              { $eq: ['$gamesPlayed', 0] },
              0,
              { $multiply: [{ $divide: ['$wins', '$gamesPlayed'] }, 100] }
            ]
          }
        }
      },
      { $sort: { winRate: -1, points: -1 } },
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
  } else {
    sortQuery[sortField] = -1;
    return await this.find({ gamesPlayed: { $gt: 0 } })
      .select('username points wins losses gamesPlayed currentStreak highestStreak avatar')
      .sort(sortQuery)
      .limit(limit)
      .lean();
  }
};

// Initialize score history on first save
userSchema.pre('save', function(next) {
  if (this.isNew && this.scoreHistory.length === 0) {
    this.addScoreHistory(this.points, 'initial');
  }
  next();
});

module.exports = mongoose.model('User', userSchema);