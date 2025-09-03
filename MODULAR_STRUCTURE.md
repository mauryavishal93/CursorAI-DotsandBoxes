# Modular Project Structure

This document describes the new modular structure of the Dots and Boxes game project.

## Project Structure

```
src/
├── backend/                 # Backend Node.js modules
│   ├── config/             # Configuration files
│   │   └── index.js        # Server configuration and environment setup
│   ├── controllers/        # Request handlers and business logic
│   │   └── socketController.js  # Socket.IO event handling
│   ├── middleware/         # Express middleware (currently empty)
│   ├── models/             # Data models (currently empty)
│   ├── routes/             # API routes
│   │   └── api.js          # API endpoints
│   ├── services/           # Business logic services
│   │   └── lobbyService.js # Lobby management service
│   ├── utils/              # Utility functions (currently empty)
│   └── server.js           # Main server entry point
├── frontend/               # Frontend modules
│   ├── components/         # UI components
│   │   ├── BaseComponent.js    # Base component class
│   │   └── GameBoard.js        # Game board canvas component
│   ├── services/           # Frontend services
│   │   ├── gameLogic.js        # Core game logic
│   │   ├── aiService.js        # AI opponent logic
│   │   ├── onlineService.js    # Online multiplayer service
│   │   └── gameService.js      # Main game orchestration
│   ├── utils/              # Frontend utilities (currently empty)
│   └── styles/             # CSS modules (currently empty)
└── shared/                 # Shared code between frontend and backend
    └── constants/          # Shared constants
        └── gameConstants.js    # Game configuration constants

public/                     # Static assets (unchanged)
├── assets/
├── css/
└── js/
    ├── game.js            # Original monolithic game file (kept for compatibility)
    ├── game-compat.js     # Compatibility layer for modular system
    └── online.js          # Online multiplayer UI (unchanged)
```

## Key Features

### 1. Separation of Concerns
- **Backend**: Handles server logic, socket connections, and API endpoints
- **Frontend**: Manages game logic, UI components, and user interactions
- **Shared**: Contains constants and utilities used by both frontend and backend

### 2. Modular Architecture
- Each module has a single responsibility
- Easy to test and maintain
- Clear dependencies between modules

### 3. Backward Compatibility
- Original `game.js` file is preserved
- Automatic fallback to original system if modular system fails
- No breaking changes to existing functionality

### 4. ES6 Modules
- Uses modern JavaScript module system
- Better dependency management
- Tree-shaking support for smaller bundles

## How It Works

### Server Startup
1. `src/backend/server.js` is the main entry point
2. Loads configuration from `src/backend/config/index.js`
3. Sets up Express routes and Socket.IO handlers
4. Starts the HTTP server

### Frontend Loading
1. Browser tries to load `public/js/game-compat.js` as an ES6 module
2. If successful, uses the new modular system
3. If failed, falls back to the original `public/js/game.js`
4. Ensures the game always works regardless of browser support

### Game Flow
1. `GameService` orchestrates the entire game
2. `GameLogic` handles core game rules and state
3. `GameBoard` manages the canvas rendering
4. `AIService` handles AI opponent moves
5. `OnlineService` manages multiplayer connections

## Benefits

### For Developers
- **Maintainability**: Easier to find and modify specific functionality
- **Testability**: Each module can be tested independently
- **Scalability**: Easy to add new features without affecting existing code
- **Code Reuse**: Shared constants and utilities reduce duplication

### For Users
- **Reliability**: Automatic fallback ensures the game always works
- **Performance**: Modular loading can improve initial load times
- **Compatibility**: Works with both modern and older browsers

## Migration Notes

### What Changed
- New modular structure in `src/` directory
- ES6 module imports/exports
- Separated concerns into different files
- Added compatibility layer

### What Stayed the Same
- All game functionality remains identical
- Same API endpoints and socket events
- Same UI and user experience
- Original files preserved for compatibility

### Development Workflow
- Use `npm start` to run the server (same as before)
- The modular system loads automatically
- Original system is used as fallback if needed
- No changes required to existing deployment

## Future Enhancements

The modular structure enables:
- Unit testing for individual modules
- TypeScript migration
- Build tools and bundling
- Code splitting and lazy loading
- Better error handling and logging
- Plugin system for new game modes
