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
  // Early return for null/undefined
  if (!userId) {
    console.log(`⚠️  User ID is null or undefined. Returning empty stats.`);
    return [];
  }
  
  // Check if userId is a UUID (from in-memory storage)
  const userIdStr = String(userId).trim();
  
  // UUID detection: exactly 36 chars, contains hyphens, matches UUID pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUUID = userIdStr.length === 36 && userIdStr.includes('-') && uuidPattern.test(userIdStr);
  
  // If userId is a UUID (from in-memory storage), return empty array immediately
  if (isUUID) {
    console.log(`⚠️  User ID "${userIdStr}" is a UUID (from in-memory storage). Returning empty stats.`);
    return [];
  }
  
  // Check if userId is a valid MongoDB ObjectId (exactly 24 hex characters)
  const mongoose = require('mongoose');
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  const isValidObjectId = userIdStr.length === 24 && 
                          objectIdPattern.test(userIdStr) &&
                          mongoose.Types.ObjectId.isValid(userIdStr);
  
  if (!isValidObjectId) {
    console.log(`⚠️  User ID "${userIdStr}" is not a valid MongoDB ObjectId (length: ${userIdStr.length}). Returning empty stats.`);
    return [];
  }
  
  try {
    // Convert to ObjectId - wrap in try-catch for safety
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(userIdStr);
    } catch (castError) {
      console.log(`⚠️  User ID "${userIdStr}" cannot be converted to ObjectId: ${castError.message}. Returning empty stats.`);
      return [];
    }
    
    return await this.find({ 'players.userId': objectId })
      .sort({ endedAt: -1 })
      .limit(limit)
      .populate('players.userId', 'username avatar')
      .lean();
  } catch (error) {
    // Catch any casting errors or query errors
    if (error.name === 'CastError' || error.message.includes('ObjectId') || error.message.includes('Cast to ObjectId')) {
      console.log(`⚠️  User ID "${userIdStr}" caused CastError. Returning empty stats.`);
      return [];
    }
    console.error(`❌ Error querying player stats for user ${userIdStr}:`, error.message);
    return [];
  }
};

gameSchema.statics.getRecentGames = async function(limit = 20) {
  return await this.find({ gameMode: 'onlineMultiplayer' })
    .sort({ endedAt: -1 })
    .limit(limit)
    .populate('players.userId', 'username avatar')
    .lean();
};

gameSchema.statics.getUserRecentGames = async function(userId, limit = 20) {
  // Early return for null/undefined
  if (!userId) {
    console.log(`⚠️  User ID is null or undefined. Returning empty games list.`);
    return [];
  }
  
  // Check if userId is a UUID (from in-memory storage)
  // UUIDs are 36 characters with hyphens (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const userIdStr = String(userId).trim();
  
  // UUID detection: exactly 36 chars, contains hyphens, matches UUID pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUUID = userIdStr.length === 36 && userIdStr.includes('-') && uuidPattern.test(userIdStr);
  
  // If userId is a UUID (from in-memory storage), return empty array immediately
  // UUID users don't have games stored in MongoDB
  if (isUUID) {
    console.log(`⚠️  User ID "${userIdStr}" is a UUID (from in-memory storage). Returning empty games list.`);
    return [];
  }
  
  // Check if userId is a valid MongoDB ObjectId (exactly 24 hex characters)
  const mongoose = require('mongoose');
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  const isValidObjectId = userIdStr.length === 24 && 
                          objectIdPattern.test(userIdStr) &&
                          mongoose.Types.ObjectId.isValid(userIdStr);
  
  if (!isValidObjectId) {
    console.log(`⚠️  User ID "${userIdStr}" is not a valid MongoDB ObjectId (length: ${userIdStr.length}). Returning empty games list.`);
    return [];
  }
  
  try {
    // Convert to ObjectId to ensure proper type - wrap in try-catch for safety
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(userIdStr);
    } catch (castError) {
      console.log(`⚠️  User ID "${userIdStr}" cannot be converted to ObjectId: ${castError.message}. Returning empty games list.`);
      return [];
    }
    
    return await this.find({ 
      'players.userId': objectId,
      gameMode: 'onlineMultiplayer' 
    })
      .sort({ endedAt: -1 })
      .limit(limit)
      .populate('players.userId', 'username avatar')
      .lean();
  } catch (error) {
    // Catch any casting errors or query errors
    if (error.name === 'CastError' || error.message.includes('ObjectId') || error.message.includes('Cast to ObjectId')) {
      console.log(`⚠️  User ID "${userIdStr}" caused CastError. Returning empty games list.`);
      return [];
    }
    console.error(`❌ Error querying games for user ${userIdStr}:`, error.message);
    return [];
  }
};

module.exports = mongoose.model('Game', gameSchema);
