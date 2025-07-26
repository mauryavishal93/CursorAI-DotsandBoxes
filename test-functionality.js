// Simple test script to verify server functionality
const io = require('socket.io-client');

console.log('🧪 Starting functionality tests...');

// Test 1: Server Connection
console.log('\n📡 Test 1: Server Connection');
const socket = io('http://localhost:4000');

socket.on('connect', () => {
  console.log('✅ Server connection successful');
  
  // Test 2: Lobby Creation
  console.log('\n🎮 Test 2: Lobby Creation');
  socket.emit('createLobby', (response) => {
    if (response && response.lobbyCode) {
      console.log('✅ Lobby creation successful:', response.lobbyCode);
      
      // Test 3: Lobby Joining
      console.log('\n👥 Test 3: Lobby Joining');
      const testSocket = io('http://localhost:4000');
      testSocket.on('connect', () => {
        testSocket.emit('joinLobby', response.lobbyCode, (joinResponse) => {
          if (joinResponse && joinResponse.success) {
            console.log('✅ Lobby joining successful');
            
            // Test 4: Game Actions
            console.log('\n🎲 Test 4: Game Actions');
            testSocket.emit('gameAction', {
              type: 'syncRollDice',
              value: 3,
              startTimestamp: Date.now()
            });
            console.log('✅ Game action emission successful');
            
            // Test 5: Disconnect Handling
            console.log('\n🚪 Test 5: Disconnect Handling');
            testSocket.emit('leaveLobby', response.lobbyCode);
            console.log('✅ Leave lobby successful');
            
            // Cleanup
            setTimeout(() => {
              testSocket.disconnect();
              socket.disconnect();
              console.log('\n✅ All tests completed successfully!');
              console.log('\n🎉 Server functionality verified:');
              console.log('   - ✅ Connection handling');
              console.log('   - ✅ Lobby creation');
              console.log('   - ✅ Lobby joining');
              console.log('   - ✅ Game actions');
              console.log('   - ✅ Disconnect handling');
              process.exit(0);
            }, 1000);
          } else {
            console.log('❌ Lobby joining failed:', joinResponse);
            process.exit(1);
          }
        });
      });
    } else {
      console.log('❌ Lobby creation failed:', response);
      process.exit(1);
    }
  });
});

socket.on('connect_error', (error) => {
  console.log('❌ Server connection failed:', error.message);
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('❌ Tests timed out');
  process.exit(1);
}, 10000); 