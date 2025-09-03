// Wrap the entire script in a window.onload to ensure all elements and functions are loaded
window.onload = function() {
  // Guard against double-initialization
  if (window.__gameInitDone) return;
  window.__gameInitDone = true;
  
  // ========================================
  // DEPLOYMENT CONFIGURATION - LUCKY WHEEL
  // ========================================
  // This value is now set via command line argument during deployment
  // Example: npm start DEFAULT_LUCKY_WHEEL_ENABLED=true
  // Example: npm start DEFAULT_LUCKY_WHEEL_ENABLED=false
  let DEFAULT_LUCKY_WHEEL_ENABLED = true; // Will be updated from server
  // ========================================
  // Global constants for game configuration
  const GRID_SIZE = 5; // 5x5 squares, means 6x6 dots
  const DOT_RADIUS = 6;
  const LINE_WIDTH = 4;
  const DOT_COLOR = '#4A2C2A'; // Dark brown dots
  const LINE_COLOR_PLAYER1 = '#36454F'; // Charcoal (deep blue-gray) line for Player 1
  const LINE_COLOR_PLAYER2 = '#A0522D'; // Sienna (rich reddish-brown) line for Player 2
  const SQUARE_MARK_COLOR_PLAYER1 = '#2F4F4F'; // DarkSlateGray for X
  const SQUARE_MARK_COLOR_PLAYER2 = '#8B4513'; // SaddleBrown for O
  const ACTIVE_DOT_COLOR = '#FF6347'; // Tomato for selected dot (still vibrant for visibility)
  const SPECIAL_LINE_DICE_VALUE = 1; // Special line feature (no longer granted on any roll)
  const AI_MOVE_DELAY = 700; // Delay in milliseconds for AI moves
  const BOARD_PADDING = 15; // Padding from canvas edge to the center of the first dot
  const LINE_SELECT_RADIUS = 35; // Increased radius for easier line selection on mobile
  const TOUCH_RADIUS = 25; // Increased touch radius for better mobile experience
  const DRAG_THRESHOLD = 10; // Minimum distance to start drag operation

  // SVG representations for dice faces (shared)
  const diceSVGs = {
      1: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="10"/></svg>',
      2: '<svg viewBox="0 0 100 100"><circle cx="25" cy="25" r="10"/><circle cx="75" cy="75" r="10"/></svg>',
      3: '<svg viewBox="0 0 100 100"><circle cx="25" cy="25" r="10"/><circle cx="50" cy="50" r="10"/><circle cx="75" cy="75" r="10"/></svg>',
      4: '<svg viewBox="0 0 100 100"><circle cx="25" cy="25" r="10"/><circle cx="75" cy="25" r="10"/><circle cx="25" cy="75" r="10"/><circle cx="75" cy="75" r="10"/></svg>',
      5: '<svg viewBox="0 0 100 100"><circle cx="25" cy="25" r="10"/><circle cx="75" cy="25" r="10"/><circle cx="50" cy="50" r="10"/><circle cx="25" cy="75" r="10"/><circle cx="75" cy="75" r="10"/></svg>',
      6: '<svg viewBox="0 0 100 100"><circle cx="25" cy="25" r="10"/><circle cx="75" cy="25" r="10"/><circle cx="25" cy="50" r="10"/><circle cx="75" cy="50" r="10"/><circle cx="25" cy="75" r="10"/><circle cx="75" cy="75" r="10"/></svg>'
  };

  // Global game state variables (for the currently active game)
  let currentCanvas;
  let currentCtx;
  let cellSize;
  let boardSize;
  let playerTurn;
  let linesToDraw;
  let diceValue;
  let playerScores;
  let drawnLines; // Array to store { start, end, player } objects
  let drawnLineKeys; // Set to store canonical string keys for quick lookup
  let completedSquares;
  let selectedDot;
  let isDrawingLine; // Indicates if a drag/slide operation is in progress
  let gameOver;
  let diceAnimationIntervalId;
  let hasSpecialLine;
  let gameMode; // 'singlePlayer' or 'twoPlayers'
  let playerNames = { 1: 'Player 1', 2: 'Player 2' }; // Stores names for display
  let hasRolledDice = false; // New flag to prevent multiple dice rolls per turn
  // Lucky Draw (Two Players mode only)
  let isLuckyWheelActive = false;
  // Legacy flag (no longer used for add behavior). Keep defined for safety but unused.
  let twoPlayerExtraRollAdds = false; // Deprecated: add behavior removed
  let skipNextTurnForPlayer = null;   // 1 or 2, skip on next switchTurn
  let hasSpunLuckyWheelThisTurn = false; // Prevent multiple spins in the same turn
  let twoPlayerExtraRollAfterFinish = false; // Grant one extra dice roll after current lines are drawn
  
  // Lucky Wheel Toggle Feature
  let isLuckyWheelEnabled = DEFAULT_LUCKY_WHEEL_ENABLED; // Default from deployment configuration

  // Initialize game state immediately when window loads
  // This ensures drawnLineKeys and other state variables are properly initialized
  // before any functions (like runAllTests) try to access them.
  resetGameState();
  
  // Fetch Lucky Wheel configuration from server
  fetchLuckyWheelConfig();

  // UI elements references (common screens)
  const homeScreen = document.getElementById('home-screen');
  const singlePlayerSetupScreen = document.getElementById('single-player-setup-screen');
  const twoPlayerSetupScreen = document.getElementById('two-player-setup-screen'); 
  const singlePlayerBtn = document.getElementById('single-player-btn');
  const twoPlayerBtn = document.getElementById('two-player-btn'); 
  const onlineGameBtn = document.getElementById('online-game-btn'); // Re-added
  const runUnitTestsBtn = document.getElementById('run-unit-tests-btn'); // New button
  


  const spPlayerNameInput = document.getElementById('sp-player-name-input'); 
  const startSinglePlayerGameBtn = document.getElementById('start-single-player-game-btn');
  const spSetupBackToHomeBtn = document.getElementById('sp-setup-back-to-home-btn'); // New back button for setup screen

  const tpPlayer1NameInput = document.getElementById('tp-player1-name-input'); 
  const tpPlayer2NameInput = document.getElementById('tp-player2-name-input'); 
  const startTwoPlayerGameBtn = document.getElementById('start-two-player-game-btn'); 
  const tpSetupBackToHomeBtn = document.getElementById('tp-setup-back-to-home-btn'); // New back button for setup screen

  const messageBox = document.getElementById('messageBox');
  const messageTitle = document.getElementById('messageTitle');
  const messageText = document.getElementById('messageText');
  const messageBoxCloseBtn = document.getElementById('messageBoxCloseBtn');
  const confirmationBox = document.getElementById('confirmationBox');
  const confirmationTitle = document.getElementById('confirmationTitle');
  const confirmationText = document.getElementById('confirmationText');
  const confirmYesBtn = document.getElementById('confirmYesBtn');
  const confirmNoBtn = document.getElementById('confirmNoBtn');

  // UI elements references for Single Player Game Screen
  const spGameScreen = document.getElementById('single-player-game-screen');
  const spGameCanvas = document.getElementById('sp-gameCanvas');
  const spPlayer1ScoreEl = document.getElementById('sp-player1-score');
  const spPlayer2ScoreEl = document.getElementById('sp-player2-score');
  const spPlayer1CountEl = document.getElementById('sp-player1-count');
  const spPlayer2CountEl = document.getElementById('sp-player2-count');
  const spPlayer1NameDisplay = document.getElementById('sp-player1-name-display');
  const spPlayer2NameDisplay = document.getElementById('sp-player2-name-display');
  const spCurrentPlayerNameDisplay = document.getElementById('sp-current-player-name-display');
  const spLinesToDrawCountEl = document.getElementById('sp-lines-to-draw-count');
  const spDiceDisplayEl = document.getElementById('sp-dice-display');
  // Removed spRollDiceBtn
  const spRestartBtn = document.getElementById('sp-restart-btn');
  const spBackToHomeBtn = document.getElementById('sp-back-to-home-btn');
  const spSpecialLineIndicatorEl = document.getElementById('sp-special-line-indicator');
  let spCtx = null; // Will be initialized after DOM is loaded

  // UI elements references for Two Player Game Screen
  const tpGameScreen = document.getElementById('two-player-game-screen');
  const tpGameCanvas = document.getElementById('tp-gameCanvas');
  const tpPlayer1ScoreEl = document.getElementById('tp-player1-score');
  const tpPlayer2ScoreEl = document.getElementById('tp-player2-score');
  const tpPlayer1CountEl = document.getElementById('tp-player1-count');
  const tpPlayer2CountEl = document.getElementById('tp-player2-count');
  const tpPlayer1NameDisplay = document.getElementById('tp-player1-name-display');
  const tpPlayer2NameDisplay = document.getElementById('tp-player2-name-display');
  const tpCurrentPlayerNameDisplay = document.getElementById('tp-current-player-name-display');
  const tpLinesToDrawCountEl = document.getElementById('tp-lines-to-draw-count');
  const tpDiceDisplayEl = document.getElementById('tp-dice-display');
  // Removed tpRollDiceBtn
  const tpRestartBtn = document.getElementById('tp-restart-btn');
  const tpBackToHomeBtn = document.getElementById('tp-back-to-home-btn');
  const tpSpecialLineIndicatorEl = document.getElementById('tp-special-line-indicator');
  let tpCtx = null; // Will be initialized after DOM is loaded

  // UI elements references for Online Multiplayer Game Screen
  const onlineGameScreen = document.getElementById('online-game-screen');
  const onlineGameCanvas = document.getElementById('online-gameCanvas');
  const onlinePlayer1ScoreEl = document.getElementById('online-player1-score');
  const onlinePlayer2ScoreEl = document.getElementById('online-player2-score');
  const onlinePlayer1CountEl = document.getElementById('online-player1-count');
  const onlinePlayer2CountEl = document.getElementById('online-player2-count');
  const onlinePlayer1NameDisplay = document.getElementById('online-player1-name-display');
  const onlinePlayer2NameDisplay = document.getElementById('online-player2-name-display');
  const onlineCurrentPlayerNameDisplay = document.getElementById('online-current-player-name-display');
  const onlineLinesToDrawCountEl = document.getElementById('online-lines-to-draw-count');
  const onlineDiceDisplayEl = document.getElementById('online-dice-display');
  const onlineRestartBtn = document.getElementById('online-restart-btn');
  const onlineBackToHomeBtn = document.getElementById('online-back-to-home-btn');
  const onlineSpecialLineIndicatorEl = document.getElementById('online-special-line-indicator');
  let onlineCtx = null; // Will be initialized after DOM is loaded

  // Online multiplayer variables
  let onlinePlayerRole = null; // 1 or 2
  let onlineLobbyCode = null;
  let onlineSocket = null;

  // New UI elements for Rules and Info modals
  const rulesBtnHome = document.getElementById('rules-btn-home');
  const infoBtnHome = document.getElementById('info-btn-home');

  const rulesModal = document.getElementById('rulesModal');
  const rulesModalCloseBtn = document.getElementById('rulesModalCloseBtn');
  const infoModal = document.getElementById('infoModal');
  const infoModalCloseBtn = document.getElementById('infoModalCloseBtn');

  // Object to expose game logic functions for unit testing
  const gameLogic = {};

  // Add a UI element for online turn info
  let onlineTurnInfo = null;
  
  // Initialize canvas contexts after DOM is loaded
  function initializeCanvasContexts() {
    if (spGameCanvas && !spCtx) {
      spCtx = spGameCanvas.getContext('2d');
    }
    if (tpGameCanvas && !tpCtx) {
      tpCtx = tpGameCanvas.getContext('2d');
    }
    if (onlineGameCanvas && !onlineCtx) {
      onlineCtx = onlineGameCanvas.getContext('2d');
    }
  }
  
  window.addEventListener('DOMContentLoaded', () => {
    // Initialize canvas contexts
    initializeCanvasContexts();
    
    if (!document.getElementById('online-turn-info')) {
      onlineTurnInfo = document.createElement('div');
      onlineTurnInfo.id = 'online-turn-info';
      onlineTurnInfo.style.textAlign = 'center';
      onlineTurnInfo.style.fontWeight = 'bold';
      onlineTurnInfo.style.margin = '10px 0';
      onlineTurnInfo.style.fontSize = '1.2em';
      const parent = document.getElementById('two-player-game-screen') || document.body;
      parent.insertBefore(onlineTurnInfo, parent.firstChild);
    } else {
      onlineTurnInfo = document.getElementById('online-turn-info');
    }
  });

  function updateOnlineTurnInfo() {
    if (gameMode === 'onlineMultiplayer') {
      // Update the current player name display to show "Your turn" or "Opponent's turn"
      if (playerTurn === onlinePlayerRole) {
        onlineCurrentPlayerNameDisplay.textContent = "Your turn";
      } else {
        onlineCurrentPlayerNameDisplay.textContent = "Opponent's turn";
      }
    }
  }

  /**
   * Displays a custom message box.
   * @param {string} title - The title of the message box.
   * @param {string} text - The main text content.
   */
  function showMessage(title, text, onClose) {
      if (!messageTitle || !messageText || !messageBox || !messageBoxCloseBtn) {
          console.error('Message box elements not found');
          return;
      }
      
      messageTitle.textContent = title;
      messageText.textContent = text;
      messageBox.style.display = 'block';
      
      // Auto-close message box for AI players in single player mode after 2.4s
      if (gameMode === 'singlePlayer' && playerTurn === 2) {
          console.log('[MESSAGE BOX] AI player - auto-closing message box after 2.4s for:', title);
          setTimeout(() => {
              hideMessageBox();
              console.log('[MESSAGE BOX] Message box auto-closed for AI player');
          }, 2400);
      }
      
      // Store the callback for when OK is clicked
      if (onClose) {
          messageBoxCloseBtn.onclick = () => {
              hideMessageBox();
              onClose();
          };
      } else {
          messageBoxCloseBtn.onclick = hideMessageBox;
      }
  }

  /**
   * Hides the custom message box.
   */
  function hideMessageBox() {
      if (messageBox) {
          messageBox.style.display = 'none';
      }
  }

  /**
   * Shows a confirmation box.
   * @param {string} title - The title for the confirmation.
   * @param {string} text - The message for the user.
   * @param {function} onConfirm - Callback function if 'Yes' is clicked.
   * @param {function} onCancel - Callback function if 'No' is clicked.
   */
  function showConfirmation(title, text, onConfirm, onCancel) {
      if (!confirmationTitle || !confirmationText || !confirmationBox || !confirmYesBtn || !confirmNoBtn) {
          console.error('Confirmation box elements not found');
          return;
      }
      
      confirmationTitle.textContent = title;
      confirmationText.textContent = text;
      confirmationBox.style.display = 'block';

      confirmYesBtn.onclick = () => {
          confirmationBox.style.display = 'none';
          onConfirm();
      };

      confirmNoBtn.onclick = () => {
          confirmationBox.style.display = 'none';
          if (onCancel) onCancel();
      };
  }


  /**
   * Hides all main screen elements.
   */
  function hideAllScreens() {
      if (homeScreen) homeScreen.style.display = 'none';
      if (singlePlayerSetupScreen) singlePlayerSetupScreen.style.display = 'none';
      if (twoPlayerSetupScreen) twoPlayerSetupScreen.style.display = 'none';
      if (spGameScreen) spGameScreen.style.display = 'none';
      if (tpGameScreen) tpGameScreen.style.display = 'none';
      if (onlineGameScreen) onlineGameScreen.style.display = 'none';
  }

  /**
   * Switches the displayed screen.
   * @param {HTMLElement} screenToShow - The screen element to display.
   */
  function showScreen(screenToShow) {
      console.log('showScreen called with:', screenToShow ? screenToShow.id : 'null');
      if (!screenToShow) {
          console.error('Screen element not found');
          return;
      }
      
      hideAllScreens();
      screenToShow.style.display = 'flex';
      console.log('Screen shown:', screenToShow.id);
  }
  
  
  
  /**
   * Fetches Lucky Wheel configuration from server and initializes the game state.
   */
  async function fetchLuckyWheelConfig() {
      try {
          const response = await fetch('/api/config');
          const config = await response.json();
          
          DEFAULT_LUCKY_WHEEL_ENABLED = config.DEFAULT_LUCKY_WHEEL_ENABLED;
          isLuckyWheelEnabled = DEFAULT_LUCKY_WHEEL_ENABLED;
          
          console.log('[LUCKY WHEEL] Configuration loaded from server:', config.message);
          console.log('[LUCKY WHEEL] Lucky Wheel is:', isLuckyWheelEnabled ? 'ENABLED' : 'DISABLED');
          

          
      } catch (error) {
          console.warn('[LUCKY WHEEL] Failed to fetch configuration from server, using default:', DEFAULT_LUCKY_WHEEL_ENABLED);
          isLuckyWheelEnabled = DEFAULT_LUCKY_WHEEL_ENABLED;
      }
  }
  
  /**
   * Initializes canvas dimensions based on the container size.
   * Adjusts for smaller screens to ensure visibility.
   */
  function initializeCanvasDimensions() {
      if (!currentCanvas) {
          console.error('Current canvas not found');
          return;
      }
      
      // Get the available width within the game screen container
      const parentContainer = currentCanvas.parentElement; // This is sp-game-screen or tp-game-screen
      if (!parentContainer) {
          console.error('Canvas parent container not found');
          return;
      }
      
      let availableWidth = parentContainer.clientWidth;

      // Account for potential margin on the canvas itself (5px on each side, as per CSS)
      availableWidth -= (2 * 5); // 5px margin on left and right

      // Ensure the canvas is not too small or too large
      const minCanvasSize = 250; // Minimum size for playability
      const maxCanvasSize = 600; // Max size to prevent it from getting too big on huge screens

      let targetCanvasSize = Math.min(availableWidth, maxCanvasSize);
      targetCanvasSize = Math.max(targetCanvasSize, minCanvasSize);

      // Calculate cellSize based on the targetCanvasSize.
      // targetCanvasSize = (GRID_SIZE * cellSize) + (2 * DOT_RADIUS) + (2 * BOARD_PADDING)
      // So, cellSize = (targetCanvasSize - (2 * DOT_RADIUS) - (2 * BOARD_PADDING)) / GRID_SIZE
      cellSize = Math.floor((targetCanvasSize - (2 * DOT_RADIUS) - (2 * BOARD_PADDING)) / GRID_SIZE);

      // Ensure cellSize is at least a minimum value for readability
      if (cellSize < 30) cellSize = 30;

      // Recalculate boardSize based on the adjusted cellSize to ensure perfect fit
      // This boardSize includes the space for all dots and the BOARD_PADDING on both sides.
      boardSize = (GRID_SIZE * cellSize) + (2 * DOT_RADIUS) + (2 * BOARD_PADDING);

      currentCanvas.width = boardSize;
      currentCanvas.height = boardSize;

      console.log(`Canvas Dimensions: Width=${currentCanvas.width}, Height=${currentCanvas.height}, CellSize=${cellSize}, BoardPadding=${BOARD_PADDING}`);
  }

  /**
   * Clears the canvas and draws the initial dots.
   */
  function drawBoard() {
      if (!currentCtx) {
          console.error('Canvas context not available');
          return;
      }
      
      // Clear the canvas
      currentCtx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
      
      // Draw all dots
      for (let row = 0; row <= GRID_SIZE; row++) {
          for (let col = 0; col <= GRID_SIZE; col++) {
              drawDot(row, col, '#4A2C2A');
          }
      }
  }

  /**
   * Draws a dot on the canvas.
   * @param {number} row - The row index of the dot.
   * @param {number} col - The column index of the dot.
   * @param {string} color - The color of the dot.
   */
  function drawDot(row, col, color) {
      if (!currentCtx) {
          console.error('Canvas context not available for drawing dot');
          return;
      }
      
      const x = BOARD_PADDING + col * cellSize;
      const y = BOARD_PADDING + row * cellSize;
      
      currentCtx.beginPath();
      currentCtx.arc(x, y, DOT_RADIUS, 0, 2 * Math.PI);
      currentCtx.fillStyle = color;
      currentCtx.fill();
  }

  /**
   * Draws a line on the canvas.
   * @param {object} line - The line object with start and end coordinates.
   * @param {string} color - The color of the line.
   */
  function drawLine(line, color) {
      if (!currentCtx) {
          console.error('Canvas context not available for drawing line');
          return;
      }
      
      const startX = BOARD_PADDING + line.start.col * cellSize;
      const startY = BOARD_PADDING + line.start.row * cellSize;
      const endX = BOARD_PADDING + line.end.col * cellSize;
      const endY = BOARD_PADDING + line.end.row * cellSize;
      
      currentCtx.beginPath();
      currentCtx.moveTo(startX, startY);
      currentCtx.lineTo(endX, endY);
      currentCtx.strokeStyle = color;
      currentCtx.lineWidth = LINE_WIDTH;
      currentCtx.stroke();
  }

  /**
   * Draws the mark for a completed square.
   * @param {number} row - The row index of the top-left dot of the square.
   * @param {number} col - The column index of the top-left dot of the square.
   * @param {number} player - The player who completed the square (1 or 2).
   */
  function drawSquareMark(row, col, player) {
      console.log(`drawSquareMark called for player ${player} at (${row}, ${col})`);
      const x = col * cellSize + DOT_RADIUS + BOARD_PADDING + cellSize / 2;
      const y = row * cellSize + DOT_RADIUS + BOARD_PADDING + cellSize / 2;
      const mark = (player === 1) ? 'X' : 'O';
      const color = (player === 1) ? SQUARE_MARK_COLOR_PLAYER1 : SQUARE_MARK_COLOR_PLAYER2;

      currentCtx.fillStyle = color;
      currentCtx.font = `${cellSize * 0.8}px Inter`; // Ensure font size is appropriate
      currentCtx.textAlign = 'center';
      currentCtx.textBaseline = 'middle';
      currentCtx.fillText(mark, x, y);
  }

  /**
   * Resets the game state variables.
   */
  function resetGameState() {
      // Reset all game state variables
      playerTurn = 1;
      linesToDraw = 0;
      diceValue = 0;
      playerScores = { 1: 0, 2: 0 };
      drawnLines = [];
      drawnLineKeys = new Set();
      completedSquares = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0)); // 0: uncompleted, 1: P1, 2: P2
      selectedDot = null;
      isDrawingLine = false;
      gameOver = false;
      hasSpecialLine = false;
      hasRolledDice = false;
      hasSpunLuckyWheelThisTurn = false; // Reset Lucky Wheel flag for new game
      twoPlayerExtraRollAfterFinish = false; // Reset extra roll flag for new game
      isLuckyWheelActive = false; // Reset Lucky Wheel active state for new game
      clearInterval(diceAnimationIntervalId);
  }

  /**
   * Updates the score display for the current game mode.
   */
  function updateScoreDisplay() {
      if (gameMode === 'singlePlayer') {
          if (spPlayer1CountEl) spPlayer1CountEl.textContent = playerScores[1];
          if (spPlayer2CountEl) spPlayer2CountEl.textContent = playerScores[2];
          if (spCurrentPlayerNameDisplay) spCurrentPlayerNameDisplay.textContent = playerNames[playerTurn];
          if (spLinesToDrawCountEl) spLinesToDrawCountEl.textContent = linesToDraw;
          if (spSpecialLineIndicatorEl) spSpecialLineIndicatorEl.style.display = hasSpecialLine ? 'block' : 'none';
          
          // Update active player styling
          if (spPlayer1ScoreEl) spPlayer1ScoreEl.classList.toggle('active', playerTurn === 1);
          if (spPlayer2ScoreEl) spPlayer2ScoreEl.classList.toggle('active', playerTurn === 2);
      } else if (gameMode === 'twoPlayers') {
          if (tpPlayer1CountEl) tpPlayer1CountEl.textContent = playerScores[1];
          if (tpPlayer2CountEl) tpPlayer2CountEl.textContent = playerScores[2];
          if (tpCurrentPlayerNameDisplay) tpCurrentPlayerNameDisplay.textContent = playerNames[playerTurn];
          if (tpLinesToDrawCountEl) tpLinesToDrawCountEl.textContent = linesToDraw;
          if (tpSpecialLineIndicatorEl) tpSpecialLineIndicatorEl.style.display = hasSpecialLine ? 'block' : 'none';
          
          // Update active player styling
          if (tpPlayer1ScoreEl) tpPlayer1ScoreEl.classList.toggle('active', playerTurn === 1);
          if (tpPlayer2ScoreEl) tpPlayer2ScoreEl.classList.toggle('active', playerTurn === 2);
      } else if (gameMode === 'onlineMultiplayer') {
          if (onlinePlayer1CountEl) onlinePlayer1CountEl.textContent = playerScores[1];
          if (onlinePlayer2CountEl) onlinePlayer2CountEl.textContent = playerScores[2];
          if (onlineCurrentPlayerNameDisplay) onlineCurrentPlayerNameDisplay.textContent = playerNames[playerTurn];
          if (onlineLinesToDrawCountEl) onlineLinesToDrawCountEl.textContent = linesToDraw;
          if (onlineSpecialLineIndicatorEl) onlineSpecialLineIndicatorEl.style.display = hasSpecialLine ? 'block' : 'none';
          
          // Update active player styling
          if (onlinePlayer1ScoreEl) onlinePlayer1ScoreEl.classList.toggle('active', playerTurn === 1);
          if (onlinePlayer2ScoreEl) onlinePlayer2ScoreEl.classList.toggle('active', playerTurn === 2);
          
          updateOnlineTurnInfo();
      }
      
      // Update dice interactivity based on current state
      updateDiceInteractivity();
  }

  /**
   * Displays the current dice value.
   * @param {number} value - The value to display on the dice.
   */
  function displayDiceValue(value) {
      const diceDisplayEl = (gameMode === 'singlePlayer') ? spDiceDisplayEl : 
                           (gameMode === 'twoPlayers') ? tpDiceDisplayEl : onlineDiceDisplayEl;
      if (value === 0) {
          diceDisplayEl.innerHTML = diceSVGs[1]; // Show a default face when no value is rolled yet
          diceDisplayEl.classList.add('disabled');
      } else {
          diceDisplayEl.innerHTML = diceSVGs[value];
          diceDisplayEl.classList.remove('disabled');
      }
  }

  /**
   * Handles dice click events and calls rollDice with proper parameters.
   */
  function handleDiceClick(event) {
    // Call rollDice without any parameters for user-initiated rolls
    rollDice();
  }

  /**
   * Rolls the dice and updates the lines to draw.
   */
  function rollDice(forceValue, skipEmit) {
    console.log('[DEBUG] rollDice called with forceValue:', forceValue, 'skipEmit:', skipEmit);
    
    // Handle online multiplayer dice roll
    if (gameMode === 'onlineMultiplayer') {
      // If this is a forced value (from remote player), just apply it
      if (typeof forceValue === 'number' && forceValue >= 1 && forceValue <= 6) {
        diceValue = forceValue;
        linesToDraw = diceValue;
        hasRolledDice = !(gameMode === 'twoPlayers' && twoPlayerExtraRollAdds); // If extra roll granted, keep false until consumed
        console.log('[DICE ROLL][REMOTE] Dice rolled:', diceValue, '| linesToDraw:', linesToDraw, '| player:', playerTurn);
        displayDiceValue(diceValue);
        updateScoreDisplay();
        return;
      }
      
      // If it's not this player's turn, don't allow rolling
      if (playerTurn !== onlinePlayerRole) {
        console.log('[DEBUG] Not this player\'s turn, returning');
        return;
      }
      
      // If dice has already been rolled this turn, don't allow another roll
      if (hasRolledDice) {
        console.log('[DEBUG] Dice already rolled this turn, returning');
        return;
      }
      
      // Generate a random dice value 1-6 and emit to other player
      const randomValue = Math.floor(Math.random() * 6) + 1;
      const startTimestamp = Date.now() + 100; // Small delay to ensure sync
      
      console.log('[DEBUG] Generating random dice value:', randomValue);
      
      // Emit the dice roll to the server
      if (onlineSocket && onlineLobbyCode) {
        onlineSocket.emit('gameAction', {
          lobbyCode: onlineLobbyCode,
          action: {
            type: 'syncRollDice',
            value: randomValue,
            startTimestamp: startTimestamp,
            playerId: onlinePlayerRole // Add player ID to identify who rolled
          }
        });
      }
      
      // Apply the roll locally with animation (for the player who rolled)
      console.log('[DICE ROLL][LOCAL] Starting animation for dice value:', randomValue);
      
      // Show animation for the local player - don't set values until animation completes
      animateDiceRollSync(randomValue, startTimestamp, () => {
        // Set the values after the animation completes for local player
        diceValue = randomValue;
        linesToDraw = randomValue;
        hasRolledDice = true; // Mark that dice has been rolled for this turn
        console.log('[DICE ROLL][LOCAL] Animation complete. Dice rolled:', diceValue, '| linesToDraw:', linesToDraw, '| player:', playerTurn);
        displayDiceValue(diceValue);
        updateScoreDisplay();
        
        // Lucky Wheel is disabled for online multiplayer mode
        // Only enable for single player and two player modes
      });
      
      return;
    }
    
    // Local (single/two player) fallback
    // If dice has already been rolled this turn, don't allow another roll
    // EXCEPT if Lucky Draw granted an extra chance (works in all modes)
    if (hasRolledDice && !twoPlayerExtraRollAfterFinish) {
      console.log('[DEBUG] Dice already rolled this turn, returning');
      return;
    }
    
    let rollCount = 0;
    const maxRolls = 15;
    const rollDuration = 50;
    const diceDisplayEl = (gameMode === 'singlePlayer') ? spDiceDisplayEl : tpDiceDisplayEl;
    diceDisplayEl.classList.add('disabled');
    clearInterval(diceAnimationIntervalId);
    diceAnimationIntervalId = setInterval(() => {
      const randomRoll = Math.floor(Math.random() * 6) + 1;
      diceDisplayEl.innerHTML = diceSVGs[randomRoll];
      rollCount++;
      if (rollCount >= maxRolls) {
        clearInterval(diceAnimationIntervalId);
        // Use the random dice value
        diceValue = randomRoll;
        linesToDraw = diceValue;
        hasRolledDice = true; // Mark that dice has been rolled for this turn
        console.log('[DICE ROLL] Dice rolled:', diceValue, '| linesToDraw:', linesToDraw, '| player:', playerTurn);
        displayDiceValue(diceValue);
        updateScoreDisplay();
        diceDisplayEl.classList.remove('disabled');
        // Check if Lucky Wheel is enabled before triggering
        if (isLuckyWheelEnabled && gameMode === 'twoPlayers' && diceValue === 6 && !hasSpunLuckyWheelThisTurn) {
          console.log('[LUCKY WHEEL] Triggering for Two Players mode, player:', playerTurn);
          setTimeout(() => {
            triggerLuckyWheel();
          }, 250);
        }
        // Check if Lucky Wheel is enabled before triggering
        if (isLuckyWheelEnabled && gameMode === 'singlePlayer' && diceValue === 6 && !hasSpunLuckyWheelThisTurn) {
          console.log('[LUCKY WHEEL] Triggering for Single Player mode, player:', playerTurn, 'diceValue:', diceValue, 'hasSpunLuckyWheelThisTurn:', hasSpunLuckyWheelThisTurn, 'isLuckyWheelActive:', isLuckyWheelActive);
          
          // For AI player, auto-trigger the wheel
          if (playerTurn === 2) {
            setTimeout(() => {
              console.log('[LUCKY WHEEL] Auto-triggering for AI player');
              triggerLuckyWheel();
            }, 250);
          } else {
            // For human player, just show the wheel (they need to spin manually)
            setTimeout(() => {
              console.log('[LUCKY WHEEL] Showing wheel for human player to spin manually');
              triggerLuckyWheel();
            }, 250);
          }
        }
        // AI moves should only start when turn switches, not after dice roll
        // This ensures proper turn flow like in 2-player mode
      }
    }, rollDuration);
    const diceAudio = document.getElementById('dice-audio');
    if (diceAudio) {
      diceAudio.currentTime = 0;
      diceAudio.play();
    }
  }

  /**
   * Generates a canonical string representation of a line.
   * Ensures that the start coordinates are always "smaller" than end coordinates for consistent keys.
   * @param {object} dot1 - First dot {row, col}.
   * @param {object} dot2 - Second dot {row, col}.
   * @returns {string} Canonical line key.
   */
  function getCanonicalLineKey(dot1, dot2) {
      // Ensure consistent order for horizontal lines
      if (dot1.row === dot2.row) {
          const minCol = Math.min(dot1.col, dot2.col);
          return `h_${dot1.row}_${minCol}`;
      }
      // Ensure consistent order for vertical lines
      else if (dot1.col === dot2.col) {
          const minRow = Math.min(dot1.row, dot2.row);
          return `v_${minRow}_${dot1.col}`;
      }
      return null; // Should not happen for valid lines
  }

  /**
   * Checks if a square is completed and marks it.
   * @param {number} r - Row index of the top-left dot of the potential square.
   * @param {number} c - Column index of the top-left dot of the potential square.
   * @returns {boolean} True if a square was completed, false otherwise.
   */
  function checkAndCompleteSquare(r, c) {
      console.log(`  checkAndCompleteSquare: Checking square at [${r}][${c}].`);
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
          console.log(`    checkAndCompleteSquare: Square at [${r}][${c}] is out of bounds.`);
          return false;
      }
      console.log(`    checkAndCompleteSquare: Current state of completedSquares[${r}][${c}]: ${completedSquares[r][c]}`);
      if (completedSquares[r][c] !== 0) {
          console.log(`    checkAndCompleteSquare: Square at [${r}][${c}] already completed by player ${completedSquares[r][c]}.`);
          return false; // Already completed
      }

      // Define the four lines that form this square in canonical form
      const topLineKey = getCanonicalLineKey({row: r, col: c}, {row: r, col: c + 1});
      const bottomLineKey = getCanonicalLineKey({row: r + 1, col: c}, {row: r + 1, col: c + 1});
      const leftLineKey = getCanonicalLineKey({row: r, col: c}, {row: r + 1, col: c});
      const rightLineKey = getCanonicalLineKey({row: r, col: c + 1}, {row: r + 1, col: c + 1});

      const hasTop = drawnLineKeys.has(topLineKey);
      const hasBottom = drawnLineKeys.has(bottomLineKey);
      const hasLeft = drawnLineKeys.has(leftLineKey);
      const hasRight = drawnLineKeys.has(rightLineKey);

      console.log(`    checkAndCompleteSquare: Square [${r}][${c}] line status: Top: ${hasTop}, Bottom: ${hasBottom}, Left: ${hasLeft}, Right: ${hasRight}`);

      if (hasTop && hasBottom && hasLeft && hasRight) {
          completedSquares[r][c] = playerTurn;
          console.log(`    Square [${r}][${c}] IS complete. Marking for Player ${playerTurn}.`);
          drawSquareMark(r, c, playerTurn);
          return true;
      }
      console.log(`    Square [${r}][${c}] is NOT complete.`);
      return false;
  }

  /**
   * Switches the current player turn.
   */
  function switchTurn() {
      const previousPlayer = playerTurn;
      playerTurn = playerTurn === 1 ? 2 : 1;
      linesToDraw = 0; // Reset lines to draw for the new player
      hasRolledDice = false; // Reset dice roll flag for new turn
      hasSpunLuckyWheelThisTurn = false; // reset wheel spin allowance for the new player's turn
      displayDiceValue(0); // Show default dice face for next turn
      
      console.log(`[TURN SWITCH] Player ${previousPlayer} -> Player ${playerTurn} (${playerNames[playerTurn]})`);
      console.log(`[TURN SWITCH] Game Mode: ${gameMode}, Lines to Draw: ${linesToDraw}, Has Rolled Dice: ${hasRolledDice}`);
      
      // For online multiplayer, emit turn switch to sync with other player
      if (gameMode === 'onlineMultiplayer' && onlineSocket && onlineLobbyCode) {
        onlineSocket.emit('gameAction', {
          lobbyCode: onlineLobbyCode,
          action: {
            type: 'switchTurn',
            playerId: onlinePlayerRole,
            newPlayerTurn: playerTurn,
            previousPlayer: previousPlayer
          }
        });
      }
      
      // Update display
      updateScoreDisplay();
      
      // Update dice interactivity for new turn
      updateDiceInteractivity();

      // If Lucky Wheel marked this player's next turn to be skipped, consume and skip
      if (skipNextTurnForPlayer === playerTurn) {
        const skippedPlayerName = playerNames[playerTurn] || `Player ${playerTurn}`;
        skipNextTurnForPlayer = null;
        showMessage('Turn Skipped!', `${skippedPlayerName}'s turn is skipped due to Lucky Draw.`);
        // Immediately advance again to the other player
        switchTurn();
        return;
      }
    
      // Check if it's AI's turn in single-player mode
      if (gameMode === 'singlePlayer' && playerTurn === 2 && !gameOver) {
          console.log("Switching to AI turn. AI will start after a delay.");
          // Only start AI moves if Lucky Wheel is not active
          if (!isLuckyWheelActive) {
            // Add a longer delay to give human player time to see the turn switch
            setTimeout(aiMakeMove, 1000); // 1 second delay instead of AI_MOVE_DELAY
          } else {
            console.log('[AI] Lucky Wheel is active, AI moves will start after wheel completes');
          }
      }
  }

  /**
   * Updates user statistics after game completion
   * @param {number} winner - The winner (1, 2, or 0 for tie)
   * @param {number} winnerScore - The winner's score (or 0 for tie)
   */
  function updateUserStatistics(winner, winnerScore) {
    if (gameMode !== 'onlineMultiplayer') {
      return; // Only update stats for online multiplayer games
    }
    
    // Check if user is logged in and has authService available
    if (typeof window.authService !== 'undefined' && window.authService.isLoggedIn()) {
      // Determine if current user won
      const currentUserRole = window.onlinePlayerRole;
      const isWinner = (winner === currentUserRole);
      
      // Get the current user's actual score from the game
      const currentUserScore = (currentUserRole === 1) ? playerScores[1] : playerScores[2];
      
      console.log(`Updating stats: winner=${winner}, currentUserRole=${currentUserRole}, isWinner=${isWinner}, currentUserScore=${currentUserScore}`);
      
      // Update statistics with the current user's actual score
      window.authService.updateStats(isWinner, currentUserScore).then(result => {
        if (result.success) {
          console.log('Statistics updated successfully:', result.stats);
          // Update the profile display if it's currently visible
          updateProfileStatsDisplay(result.stats);
        } else {
          console.error('Failed to update statistics:', result.message);
        }
      }).catch(error => {
        console.error('Error updating statistics:', error);
      });
    } else {
      console.log('User not logged in or authService not available, skipping stats update');
    }
  }

  /**
   * Updates the profile statistics display with new stats
   * @param {Object} stats - The updated statistics object
   */
  function updateProfileStatsDisplay(stats) {
    const gamesPlayedEl = document.getElementById('stat-games-played');
    const gamesWonEl = document.getElementById('stat-games-won');
    const winRateEl = document.getElementById('stat-win-rate');
    const totalScoreEl = document.getElementById('stat-total-score');
    
    if (gamesPlayedEl) gamesPlayedEl.textContent = stats.gamesPlayed || 0;
    if (gamesWonEl) gamesWonEl.textContent = stats.gamesWon || 0;
    if (winRateEl) {
      const winRate = stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed * 100).toFixed(1) : 0;
      winRateEl.textContent = `${winRate}%`;
    }
    if (totalScoreEl) totalScoreEl.textContent = stats.totalScore || 0;
  }

  /**
   * Checks if the game is over and determines the winner.
   */
  function checkGameOver() {
      let totalCompletedSquares = 0;
      for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
              if (completedSquares[r][c] !== 0) {
                  totalCompletedSquares++;
              }
          }
      }

      const maxSquares = GRID_SIZE * GRID_SIZE;

      // Check for majority win
      if (playerScores[1] > maxSquares / 2) {
          gameOver = true;
          showMessage("Game Over!", `${playerNames[1]} wins with ${playerScores[1]} squares!`);
          
          // Emit game over event to server for online multiplayer
          if (gameMode === 'onlineMultiplayer' && onlineSocket && onlineLobbyCode) {
              onlineSocket.emit('gameAction', {
                  lobbyCode: onlineLobbyCode,
                  action: {
                      type: 'gameOver',
                      winner: 1,
                      winnerRole: 1, // Send the actual winner's role (Player 1)
                      winnerScore: playerScores[1],
                      player1Score: playerScores[1],
                      player2Score: playerScores[2]
                  }
              });
              
              // Statistics will be updated by the backend socket controller for both players
          }
          return;
      }
      if (playerScores[2] > maxSquares / 2) {
          gameOver = true;
          showMessage("Game Over!", `${playerNames[2]} wins with ${playerScores[2]} squares!`);
          
          // Emit game over event to server for online multiplayer
          if (gameMode === 'onlineMultiplayer' && onlineSocket && onlineLobbyCode) {
              onlineSocket.emit('gameAction', {
                  lobbyCode: onlineLobbyCode,
                  action: {
                      type: 'gameOver',
                      winner: 2,
                      winnerRole: 2, // Send the actual winner's role (Player 2)
                      winnerScore: playerScores[2],
                      player1Score: playerScores[1],
                      player2Score: playerScores[2]
                  }
              });
              
              // Statistics will be updated by the backend socket controller for both players
          }
          return;
      }

      // Check if all squares are completed or all lines are drawn
      // Total possible lines = GRID_SIZE * (GRID_SIZE + 1) * 2
      // For a 5x5 grid, it's 5 * 6 * 2 = 60 lines
      if (totalCompletedSquares === maxSquares || drawnLines.length === (GRID_SIZE * (GRID_SIZE + 1) * 2)) {
          gameOver = true;
          let winnerMessage = '';
          let winner = null;
          if (playerScores[1] > playerScores[2]) {
              winnerMessage = `${playerNames[1]} wins with ${playerScores[1]} squares!`;
              winner = 1;
          } else if (playerScores[2] > playerScores[1]) {
              winnerMessage = `${playerNames[2]} wins with ${playerScores[2]} squares!`;
              winner = 2;
          } else {
              winnerMessage = "It's a tie!";
              winner = 0; // Tie
          }
          showMessage("Game Over!", winnerMessage);
          
          // Emit game over event to server for online multiplayer
          if (gameMode === 'onlineMultiplayer' && onlineSocket && onlineLobbyCode) {
              onlineSocket.emit('gameAction', {
                  lobbyCode: onlineLobbyCode,
                  action: {
                      type: 'gameOver',
                      winner: winner,
                      winnerRole: winner, // Send the actual winner's role (0 for tie)
                      winnerScore: winner !== 0 ? playerScores[winner] : 0,
                      player1Score: playerScores[1],
                      player2Score: playerScores[2]
                  }
              });
              
              // Statistics will be updated by the backend socket controller for both players
          }
      }
  }

  /**
   * Redraws all existing lines on the canvas.
   */
  function redrawLines() {
      console.log("Redrawing lines. Current drawnLines array:", JSON.stringify(drawnLines));
      drawnLines.forEach((line, index) => { // drawnLines now contains full line objects
          // Defensive check for malformed line objects
          if (!line || !line.start || !line.end || typeof line.start.col === 'undefined' || typeof line.start.row === 'undefined' || typeof line.end.col === 'undefined' || typeof line.end.row === 'undefined') {
              console.error(`Malformed line object at index ${index} in drawnLines, skipping:`, line);
              return; // Skip drawing this malformed line
          }
          console.log("Attempting to draw line:", JSON.stringify(line));
          drawLine(line, (line.player === 1) ? LINE_COLOR_PLAYER1 : LINE_COLOR_PLAYER2);
      });
  }

  /**
   * Redraws all completed squares on the canvas.
   */
  function redrawSquares() {
      for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
              if (completedSquares[r][c] !== 0) {
                  drawSquareMark(r, c, completedSquares[r][c]);
              }
          }
      }
  }


  /**
   * Gets the dot at the given client coordinates.
   * @param {number} clientX - The client X coordinate.
   * @param {number} clientY - The client Y coordinate.
   * @returns {object|null} The dot object {row, col} or null if no dot is found near the coordinates.
   */
  function getDotAtCoordinates(clientX, clientY) {
      const rect = currentCanvas.getBoundingClientRect();
      const scaleX = currentCanvas.width / rect.width;
      const scaleY = currentCanvas.height / rect.height;

      const mouseX = (clientX - rect.left) * scaleX;
      const mouseY = (clientY - rect.top) * scaleY;

      let closestDot = null;
      let minDistance = Infinity;

      for (let r = 0; r <= GRID_SIZE; r++) {
          for (let c = 0; c <= GRID_SIZE; c++) {
              const dotX = c * cellSize + DOT_RADIUS + BOARD_PADDING;
              const dotY = r * cellSize + DOT_RADIUS + BOARD_PADDING;
              const dist = Math.sqrt(Math.pow(mouseX - dotX, 2) + Math.pow(mouseY - dotY, 2));

              if (dist < TOUCH_RADIUS && dist < minDistance) { // Use TOUCH_RADIUS for better mobile experience
                  minDistance = dist;
                  closestDot = { row: r, col: c };
              }
          }
      }
      return closestDot;
  }

  /**
   * Checks if a given line is valid (horizontal or vertical, adjacent dots).
   * @param {object} line - The line object.
   * @returns {boolean} True if the line is valid, false otherwise.
   */
  function isValidLine(line) {
      const { start, end } = line;
      const isHorizontal = start.row === end.row && Math.abs(start.col - end.col) === 1;
      const isVertical = start.col === end.col && Math.abs(start.row - end.row) === 1;
      return isHorizontal || isVertical;
  }

  /**
   * Checks if a line has already been drawn.
   * @param {object} newLine - The new line to check.
   * @returns {boolean} True if the line exists, false otherwise.
   */
  function isLineAlreadyDrawn(newLine) {
      const canonicalKey = getCanonicalLineKey(newLine.start, newLine.end);
      return drawnLineKeys.has(canonicalKey); // Check if the canonical key exists in the Set
  }


  /**
   * Provides enhanced visual feedback for line drawing operations.
   * @param {object} startDot - The starting dot coordinates.
   * @param {object} endDot - The ending dot coordinates.
   * @param {string} color - The color for the feedback.
   */
  function drawEnhancedPreview(startDot, endDot, color) {
      if (!startDot || !endDot) return;
      
      currentCtx.save();
      
      // Draw enhanced preview line
      currentCtx.beginPath();
      currentCtx.moveTo(startDot.col * cellSize + DOT_RADIUS + BOARD_PADDING, startDot.row * cellSize + DOT_RADIUS + BOARD_PADDING);
      currentCtx.lineTo(endDot.col * cellSize + DOT_RADIUS + BOARD_PADDING, endDot.row * cellSize + DOT_RADIUS + BOARD_PADDING);
      
      // Enhanced styling
      currentCtx.strokeStyle = color + '90'; // More opaque
      currentCtx.lineWidth = LINE_WIDTH + 3; // Thicker line
      currentCtx.lineCap = 'round';
      currentCtx.lineJoin = 'round';
      currentCtx.setLineDash([15, 8]); // Longer dashes
      currentCtx.stroke();
      
      // Add glow effect
      currentCtx.shadowColor = color;
      currentCtx.shadowBlur = 8;
      currentCtx.shadowOffsetX = 0;
      currentCtx.shadowOffsetY = 0;
      currentCtx.stroke();
      
      currentCtx.restore();
      currentCtx.setLineDash([]); // Reset line dash
  }

  /**
   * Draws a smooth animated line from start to end position.
   * @param {number} startX - Starting X coordinate.
   * @param {number} startY - Starting Y coordinate.
   * @param {number} endX - Ending X coordinate.
   * @param {number} endY - Ending Y coordinate.
   * @param {string} color - Line color.
   * @param {number} progress - Animation progress (0 to 1).
   */
  function drawSmoothLine(startX, startY, endX, endY, color, progress = 1) {
      currentCtx.save();
      currentCtx.beginPath();
      currentCtx.moveTo(startX, startY);
      
      // Calculate current position based on progress
      const currentX = startX + (endX - startX) * progress;
      const currentY = startY + (endY - startY) * progress;
      
      currentCtx.lineTo(currentX, currentY);
      currentCtx.strokeStyle = color;
      currentCtx.lineWidth = LINE_WIDTH + 2;
      currentCtx.lineCap = 'round';
      currentCtx.lineJoin = 'round';
      currentCtx.stroke();
      
      // Add glow effect
      currentCtx.shadowColor = color;
      currentCtx.shadowBlur = 4;
      currentCtx.shadowOffsetX = 0;
      currentCtx.shadowOffsetY = 0;
      currentCtx.stroke();
      
      currentCtx.restore();
  }

  /**
   * Handles mouse/touch down event on the canvas.
   * @param {MouseEvent|TouchEvent} event - The event object.
   */
  function handleCanvasStart(event) {
      // Prevent user input if it's AI's turn in single-player mode
      if (gameMode === 'singlePlayer' && playerTurn === 2) {
          console.log("User input ignored: AI's turn.");
          return;
      }
      
      // Prevent user input if it's not this player's turn in online multiplayer
      if (gameMode === 'onlineMultiplayer' && playerTurn !== onlinePlayerRole) {
          console.log("User input ignored: Not this player's turn in online multiplayer.");
          return;
      }

      if (gameOver) return;
      event.preventDefault(); // Prevent scrolling on touch devices

      // Validate canvas context
      if (!currentCtx) {
          console.error("Canvas context not available");
          return;
      }

      let clientX, clientY;
      try {
          if (event.touches && event.touches.length > 0) {
              clientX = event.touches[0].clientX;
              clientY = event.touches[0].clientY;
          } else if (event.clientX !== undefined && event.clientY !== undefined) {
              clientX = event.clientX;
              clientY = event.clientY;
          } else {
              console.error("Unable to get coordinates from event");
              return;
          }
      } catch (error) {
          console.error("Error getting coordinates:", error);
          return;
      }

      // Initialize drag variables
      dragStartX = clientX;
      dragStartY = clientY;
      dragDistance = 0;
      isDragging = false;
      lastDragTime = Date.now();
      dragVelocity = { x: 0, y: 0 };

      selectedDot = getDotAtCoordinates(clientX, clientY);
      if (selectedDot) {
          isDrawingLine = true;
          
          // Enhanced visual feedback for selected dot
          drawBoard();
          redrawLines();
          redrawSquares();
          
          // Draw enhanced selection indicator
          currentCtx.save();
          currentCtx.globalAlpha = 0.3;
          currentCtx.fillStyle = ACTIVE_DOT_COLOR;
          currentCtx.beginPath();
          currentCtx.arc(
              selectedDot.col * cellSize + DOT_RADIUS + BOARD_PADDING,
              selectedDot.row * cellSize + DOT_RADIUS + BOARD_PADDING,
              TOUCH_RADIUS,
              0,
              2 * Math.PI
          );
          currentCtx.fill();
          currentCtx.restore();
          
          drawDot(selectedDot.row, selectedDot.col, ACTIVE_DOT_COLOR);
      }
  }

  /**
   * Handles mouse/touch move event on the canvas.
   * @param {MouseEvent|TouchEvent} event - The event object.
   */
  function handleCanvasMove(event) {
      // Prevent user input if it's AI's turn in single-player mode
      if (gameMode === 'singlePlayer' && playerTurn === 2) {
          return;
      }
      
      // Prevent user input if it's not this player's turn in online multiplayer
      if (gameMode === 'onlineMultiplayer' && playerTurn !== onlinePlayerRole) {
          return;
      }

      if (gameOver || !isDrawingLine || !selectedDot) return;
      event.preventDefault(); // Prevent scrolling on touch devices

      // Validate canvas context
      if (!currentCtx) {
          console.error("Canvas context not available");
          return;
      }

      let clientX, clientY;
      try {
          if (event.touches && event.touches.length > 0) {
              clientX = event.touches[0].clientX;
              clientY = event.touches[0].clientY;
          } else if (event.clientX !== undefined && event.clientY !== undefined) {
              clientX = event.clientX;
              clientY = event.clientY;
          } else {
              console.error("Unable to get coordinates from event");
              return;
          }
      } catch (error) {
          console.error("Error getting coordinates:", error);
          return;
      }

      // Calculate drag distance and velocity
      const currentTime = Date.now();
      const deltaX = clientX - dragStartX;
      const deltaY = clientY - dragStartY;
      dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      const timeDiff = currentTime - lastDragTime;
      if (timeDiff > 0) {
          dragVelocity.x = deltaX / timeDiff;
          dragVelocity.y = deltaY / timeDiff;
      }
      lastDragTime = currentTime;

      // Start dragging if threshold is met
      if (dragDistance > DRAG_THRESHOLD && !isDragging) {
          isDragging = true;
      }

      // Get current mouse/touch position in canvas coordinates
      const rect = currentCanvas.getBoundingClientRect();
      const scaleX = currentCanvas.width / rect.width;
      const scaleY = currentCanvas.height / rect.height;
      const mouseX = (clientX - rect.left) * scaleX;
      const mouseY = (clientY - rect.top) * scaleY;

      // Find the closest valid end dot
      const currentDot = getDotAtCoordinates(clientX, clientY);
      let bestEndDot = null;
      let minDistance = Infinity;

      if (selectedDot) {
          // Check all adjacent dots (up, down, left, right)
          const adjacents = [
              { row: selectedDot.row - 1, col: selectedDot.col }, // up
              { row: selectedDot.row + 1, col: selectedDot.col }, // down
              { row: selectedDot.row, col: selectedDot.col - 1 }, // left
              { row: selectedDot.row, col: selectedDot.col + 1 }  // right
          ];

          for (const adj of adjacents) {
              if (adj.row < 0 || adj.row > GRID_SIZE || adj.col < 0 || adj.col > GRID_SIZE) continue;
              
              const line = { start: selectedDot, end: adj, player: playerTurn };
              if (!isValidLine(line)) continue;
              
              const canonicalKey = getCanonicalLineKey(line.start, line.end);
              if (drawnLineKeys.has(canonicalKey)) continue;

              // Calculate distance from mouse to line midpoint
              const midX = ((selectedDot.col + adj.col) / 2) * cellSize + DOT_RADIUS + BOARD_PADDING;
              const midY = ((selectedDot.row + adj.row) / 2) * cellSize + DOT_RADIUS + BOARD_PADDING;
              const dist = Math.sqrt(Math.pow(mouseX - midX, 2) + Math.pow(mouseY - midY, 2));
              
              if (dist < LINE_SELECT_RADIUS && dist < minDistance) {
                  minDistance = dist;
                  bestEndDot = adj;
              }
          }
      }

      // Redraw everything for smooth preview
      drawBoard();
      redrawLines();
      redrawSquares();
      
      // Enhanced visual feedback for selected dot
      currentCtx.save();
      currentCtx.globalAlpha = 0.3;
      currentCtx.fillStyle = ACTIVE_DOT_COLOR;
      currentCtx.beginPath();
      currentCtx.arc(
          selectedDot.col * cellSize + DOT_RADIUS + BOARD_PADDING,
          selectedDot.row * cellSize + DOT_RADIUS + BOARD_PADDING,
          TOUCH_RADIUS,
          0,
          2 * Math.PI
      );
      currentCtx.fill();
      currentCtx.restore();
      
      drawDot(selectedDot.row, selectedDot.col, ACTIVE_DOT_COLOR);

      // Draw preview line to current mouse position
      if (isDragging) {
          // Draw a smooth line from start dot to current mouse position
          currentCtx.save();
          currentCtx.beginPath();
          currentCtx.moveTo(
              selectedDot.col * cellSize + DOT_RADIUS + BOARD_PADDING,
              selectedDot.row * cellSize + DOT_RADIUS + BOARD_PADDING
          );
          currentCtx.lineTo(mouseX, mouseY);
          
          // Enhanced preview line styling
          const previewColor = (playerTurn === 1) ? LINE_COLOR_PLAYER1 : LINE_COLOR_PLAYER2;
          currentCtx.strokeStyle = previewColor + '80';
          currentCtx.lineWidth = LINE_WIDTH + 2;
          currentCtx.lineCap = 'round';
          currentCtx.lineJoin = 'round';
          currentCtx.setLineDash([12, 6]);
          currentCtx.stroke();
          
          // Add glow effect
          currentCtx.shadowColor = previewColor;
          currentCtx.shadowBlur = 6;
          currentCtx.shadowOffsetX = 0;
          currentCtx.shadowOffsetY = 0;
          currentCtx.stroke();
          
          currentCtx.restore();
          currentCtx.setLineDash([]);
      }

      // If we found a valid end dot, highlight it and show the final preview
      if (bestEndDot) {
          // Enhanced visual feedback for potential end dot
          currentCtx.save();
          currentCtx.globalAlpha = 0.4;
          currentCtx.fillStyle = ACTIVE_DOT_COLOR;
          currentCtx.beginPath();
          currentCtx.arc(
              bestEndDot.col * cellSize + DOT_RADIUS + BOARD_PADDING,
              bestEndDot.row * cellSize + DOT_RADIUS + BOARD_PADDING,
              TOUCH_RADIUS * 0.8,
              0,
              2 * Math.PI
          );
          currentCtx.fill();
          currentCtx.restore();
          
          drawDot(bestEndDot.row, bestEndDot.col, ACTIVE_DOT_COLOR);
          
          // Draw the final preview line
          currentCtx.save();
          currentCtx.beginPath();
          currentCtx.moveTo(
              selectedDot.col * cellSize + DOT_RADIUS + BOARD_PADDING,
              selectedDot.row * cellSize + DOT_RADIUS + BOARD_PADDING
          );
          currentCtx.lineTo(
              bestEndDot.col * cellSize + DOT_RADIUS + BOARD_PADDING,
              bestEndDot.row * cellSize + DOT_RADIUS + BOARD_PADDING
          );
          
          const finalPreviewColor = (playerTurn === 1) ? LINE_COLOR_PLAYER1 : LINE_COLOR_PLAYER2;
          currentCtx.strokeStyle = finalPreviewColor + 'A0';
          currentCtx.lineWidth = LINE_WIDTH + 3;
          currentCtx.lineCap = 'round';
          currentCtx.lineJoin = 'round';
          currentCtx.setLineDash([15, 8]);
          currentCtx.stroke();
          
          // Add stronger glow for final preview
          currentCtx.shadowColor = finalPreviewColor;
          currentCtx.shadowBlur = 8;
          currentCtx.shadowOffsetX = 0;
          currentCtx.shadowOffsetY = 0;
          currentCtx.stroke();
          
          currentCtx.restore();
          currentCtx.setLineDash([]);
      }
  }

  /**
   * Handles mouse/touch up event on the canvas.
   * @param {MouseEvent|TouchEvent} event - The event object.
   */
  function handleCanvasEnd(event) {
      // Prevent user input if it's AI's turn in single-player mode
      if (gameMode === 'singlePlayer' && playerTurn === 2) {
          // Reset drawing state and redraw board even if AI turn, to clear any accidental previews
          selectedDot = null;
          isDrawingLine = false;
          isDragging = false;
          drawBoard();
          redrawLines();
          redrawSquares();
          return;
      }
      
      // Prevent user input if it's not this player's turn in online multiplayer
      if (gameMode === 'onlineMultiplayer' && playerTurn !== onlinePlayerRole) {
          selectedDot = null;
          isDrawingLine = false;
          isDragging = false;
          drawBoard();
          redrawLines();
          redrawSquares();
          return;
      }

      if (gameOver || !isDrawingLine || !selectedDot) {
          selectedDot = null;
          isDrawingLine = false;
          isDragging = false;
          drawBoard();
          redrawLines();
          redrawSquares();
          return;
      }
      event.preventDefault(); // Prevent scrolling on touch devices

      // Validate canvas context
      if (!currentCtx) {
          console.error("Canvas context not available");
          return;
      }

      let clientX, clientY;
      try {
          if (event.changedTouches && event.changedTouches.length > 0) { // For touchend, use changedTouches
              clientX = event.changedTouches[0].clientX;
              clientY = event.changedTouches[0].clientY;
          } else if (event.clientX !== undefined && event.clientY !== undefined) {
              clientX = event.clientX;
              clientY = event.clientY;
          } else {
              console.error("Unable to get coordinates from event");
              return;
          }
      } catch (error) {
          console.error("Error getting coordinates:", error);
          return;
      }

      // Enhanced line detection with better tolerance for smooth drawing
      let bestLine = null;
      let minDist = Infinity;
      
      if (selectedDot) {
          // Get current mouse/touch position in canvas coordinates
          const rect = currentCanvas.getBoundingClientRect();
          const scaleX = currentCanvas.width / rect.width;
          const scaleY = currentCanvas.height / rect.height;
          const mouseX = (clientX - rect.left) * scaleX;
          const mouseY = (clientY - rect.top) * scaleY;
          
          // Check all adjacent dots (up, down, left, right)
          const adjacents = [
              { row: selectedDot.row - 1, col: selectedDot.col }, // up
              { row: selectedDot.row + 1, col: selectedDot.col }, // down
              { row: selectedDot.row, col: selectedDot.col - 1 }, // left
              { row: selectedDot.row, col: selectedDot.col + 1 }  // right
          ];
          
          for (const adj of adjacents) {
              if (adj.row < 0 || adj.row > GRID_SIZE || adj.col < 0 || adj.col > GRID_SIZE) continue;
              const line = { start: selectedDot, end: adj, player: playerTurn };
              if (!isValidLine(line)) continue;
              const canonicalKey = getCanonicalLineKey(line.start, line.end);
              if (drawnLineKeys.has(canonicalKey)) continue;
              
              // Find midpoint of the line
              const midX = ((selectedDot.col + adj.col) / 2) * cellSize + DOT_RADIUS + BOARD_PADDING;
              const midY = ((selectedDot.row + adj.row) / 2) * cellSize + DOT_RADIUS + BOARD_PADDING;
              const dist = Math.sqrt(Math.pow(mouseX - midX, 2) + Math.pow(mouseY - midY, 2));
              
              // Enhanced detection: consider both distance and drag state
              const effectiveRadius = isDragging ? LINE_SELECT_RADIUS * 1.5 : LINE_SELECT_RADIUS;
              if (dist < effectiveRadius && dist < minDist) {
                  minDist = dist;
                  bestLine = { line, canonicalKey };
              }
          }
      }

      // Use bestLine if found, else fallback to old logic (for mouse precision)
      let finalLine = null;
      let finalKey = null;
      if (bestLine) {
          finalLine = bestLine.line;
          finalKey = bestLine.canonicalKey;
      } else {
          // Fallback: use original logic with enhanced tolerance
          const endDot = getDotAtCoordinates(clientX, clientY);
          if (endDot && selectedDot && (endDot.row !== selectedDot.row || endDot.col !== selectedDot.col)) {
              const line = { start: selectedDot, end: endDot, player: playerTurn };
              const canonicalKey = getCanonicalLineKey(line.start, line.end);
              if (isValidLine(line) && !drawnLineKeys.has(canonicalKey)) {
                  finalLine = line;
                  finalKey = canonicalKey;
              }
          }
      }

      if (finalLine && finalKey) {
          // Check if player has rolled dice and has lines to draw
          if (linesToDraw <= 0 && !hasSpecialLine) {
              // Player hasn't rolled dice or doesn't have lines to draw
              showMessage("Roll the Dice First!", "You need to roll the dice to get lines to draw. Click on the dice to roll!", () => {
                  // Reset drawing state after showing message
                  selectedDot = null;
                  isDrawingLine = false;
                  isDragging = false;
                  drawBoard();
                  redrawLines();
                  redrawSquares();
              });
              return;
          }
          
          // ... existing code for drawing the line, updating state, etc. ...
          // (Copy from the original handleCanvasEnd logic for line drawing)
          // --- BEGIN COPIED BLOCK ---
          if (linesToDraw > 0 || hasSpecialLine) {
              drawnLines.push(finalLine); // Add the full line object to the array
              drawnLineKeys.add(finalKey); // Add canonical key to the Set
              drawLine(finalLine, (playerTurn === 1) ? LINE_COLOR_PLAYER1 : LINE_COLOR_PLAYER2);
              // Emit line draw to other player in online multiplayer
              if (gameMode === 'onlineMultiplayer' && onlineSocket && onlineLobbyCode) {
                  onlineSocket.emit('gameAction', {
                      lobbyCode: onlineLobbyCode,
                      action: {
                          type: 'drawLine',
                          line: finalLine
                      }
                  });
              }
              // Check for completed squares and update score
              let squaresCompletedThisTurn = 0;
              // Check for horizontal square completion
              if (finalLine.start.row === finalLine.end.row) { // Horizontal line
                  const minCol = Math.min(finalLine.start.col, finalLine.end.col);
                  if (finalLine.start.row > 0) {
                      if (checkAndCompleteSquare(finalLine.start.row - 1, minCol)) {
                          squaresCompletedThisTurn++;
                      }
                  }
                  if (finalLine.start.row < GRID_SIZE) {
                      if (checkAndCompleteSquare(finalLine.start.row, minCol)) {
                          squaresCompletedThisTurn++;
                      }
                  }
              } else { // Vertical line
                  const minRow = Math.min(finalLine.start.row, finalLine.end.row);
                  if (finalLine.start.col > 0) {
                      if (checkAndCompleteSquare(minRow, finalLine.start.col - 1)) {
                          squaresCompletedThisTurn++;
                      }
                  }
                  if (finalLine.start.col < GRID_SIZE) {
                      if (checkAndCompleteSquare(minRow, finalLine.start.col)) {
                          squaresCompletedThisTurn++;
                      }
                  }
              }
              if (squaresCompletedThisTurn > 0) {
                  playerScores[playerTurn] += squaresCompletedThisTurn;
              }
              // Always decrement linesToDraw for a regular line
              if (linesToDraw > 0) {
                  linesToDraw--;
              }
              updateScoreDisplay(); // Update display after all changes
              checkGameOver();
              // Determine if turn switches
              if (linesToDraw <= 0) {
                  if (twoPlayerExtraRollAfterFinish) {
                      // Consume the extra roll and allow player to roll again now (works in all modes)
                      twoPlayerExtraRollAfterFinish = false;
                      hasRolledDice = false; // allow rolling again
                      showMessage('Lucky Draw', 'Your bonus roll is ready! Roll the dice again.');
                      updateDiceInteractivity();
                  } else {
                      // For online multiplayer, only the current player should trigger turn switch
                      if (gameMode === 'onlineMultiplayer' && playerTurn === onlinePlayerRole) {
                          switchTurn();
                      } else if (gameMode !== 'onlineMultiplayer') {
                          switchTurn();
                      }
                  }
              }
          }
          // --- END COPIED BLOCK ---
      }
      
      // Reset drawing state and redraw board
      selectedDot = null;
      isDrawingLine = false;
      isDragging = false;
      drawBoard();
      redrawLines();
      redrawSquares();
  }


  /**
   * Handles the AI's turn in single-player mode.
   */
  function aiMakeMove() {
      console.log(`AI Make Move START: Player Turn: ${playerTurn}, Lines to Draw: ${linesToDraw}`);
      if (gameOver) {
          console.log("AI: Game is over, not making a move.");
          return;
      }

      // If AI needs to roll dice (no lines yet)
      if (linesToDraw === 0) {
          console.log("AI: No lines to draw and no special line. Rolling dice.");
          
          // Generate random dice value and animate the roll
          const randomValue = Math.floor(Math.random() * 6) + 1;
          console.log(`AI: Rolling dice, got ${randomValue}`);
          
          // Use proper dice animation
          animateDiceRoll(randomValue, () => {
              // Set the values after animation completes
              diceValue = randomValue;
              linesToDraw = randomValue;
              hasRolledDice = true;
              displayDiceValue(diceValue);
              updateScoreDisplay();
              
              console.log(`AI: Dice animation complete. Got ${diceValue} lines to draw`);
              
              // Check if Lucky Draw wheel should be triggered (only when enabled)
              if (isLuckyWheelEnabled && diceValue === 6 && !hasSpunLuckyWheelThisTurn) {
                  console.log('[LUCKY WHEEL] AI rolled 6, triggering Lucky Draw wheel');
                  triggerLuckyWheel();
                  return; // Let the Lucky Draw wheel handle the rest
              }
              
              // If no Lucky Draw or Lucky Wheel is disabled, continue with AI moves
              setTimeout(aiMakeMove, AI_MOVE_DELAY);
          });
          return;

      }

      // If AI has lines to draw
      if (linesToDraw > 0) {
          const availableLines = [];
          for (let r = 0; r <= GRID_SIZE; r++) {
              for (let c = 0; c <= GRID_SIZE; c++) {
                  // Horizontal lines
                  if (c < GRID_SIZE) {
                      const line = { start: { row: r, col: c }, end: { row: r, col: c + 1 } };
                      if (isValidLine(line) && !isLineAlreadyDrawn(line)) {
                          availableLines.push(line);
                      }
                  }
                  // Vertical lines
                  if (r < GRID_SIZE) {
                      const line = { start: { row: r, col: c }, end: { row: r + 1, col: c } };
                      if (isValidLine(line) && !isLineAlreadyDrawn(line)) {
                          availableLines.push(line);
                      }
                  }
              }
          }
          console.log("AI: Found available lines count:", availableLines.length);

          let chosenLine = null;

          // Prioritize completing a square
          for (const line of availableLines) {
              const tempDrawnLineKeys = new Set(drawnLineKeys); // Create a temporary set
              tempDrawnLineKeys.add(getCanonicalLineKey(line.start, line.end)); // Add hypothetical line

              let completesSquareForAI = false;
              if (line.start.row === line.end.row) { // Horizontal line
                  const minCol = Math.min(line.start.col, line.end.col);
                  if (line.start.row > 0 && checkHypotheticalSquareCompletion(line.start.row - 1, minCol, tempDrawnLineKeys)) completesSquareForAI = true;
                  if (line.start.row < GRID_SIZE && checkHypotheticalSquareCompletion(line.start.row, minCol, tempDrawnLineKeys)) completesSquareForAI = true;
              } else { // Vertical line
                  const minRow = Math.min(line.start.row, line.end.row);
                  if (line.start.col > 0 && checkHypotheticalSquareCompletion(minRow, line.start.col - 1, tempDrawnLineKeys)) completesSquareForAI = true;
                  if (line.start.col < GRID_SIZE && checkHypotheticalSquareCompletion(minRow, line.start.col, tempDrawnLineKeys)) completesSquareForAI = true;
              }
              if (completesSquareForAI) {
                  chosenLine = line;
                  console.log("AI: Chosen line (completes square):", chosenLine);
                  break; // Found a winning move, take it!
              }
          }

          // If no square can be completed, pick a random available line
          if (!chosenLine && availableLines.length > 0) {
              chosenLine = availableLines[Math.floor(Math.random() * availableLines.length)];
              console.log("AI: No square to complete, picking random line:", chosenLine);
          }

          if (chosenLine) {
              setTimeout(() => {
                  console.log("AI: Executing draw for line:", chosenLine);
                  const canonicalKey = getCanonicalLineKey(chosenLine.start, chosenLine.end);
                  const lineToDraw = { ...chosenLine, player: playerTurn }; // Add player info
                  drawnLines.push(lineToDraw); // Add the full line object to the array
                  drawnLineKeys.add(canonicalKey); // Add canonical key to the Set

                  drawLine(lineToDraw, (playerTurn === 1) ? LINE_COLOR_PLAYER1 : LINE_COLOR_PLAYER2);
                  
                  // AI's turn logic for decrementing linesToDraw
                  let squaresCompletedThisTurn = 0;
                  if (lineToDraw.start.row === lineToDraw.end.row) { // Horizontal line
                      const minCol = Math.min(lineToDraw.start.col, lineToDraw.end.col);
                      if (lineToDraw.start.row > 0) {
                          console.log(`  AI: Checking square above: (${lineToDraw.start.row - 1}, ${minCol})`);
                          if (checkAndCompleteSquare(lineToDraw.start.row - 1, minCol)) {
                              squaresCompletedThisTurn++;
                          }
                      }
                      if (lineToDraw.start.row < GRID_SIZE) {
                          console.log(`  AI: Checking square below: (${lineToDraw.start.row}, ${minCol})`);
                          if (checkAndCompleteSquare(lineToDraw.start.row, minCol)) {
                              squaresCompletedThisTurn++;
                          }
                      }
                  } else { // Vertical line
                      const minRow = Math.min(lineToDraw.start.row, lineToDraw.end.row);
                      if (lineToDraw.start.col > 0) {
                          console.log(`  AI: Checking square left: (${minRow}, ${lineToDraw.start.col - 1})`);
                          if (checkAndCompleteSquare(minRow, lineToDraw.start.col - 1)) {
                              squaresCompletedThisTurn++;
                          }
                      }
                      if (lineToDraw.start.col < GRID_SIZE) {
                          console.log(`  AI: Checking square right: (${minRow}, ${lineToDraw.start.col})`);
                          if (checkAndCompleteSquare(minRow, lineToDraw.start.col)) {
                              squaresCompletedThisTurn++;
                          }
                      }
                  }

                  console.log(`AI: Total squares completed this turn: ${squaresCompletedThisTurn}`);
                  if (squaresCompletedThisTurn > 0) {
                      playerScores[playerTurn] += squaresCompletedThisTurn;
                      console.log(`AI: Player ${playerTurn} score updated to: ${playerScores[playerTurn]}.`);
                  }

                  console.log(`AI: Before line consumption - linesToDraw: ${linesToDraw}`);
                  if (linesToDraw > 0) {
                      linesToDraw--;
                      console.log(`AI: Lines to draw decremented to: ${linesToDraw}.`);
                  }

                  drawBoard(); // Clear and redraw
                  redrawLines(); // Redraw all lines
                  redrawSquares(); // Redraw all squares
                  updateScoreDisplay();
                  checkGameOver();

                  // After drawing, if AI still has lines to draw, make another move
                  if (linesToDraw > 0) {
                      console.log(`AI: Remaining lines: ${linesToDraw}. Scheduling next move.`);
                      setTimeout(aiMakeMove, AI_MOVE_DELAY);
                  } else {
                      console.log("AI: No more lines to draw. Checking for extra roll.");
                      // Check if AI has an extra roll from Double Trouble
                      if (twoPlayerExtraRollAfterFinish) {
                          console.log("AI: Has extra roll from Double Trouble, rolling dice again.");
                          // Consume the extra roll and allow AI to roll dice again
                          twoPlayerExtraRollAfterFinish = false;
                          hasRolledDice = false; // allow rolling again
                          // AI will roll dice and continue with its turn
                          setTimeout(aiMakeMove, AI_MOVE_DELAY);
                      } else {
                          console.log(`[AI TURN END] AI finished drawing all lines, switching turn from Player ${playerTurn} to Player 1`);
                          switchTurn();
                      }
                  }
              }, AI_MOVE_DELAY);
          } else {
              console.log("AI: No valid line could be chosen from available lines. Checking for extra roll.");
              // Check if AI has an extra roll from Double Trouble even when no lines available
              if (twoPlayerExtraRollAfterFinish) {
                  console.log("AI: Has extra roll from Double Trouble, rolling dice again.");
                  // Consume the extra roll and allow AI to roll dice again
                  twoPlayerExtraRollAfterFinish = false;
                  hasRolledDice = false; // allow rolling again
                  // AI will roll dice and continue with its turn
                  setTimeout(aiMakeMove, AI_MOVE_DELAY);
              } else {
                  console.log("AI: No valid lines and no extra roll. Switching turn.");
                  switchTurn();
              }
          }
      } else {
          console.log("AI Make Move END: No lines to draw. Checking for extra roll.");
          // Check if AI has an extra roll from Double Trouble
          if (twoPlayerExtraRollAfterFinish) {
              console.log("AI: Has extra roll from Double Trouble, rolling dice again.");
              // Consume the extra roll and allow AI to roll dice again
              twoPlayerExtraRollAfterFinish = false;
              hasRolledDice = false; // allow rolling again
              // AI will roll dice and continue with its turn
              setTimeout(aiMakeMove, AI_MOVE_DELAY);
          } else {
              console.log("AI: No lines to draw and no extra roll. Switching turn.");
              // This case should ideally not be reached if rollDice is called first and sets linesToDraw
              switchTurn();
          }
      }
  }

  /**
   * Checks if a hypothetical square completion is possible with a given set of lines.
   * This is used for AI's lookahead.
   * @param {number} r - Row index of the top-left dot of the potential square.
   * @param {number} c - Column index of the top-left dot of the potential square.
   * @param {Set<string>} linesSet - The set of canonical line keys to check against.
   * @returns {boolean} True if a square would be completed.
   */
  function checkHypotheticalSquareCompletion(r, c, linesSet) {
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;

      // Define the four lines that form this square in canonical form
      const topLineKey = getCanonicalLineKey({row: r, col: c}, {row: r, col: c + 1});
      const bottomLineKey = getCanonicalLineKey({row: r + 1, col: c}, {row: r + 1, col: c + 1});
      const leftLineKey = getCanonicalLineKey({row: r, col: c}, {row: r + 1, col: c});
      const rightLineKey = getCanonicalLineKey({row: r, col: c + 1}, {row: r + 1, col: c + 1});

      return linesSet.has(topLineKey) && linesSet.has(bottomLineKey) &&
             linesSet.has(leftLineKey) && linesSet.has(rightLineKey);
  }


  /**
   * Checks if a given square has 3 sides drawn.
   * @param {number} r - Row index of the top-left dot of the potential square.
   * @param {number} c - Column index of the top-left dot of the potential square.
   * @param {Set<string>} linesSet - The set of canonical line keys to check against.
   * @returns {boolean} True if the square has 3 sides, false otherwise.
   */
  function isThreeSided(r, c, linesSet) {
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;

      let sidesCount = 0;
      const hasLine = (startRow, startCol, endRow, endCol) => {
          return linesSet.has(getCanonicalLineKey({row: startRow, col: startCol}, {row: endRow, col: endCol}));
      };

      if (hasLine(r, c, r, c + 1)) sidesCount++; // Top
      if (hasLine(r + 1, c, r + 1, c + 1)) sidesCount++; // Bottom
      if (hasLine(r, c, r + 1, c)) sidesCount++; // Left
      if (hasLine(r, c + 1, r + 1, c + 1)) sidesCount++; // Right

      return sidesCount === 3;
  }


  /**
   * Starts a new game based on the selected mode.
   * @param {string} mode - 'singlePlayer' or 'twoPlayers'.
   */
  function startGame(mode, onlineOptions) {
      console.log('startGame called with:', { mode, onlineOptions });
      gameMode = mode;
      resetGameState();
      
      // Ensure canvas contexts are initialized
      initializeCanvasContexts();

      if (gameMode === 'singlePlayer') {
          currentCanvas = spGameCanvas;
          currentCtx = spCtx;
          const inputValue = spPlayerNameInput.value.trim();
          if (inputValue) {
            playerNames[1] = inputValue;
          } else {
            // Fallback to current user's username or 'Username'
            let currentUser = null;
            if (window.authService) {
              currentUser = window.authService.getCurrentUser();
            }
            
            // If no user from auth service, try to get from localStorage directly
            if (!currentUser) {
              try {
                const userData = localStorage.getItem('dotsAndBoxesUser');
                if (userData) {
                  currentUser = JSON.parse(userData);
                }
              } catch (error) {
                console.error('Error reading user from localStorage:', error);
              }
            }
            
            playerNames[1] = (currentUser && currentUser.username) ? currentUser.username : 'Username';
          }
          playerNames[2] = 'AI Agent';
          spPlayer1NameDisplay.textContent = playerNames[1] + ' (X)';
          spPlayer2NameDisplay.textContent = playerNames[2] + ' (O)';
          showScreen(spGameScreen);
      } else if (gameMode === 'twoPlayers') {
          currentCanvas = tpGameCanvas;
          currentCtx = tpCtx;
          const inputValue = tpPlayer1NameInput.value.trim();
          if (inputValue) {
            playerNames[1] = inputValue;
          } else {
            // Fallback to current user's username or 'Username'
            let currentUser = null;
            if (window.authService) {
              currentUser = window.authService.getCurrentUser();
            }
            
            // If no user from auth service, try to get from localStorage directly
            if (!currentUser) {
              try {
                const userData = localStorage.getItem('dotsAndBoxesUser');
                if (userData) {
                  currentUser = JSON.parse(userData);
                }
              } catch (error) {
                console.error('Error reading user from localStorage:', error);
              }
            }
            
            playerNames[1] = (currentUser && currentUser.username) ? currentUser.username : 'Username';
          }
          playerNames[2] = tpPlayer2NameInput.value.trim() || 'Player 2';
          tpPlayer1NameDisplay.textContent = playerNames[1] + ' (X)';
          tpPlayer2NameDisplay.textContent = playerNames[2] + ' (O)';
          showScreen(tpGameScreen);
      } else if (gameMode === 'onlineMultiplayer') {
          console.log('Starting online multiplayer game...');
          currentCanvas = onlineGameCanvas;
          currentCtx = onlineCtx;
          
          // Set online multiplayer context
          onlinePlayerRole = onlineOptions && onlineOptions.playerRole ? onlineOptions.playerRole : 1;
          onlineLobbyCode = onlineOptions && onlineOptions.lobbyCode ? onlineOptions.lobbyCode : null;
          onlineSocket = onlineOptions && onlineOptions.socket ? onlineOptions.socket : window.socket;
          
          console.log('Online multiplayer context set:', { 
            onlinePlayerRole, 
            onlineLobbyCode, 
            hasSocket: !!onlineSocket 
          });
          
          // Set player names based on role
          let currentUser = null;
          if (window.authService) {
            currentUser = window.authService.getCurrentUser();
          }
          
          // If no user from auth service, try to get from localStorage directly
          if (!currentUser) {
            try {
              const userData = localStorage.getItem('dotsAndBoxesUser');
              if (userData) {
                currentUser = JSON.parse(userData);
                console.log('Online game - Found user in localStorage:', currentUser);
              }
            } catch (error) {
              console.error('Online game - Error reading user from localStorage:', error);
            }
          }
          
          console.log('Online game - Current user:', currentUser);
          const playerUsername = currentUser && currentUser.username ? currentUser.username : 'Player';
          console.log('Online game - Player username:', playerUsername);
          
          if (onlinePlayerRole === 1) {
              playerNames[1] = playerUsername;
              playerNames[2] = 'Opponent';
          } else {
              playerNames[1] = 'Opponent';
              playerNames[2] = playerUsername;
          }
          
          onlinePlayer1NameDisplay.textContent = playerNames[1] + ' (X)';
          onlinePlayer2NameDisplay.textContent = playerNames[2] + ' (O)';
          
          console.log('Player names set:', { player1: playerNames[1], player2: playerNames[2] });
          console.log('About to show online game screen...');
          
          showScreen(onlineGameScreen);
          
          // Hide lobby UI
          const onlineLobbyUI = document.getElementById('online-lobby-ui');
          if (onlineLobbyUI) {
            onlineLobbyUI.style.display = 'none';
            console.log('Lobby UI hidden');
          }
          
          console.log('Online multiplayer game started successfully');
      }

      // Check if canvas and context are valid
      if (!currentCanvas || !currentCtx) {
          console.error('Canvas or context not found for game mode:', gameMode);
          return;
      }

      initializeCanvasDimensions();
      drawBoard();
      updateScoreDisplay();
      displayDiceValue(0); // Set initial dice display
      
      // Initialize dice interactivity
      updateDiceInteractivity();
      
      // Remove existing event listeners safely
      if (currentCanvas) {
          currentCanvas.removeEventListener('mousedown', handleCanvasStart);
          currentCanvas.removeEventListener('mousemove', handleCanvasMove);
          currentCanvas.removeEventListener('mouseup', handleCanvasEnd);
          currentCanvas.removeEventListener('touchstart', handleCanvasStart);
          currentCanvas.removeEventListener('touchmove', handleCanvasMove);
          currentCanvas.removeEventListener('touchend', handleCanvasEnd);

          // Add new event listeners
          currentCanvas.addEventListener('mousedown', handleCanvasStart);
          currentCanvas.addEventListener('mousemove', handleCanvasMove);
          currentCanvas.addEventListener('mouseup', handleCanvasEnd);
          currentCanvas.addEventListener('touchstart', handleCanvasStart);
          currentCanvas.addEventListener('touchmove', handleCanvasMove);
          currentCanvas.addEventListener('touchend', handleCanvasEnd);
      }

      const currentDiceDisplayEl = (gameMode === 'singlePlayer') ? spDiceDisplayEl : 
                                  (gameMode === 'twoPlayers') ? tpDiceDisplayEl : onlineDiceDisplayEl;
      
      if (currentDiceDisplayEl) {
          currentDiceDisplayEl.removeEventListener('click', handleDiceClick);
          currentDiceDisplayEl.addEventListener('click', handleDiceClick);
      }

      // Show game start message after everything is set up
      showMessage("Game Start!", `It's ${playerNames[playerTurn]}'s turn. Roll the dice to begin!`);

      // Single player games should always start with human player (Player 1)
      if (gameMode === 'singlePlayer') {
          playerTurn = 1; // Force start with human player
          console.log('[GAME START] Single player game starting with human player (Player 1)');
          updateScoreDisplay(); // Update display to show human player's turn
      }
  }

  /**
   * Event Listeners for screen navigation and game actions.
   */
  singlePlayerBtn.addEventListener('click', () => {
      showScreen(singlePlayerSetupScreen);
  });

  twoPlayerBtn.addEventListener('click', () => {
      showScreen(twoPlayerSetupScreen);
  });

  onlineGameBtn.addEventListener('click', () => {
      const onlineLobbyUI = document.getElementById('online-lobby-ui');
      if (onlineLobbyUI) onlineLobbyUI.style.display = 'block';
  });

  // Online game screen event listeners
  onlineRestartBtn.addEventListener('click', () => {
      if (gameMode === 'onlineMultiplayer') {
          showConfirmation("Restart Game", "Are you sure you want to restart the game? This will end the current session.", () => {
              // Emit leave lobby event to notify opponent
              if (onlineSocket && onlineLobbyCode) {
                  onlineSocket.emit('leaveLobby', onlineLobbyCode);
              }
              showScreen(homeScreen);
          }, () => {});
      }
  });

  onlineBackToHomeBtn.addEventListener('click', () => {
      if (gameMode === 'onlineMultiplayer') {
          if (gameOver) {
              // If game is over, just leave lobby and go home without confirmation
              if (onlineSocket && onlineLobbyCode) {
                  onlineSocket.emit('leaveLobby', onlineLobbyCode);
              }
              showScreen(homeScreen);
          } else {
              showConfirmation("Leave Game", "Are you sure you want to leave the game? This will end the current session.", () => {
                  // Emit leave lobby event to notify opponent
                  if (onlineSocket && onlineLobbyCode) {
                      onlineSocket.emit('leaveLobby', onlineLobbyCode);
                  }
                  showScreen(homeScreen);
              }, () => {});
          }
      }
  });

  startSinglePlayerGameBtn.addEventListener('click', () => startGame('singlePlayer'));
  startTwoPlayerGameBtn.addEventListener('click', () => startGame('twoPlayers'));

  // Setup screen back button handlers
  spSetupBackToHomeBtn.addEventListener('click', () => {
      showScreen(homeScreen);
  });
  tpSetupBackToHomeBtn.addEventListener('click', () => {
      showScreen(homeScreen);
  });

  messageBoxCloseBtn.addEventListener('click', hideMessageBox);

  spRestartBtn.addEventListener('click', () => {
      if (gameOver) {
          startGame('singlePlayer'); // No confirmation if game is over
      } else {
          showConfirmation("Restart Game?", "Are you sure you want to restart the single player game?",
              () => startGame('singlePlayer'));
      }
  });
  spBackToHomeBtn.addEventListener('click', () => {
      if (gameOver) {
          showScreen(homeScreen); // No confirmation if game is over
      } else {
          showConfirmation("Quit Game?", "Are you sure you want to quit the current game and go back to home?",
              () => showScreen(homeScreen));
      }
  });

  tpRestartBtn.addEventListener('click', () => {
      if (gameOver) {
          startGame('twoPlayers'); // No confirmation if game is over
      } else {
          showConfirmation("Restart Game?", "Are you sure you want to restart the two player game?",
              () => startGame('twoPlayers'));
      }
  });
  tpBackToHomeBtn.addEventListener('click', () => {
      if (gameOver) {
          showScreen(homeScreen); // No confirmation if game is over
      } else {
          showConfirmation("Quit Game?", "Are you sure you want to quit the current game and go back to home?",
              () => showScreen(homeScreen));
      }
  });

  if (rulesBtnHome) rulesBtnHome.addEventListener('click', () => rulesModal && (rulesModal.style.display = 'block'));
  if (infoBtnHome) infoBtnHome.addEventListener('click', () => infoModal && (infoModal.style.display = 'block'));
  if (rulesModalCloseBtn) rulesModalCloseBtn.addEventListener('click', () => rulesModal && (rulesModal.style.display = 'none'));
  if (infoModalCloseBtn) infoModalCloseBtn.addEventListener('click', () => infoModal && (infoModal.style.display = 'none'));

  const testResultsDiv = document.createElement('div');
  testResultsDiv.id = 'test-results';
  testResultsDiv.className = 'message-box'; // Reuse message box style
  document.body.appendChild(testResultsDiv);

  function showTestResults(results) {
      let html = `<h3>Unit Test Results</h3>`;
      let allPassed = true;
      results.forEach(result => {
          if (result.passed) {
              html += `<p style="color: green;">&#10004; ${result.name}</p>`;
          } else {
              allPassed = false;
              html += `<p style="color: red;">&#10008; ${result.name}: ${result.message}</p>`;
          }
      });
      html += `<p class="font-bold mt-4" style="color: ${allPassed ? 'green' : 'red'};">All tests ${allPassed ? 'PASSED' : 'FAILED'}!</p>`;
      html += `<button onclick="hideTestResults()" class="mt-4 btn btn-secondary">Close Results</button>`;
      testResultsDiv.innerHTML = html;
      testResultsDiv.style.display = 'block';
  }

  window.hideTestResults = () => {
      testResultsDiv.style.display = 'none';
  };

  const tests = [];

  function test(name, fn) {
      tests.push({ name, fn });
  }

  function assertEqual(actual, expected, message = `Expected ${expected}, but got ${actual}`) {
      if (actual !== expected) {
          throw new Error(message);
      }
  }

  function assertTrue(condition, message = `Expected true, but got false`) {
      if (!condition) {
          throw new Error(message);
      }
  }

  function assertFalse(condition, message = `Expected false, but got true`) {
      if (condition) {
          throw new Error(message);
      }
  }

  const mockCtx = {
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      setLineDash: () => {},
      fillText: () => {},
  };

  const mockCanvas = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 500 }),
      width: 500,
      height: 500
  };

  function runAllTests() {
      const results = [];
      console.groupCollapsed("Running Unit Tests"); // Group console logs for tests
      
      const originalGameState = gameLogic.getGameState();
      const originalCurrentCtx = currentCtx;
      const originalCurrentCanvas = currentCanvas;

      currentCtx = mockCtx;
      currentCanvas = mockCanvas;
      
      cellSize = 90; // A fixed value for testing purposes

      tests.forEach(t => {
          try {
              resetGameState();
              t.fn();
              results.push({ name: t.name, passed: true });
              console.log(`%c✓ ${t.name}`, 'color: green;');
          } catch (e) {
              results.push({ name: t.name, passed: false, message: e.message });
              console.error(`%c✗ ${t.name}: ${e.message}`, 'color: red;');
          }
      });
      console.groupEnd();
      
      gameLogic.setTestState(originalGameState); // Restore game state
      currentCtx = originalCurrentCtx; // Restore actual canvas context
      currentCanvas = originalCurrentCanvas; // Restore actual canvas element

      showTestResults(results);
  }

  gameLogic.getCanonicalLineKey = getCanonicalLineKey;
  gameLogic.isValidLine = isValidLine;
  gameLogic.isLineAlreadyDrawn = isLineAlreadyDrawn;
  gameLogic.checkAndCompleteSquare = checkAndCompleteSquare;
  gameLogic.resetGameState = resetGameState;
  gameLogic.setTestState = (state) => {
      playerTurn = state.playerTurn;
      linesToDraw = state.linesToDraw;
      playerScores = { ...state.playerScores };
      drawnLines = [ ...state.drawnLines ];
      drawnLineKeys = new Set(state.drawnLineKeys); // Reconstruct Set from Array
      completedSquares = state.completedSquares.map(row => [...row]);
      gameOver = state.gameOver;
      hasSpecialLine = state.hasSpecialLine;
  };
  gameLogic.getGameState = () => ({
      playerTurn,
      linesToDraw,
      playerScores,
      drawnLines,
      drawnLineKeys: Array.from(drawnLineKeys || new Set()),
      completedSquares: completedSquares.map(row => [...row]),
      gameOver,
      hasSpecialLine
  });

  test('getCanonicalLineKey for horizontal lines (left-to-right)', () => {
      const key1 = gameLogic.getCanonicalLineKey({ row: 0, col: 0 }, { row: 0, col: 1 });
      assertEqual(key1, 'h_0_0', 'Should be h_0_0');
  });

  test('getCanonicalLineKey for horizontal lines (right-to-left)', () => {
      const key2 = gameLogic.getCanonicalLineKey({ row: 0, col: 1 }, { row: 0, col: 0 });
      assertEqual(key2, 'h_0_0', 'Should be h_0_0 for reversed order');
  });

  test('getCanonicalLineKey for vertical lines (top-to-bottom)', () => {
      const key3 = gameLogic.getCanonicalLineKey({ row: 0, col: 0 }, { row: 1, col: 0 });
      assertEqual(key3, 'v_0_0', 'Should be v_0_0');
  });

  test('getCanonicalLineKey for vertical lines (bottom-to-top)', () => {
      const key4 = gameLogic.getCanonicalLineKey({ row: 1, col: 0 }, { row: 0, col: 0 });
      assertEqual(key4, 'v_0_0', 'Should be v_0_0 for reversed order');
  });

  test('isValidLine for valid horizontal line', () => {
      const line = { start: { row: 0, col: 0 }, end: { row: 0, col: 1 } };
      assertTrue(gameLogic.isValidLine(line), 'Horizontal line (0,0)-(0,1) should be valid');
  });

  test('isValidLine for valid vertical line', () => {
      const line = { start: { row: 0, col: 0 }, end: { row: 1, col: 0 } };
      assertTrue(gameLogic.isValidLine(line), 'Vertical line (0,0)-(1,0) should be valid');
  });

  test('isValidLine for invalid diagonal line', () => {
      const line = { start: { row: 0, col: 0 }, end: { row: 1, col: 1 } };
      assertFalse(gameLogic.isValidLine(line), 'Diagonal line (0,0)-(1,1) should be invalid');
  });

  test('isValidLine for invalid non-adjacent line', () => {
      const line = { start: { row: 0, col: 0 }, end: { row: 0, col: 2 } };
      assertFalse(gameLogic.isValidLine(line), 'Non-adjacent horizontal line (0,0)-(0,2) should be invalid');
  });

  test('isLineAlreadyDrawn correctly detects drawn lines', () => {
      gameLogic.setTestState({
          playerTurn: 1,
          linesToDraw: 0,
          playerScores: { 1: 0, 2: 0 },
          drawnLines: [{ start: { row: 0, col: 0 }, end: { row: 0, col: 1 }, player: 1 }],
          drawnLineKeys: ['h_0_0'],
          completedSquares: Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0)),
          gameOver: false,
          hasSpecialLine: false
      });

      const existingLine = { start: { row: 0, col: 0 }, end: { row: 0, col: 1 } };
      assertTrue(gameLogic.isLineAlreadyDrawn(existingLine), 'Existing line should be detected as drawn');

      const nonExistentLine = { start: { row: 1, col: 0 }, end: { row: 1, col: 1 } };
      assertFalse(gameLogic.isLineAlreadyDrawn(nonExistentLine), 'Non-existent line should not be detected as drawn');

      const reversedExistingLine = { start: { row: 0, col: 1 }, end: { row: 0, col: 0 } };
      assertTrue(gameLogic.isLineAlreadyDrawn(reversedExistingLine), 'Reversed existing line should be detected as drawn');
  });

  test('checkAndCompleteSquare completes square and updates score (horizontal line)', () => {
      gameLogic.setTestState({
          playerTurn: 1,
          linesToDraw: 1, // Player has 1 line left
          playerScores: { 1: 0, 2: 0 },
          drawnLines: [
              { start: { row: 0, col: 0 }, end: { row: 1, col: 0 }, player: 2 }, // Left
              { start: { row: 0, col: 1 }, end: { row: 1, col: 1 }, player: 2 }, // Right
              { start: { row: 1, col: 0 }, end: { row: 1, col: 1 }, player: 2 }  // Bottom
          ],
          drawnLineKeys: new Set(['v_0_0', 'v_0_1', 'h_1_0']),
          completedSquares: Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0)),
          gameOver: false,
          hasSpecialLine: false
      });

      drawnLineKeys.add(gameLogic.getCanonicalLineKey({ row: 0, col: 0 }, { row: 0, col: 1 }));

      const completed = gameLogic.checkAndCompleteSquare(0, 0);
      assertTrue(completed, 'Square (0,0) should be completed');
      assertEqual(completedSquares[0][0], 1, 'Square (0,0) should be marked by Player 1');
  });

  test('checkAndCompleteSquare completes square and updates score (vertical line)', () => {
      gameLogic.setTestState({
          playerTurn: 2,
          linesToDraw: 1, // Player has 1 line left
          playerScores: { 1: 0, 2: 0 },
          drawnLines: [
              { start: { row: 0, col: 0 }, end: { row: 0, col: 1 }, player: 1 }, // Top
              { start: { row: 1, col: 0 }, end: { row: 1, col: 1 }, player: 1 }, // Bottom
              { start: { row: 0, col: 0 }, end: { row: 1, col: 0 }, player: 1 }  // Left
          ],
          drawnLineKeys: new Set(['h_0_0', 'h_1_0', 'v_0_0']),
          completedSquares: Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0)),
          gameOver: false,
          hasSpecialLine: false
      });

      drawnLineKeys.add(gameLogic.getCanonicalLineKey({ row: 0, col: 1 }, { row: 1, col: 1 }));

      const completed = gameLogic.checkAndCompleteSquare(0, 0);
      assertTrue(completed, 'Square (0,0) should be completed by Player 2');
      assertEqual(completedSquares[0][0], 2, 'Square (0,0) should be marked by Player 2');
  });

  test('checkAndCompleteSquare does not complete if less than 4 lines', () => {
      gameLogic.setTestState({
          playerTurn: 1,
          linesToDraw: 1,
          playerScores: { 1: 0, 2: 0 },
          drawnLines: [
              { start: { row: 0, col: 0 }, end: { row: 1, col: 0 }, player: 2 }, // Left
              { start: { row: 0, col: 1 }, end: { row: 1, col: 1 }, player: 2 }, // Right
          ],
          drawnLineKeys: new Set(['v_0_0', 'v_0_1']),
          completedSquares: Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0)),
          gameOver: false,
          hasSpecialLine: false
      });
      
      drawnLineKeys.add(gameLogic.getCanonicalLineKey({ row: 0, col: 0 }, { row: 0, col: 1 }));

      const completed = gameLogic.checkAndCompleteSquare(0, 0);
      assertFalse(completed, 'Square (0,0) should not be completed with only 3 lines');
      assertEqual(completedSquares[0][0], 0, 'Square (0,0) should remain uncompleted');
  });

  test('checkAndCompleteSquare does not re-complete an already completed square', () => {
      gameLogic.setTestState({
          playerTurn: 1,
          linesToDraw: 1,
          playerScores: { 1: 1, 2: 0 },
          drawnLines: [],
          drawnLineKeys: new Set(),
          completedSquares: [[1, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
          gameOver: false,
          hasSpecialLine: false
      });
      
      const completed = gameLogic.checkAndCompleteSquare(0, 0);
      assertFalse(completed, 'Already completed square should not be completed again');
      assertEqual(completedSquares[0][0], 1, 'Square (0,0) should remain marked by Player 1');
  });

  test('resetGameState resets all game variables', () => {
      playerTurn = 2;
      linesToDraw = 3;
      diceValue = 5;
      playerScores = { 1: 5, 2: 3 };
      drawnLines = [{ start: { row: 0, col: 0 }, end: { row: 0, col: 1 }, player: 1 }];
      drawnLineKeys = new Set(['h_0_0']);
      completedSquares = [[1, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
      selectedDot = { row: 0, col: 0 };
      isDrawingLine = true;
      gameOver = true;
      hasSpecialLine = true;

      gameLogic.resetGameState();

      assertEqual(playerTurn, 1, 'playerTurn should be 1');
      assertEqual(linesToDraw, 0, 'linesToDraw should be 0');
      assertEqual(diceValue, 0, 'diceValue should be 0');
      assertEqual(playerScores[1], 0, 'Player 1 score should be 0');
      assertEqual(playerScores[2], 0, 'Player 2 score should be 0');
      assertEqual(drawnLines.length, 0, 'drawnLines should be empty');
      assertEqual(drawnLineKeys.size, 0, 'drawnLineKeys should be empty');
      assertEqual(completedSquares.flat().every(val => val === 0), true, 'all squares should be uncompleted');
      assertEqual(selectedDot, null, 'selectedDot should be null');
      assertEqual(isDrawingLine, false, 'isDrawingLine should be false');
      assertEqual(gameOver, false, 'gameOver should be false');
      assertEqual(hasSpecialLine, false, 'hasSpecialLine should be false');
  });

  window.startGame = startGame;
  window.homeScreen = homeScreen;
  window.showScreen = showScreen;

  showScreen(homeScreen);

  runUnitTestsBtn.addEventListener('click', runAllTests);

  // --- DICE ROLL SYNC ANIMATION FOR ONLINE MULTIPLAYER ---
  // Helper to animate dice roll
  function animateDiceRoll(finalValue, onComplete) {
    const diceDisplayEl = (gameMode === 'singlePlayer') ? spDiceDisplayEl : 
                         (gameMode === 'twoPlayers') ? tpDiceDisplayEl : onlineDiceDisplayEl;
    let rollCount = 0;
    const maxRolls = 15;
    const rollDuration = 50;
    clearInterval(diceAnimationIntervalId);
    diceDisplayEl.classList.add('disabled');
    diceAnimationIntervalId = setInterval(() => {
      const randomRoll = Math.floor(Math.random() * 6) + 1;
      diceDisplayEl.innerHTML = diceSVGs[randomRoll];
      rollCount++;
      if (rollCount >= maxRolls) {
        clearInterval(diceAnimationIntervalId);
        diceDisplayEl.classList.remove('disabled');
        if (typeof finalValue === 'number') {
          displayDiceValue(finalValue);
        }
        if (onComplete) onComplete();
      }
    }, rollDuration);
    // Play dice audio if present
    const diceAudio = document.getElementById('dice-audio');
    if (diceAudio) {
      diceAudio.currentTime = 0;
      diceAudio.play();
    }
  }

  // --- DICE ROLL SYNC: SINGLE EVENT FOR BOTH USERS ---
  // Helper to animate dice roll with a fixed duration and reveal at the same time
  function animateDiceRollSync(finalValue, startTimestamp, onComplete) {
    const diceDisplayEl = (gameMode === 'onlineMultiplayer') ? onlineDiceDisplayEl : tpDiceDisplayEl;
    const maxRolls = 15;
    const rollDuration = 50;
    const totalDuration = maxRolls * rollDuration;
    let rollCount = 0;
    clearInterval(diceAnimationIntervalId);
    diceDisplayEl.classList.add('disabled');
    // Calculate delay to sync with the other user
    const now = Date.now();
    const delay = Math.max(0, startTimestamp + totalDuration - now);
    diceAnimationIntervalId = setInterval(() => {
      const randomRoll = Math.floor(Math.random() * 6) + 1;
      diceDisplayEl.innerHTML = diceSVGs[randomRoll];
      rollCount++;
      if (rollCount >= maxRolls) {
        clearInterval(diceAnimationIntervalId);
        // Wait for the sync delay before revealing
        setTimeout(() => {
          diceDisplayEl.classList.remove('disabled');
          if (typeof finalValue === 'number') {
            displayDiceValue(finalValue);
          }
          // Clear the animation interval
          diceAnimationIntervalId = null;
          // Update dice interactivity after animation completes
          updateDiceInteractivity();
          if (onComplete) onComplete();
        }, delay);
      }
    }, rollDuration);
    // Play dice audio if present
    const diceAudio = document.getElementById('dice-audio');
    if (diceAudio) {
      diceAudio.currentTime = 0;
      diceAudio.play();
    }
  }

  // Note: The main rollDice function already handles online multiplayer properly
  // No need for additional patching

  // --- UI: YOU LEFT, OPPONENT RIGHT, CURRENT TURN ---
  function updateOnlinePlayerLabels() {
    if (gameMode === 'onlineMultiplayer') {
      // Always show 'You' on left, 'Opponent' on right
      onlinePlayer1NameDisplay.textContent = (onlinePlayerRole === 1 ? 'You' : 'Opponent') + ' (X)';
      onlinePlayer2NameDisplay.textContent = (onlinePlayerRole === 2 ? 'You' : 'Opponent') + ' (O)';
    }
  }

  // Patch startGame to update player labels
  const originalStartGameForLabels = startGame;
  startGame = function(mode, onlineOptions) {
    originalStartGameForLabels(mode, onlineOptions);
    updateOnlinePlayerLabels();
    updateOnlineTurnInfo();
  };

  // Patch updateScoreDisplay to update current turn label
  const originalUpdateScoreDisplayForTurn = updateScoreDisplay;
  updateScoreDisplay = function() {
    originalUpdateScoreDisplayForTurn();
    updateDiceInteractivity();
    if (gameMode === 'onlineMultiplayer') {
              onlineCurrentPlayerNameDisplay.textContent = playerNames[playerTurn];
    }
  };

  // --- DICE CLICKABLE ONLY FOR CURRENT PLAYER ---
  function updateDiceInteractivity() {
    if (gameMode === 'onlineMultiplayer') {
      // Only update interactivity if dice is not currently animating
      const isAnimating = diceAnimationIntervalId !== null && diceAnimationIntervalId !== undefined;
      if (!isAnimating) {
        onlineDiceDisplayEl.style.cursor = (playerTurn === onlinePlayerRole) ? 'pointer' : 'not-allowed';
        onlineDiceDisplayEl.classList.toggle('disabled', playerTurn !== onlinePlayerRole);
      }
    } else {
      const currentDiceDisplayEl = (gameMode === 'singlePlayer') ? spDiceDisplayEl : tpDiceDisplayEl;
      currentDiceDisplayEl.style.cursor = 'pointer';
      currentDiceDisplayEl.classList.remove('disabled');
    }
  }

  // Handle remote game actions from other player
  window.handleRemoteGameAction = function(action) {
    console.log('Handling remote game action:', action);
    
    if (action.type === 'drawLine') {
      // Apply the line drawn by the other player
      const line = action.line;
      const canonicalKey = getCanonicalLineKey(line.start, line.end);
      
      if (!drawnLineKeys.has(canonicalKey)) {
        drawnLines.push(line);
        drawnLineKeys.add(canonicalKey);
        drawLine(line, (line.player === 1) ? LINE_COLOR_PLAYER1 : LINE_COLOR_PLAYER2);
        
        // Check for completed squares and update score
        let squaresCompletedThisTurn = 0;
        if (line.start.row === line.end.row) { // Horizontal line
          const minCol = Math.min(line.start.col, line.end.col);
          if (line.start.row > 0) {
            if (checkAndCompleteSquare(line.start.row - 1, minCol)) {
              squaresCompletedThisTurn++;
            }
          }
          if (line.start.row < GRID_SIZE) {
            if (checkAndCompleteSquare(line.start.row, minCol)) {
              squaresCompletedThisTurn++;
            }
          }
        } else { // Vertical line
          const minRow = Math.min(line.start.row, line.end.row);
          if (line.start.col > 0) {
            if (checkAndCompleteSquare(minRow, line.start.col - 1)) {
              squaresCompletedThisTurn++;
            }
          }
          if (line.start.col < GRID_SIZE) {
            if (checkAndCompleteSquare(minRow, line.start.col)) {
              squaresCompletedThisTurn++;
            }
          }
        }
        
        if (squaresCompletedThisTurn > 0) {
          playerScores[line.player] += squaresCompletedThisTurn;
        }
        
        // Decrement lines to draw for the remote player
        if (linesToDraw > 0) {
          linesToDraw--;
        }
        
        updateScoreDisplay();
        checkGameOver();
        
        // Switch turn if no lines left (online mode has no lucky draw extras)
        if (linesToDraw <= 0) {
          switchTurn();
        }
      }
    } else if (action.type === 'syncRollDice') {
      // Handle synchronized dice roll for remote player
      console.log('[DEBUG] Handling syncRollDice action with value:', action.value);
      
      // Only animate for the remote player (not the player who rolled)
      if (action.playerId !== onlinePlayerRole) {
        console.log('[DICE ROLL][REMOTE] Starting animation for dice value:', action.value);
        
        animateDiceRollSync(action.value, action.startTimestamp, () => {
          // Set the values after the animation completes for remote player
          diceValue = action.value;
          linesToDraw = action.value;
          hasRolledDice = true; // Mark that dice has been rolled for this turn
          console.log('[DICE ROLL][REMOTE] Animation complete. Dice rolled:', diceValue, '| linesToDraw:', linesToDraw, '| player:', playerTurn);
          displayDiceValue(diceValue);
          updateScoreDisplay();
          
          // Note: Lucky Wheel will be triggered via sync message from the player who rolled
        });
      } else {
        console.log('[DICE ROLL][LOCAL] Ignoring own dice roll event');
      }
    } else if (action.type === 'triggerLuckyWheel') {
      // Lucky Wheel is disabled for online multiplayer mode
      console.log('[LUCKY WHEEL] Lucky Wheel trigger received but disabled for online multiplayer mode');
    } else if (action.type === 'spinLuckyWheel') {
      // Lucky Wheel is disabled for online multiplayer mode
      console.log('[LUCKY WHEEL] Lucky Wheel spin received but disabled for online multiplayer mode');
    } else if (action.type === 'luckyWheelResult') {
      // Lucky Wheel is disabled for online multiplayer mode
      console.log('[LUCKY WHEEL] Lucky Wheel result received but disabled for online multiplayer mode');
    } else if (action.type === 'closeLuckyWheel') {
      // Lucky Wheel is disabled for online multiplayer mode
      console.log('[LUCKY WHEEL] Lucky Wheel close received but disabled for online multiplayer mode');
    } else if (action.type === 'switchTurn') {
      // Handle turn switch from remote player
      console.log('[TURN SWITCH] Received turn switch from remote player:', action);
      
      if (gameMode === 'onlineMultiplayer' && action.playerId !== onlinePlayerRole) {
        // Sync the turn switch for the opponent
        const previousPlayer = playerTurn;
        playerTurn = action.newPlayerTurn;
        linesToDraw = 0; // Reset lines to draw for the new player
        hasRolledDice = false; // Reset dice roll flag for new turn
        hasSpunLuckyWheelThisTurn = false; // reset wheel spin allowance for the new player's turn
        displayDiceValue(0); // Show default dice face for next turn
        
        console.log(`[TURN SWITCH] Synced: Player ${previousPlayer} -> Player ${playerTurn} (${playerNames[playerTurn]})`);
        
        // Update display
        updateScoreDisplay();
        
        // Update dice interactivity for new turn
        updateDiceInteractivity();
      }
    } else if (action.type === 'gameOver') {
      // Handle game over event from remote player
      console.log('[DEBUG] Handling gameOver action from remote player:', action);
      
      // Set game as over locally
      gameOver = true;
      
      // Determine the correct winner name based on player roles
      let winnerName;
      const winnerScore = action.winnerScore || 0;
      
      if (gameMode === 'onlineMultiplayer' && action.winnerRole) {
        // In online multiplayer, determine winner based on roles
        if (action.winnerRole === onlinePlayerRole) {
          // The winner is the local player (you)
          winnerName = 'You';
        } else {
          // The winner is the remote player (opponent)
          winnerName = 'Opponent';
        }
      } else {
        // Fallback to original logic
        winnerName = action.winnerName || `Player ${action.winner}`;
      }
      
      showMessage("Game Over!", `${winnerName} wins with ${winnerScore} squares!`);
      
      // Disable game interactions
      if (typeof window.disableGameInteractions === 'function') {
        window.disableGameInteractions();
      }
    }
  };

  // Listen for remote dice roll events
  if (window.socket) {
    window.socket.on('gameAction', (action) => {
      // Use the centralized handler
      window.handleRemoteGameAction(action);
    });
  }

  // Function to disable game interactions when opponent disconnects
  window.disableGameInteractions = function() {
    console.log('Disabling game interactions due to opponent disconnect');
    gameOver = true;
    
    // Disable canvas interactions
    if (currentCanvas) {
      currentCanvas.style.pointerEvents = 'none';
    }
    
    // Disable dice interactions
    if (onlineDiceDisplayEl) {
      onlineDiceDisplayEl.style.pointerEvents = 'none';
      onlineDiceDisplayEl.style.cursor = 'not-allowed';
    }
    
    // Update UI to show game is over
    updateOnlineTurnInfo();
  };

  // Function to reset online game state completely
  window.resetOnlineGameState = function() {
    console.log('Resetting online game state from game.js');
    
    // Reset game mode
    gameMode = null;
    
    // Reset online-specific variables
    onlinePlayerRole = null;
    onlineSocket = null;
    onlineLobbyCode = null;
    
    // Reset game state
    gameOver = false;
    playerTurn = 1;
    linesToDraw = 0;
    diceValue = 0;
    playerScores = { 1: 0, 2: 0 };
    drawnLines = [];
    drawnLineKeys = new Set();
    completedSquares = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
    selectedDot = null;
    isDrawingLine = false;
    hasSpecialLine = false;
    hasRolledDice = false; // Reset dice roll flag
    
    // Re-enable canvas interactions
    if (currentCanvas) {
      currentCanvas.style.pointerEvents = 'auto';
    }
    
    // Re-enable dice interactions
    if (onlineDiceDisplayEl) {
      onlineDiceDisplayEl.style.pointerEvents = 'auto';
      onlineDiceDisplayEl.style.cursor = 'pointer';
    }
    
    console.log('Online game state reset complete from game.js');
  };

  // Expose showMessage function globally
  // Expose essentials globally for other modules
  window.showMessage = showMessage;
  window.hideMessageBox = hideMessageBox;
  window.showConfirmation = showConfirmation;
  window.showScreen = showScreen;
  window.homeScreen = homeScreen;
  window.startGame = startGame;
  window.resetGameState = resetGameState;
  window.gameOver = () => gameOver; // Expose gameOver state

  // ------------------- Lucky Draw Wheel (All Modes) -------------------
  function triggerLuckyWheel() {
    console.log('[LUCKY WHEEL] Function called, gameMode:', gameMode, 'playerTurn:', playerTurn, 'hasSpunLuckyWheelThisTurn:', hasSpunLuckyWheelThisTurn);
    
    // Lucky Wheel is disabled for online multiplayer mode
    if (gameMode === 'onlineMultiplayer') {
      console.log('[LUCKY WHEEL] Lucky Wheel is disabled for online multiplayer mode, skipping');
      return;
    }
    
    // Check if Lucky Wheel is enabled via toggle
    if (!isLuckyWheelEnabled) {
      console.log('[LUCKY WHEEL] Lucky Wheel is disabled via toggle, skipping');
      return;
    }
    
    if (isLuckyWheelActive) {
      console.log('[LUCKY WHEEL] Already active, returning');
      return;
    }
    isLuckyWheelActive = true;
    console.log('[LUCKY WHEEL] Setting active, searching for UI elements...');
    const modal = document.getElementById('luckyWheelModal');
    const canvas = document.getElementById('luckyWheelCanvas');
    const spinBtn = document.getElementById('spinWheelBtn');
    const resultEl = document.getElementById('luckyWheelResult');
    const closeBtn = document.getElementById('closeLuckyWheelBtn');
    const wheelContainer = document.getElementById('wheelContainer');
    if (!modal || !canvas || !spinBtn || !resultEl || !closeBtn) {
      console.error('[LUCKY WHEEL] UI elements not found:', { 
        modal: !!modal, 
        canvas: !!canvas, 
        spinBtn: !!spinBtn, 
        resultEl: !!resultEl, 
        closeBtn: !!closeBtn 
      });
      console.error('[LUCKY WHEEL] Modal element:', modal);
      console.error('[LUCKY WHEEL] Canvas element:', canvas);
      console.error('[LUCKY WHEEL] Spin button element:', spinBtn);
      console.error('[LUCKY WHEEL] Result element:', resultEl);
      console.error('[LUCKY WHEEL] Close button element:', closeBtn);
      isLuckyWheelActive = false;
      return;
    }
    console.log('[LUCKY WHEEL] All UI elements found, proceeding...');

    // Check if this is AI turn in Single Player mode for auto-spin
    const isAITurn = gameMode === 'singlePlayer' && playerTurn === 2;
    
    // Check if current player can control the spin in online multiplayer
    const canControlSpin = gameMode !== 'onlineMultiplayer' || (gameMode === 'onlineMultiplayer' && playerTurn === onlinePlayerRole);

    // Add a comfortable gap above the wheel
    if (wheelContainer) {
      wheelContainer.style.marginTop = '12px';
    }

    // Place result text under the wheel and above the spin button group (single line, no overlap)
    if (modal && wheelContainer && resultEl) {
      const buttonGroup = modal.querySelector('.button-group');
      try {
        if (buttonGroup) {
          modal.insertBefore(resultEl, buttonGroup);
        } else {
          wheelContainer.insertAdjacentElement('afterend', resultEl);
        }
      } catch(e) {}
      resultEl.style.position = 'static';
      resultEl.style.margin = '10px auto 8px auto';
      resultEl.style.left = '';
      resultEl.style.top = '';
      resultEl.style.transform = '';
      resultEl.style.textAlign = 'center';
      resultEl.style.pointerEvents = 'none';
      resultEl.style.whiteSpace = 'nowrap';
      resultEl.style.overflow = 'hidden';
      resultEl.style.textOverflow = 'ellipsis';
      try { resultEl.style.maxWidth = Math.round(canvas.width * 0.9) + 'px'; } catch(e) {}
    }

    // Define segments arranged alternately with "Better Luck Next time." after every option
    const segments = [
      '🎯 Bullseye! +1 line',
      '🤞 Better Luck Next time.',
      '🎲 Double Trouble! Roll again',
      '🤞 Better Luck Next time.',
      '💨 Poof! Turn vanished',
      '🤞 Better Luck Next time.',
      '⚡ Lightning Strike! Skip opponent',
      '🤞 Better Luck Next time.'
    ];

    // Draw wheel
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 5;
    const colors = ['#F4A261','#E76F51','#2A9D8F','#E9C46A','#8AB17D','#C9ADA7'];
    let currentHighlightIndex = null; // Highlight the top (12 o'clock) segment after spin ends

    function drawWheel(rotation=0) {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      const anglePer = (2*Math.PI)/segments.length;
      for (let i=0;i<segments.length;i++) {
        const start = i*anglePer + rotation;
        const end = start + anglePer;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = colors[i%colors.length];
        ctx.fill();
        // Text (centered within slice with dynamic fitting)
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(start + anglePer/2);
        ctx.fillStyle = '#222';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        drawWrappedSliceText(ctx, segments[i], radius, anglePer);
        ctx.restore();
      }

      // Highlight the result segment wedge fixed at 12 o'clock (top) if available
      if (currentHighlightIndex !== null) {
        const pointerAngle = Math.PI / 2; // 12 o'clock in canvas coordinates
        const hStart = pointerAngle - anglePer / 2;
        const hEnd = pointerAngle + anglePer / 2;

        // Outer rim arc highlight at top
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = '#B71C1C';
        ctx.lineWidth = 6;
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 4;
        ctx.arc(centerX, centerY, radius - 2, hStart, hEnd);
        ctx.stroke();
        ctx.restore();

        // Soft inner wedge overlay at top
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius - 10, hStart, hEnd);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fill();
        ctx.restore();
      }

      // Pointer (small white arrow with red stroke) at 6 o'clock (bottom)
      ctx.save();
      ctx.beginPath();
      // Place pointer at the circumference with tip pointing inward (bottom)
      const tipY = centerY + radius - 6;   // tip slightly inside the wheel
      const baseY = tipY + 10;             // base just outside the wheel but within canvas margin
      ctx.moveTo(centerX, tipY);
      ctx.lineTo(centerX - 12, baseY);
      ctx.lineTo(centerX + 12, baseY);
      ctx.closePath();
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 3;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#B71C1C';
      ctx.stroke();
      ctx.restore();
    }

    // Draw multi-line centered text within a slice; dynamically fits font size and wrapping
    function drawWrappedSliceText(context, text, radius, anglePer) {
      const innerMargin = radius * 0.18; // keep text away from center a bit
      const radialDistance = radius * 0.58; // where text is centered along the radius
      const maxLineWidth = 2 * (radialDistance - innerMargin); // ensure left edge stays inside wheel
      const maxTangential = anglePer * radius * 0.75; // available height within slice

      let fontSize = 10; // start size (reduced further)
      const minFont = 6; // allow smaller minimum

      const computeLines = (fs) => {
        context.font = `600 ${fs}px Inter, sans-serif`;
        const words = text.split(' ');
        const out = [];
        let current = '';
        for (let i = 0; i < words.length; i++) {
          const candidate = current ? current + ' ' + words[i] : words[i];
          if (context.measureText(candidate).width <= maxLineWidth) {
            current = candidate;
          } else {
            if (current) out.push(current);
            current = words[i];
          }
        }
        if (current) out.push(current);
        return out;
      };

      let lines = computeLines(fontSize);
      let lineHeight = Math.round(fontSize * 1.08);
      while ((lines.length * lineHeight > maxTangential || Math.max(...lines.map(l => context.measureText(l).width)) > maxLineWidth) && fontSize > minFont) {
        fontSize -= 1;
        lines = computeLines(fontSize);
        lineHeight = Math.round(fontSize * 1.08);
      }

      // Final draw with computed font
      context.font = `600 ${fontSize}px Inter, sans-serif`;
      const totalHeight = lines.length * lineHeight;
      let yStart = -totalHeight / 2 + lineHeight / 2;
      for (let i = 0; i < lines.length; i++) {
        context.fillText(lines[i], radialDistance, yStart + i * lineHeight);
      }
    }

    drawWheel();
    modal.style.display = 'block';
    resultEl.textContent = '';
    closeBtn.style.display = 'none';

    let spinning = false;
    let rotation = 0;
    let spinVelocity = 0;

    spinBtn.onclick = () => {
      if (spinning || hasSpunLuckyWheelThisTurn) return; // only once per turn
      spinning = true;
      resultEl.textContent = 'Spinning...';
      
      // For online multiplayer, only the current player can spin
      if (gameMode === 'onlineMultiplayer' && playerTurn !== onlinePlayerRole) {
        console.log('[LUCKY WHEEL] Opponent cannot spin the wheel');
        spinning = false;
        return;
      }
      
      // Random target segment (uniform across all segments)
      const targetIndex = Math.floor(Math.random() * segments.length);
      const anglePer = (2*Math.PI)/segments.length;
      // Calculate target so pointer (12 o'clock) lands at targetIndex
      const targetAngle = (Math.PI/2) - (targetIndex * anglePer) - anglePer/2;
      const fullSpins = 5 + Math.floor(Math.random()*3);
      const finalRotation = targetAngle + fullSpins*2*Math.PI;
      const duration = 2500;
      const startTime = performance.now();
      
      // Lucky Wheel is disabled for online multiplayer mode
      // No need to emit spin parameters for online multiplayer

      function animate(now) {
        const t = Math.min(1, (now - startTime)/duration);
        const ease = 1 - Math.pow(1 - t, 3);
        rotation = ease * finalRotation;
        drawWheel(rotation);
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          // The result is the segment directly under the 12 o'clock pointer
          // Since we calculated the target angle to center the chosen segment under the pointer,
          // we can directly use the targetIndex as the final result
          const landed = targetIndex;
          const result = segments[landed];
          currentHighlightIndex = landed; // record and show highlight at top
          drawWheel(rotation);
          resultEl.textContent = `⬆️ ${result}`;
          applyLuckyWheelOutcome(result);
          hasSpunLuckyWheelThisTurn = true; // mark wheel used for this turn
          
                  // Show close button for human players, hide for AI players
        if (gameMode === 'singlePlayer' && playerTurn === 2) {
          // AI player - close button will be hidden, wheel auto-closes
          closeBtn.style.display = 'none';
          console.log('[LUCKY WHEEL] AI player - close button hidden, wheel will auto-close');
        } else {
          // Human player - show close button for manual closing
          closeBtn.style.display = 'inline-block';
          console.log('[LUCKY WHEEL] Human player - close button shown for manual closing');
        }
          
          spinning = false;
        }
      }
      requestAnimationFrame(animate);
    };

    closeBtn.onclick = () => {
      console.log('[LUCKY WHEEL] Close button clicked by player:', playerTurn);
      
      // For online multiplayer, only the current player can close the wheel
      if (gameMode === 'onlineMultiplayer' && playerTurn !== onlinePlayerRole) {
        console.log('[LUCKY WHEEL] Opponent cannot close the wheel');
        return;
      }
      
      // Lucky Wheel is disabled for online multiplayer mode
      // No need to emit close events for online multiplayer
      
      modal.style.display = 'none';
      currentHighlightIndex = null;
      isLuckyWheelActive = false;
      
      // If this was a human player in single player mode, they need to manually close
      if (gameMode === 'singlePlayer' && playerTurn === 1) {
        console.log('[LUCKY WHEEL] Human player closed the wheel manually');
        // The wheel is now closed, human player can continue their turn
      }
    };

    // Show the modal
    modal.style.display = 'block';
    console.log('[LUCKY WHEEL] Modal displayed, isAITurn:', isAITurn);
    
    // Handle AI vs Human players differently in Single Player mode
    if (isAITurn) {
      // For AI player: Auto-spin and auto-close
      console.log('[LUCKY WHEEL] AI turn - setting up auto-spin and auto-close');
      spinBtn.style.display = 'none';
      resultEl.textContent = 'AI is spinning the wheel...';
      
      // Auto-spin after 300ms delay
      setTimeout(() => {
        if (!hasSpunLuckyWheelThisTurn) {
          console.log('[LUCKY WHEEL] AI auto-spinning the wheel');
          spinBtn.click(); // Trigger the spin automatically
        }
      }, 300);
    } else if (gameMode === 'onlineMultiplayer' && !canControlSpin) {
      // For opponent in online multiplayer: View only, no control
      console.log('[LUCKY WHEEL] Online multiplayer - opponent view only');
      spinBtn.style.display = 'none';
      closeBtn.style.display = 'none';
      resultEl.textContent = `${playerNames[playerTurn]} is spinning the wheel...`;
    } else {
      // For human player: Manual spin and manual close
      console.log('[LUCKY WHEEL] Human turn - setting up manual spin and close');
      spinBtn.style.display = 'inline-block';
      closeBtn.style.display = 'none'; // Hide close button initially, show after spin
      resultEl.textContent = 'Spin the wheel to see your luck!';
    }
  }

  function applyLuckyWheelOutcome(resultText) {
    console.log('[LUCKY WHEEL] Applying outcome:', resultText, 'for player:', playerTurn, 'in mode:', gameMode);
    
    // Lucky Wheel is disabled for online multiplayer mode
    // No need to emit results for online multiplayer
    
    // Map outcomes to effects
    switch (resultText) {
      case '🎯 Bullseye! +1 line':
        linesToDraw += 1;
        showMessage('Lucky Draw', '🎯 Bullseye! You hit the target and earned +1 line!');
        updateScoreDisplay();
        break;
      case '🎲 Double Trouble! Roll again':
        // Grant 1 extra dice roll after finishing current lines
        twoPlayerExtraRollAfterFinish = true;
        showMessage('Lucky Draw', '🎲 Double Trouble! You will get one extra dice roll after you finish drawing your lines!');
        break;
      case '💨 Poof! Turn vanished':
        // Current player's remaining lines are set to 0 immediately and turn passes
        linesToDraw = 0;
        showMessage('Lucky Draw', '💨 Poof! Your turn just vanished into thin air!');
        updateScoreDisplay();
        // For online multiplayer, only the current player should trigger turn switch
        if (gameMode === 'onlineMultiplayer' && playerTurn === onlinePlayerRole) {
          switchTurn();
        } else if (gameMode !== 'onlineMultiplayer') {
          switchTurn();
        }
        break;
      case '⚡ Lightning Strike! Skip opponent':
        // Set flag to skip opponent next time their turn begins
        const opponent = playerTurn === 1 ? 2 : 1;
        skipNextTurnForPlayer = opponent;
        showMessage('Lucky Draw', `⚡ Lightning Strike! ${playerNames[opponent]}'s next turn will be skipped. After you finish, you'll roll again!`);
        break;
      case '🤞 Better Luck Next time.':
      default:
        const remainingLines = linesToDraw > 0 ? linesToDraw : 0;
        showMessage('Lucky Draw', `🤞 Better luck next time! You still have ${remainingLines} lines to draw.`);
        break;
    }

    // Handle AI vs Human players differently in Single Player mode
    if (gameMode === 'singlePlayer') {
      if (playerTurn === 2) {
        // For AI player: Auto-close the wheel and continue
        console.log('[LUCKY WHEEL] AI got outcome:', resultText);
        
        // Auto-close the wheel after a short delay so human can see the result
        setTimeout(() => {
          const modal = document.getElementById('luckyWheelModal');
          if (modal) {
            modal.style.display = 'none';
            isLuckyWheelActive = false;
            console.log('[LUCKY WHEEL] Wheel auto-closed for AI');
            
            // Wait for message box to auto-close (2.4s) before starting AI moves
            // This ensures better user experience - human sees result before AI starts
            console.log('[LUCKY WHEEL] Waiting 2.45s for message box to auto-close before starting AI moves');
            setTimeout(() => {
              console.log('[LUCKY WHEEL] Message box should be closed now, starting AI moves');
              
              // Handle different outcomes for AI
              switch (resultText) {
                case '💨 Poof! Turn vanished':
                  // AI's turn vanished, but first ensure wheel and message box are fully closed
                  console.log('[LUCKY WHEEL] AI turn vanished, ensuring wheel and message box are closed before switching turn');
                  // The wheel is already closed, and message box will auto-close after 2.4s
                  // Wait for message box to fully close, then switch turn
                  setTimeout(() => {
                    console.log('[LUCKY WHEEL] Message box should be fully closed now, switching turn');
                    switchTurn();
                  }, 100); // Small buffer to ensure message box is closed
                  break;
                case '🎲 Double Trouble! Roll again':
                  // AI gets extra roll, but should finish current lines first
                  console.log('[LUCKY WHEEL] AI got Double Trouble, continuing with current lines');
                  if (linesToDraw > 0) {
                    console.log('[LUCKY WHEEL] AI has lines to draw, continuing');
                    setTimeout(aiMakeMove, AI_MOVE_DELAY);
                  } else {
                    // If no lines to draw, AI should roll dice again
                    console.log('[LUCKY WHEEL] AI has no lines, will roll dice again');
                    setTimeout(aiMakeMove, AI_MOVE_DELAY);
                  }
                  break;
                default:
                  // For all other outcomes (Bullseye, Lightning Strike, Better Luck), AI continues
                  console.log('[LUCKY WHEEL] AI continuing with current turn (outcome:', resultText, ')');
                  if (linesToDraw > 0) {
                    console.log('[LUCKY WHEEL] AI has lines to draw, continuing');
                    setTimeout(aiMakeMove, AI_MOVE_DELAY);
                  } else {
                    // If no lines to draw, AI should roll dice
                    console.log('[LUCKY WHEEL] AI has no lines, will roll dice');
                    setTimeout(aiMakeMove, AI_MOVE_DELAY);
                  }
                  break;
              }
            }, 2450); // Wait 2.45s to ensure message box is closed (2.4s + 50ms buffer)
          }
        }, 1500); // 1.5 second delay to show the result
      } else {
        // For human player: Keep wheel open, they need to close it manually
        console.log('[LUCKY WHEEL] Human player got outcome:', resultText);
        console.log('[LUCKY WHEEL] Wheel stays open for human player to close manually');
        // The wheel will stay open until the human player clicks the close button
      }
    }
  }

  /**
   * Gets the closest valid line to the given coordinates.
   * @param {number} clientX - Client X coordinate.
   * @param {number} clientY - Client Y coordinate.
   * @param {object} startDot - The starting dot.
   * @returns {object|null} The closest valid line or null.
   */
  function getClosestValidLine(clientX, clientY, startDot) {
      if (!startDot) return null;
      
      const rect = currentCanvas.getBoundingClientRect();
      const scaleX = currentCanvas.width / rect.width;
      const scaleY = currentCanvas.height / rect.height;
      const mouseX = (clientX - rect.left) * scaleX;
      const mouseY = (clientY - rect.top) * scaleY;
      
      let bestLine = null;
      let minDistance = Infinity;
      
      // Check all adjacent dots (up, down, left, right)
      const adjacents = [
          { row: startDot.row - 1, col: startDot.col }, // up
          { row: startDot.row + 1, col: startDot.col }, // down
          { row: startDot.row, col: startDot.col - 1 }, // left
          { row: startDot.row, col: startDot.col + 1 }  // right
      ];
      
      for (const adj of adjacents) {
          if (adj.row < 0 || adj.row > GRID_SIZE || adj.col < 0 || adj.col > GRID_SIZE) continue;
          
          const line = { start: startDot, end: adj, player: playerTurn };
          if (!isValidLine(line)) continue;
          
          const canonicalKey = getCanonicalLineKey(line.start, line.end);
          if (drawnLineKeys.has(canonicalKey)) continue;
          
          // Calculate distance from mouse to line midpoint
          const midX = ((startDot.col + adj.col) / 2) * cellSize + DOT_RADIUS + BOARD_PADDING;
          const midY = ((startDot.row + adj.row) / 2) * cellSize + DOT_RADIUS + BOARD_PADDING;
          const dist = Math.sqrt(Math.pow(mouseX - midX, 2) + Math.pow(mouseY - midY, 2));
          
          if (dist < LINE_SELECT_RADIUS && dist < minDistance) {
              minDistance = dist;
              bestLine = { line, canonicalKey, endDot: adj };
          }
      }
      
      return bestLine;
  }

  /**
   * Updates dice interactivity and visual state based on game state.
   */
  function updateDiceInteractivity() {
      const currentDiceDisplayEl = (gameMode === 'singlePlayer') ? spDiceDisplayEl : 
                                  (gameMode === 'twoPlayers') ? tpDiceDisplayEl : onlineDiceDisplayEl;
      
      if (!currentDiceDisplayEl) return;
      
      // Check if dice should be interactive
      const canRollDice = (linesToDraw <= 0 && !hasSpecialLine) && !gameOver;
      
      if (canRollDice) {
          // Make dice interactive and add visual highlight
          currentDiceDisplayEl.style.cursor = 'pointer';
          currentDiceDisplayEl.style.opacity = '1';
          currentDiceDisplayEl.style.transform = 'scale(1.05)';
          currentDiceDisplayEl.style.transition = 'all 0.3s ease';
          
          // Add pulsing animation to draw attention
          currentDiceDisplayEl.style.animation = 'dicePulse 2s infinite';
          
          // Add CSS animation if not already present
          if (!document.getElementById('dicePulseStyle')) {
              const style = document.createElement('style');
              style.id = 'dicePulseStyle';
              style.textContent = `
                  @keyframes dicePulse {
                      0% { transform: scale(1.05); box-shadow: 0 0 5px rgba(255, 99, 71, 0.5); }
                      50% { transform: scale(1.1); box-shadow: 0 0 15px rgba(255, 99, 71, 0.8); }
                      100% { transform: scale(1.05); box-shadow: 0 0 5px rgba(255, 99, 71, 0.5); }
                  }
              `;
              document.head.appendChild(style);
          }
      } else {
          // Make dice non-interactive and remove highlight
          currentDiceDisplayEl.style.cursor = 'default';
          currentDiceDisplayEl.style.opacity = '0.7';
          currentDiceDisplayEl.style.transform = 'scale(1)';
          currentDiceDisplayEl.style.animation = 'none';
      }
  }

  // Utility function to count remaining boxes
  function getRemainingBoxes() {
    let totalCompleted = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (completedSquares[r][c] !== 0) totalCompleted++;
        }
    }
    return GRID_SIZE * GRID_SIZE - totalCompleted;
  }

}; // End of window.onload