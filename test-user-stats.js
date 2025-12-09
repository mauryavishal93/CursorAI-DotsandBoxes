/**
 * Test Script for User Stats and Recent Games
 * Tests reading user statistics and recent games from the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/backend/models/User');
const Game = require('./src/backend/models/Game');
const ScoringService = require('./src/backend/services/scoringService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mauryavishal93_db_user:j2mFtqt7kKN6B2G0@dotsandboxes.wmzzcle.mongodb.net/dots-and-boxes?authSource=admin';

// Test user ID - can be passed as command line argument or will use first user found
const testUserId = process.argv[2] || null;

let testResults = {
  connection: false,
  userFound: false,
  statsRead: false,
  gamesRead: false,
  errors: []
};

async function connectDatabase() {
  console.log('\n🔍 Connecting to MongoDB...');
  console.log('================================\n');
  
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ Connected to MongoDB successfully!\n');
    testResults.connection = true;
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    testResults.errors.push(`Connection: ${error.message}`);
    return false;
  }
}

async function findTestUser() {
  console.log('👤 Finding Test User...');
  console.log('================================\n');
  
  try {
    let user;
    
    if (testUserId) {
      console.log(`📝 Looking for user with ID: ${testUserId}`);
      
      // Check if it's a UUID or ObjectId
      const isUUID = testUserId.toString().length === 36 && testUserId.includes('-');
      const isValidObjectId = mongoose.Types.ObjectId.isValid(testUserId) && 
                              testUserId.toString().length === 24;
      
      if (isUUID) {
        console.log('⚠️  UUID detected - This user is from in-memory storage');
        console.log('   UUID users don\'t have MongoDB records');
        return null;
      } else if (isValidObjectId) {
        user = await User.findById(testUserId).lean();
      } else {
        // Try to find by username or email
        user = await User.findOne({
          $or: [
            { username: testUserId },
            { email: testUserId }
          ]
        }).lean();
      }
    } else {
      // Get first user with games played
      console.log('📝 No user ID provided, finding first user with games...');
      user = await User.findOne({ gamesPlayed: { $gt: 0 } })
        .sort({ gamesPlayed: -1 })
        .lean();
    }
    
    if (!user) {
      console.log('❌ No user found');
      return null;
    }
    
    console.log('✅ User found:');
    console.log(`   - ID: ${user._id}`);
    console.log(`   - Username: ${user.username}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Points: ${user.points}`);
    console.log(`   - Wins: ${user.wins}`);
    console.log(`   - Losses: ${user.losses}`);
    console.log(`   - Games Played: ${user.gamesPlayed}`);
    console.log(`   - Current Streak: ${user.currentStreak}`);
    console.log(`   - Highest Streak: ${user.highestStreak}\n`);
    
    testResults.userFound = true;
    return user;
  } catch (error) {
    console.error('❌ Error finding user:', error.message);
    testResults.errors.push(`Find User: ${error.message}`);
    return null;
  }
}

async function testUserStats(userId) {
  console.log('📊 Testing User Stats...');
  console.log('================================\n');
  
  try {
    console.log(`📡 Fetching stats for user: ${userId}`);
    
    // Set global flag to ensure MongoDB is used
    global.useInMemoryStorage = false;
    
    const stats = await ScoringService.getUserStats(userId);
    
    if (stats.success) {
      console.log('✅ User stats retrieved successfully!\n');
      console.log('📈 User Statistics:');
      console.log(`   - Username: ${stats.user.username}`);
      console.log(`   - Points: ${stats.user.points}`);
      console.log(`   - Wins: ${stats.user.wins}`);
      console.log(`   - Losses: ${stats.user.losses}`);
      console.log(`   - Games Played: ${stats.user.gamesPlayed}`);
      console.log(`   - Win Rate: ${stats.user.winRate}%`);
      console.log(`   - Loss Rate: ${stats.user.lossRate}%`);
      console.log(`   - Current Streak: ${stats.user.currentStreak}`);
      console.log(`   - Highest Streak: ${stats.user.highestStreak}`);
      console.log(`   - Rank: ${stats.user.rank}`);
      console.log(`   - Avatar: ${stats.user.avatar}`);
      
      if (stats.scoreHistory && stats.scoreHistory.length > 0) {
        console.log(`\n📜 Score History: ${stats.scoreHistory.length} entries`);
        const recentHistory = stats.scoreHistory.slice(-5);
        recentHistory.forEach((entry, index) => {
          console.log(`   ${index + 1}. ${entry.points} points (${entry.gameResult}) - ${new Date(entry.timestamp).toLocaleDateString()}`);
        });
      } else {
        console.log('\n📜 Score History: No entries');
      }
      
      console.log(`\n🎮 Recent Games Count: ${stats.recentGames ? stats.recentGames.length : 0}\n`);
      
      testResults.statsRead = true;
      return stats;
    } else {
      throw new Error('Stats retrieval returned success: false');
    }
  } catch (error) {
    console.error('❌ Error fetching user stats:', error.message);
    testResults.errors.push(`User Stats: ${error.message}`);
    return null;
  }
}

async function testRecentGames(userId) {
  console.log('🎮 Testing Recent Games...');
  console.log('================================\n');
  
  try {
    console.log(`📡 Fetching recent games for user: ${userId}`);
    
    // Set global flag to ensure MongoDB is used
    global.useInMemoryStorage = false;
    
    const gamesResult = await ScoringService.getRecentGames(20, userId);
    
    if (gamesResult.success !== false) {
      console.log(`✅ Recent games retrieved successfully!\n`);
      console.log(`📊 Total Games Found: ${gamesResult.totalGames}`);
      
      if (gamesResult.games && gamesResult.games.length > 0) {
        console.log('\n🎮 Recent Games:');
        gamesResult.games.forEach((game, index) => {
          console.log(`\n   Game ${index + 1}:`);
          console.log(`   - Game ID: ${game.gameId}`);
          console.log(`   - Mode: ${game.gameMode}`);
          console.log(`   - Started: ${new Date(game.startedAt).toLocaleString()}`);
          console.log(`   - Ended: ${new Date(game.endedAt).toLocaleString()}`);
          console.log(`   - Duration: ${game.gameStats?.gameDuration || 'N/A'} seconds`);
          console.log(`   - Total Moves: ${game.gameStats?.totalMoves || 'N/A'}`);
          console.log(`   - Board Size: ${game.gameStats?.boardSize || 'N/A'}`);
          console.log(`   - Lobby Code: ${game.lobbyCode || 'N/A'}`);
          
          if (game.players && game.players.length > 0) {
            console.log(`   - Players:`);
            game.players.forEach((player, pIndex) => {
              const playerInfo = typeof player.userId === 'object' && player.userId.username 
                ? `${player.userId.username} (${player.userId._id})`
                : `Player ${pIndex + 1}`;
              console.log(`     ${pIndex + 1}. ${playerInfo} - Score: ${player.finalScore}, Result: ${player.result}`);
            });
          }
          
          if (game.winner) {
            console.log(`   - Winner: ${game.winner.username || game.winner.userId}`);
          }
        });
      } else {
        console.log('\nℹ️  No recent games found');
        if (gamesResult.message) {
          console.log(`   Message: ${gamesResult.message}`);
        }
      }
      
      console.log('');
      testResults.gamesRead = true;
      return gamesResult;
    } else {
      throw new Error(gamesResult.error || 'Failed to fetch recent games');
    }
  } catch (error) {
    console.error('❌ Error fetching recent games:', error.message);
    testResults.errors.push(`Recent Games: ${error.message}`);
    return null;
  }
}

async function testAllUsers() {
  console.log('\n👥 Testing All Users Summary...');
  console.log('================================\n');
  
  try {
    const users = await User.find({ gamesPlayed: { $gt: 0 } })
      .select('username email points wins losses gamesPlayed currentStreak highestStreak')
      .sort({ gamesPlayed: -1 })
      .limit(10)
      .lean();
    
    console.log(`📊 Found ${users.length} users with games played:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email})`);
      console.log(`   - Points: ${user.points}, Wins: ${user.wins}, Losses: ${user.losses}`);
      console.log(`   - Games: ${user.gamesPlayed}, Streak: ${user.currentStreak}/${user.highestStreak}`);
      console.log(`   - ID: ${user._id}\n`);
    });
    
    return users;
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    testResults.errors.push(`All Users: ${error.message}`);
    return [];
  }
}

async function runAllTests() {
  console.log('🧪 User Stats & Recent Games Test');
  console.log('==================================\n');
  
  try {
    // Connect to database
    const connected = await connectDatabase();
    if (!connected) {
      console.log('❌ Cannot proceed - database connection failed\n');
      printSummary();
      process.exit(1);
    }
    
    // Find test user
    const user = await findTestUser();
    if (!user) {
      console.log('⚠️  No user found for testing. Showing all users instead...\n');
      await testAllUsers();
      printSummary();
      await mongoose.connection.close();
      process.exit(0);
    }
    
    const userId = user._id.toString();
    
    // Test user stats
    await testUserStats(userId);
    
    // Test recent games
    await testRecentGames(userId);
    
    // Show summary of all users
    await testAllUsers();
    
    // Print summary
    printSummary();
    
  } catch (error) {
    console.error('\n❌ Unexpected error during testing:');
    console.error(error);
    testResults.errors.push(`Unexpected: ${error.message}`);
    printSummary();
  } finally {
    // Close connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 Database connection closed\n');
    }
  }
}

function printSummary() {
  console.log('\n📊 Test Summary');
  console.log('================================\n');
  
  console.log('Test Results:');
  console.log(`   ✅ Connection: ${testResults.connection ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ User Found: ${testResults.userFound ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Stats Read: ${testResults.statsRead ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Games Read: ${testResults.gamesRead ? 'PASS' : 'FAIL'}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors Encountered:');
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  const allPassed = testResults.connection && testResults.userFound && 
                    testResults.statsRead && testResults.gamesRead;
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Stats and Games are working correctly!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Please check the errors above');
  }
  console.log('='.repeat(50) + '\n');
  
  console.log('💡 Usage:');
  console.log('   node test-user-stats.js                    # Test with first user found');
  console.log('   node test-user-stats.js <userId>          # Test with specific user ID');
  console.log('   node test-user-stats.js <username>        # Test with username');
  console.log('   node test-user-stats.js <email>           # Test with email\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
