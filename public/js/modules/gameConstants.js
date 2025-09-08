// Game configuration constants
export const GAME_CONFIG = {
  GRID_SIZE: 5, // 5x5 squares, means 6x6 dots
  DOT_RADIUS: 6,
  LINE_WIDTH: 4,
  BOARD_PADDING: 15, // Padding from canvas edge to the center of the first dot
  LINE_SELECT_RADIUS: 35, // Increased radius for easier line selection on mobile
  TOUCH_RADIUS: 25, // Increased touch radius for better mobile experience
  DRAG_THRESHOLD: 10, // Minimum distance to start drag operation
  AI_MOVE_DELAY: 700, // Delay in milliseconds for AI moves
  SPECIAL_LINE_DICE_VALUE: 1, // Special line feature (no longer granted on any roll)
};

// Color constants
export const COLORS = {
  DOT_COLOR: '#4A2C2A', // Dark brown dots
  LINE_COLOR_PLAYER1: '#36454F', // Charcoal (deep blue-gray) line for Player 1
  LINE_COLOR_PLAYER2: '#A0522D', // Sienna (rich reddish-brown) line for Player 2
  SQUARE_MARK_COLOR_PLAYER1: '#2F4F4F', // DarkSlateGray for X
  SQUARE_MARK_COLOR_PLAYER2: '#8B4513', // SaddleBrown for O
  ACTIVE_DOT_COLOR: '#FF6347', // Tomato for selected dot (still vibrant for visibility)
};

// Dice SVG representations
export const DICE_SVGS = {
  1: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="10"/></svg>',
  2: '<svg viewBox="0 0 100 100"><circle cx="25" cy="25" r="10"/><circle cx="75" cy="75" r="10"/></svg>',
  3: '<svg viewBox="0 0 100 100"><circle cx="25" cy="25" r="10"/><circle cx="50" cy="50" r="10"/><circle cx="75" cy="75" r="10"/></svg>',
  4: '<svg viewBox="0 0 100 100"><circle cx="25" cy="25" r="10"/><circle cx="75" cy="25" r="10"/><circle cx="25" cy="75" r="10"/><circle cx="75" cy="75" r="10"/></svg>',
  5: '<svg viewBox="0 0 100 100"><circle cx="25" cy="25" r="10"/><circle cx="75" cy="25" r="10"/><circle cx="50" cy="50" r="10"/><circle cx="25" cy="75" r="10"/><circle cx="75" cy="75" r="10"/></svg>',
  6: '<svg viewBox="0 0 100 100"><circle cx="25" cy="25" r="10"/><circle cx="75" cy="25" r="10"/><circle cx="25" cy="50" r="10"/><circle cx="75" cy="50" r="10"/><circle cx="25" cy="75" r="10"/><circle cx="75" cy="75" r="10"/></svg>'
};

// Lucky Draw wheel outcomes
export const LUCKY_DRAW_OUTCOMES = [
  '🎯 Bullseye! +1 line',
  '🎲 Double Trouble! Roll again',
  '💨 Poof! Turn vanished',
  '⚡ Lightning Strike! Skip opponent',
  '🤞 Better Luck Next time',
  '🤞 Better Luck Next time',
  '🤞 Better Luck Next time',
  '🤞 Better Luck Next time'
];

// Game modes
export const GAME_MODES = {
  SINGLE_PLAYER: 'singlePlayer',
  TWO_PLAYERS: 'twoPlayers',
  ONLINE_MULTIPLAYER: 'onlineMultiplayer'
};

// Server configuration
export const SERVER_CONFIG = {
  PORT: process.env.PORT || 4000,
  DEFAULT_LUCKY_WHEEL_ENABLED: true
};
