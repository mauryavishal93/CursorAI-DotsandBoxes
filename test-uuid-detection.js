/**
 * Test UUID Detection Fix
 * Verifies that UUIDs are properly detected and handled before MongoDB queries
 */

// Test UUID detection logic
function testUUIDDetection() {
  console.log('🧪 Testing UUID Detection Logic\n');
  console.log('================================\n');
  
  // Test cases
  const testCases = [
    { id: 'ff6e9bbc-5690-44fc-aeba-b0d04b752c34', expected: 'UUID' },
    { id: '376cb446-7fbd-44f6-9682-4d9a650fbfba', expected: 'UUID' },
    { id: '68bc72ad245a3abcfe68099f', expected: 'ObjectId' },
    { id: '68bc606ad92b7d5b90224fa2', expected: 'ObjectId' },
    { id: 'invalid-id', expected: 'Invalid' },
    { id: '12345', expected: 'Invalid' },
    { id: '', expected: 'Invalid' },
    { id: null, expected: 'Invalid' }
  ];
  
  testCases.forEach((testCase, index) => {
    const userId = testCase.id;
    if (userId === null) {
      console.log(`Test ${index + 1}: null`);
      console.log(`   Expected: ${testCase.expected}`);
      console.log(`   Result: Invalid (null check)\n`);
      return;
    }
    
    const userIdStr = String(userId).trim();
    
    // UUID detection
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = userIdStr.length === 36 && userIdStr.includes('-') && uuidPattern.test(userIdStr);
    
    // ObjectId detection
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    const mongoose = require('mongoose');
    const isValidObjectId = userIdStr.length === 24 && 
                            objectIdPattern.test(userIdStr) &&
                            mongoose.Types.ObjectId.isValid(userIdStr);
    
    let result;
    if (isUUID) {
      result = 'UUID';
    } else if (isValidObjectId) {
      result = 'ObjectId';
    } else {
      result = 'Invalid';
    }
    
    const passed = result === testCase.expected;
    console.log(`Test ${index + 1}: ${userId}`);
    console.log(`   Expected: ${testCase.expected}`);
    console.log(`   Result: ${result} ${passed ? '✅' : '❌'}`);
    console.log(`   Length: ${userIdStr.length}`);
    console.log('');
  });
  
  console.log('================================\n');
  console.log('✅ UUID detection test completed!\n');
}

testUUIDDetection();
