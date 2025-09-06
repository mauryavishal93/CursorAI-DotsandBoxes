const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true
  },
  gameMode: {
    type: String,
    required: true,
    enum: ['singlePlayer', 'twoPlayers', 'onlineMultiplayer']
  },
  players: [{
    username: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    finalScore: {
      type: Number,
      required: true,
      min: 0
    },
    pointsChange: {
      type: Number,
      required: true
    },
    result: {
      type: String,
      required: true,
      enum: ['win', 'loss', 'tie']
    }
  }],
  winner: {
    username: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  gameStats: {
    totalMoves: {
      type: Number,
      default: 0
    },
    gameDuration: {
      type: Number, // in seconds
      default: 0
    },
    boardSize: {
      type: String,
      default: '4x4'
    }
  },
  startedAt: {
    type: Date,
    required: true
  },
  endedAt: {
    type: Date,
    required: true
  },
  lobbyCode: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for queries
gameSchema.index({ 'players.userId': 1 });
gameSchema.index({ endedAt: -1 });
gameSchema.index({ gameMode: 1 });

// Static methods
gameSchema.statics.getPlayerStats = async function(userId, limit = 10) {
  return await this.find({ 'players.userId': userId })
    .sort({ endedAt: -1 })
    .limit(limit)
    .populate('players.userId', 'username avatar')
    .lean();
};

gameSchema.statics.getRecentGames = async function(limit = 20) {
  return await this.find({ gameMode: 'onlineMultiplayer' })
    .sort({ endedAt: -1 })
    .limit(limit)
    .populate('players.userId', 'username avatar')
    .lean();
};

module.exports = mongoose.model('Game', gameSchema);
