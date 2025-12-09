/**
 * Database Connection Test Script
 * Tests MongoDB connection, read, and write operations
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/backend/models/User');
const Game = require('./src/backend/models/Game');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mauryavishal93_db_user:j2mFtqt7kKN6B2G0@dotsandboxes.wmzzcle.mongodb.net/dots-and-boxes?authSource=admin';

let testResults = {
  connection: false,
  write: false,
  read: false,
  existingData: false,
  collections: [],
  userCount: 0,
  gameCount: 0,
  errors: []
};

async function testConnection() {
  console.log('\n🔍 Testing MongoDB Connection...');
  console.log('================================\n');
  
  try {
    console.log(`📍 Connecting to: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ Connection successful!\n');
    testResults.connection = true;
    
    // Check connection state
    console.log('📊 Connection State:');
    console.log(`   - Ready State: ${mongoose.connection.readyState} (1=connected)`);
    console.log(`   - Database Name: ${mongoose.connection.name}`);
    console.log(`   - Host: ${mongoose.connection.host}`);
    console.log(`   - Port: ${mongoose.connection.port}\n`);
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error(`   Error: ${error.message}\n`);
    testResults.errors.push(`Connection: ${error.message}`);
    return false;
  }
}

async function testCollections() {
  console.log('📋 Checking Collections...');
  console.log('================================\n');
  
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    testResults.collections = collections.map(c => c.name);
    
    console.log(`✅ Found ${collections.length} collection(s):`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to list collections');
    console.error(`   Error: ${error.message}\n`);
    testResults.errors.push(`Collections: ${error.message}`);
    return false;
  }
}

async function testReadExistingData() {
  console.log('📖 Testing Read Operations (Existing Data)...');
  console.log('================================\n');
  
  try {
    // Count existing users
    const userCount = await User.countDocuments();
    testResults.userCount = userCount;
    console.log(`✅ Users collection: ${userCount} document(s) found`);
    
    // Count existing games
    const gameCount = await Game.countDocuments();
    testResults.gameCount = gameCount;
    console.log(`✅ Games collection: ${gameCount} document(s) found\n`);
    
    // Try to fetch a few users
    if (userCount > 0) {
      console.log('📝 Sample Users:');
      const sampleUsers = await User.find().limit(5).select('username email points wins gamesPlayed');
      sampleUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.username} (${user.email}) - Points: ${user.points}, Wins: ${user.wins}, Games: ${user.gamesPlayed}`);
      });
      console.log('');
      testResults.existingData = true;
    } else {
      console.log('ℹ️  No existing users found (this is OK for a new database)\n');
    }
    
    testResults.read = true;
    return true;
  } catch (error) {
    console.error('❌ Read operation failed!');
    console.error(`   Error: ${error.message}\n`);
    testResults.errors.push(`Read: ${error.message}`);
    return false;
  }
}

async function testWrite() {
  console.log('✍️  Testing Write Operations...');
  console.log('================================\n');
  
  try {
    // Create a test user (username max 20 chars)
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits
    const testUsername = `test_${timestamp}`; // Max 13 chars
    const testEmail = `test_${timestamp}@test.com`;
    
    console.log(`📝 Creating test user: ${testUsername}`);
    
    const testUser = new User({
      username: testUsername,
      email: testEmail,
      password: 'testpassword123',
      isGuest: true
    });
    
    await testUser.save();
    console.log(`✅ Test user created successfully!`);
    console.log(`   - ID: ${testUser._id}`);
    console.log(`   - Username: ${testUser.username}`);
    console.log(`   - Email: ${testUser.email}\n`);
    
    // Test reading the user we just created
    console.log('🔍 Verifying write by reading back...');
    const retrievedUser = await User.findById(testUser._id);
    
    if (retrievedUser && retrievedUser.username === testUsername) {
      console.log('✅ Write verification successful!');
      console.log(`   - Retrieved username: ${retrievedUser.username}\n`);
    } else {
      throw new Error('Failed to retrieve the user we just created');
    }
    
    // Clean up - delete test user
    console.log('🧹 Cleaning up test user...');
    await User.deleteOne({ _id: testUser._id });
    console.log('✅ Test user deleted\n');
    
    testResults.write = true;
    return true;
  } catch (error) {
    console.error('❌ Write operation failed!');
    console.error(`   Error: ${error.message}\n`);
    
    // Check if it's a duplicate key error (user already exists)
    if (error.code === 11000) {
      console.log('ℹ️  Note: This might be a duplicate key error. The database is working but the test user already exists.\n');
    }
    
    testResults.errors.push(`Write: ${error.message}`);
    return false;
  }
}

async function testUpdate() {
  console.log('🔄 Testing Update Operations...');
  console.log('================================\n');
  
  try {
    // Find a user to update (or create one)
    let testUser = await User.findOne({ username: /^test_user_/ });
    
    if (!testUser) {
      // Create a temporary user for testing (username max 20 chars)
      const timestamp = Date.now().toString().slice(-8); // Last 8 digits
      testUser = new User({
        username: `test_${timestamp}`, // Max 13 chars
        email: `test_${timestamp}@test.com`,
        password: 'testpassword123',
        isGuest: true
      });
      await testUser.save();
      console.log('📝 Created temporary user for update test');
    }
    
    const originalPoints = testUser.points;
    console.log(`📝 Updating user points from ${originalPoints} to ${originalPoints + 10}...`);
    
    testUser.points += 10;
    await testUser.save();
    
    // Verify update
    const updatedUser = await User.findById(testUser._id);
    if (updatedUser.points === originalPoints + 10) {
      console.log('✅ Update operation successful!');
      console.log(`   - Points updated: ${originalPoints} → ${updatedUser.points}\n`);
      
      // Restore original points
      updatedUser.points = originalPoints;
      await updatedUser.save();
      
      // Clean up if it was a test user
      if (testUser.username.startsWith('test_user_')) {
        await User.deleteOne({ _id: testUser._id });
        console.log('🧹 Cleaned up test user\n');
      }
      
      return true;
    } else {
      throw new Error('Update verification failed');
    }
  } catch (error) {
    console.error('❌ Update operation failed!');
    console.error(`   Error: ${error.message}\n`);
    testResults.errors.push(`Update: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 MongoDB Database Connection & Operations Test');
  console.log('==================================================\n');
  
  try {
    // Test 1: Connection
    const connected = await testConnection();
    if (!connected) {
      console.log('❌ Cannot proceed with other tests - connection failed\n');
      printSummary();
      process.exit(1);
    }
    
    // Test 2: Collections
    await testCollections();
    
    // Test 3: Read existing data
    await testReadExistingData();
    
    // Test 4: Write
    await testWrite();
    
    // Test 5: Update
    await testUpdate();
    
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
      console.log('🔌 Database connection closed\n');
    }
  }
}

function printSummary() {
  console.log('\n📊 Test Summary');
  console.log('================================\n');
  
  console.log('Test Results:');
  console.log(`   ✅ Connection: ${testResults.connection ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Write: ${testResults.write ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Read: ${testResults.read ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Existing Data: ${testResults.existingData ? 'FOUND' : 'NONE'}`);
  
  console.log('\nDatabase Statistics:');
  console.log(`   📋 Collections: ${testResults.collections.length}`);
  if (testResults.collections.length > 0) {
    testResults.collections.forEach(col => console.log(`      - ${col}`));
  }
  console.log(`   👥 Users: ${testResults.userCount}`);
  console.log(`   🎮 Games: ${testResults.gameCount}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors Encountered:');
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  const allPassed = testResults.connection && testResults.write && testResults.read;
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Database is working correctly!');
  } else {
    console.log('❌ SOME TESTS FAILED - Please check the errors above');
  }
  console.log('='.repeat(50) + '\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
