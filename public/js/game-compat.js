// Compatibility layer to maintain existing functionality
// This file bridges the old monolithic structure with the new modular structure

// Import the modular game service
import { GameService } from './modules/gameService.js';
import { GAME_MODES } from './modules/gameConstants.js';

// Import authentication system
import './auth-init.js';

// Initialize the game service
const gameService = new GameService();

// Make it globally available for backward compatibility
window.gameService = gameService;

// Export the main functions that the original game.js expected
window.startGame = function(mode, onlineOptions = {}) {
  gameService.startGame(mode, onlineOptions);
};

window.rollDice = function() {
  gameService.rollDice();
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Modular game system initialized');
});

// For backward compatibility, also initialize on window load
window.addEventListener('load', () => {
  console.log('Game compatibility layer loaded');
});
