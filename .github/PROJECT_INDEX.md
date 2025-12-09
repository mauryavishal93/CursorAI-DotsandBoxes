# Project Index - Quick Reference

This file provides a quick navigation guide for understanding the Dots and Boxes project structure.

## 📁 Key Files & Directories

### Entry Points
- **`server.js`** - Main production server (MongoDB Atlas support)
- **`src/backend/server.js`** - Alternative server (local MongoDB)
- **`index.html`** - Frontend entry point

### Configuration
- **`package.json`** - Dependencies and npm scripts
- **`src/backend/config/index.js`** - Server configuration (port, Lucky Wheel)

### Backend Core
- **`src/backend/controllers/socketController.js`** - Socket.IO event handlers (656 lines)
- **`src/backend/services/lobbyService.js`** - Lobby management
- **`src/backend/services/scoringService.js`** - Game scoring & statistics
- **`src/backend/routes/auth.js`** - Authentication API routes
- **`src/backend/routes/api.js`** - General API routes

### Backend Models
- **`src/backend/models/User.js`** - MongoDB User model
- **`src/backend/models/InMemoryUser.js`** - In-memory User model (fallback)
- **`src/backend/models/Game.js`** - Game history model

### Frontend Core
- **`src/frontend/services/gameService.js`** - Main game orchestration
- **`src/frontend/services/gameLogic.js`** - Core game rules & state
- **`src/frontend/services/aiService.js`** - AI opponent logic
- **`src/frontend/services/onlineService.js`** - Online multiplayer client
- **`src/frontend/components/GameBoard.js`** - Canvas rendering component

### Static Assets
- **`public/css/styles.css`** - Main game styles
- **`public/css/auth.css`** - Authentication UI styles
- **`public/assets/dice-roll.wav`** - Audio file

## 🎮 Game Modes

1. **Single Player vs AI** - `GAME_MODES.SINGLE_PLAYER`
2. **Two Players (Local)** - `GAME_MODES.TWO_PLAYERS`
3. **Online Multiplayer** - `GAME_MODES.ONLINE_MULTIPLAYER`

## 🔌 Socket.IO Events

### Client → Server
- `createLobby` - Create new game lobby
- `joinLobby` - Join existing lobby
- `gameAction` - Send game move/action
- `gameReady` - Signal game initialization complete
- `leaveLobby` - Leave current lobby
- `associateUser` - Link socket to user account

### Server → Client
- `lobbyUpdate` - Lobby player list update
- `startGame` - Game start signal
- `gameAction` - Receive opponent's move
- `gameStartConfirmed` - All players ready confirmation
- `playerDisconnected` - Opponent disconnected
- `playerReconnected` - Opponent reconnected
- `statsUpdated` - User statistics updated

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/guest` - Guest login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - Logout
- `PUT /api/auth/avatar` - Update avatar
- `POST /api/auth/update-stats` - Update game stats
- `POST /api/auth/update-ai-stats` - Update AI game stats

### General
- `GET /api/config` - Get server configuration
- `GET /health` - Health check endpoint

## 📊 Data Models

### User (MongoDB)
```javascript
{
  username, email, password (hashed),
  points, wins, losses, gamesPlayed,
  currentStreak, highestStreak,
  scoreHistory, avatar,
  isGuest, isAdmin,
  createdAt, lastLogin, lastGamePlayed
}
```

### Lobby (In-Memory)
```javascript
{
  players: [socketId1, socketId2],
  playerRoles: { socketId1: 1, socketId2: 2 },
  playerNames: { socketId1: "Alice", ... },
  gameState: {...},
  gameOver: boolean,
  createdAt: timestamp,
  lastActivity: timestamp,
  disconnectedPlayers: []
}
```

## 🔧 Configuration

### Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (default: 3000)
- `SESSION_SECRET` - Session encryption
- `JWT_SECRET` - JWT token secret
- `NODE_ENV` - Environment (production/development)

### Lucky Wheel
- Controlled by `DEFAULT_LUCKY_WHEEL_ENABLED` in config
- Can be set via CLI: `npm start DEFAULT_LUCKY_WHEEL_ENABLED=true`
- Disabled in Online Multiplayer mode

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start server (development)
npm start

# Start with Lucky Wheel enabled
npm run start:lucky-wheel-on

# Production deployment
npm run start:production
```

## 📚 Documentation

- **`README.md`** - User-facing documentation
- **`PROJECT_ANALYSIS.md`** - Comprehensive technical analysis
- **`PROJECT_INDEX.md`** - This file (quick reference)

## 🔍 Common Tasks

### Find Game Logic
→ `src/frontend/services/gameLogic.js`

### Find Socket Handlers
→ `src/backend/controllers/socketController.js`

### Find Authentication
→ `src/backend/routes/auth.js` + `src/backend/middleware/auth.js`

### Find Lobby Management
→ `src/backend/services/lobbyService.js`

### Find Scoring System
→ `src/backend/services/scoringService.js`

### Find AI Logic
→ `src/frontend/services/aiService.js`

### Find Canvas Rendering
→ `src/frontend/components/GameBoard.js`

---

**For detailed analysis, see:** `PROJECT_ANALYSIS.md`
