const User = require('../models/User');
const Game = require('../models/Game');

// Dynamic user model selection based on storage type
function getUserModel() {
  if (global.useInMemoryStorage) {
    return require('../models/InMemoryUser');
  } else {
    return require('../models/User');
  }
}

class ScoringService {
  /**
   * Process the result of an online multiplayer game
   * @param {Object} gameResult - Game result data
   * @param {string} gameResult.gameId - Unique game identifier
   * @param {string} gameResult.lobbyCode - Lobby code
   * @param {Object} gameResult.winner - Winner data {username, userId, score}
   * @param {Object} gameResult.loser - Loser data {username, userId, score}
   * @param {Object} gameResult.gameStats - Game statistics
   * @returns {Object} - Updated user profiles and game record
   */
  static async processGameResult(gameResult) {
    const User = getUserModel();
    const session = User.startSession ? await User.startSession() : null; // Conditional session for MongoDB
    
    try {
      let resultData = null;
      const transactionWrapper = session ? 
        (callback) => session.withTransaction(callback) : 
        (callback) => callback(); // Direct execution for in-memory
        
      await transactionWrapper(async () => {
        const { gameId, lobbyCode, winner, loser, gameStats = {} } = gameResult;
        const winnerId = winner.userId;
        const loserId = loser.userId;
        
        console.log(`🎮 Processing game result for game ${gameId}:`, {
          winner: winner.username,
          loser: loser.username,
          winnerScore: winner.score,
          loserScore: loser.score
        });
        
        // Find both users
        const findUserOptions = session ? { session } : {};
        const [winnerUser, loserUser] = await Promise.all([
          session ? User.findById(winnerId).session(session) : User.findById(winnerId),
          session ? User.findById(loserId).session(session) : User.findById(loserId)
        ]);
        
        if (!winnerUser || !loserUser) {
          throw new Error('One or both players not found in database');
        }
        
        // Store original points for change calculation
        const winnerOriginalPoints = winnerUser.points;
        const loserOriginalPoints = loserUser.points;
        
        // Process winner
        winnerUser.processGameWin(loser.username);
        
        // Process loser
        loserUser.processGameLoss(winner.username);
        
        // Save both users
        console.log('💾 Saving user stats...');
        if (session) {
          await Promise.all([
            winnerUser.save({ session }),
            loserUser.save({ session })
          ]);
          console.log('✅ User stats saved successfully to MongoDB');
        } else {
          await Promise.all([
            winnerUser.save(),
            loserUser.save()
          ]);
          console.log('✅ User stats saved successfully to in-memory storage');
        }
        
        // Create game record only for MongoDB storage
        let gameRecord = null;
        if (!global.useInMemoryStorage) {
          gameRecord = new Game({
            gameId: gameId,
            gameMode: 'onlineMultiplayer',
            players: [
              {
                username: winner.username,
                userId: winner.userId,
                finalScore: winner.score,
                pointsChange: winnerUser.points - winnerOriginalPoints,
                result: 'win'
              },
              {
                username: loser.username,
                userId: loser.userId,
                finalScore: loser.score,
                pointsChange: loserUser.points - loserOriginalPoints,
                result: 'loss'
              }
            ],
            winner: {
              username: winner.username,
              userId: winner.userId
            },
            gameStats: {
              totalMoves: gameStats.totalMoves || 0,
              gameDuration: gameStats.gameDuration || 0,
              boardSize: gameStats.boardSize || '4x4'
            },
            startedAt: gameStats.startedAt || new Date(Date.now() - 300000), // Default to 5 minutes ago
            endedAt: new Date(),
            lobbyCode: lobbyCode
          });
          
          console.log('💾 Saving game record to MongoDB...');
          if (session) {
            await gameRecord.save({ session });
          } else {
            await gameRecord.save();
          }
          console.log('✅ Game record saved successfully to MongoDB');
        } else {
          console.log('ℹ️ In-memory storage mode - skipping game record creation');
        }
        
        console.log(`✅ Game result processed successfully:`, {
          winner: `${winnerUser.username} (${winnerUser.points} points, ${winnerUser.currentStreak} streak)`,
          loser: `${loserUser.username} (${loserUser.points} points, streak reset)`,
          gameId: gameId
        });
        
        resultData = {
          success: true,
          winner: winnerUser.getPublicProfile ? winnerUser.getPublicProfile() : winnerUser,
          loser: loserUser.getPublicProfile ? loserUser.getPublicProfile() : loserUser,
          gameRecord: gameRecord ? gameRecord.toObject() : null,
          message: 'Game result processed successfully'
        };
      });
      
      // Return the result captured from transaction
      return resultData || { success: true, message: 'Game result processed successfully' };
      
    } catch (error) {
      console.error('❌ Error processing game result:', error);
      throw error;
    } finally {
      if (session && session.endSession) {
        await session.endSession();
      }
    }
  }
  
  /**
   * Get leaderboard with various sorting options
   * @param {number} limit - Number of users to return
   * @param {string} sortBy - Sort field (points, wins, highestStreak, winRate)
   * @returns {Array} - Leaderboard data
   */
  static async getLeaderboard(limit = 10, sortBy = 'points') {
    try {
      console.log(`📊 Fetching leaderboard (${sortBy}, limit: ${limit})`);
      const User = getUserModel();
      const leaderboard = await User.getLeaderboard(limit, sortBy);
      
      // Add rank to each user and log winRate for debugging
      const rankedLeaderboard = leaderboard.map((user, index) => {
        const userData = {
          ...user,
          rank: index + 1
        };
        
        console.log(`📊 User ${userData.username}: winRate = ${userData.winRate}, wins = ${userData.wins}, gamesPlayed = ${userData.gamesPlayed}`);
        return userData;
      });
      
      return {
        success: true,
        leaderboard: rankedLeaderboard,
        sortBy: sortBy,
        totalUsers: rankedLeaderboard.length
      };
    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error);
      throw error;
    }
  }
  
  /**
   * Get detailed user statistics
   * @param {string} userId - User ID
   * @returns {Object} - User statistics and recent games
   */
  static async getUserStats(userId) {
    try {
      console.log(`📈 Fetching user stats for userId: ${userId} (type: ${typeof userId})`);
      const User = getUserModel();
      
      let user, recentGames;
      if (global.useInMemoryStorage) {
        console.log('🔍 Using in-memory storage for user lookup');
        user = await User.findById(userId);
      } else {
        console.log('🔍 Using MongoDB for user lookup');
        // MongoDB findById can handle string IDs automatically
        [user, recentGames] = await Promise.all([
          User.findById(userId).lean(),
          Game.getPlayerStats(userId, 10)
        ]);
      }
      
      console.log(`🔍 User found: ${!!user}`, user ? { 
        id: user._id || user.id, 
        username: user.username,
        points: user.points,
        wins: user.wins,
        losses: user.losses 
      } : 'No user data');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Calculate additional stats
      const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;
      const lossRate = user.gamesPlayed > 0 ? Math.round((user.losses / user.gamesPlayed) * 100) : 0;
      
      // Get user's rank
      let rank = 1;
      if (global.useInMemoryStorage) {
        const allUsers = User.getAllUsers();
        const usersWithHigherPoints = allUsers.filter(u => 
          u.totalScore > (user.totalScore || 0) && u.gamesPlayed > 0
        );
        rank = usersWithHigherPoints.length + 1;
      } else {
        const usersWithHigherPoints = await User.countDocuments({ 
          points: { $gt: user.points },
          gamesPlayed: { $gt: 0 }
        });
        rank = usersWithHigherPoints + 1;
      }
      
      // Format user data consistently
      let userData;
      if (global.useInMemoryStorage) {
        userData = {
          _id: user._id || user.id,
          username: user.username,
          points: user.totalScore || 0,
          wins: user.gamesWon || 0,
          losses: (user.gamesPlayed || 0) - (user.gamesWon || 0),
          gamesPlayed: user.gamesPlayed || 0,
          currentStreak: user.currentStreak || 0,
          highestStreak: user.highestStreak || 0,
          avatar: user.avatar || 'default-1',
          winRate,
          lossRate,
          rank
        };
      } else {
        // MongoDB user - ensure consistent field mapping
        console.log('📊 MongoDB user stats raw data:', {
          points: user.points,
          wins: user.wins,
          losses: user.losses,
          gamesPlayed: user.gamesPlayed,
          currentStreak: user.currentStreak,
          highestStreak: user.highestStreak
        });
        
        userData = {
          _id: user._id,
          username: user.username,
          points: user.points || 0,
          wins: user.wins || 0,
          losses: user.losses || 0,
          gamesPlayed: user.gamesPlayed || 0,
          currentStreak: user.currentStreak || 0,
          highestStreak: user.highestStreak || 0,
          avatar: user.avatar || 'default-1',
          winRate,
          lossRate,
          rank,
          scoreHistory: user.scoreHistory || []
        };
        
        console.log('📊 Formatted user stats data:', userData);
      }
      
      return {
        success: true,
        user: userData,
        recentGames,
        scoreHistory: userData.scoreHistory || []
      };
    } catch (error) {
      console.error('❌ Error fetching user stats:', error);
      throw error;
    }
  }
  
  /**
   * Reset user statistics (admin only)
   * @param {string} userId - User ID to reset
   * @param {string} adminId - Admin user ID
   * @returns {Object} - Reset result
   */
  static async resetUserStats(userId, adminId) {
    try {
      console.log(`🔄 Admin ${adminId} requesting stats reset for user ${userId}`);
      
      const User = getUserModel();
      
      // Verify admin permissions
      const admin = await User.findById(adminId);
      if (!admin || !admin.isAdmin) {
        throw new Error('Unauthorized: Admin privileges required');
      }
      
      // Find and reset user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const originalStats = {
        points: user.points,
        wins: user.wins,
        losses: user.losses,
        gamesPlayed: user.gamesPlayed
      };
      
      user.resetStats();
      await user.save();
      
      console.log(`✅ Stats reset for ${user.username}:`, {
        before: originalStats,
        after: { points: 100, wins: 0, losses: 0, gamesPlayed: 0 }
      });
      
      return {
        success: true,
        message: `Stats reset successfully for ${user.username}`,
        user: user.getPublicProfile()
      };
    } catch (error) {
      console.error('❌ Error resetting user stats:', error);
      throw error;
    }
  }
  
  /**
   * Get recent games for a specific user or across the platform
   * @param {number} limit - Number of games to return
   * @param {string} userId - User ID to filter games for (optional)
   * @returns {Array} - Recent games data
   */
  static async getRecentGames(limit = 20, userId = null) {
    try {
      if (userId) {
        console.log(`🎯 Fetching recent online games for user ${userId} (limit: ${limit})`);
        
        if (global.useInMemoryStorage) {
          // For in-memory storage, we don't have a Game model, so return empty array
          return {
            success: true,
            games: [],
            totalGames: 0,
            message: 'Game history not available in demo mode'
          };
        } else {
          // For MongoDB, get user's recent online multiplayer games
          const recentGames = await Game.getUserRecentGames(userId, limit);
          
          // Debug: Log game data to verify startedAt and endedAt are present
          recentGames.forEach(game => {
            console.log(`🎮 Game ${game.gameId}: startedAt=${game.startedAt}, endedAt=${game.endedAt}, duration=${game.gameStats?.gameDuration}s`);
          });
          
          return {
            success: true,
            games: recentGames,
            totalGames: recentGames.length
          };
        }
      } else {
        console.log(`🎯 Fetching recent games across platform (limit: ${limit})`);
        const recentGames = await Game.getRecentGames(limit);
        
        return {
          success: true,
          games: recentGames,
          totalGames: recentGames.length
        };
      }
    } catch (error) {
      console.error('❌ Error fetching recent games:', error);
      throw error;
    }
  }
  
  /**
   * Get platform-wide statistics
   * @returns {Object} - Platform statistics
   */
  static async getPlatformStats() {
    try {
      console.log('📊 Fetching platform statistics');
      const User = getUserModel();
      
      let totalUsers, totalGames, totalActiveUsers, avgPointsPerUser, topStreakUser;
      
      if (global.useInMemoryStorage) {
        const allUsers = User.getAllUsers();
        totalUsers = allUsers.length;
        totalGames = 0; // In-memory doesn't track games separately
        totalActiveUsers = allUsers.filter(u => u.gamesPlayed > 0).length;
        
        const activeUsers = allUsers.filter(u => u.gamesPlayed > 0);
        const totalPoints = activeUsers.reduce((sum, u) => sum + (u.totalScore || 0), 0);
        avgPointsPerUser = [{ avgPoints: activeUsers.length > 0 ? totalPoints / activeUsers.length : 100 }];
        
        topStreakUser = allUsers
          .filter(u => u.highestStreak > 0)
          .sort((a, b) => (b.highestStreak || 0) - (a.highestStreak || 0))[0] || null;
      } else {
        [
          totalUsers,
          totalGames,
          totalActiveUsers,
          avgPointsPerUser,
          topStreakUser
        ] = await Promise.all([
          User.countDocuments(),
          Game.countDocuments({ gameMode: 'onlineMultiplayer' }),
          User.countDocuments({ gamesPlayed: { $gt: 0 } }),
          User.aggregate([
            { $group: { _id: null, avgPoints: { $avg: '$points' } } }
          ]),
          User.findOne().sort({ highestStreak: -1 }).select('username highestStreak').lean()
        ]);
      }
      
      return {
        success: true,
        stats: {
          totalUsers,
          totalGames,
          totalActiveUsers,
          averagePoints: Math.round(avgPointsPerUser[0]?.avgPoints || 100),
          topStreak: topStreakUser ? {
            username: topStreakUser.username,
            streak: topStreakUser.highestStreak
          } : null
        }
      };
    } catch (error) {
      console.error('❌ Error fetching platform stats:', error);
      throw error;
    }
  }
}

module.exports = ScoringService;
