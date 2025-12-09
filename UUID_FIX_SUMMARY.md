# UUID/ObjectId Compatibility Fix

## Problem

Users created in in-memory storage use UUIDs (36 characters with hyphens, e.g., `376cb446-7fbd-44f6-9682-4d9a650fbfba`), while MongoDB uses ObjectIds (24 hex characters). When UUID users tried to fetch their stats or recent games, the code attempted to query MongoDB with UUIDs, causing `CastError: Cast to ObjectId failed` errors.

## Error Example

```
CastError: Cast to ObjectId failed for value "376cb446-7fbd-44f6-9682-4d9a650fbfba" (type string) at path "userId" for model "Game"
```

## Solution

Added ID format detection and proper handling for both UUID and ObjectId formats:

### 1. Game Model (`src/backend/models/Game.js`)

**Updated Methods:**
- `getUserRecentGames()` - Now checks if userId is a valid ObjectId before querying
- `getPlayerStats()` - Same validation added

**Changes:**
- Detects UUID format (36 chars with hyphens) vs ObjectId (24 hex chars)
- Returns empty array for UUID users (they don't have MongoDB games)
- Properly converts valid ObjectIds before querying
- Added error handling to prevent crashes

### 2. Scoring Service (`src/backend/services/scoringService.js`)

**Updated Methods:**
- `getUserStats()` - Detects UUID format and uses appropriate storage
- `getRecentGames()` - Handles UUID users gracefully

**Changes:**
- UUID detection before database queries
- UUID users use in-memory storage lookup
- Returns empty games list for UUID users with appropriate message
- Better error handling (returns empty results instead of throwing)

## How It Works

### ID Format Detection

```javascript
const mongoose = require('mongoose');
const isUUID = userId.toString().length === 36 && userId.includes('-');
const isValidObjectId = mongoose.Types.ObjectId.isValid(userId) && 
                        userId.toString().length === 24;
```

### Flow for getUserStats

1. Check if userId is UUID → Use in-memory storage
2. Check if userId is valid ObjectId → Use MongoDB
3. Invalid format → Return error

### Flow for getRecentGames

1. UUID user → Return empty array with message
2. Valid ObjectId → Query MongoDB
3. Invalid format → Return empty array

## Testing

To verify the fix:

1. **UUID User (Guest/In-Memory)**:
   - Should be able to view their stats
   - Recent games will show empty (expected)
   - No errors in console

2. **MongoDB User (Registered)**:
   - Should see their stats
   - Should see their recent games
   - No errors in console

## Files Modified

1. `src/backend/models/Game.js`
   - `getUserRecentGames()` method
   - `getPlayerStats()` method

2. `src/backend/services/scoringService.js`
   - `getUserStats()` method
   - `getRecentGames()` method

## Expected Behavior

### UUID Users (In-Memory/Guest)
- ✅ Can view their profile stats
- ✅ Recent games shows empty list (no error)
- ✅ Message: "Game history not available for guest/in-memory users"

### MongoDB Users (Registered)
- ✅ Can view their profile stats
- ✅ Can see their recent games
- ✅ All data loads correctly

## Notes

- UUID users don't have games stored in MongoDB (they're in-memory only)
- This is expected behavior - UUID users are typically guest users
- Registered users should have MongoDB ObjectIds and will see their game history
- The fix prevents crashes and provides graceful degradation
