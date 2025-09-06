const User = require('../models/User');
const Game = require('../models/Game');

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
    const session = await User.startSession();
    
    try {
      await session.withTransaction(async () => {
        const { gameId, lobbyCode, winner, loser, gameStats = {} } = gameResult;
        
        console.log(`🎮 Processing game result for game ${gameId}:`, {
          winner: winner.username,
          loser: loser.username,
          winnerScore: winner.score,
          loserScore: loser.score
        });
        
        // Find both users
        const [winnerUser, loserUser] = await Promise.all([
          User.findById(winner.userId).session(session),
          User.findById(loser.userId).session(session)
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
        console.log('💾 Saving user stats to database...');
        await Promise.all([
          winnerUser.save({ session }),
          loserUser.save({ session })
        ]);
        console.log('✅ User stats saved successfully to MongoDB');
        
        // Create game record
        const gameRecord = new Game({
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
        
        console.log('💾 Saving game record to database...');
        await gameRecord.save({ session });
        console.log('✅ Game record saved successfully to MongoDB');
        
        console.log(`✅ Game result processed successfully:`, {
          winner: `${winnerUser.username} (${winnerUser.points} points, ${winnerUser.currentStreak} streak)`,
          loser: `${loserUser.username} (${loserUser.points} points, streak reset)`,
          gameId: gameId
        });
        
        return {
          success: true,
          winner: winnerUser.getPublicProfile(),
          loser: loserUser.getPublicProfile(),
          gameRecord: gameRecord.toObject()
        };
      });
      
      // Return the result (transaction was successful)
      const [updatedWinner, updatedLoser] = await Promise.all([
        User.findById(winner.userId).lean(),
        User.findById(loser.userId).lean()
      ]);
      
      return {
        success: true,
        winner: updatedWinner,
        loser: updatedLoser,
        message: 'Game result processed successfully'
      };
      
    } catch (error) {
      console.error('❌ Error processing game result:', error);
      throw error;
    } finally {
      await session.endSession();
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
      const leaderboard = await User.getLeaderboard(limit, sortBy);
      
      // Add rank to each user
      const rankedLeaderboard = leaderboard.map((user, index) => ({
        ...user,
        rank: index + 1
      }));
      
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
      console.log(`📈 Fetching user stats for ${userId}`);
      
      const [user, recentGames] = await Promise.all([
        User.findById(userId).lean(),
        Game.getPlayerStats(userId, 10)
      ]);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Calculate additional stats
      const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;
      const lossRate = user.gamesPlayed > 0 ? Math.round((user.losses / user.gamesPlayed) * 100) : 0;
      
      // Get user's rank
      const usersWithHigherPoints = await User.countDocuments({ 
        points: { $gt: user.points },
        gamesPlayed: { $gt: 0 }
      });
      const rank = usersWithHigherPoints + 1;
      
      return {
        success: true,
        user: {
          ...user,
          winRate,
          lossRate,
          rank
        },
        recentGames,
        scoreHistory: user.scoreHistory || []
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
   * Get recent games across the platform
   * @param {number} limit - Number of games to return
   * @returns {Array} - Recent games data
   */
  static async getRecentGames(limit = 20) {
    try {
      console.log(`🎯 Fetching recent games (limit: ${limit})`);
      const recentGames = await Game.getRecentGames(limit);
      
      return {
        success: true,
        games: recentGames,
        totalGames: recentGames.length
      };
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
      
      const [
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
