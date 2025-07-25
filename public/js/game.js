// Wrap the entire script in a window.onload to ensure all elements and functions are loaded
window.onload = function() {
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
  const SPECIAL_LINE_DICE_VALUE = 6; // Dice value that grants a special line
  const AI_MOVE_DELAY = 700; // Delay in milliseconds for AI moves
  const BOARD_PADDING = 15; // Padding from canvas edge to the center of the first dot

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

  // Initialize game state immediately when window loads
  // This ensures drawnLineKeys and other state variables are properly initialized
  // before any functions (like runAllTests) try to access them.
  resetGameState();

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

  const tpPlayer1NameInput = document.getElementById('tp-player1-name-input'); 
  const tpPlayer2NameInput = document.getElementById('tp-player2-name-input'); 
  const startTwoPlayerGameBtn = document.getElementById('start-two-player-game-btn'); 

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
  let spCtx = spGameCanvas.getContext('2d'); // Get context for single player canvas

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
  let tpCtx = tpGameCanvas.getContext('2d'); // Get context for two player canvas

  // New UI elements for Rules and Info modals
  const rulesBtnHome = document.getElementById('rules-btn-home');
  const infoBtnHome = document.getElementById('info-btn-home');

  const rulesModal = document.getElementById('rulesModal');
  const rulesModalCloseBtn = document.getElementById('rulesModalCloseBtn');
  const infoModal = document.getElementById('infoModal');
  const infoModalCloseBtn = document.getElementById('infoModalCloseBtn');

  // Object to expose game logic functions for unit testing
  const gameLogic = {};

  /**
   * Displays a custom message box.
   * @param {string} title - The title of the message box.
   * @param {string} text - The main text content.
   */
  function showMessage(title, text) {
      messageTitle.textContent = title;
      messageText.textContent = text;
      messageBox.style.display = 'block';
  }

  /**
   * Hides the custom message box.
   */
  function hideMessageBox() {
      messageBox.style.display = 'none';
  }

  /**
   * Shows a confirmation box.
   * @param {string} title - The title for the confirmation.
   * @param {string} text - The message for the user.
   * @param {function} onConfirm - Callback function if 'Yes' is clicked.
   * @param {function} onCancel - Callback function if 'No' is clicked.
   */
  function showConfirmation(title, text, onConfirm, onCancel) {
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
      homeScreen.style.display = 'none';
      singlePlayerSetupScreen.style.display = 'none';
      twoPlayerSetupScreen.style.display = 'none';
      spGameScreen.style.display = 'none';
      tpGameScreen.style.display = 'none';
  }

  /**
   * Switches the displayed screen.
   * @param {HTMLElement} screenToShow - The screen element to display.
   */
  function showScreen(screenToShow) {
      hideAllScreens();
      screenToShow.style.display = 'flex';
  }

  /**
   * Initializes canvas dimensions based on the container size.
   * Adjusts for smaller screens to ensure visibility.
   */
  function initializeCanvasDimensions() {
      // Get the available width within the game screen container
      const parentContainer = currentCanvas.parentElement; // This is sp-game-screen or tp-game-screen
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
      currentCtx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);

      for (let i = 0; i <= GRID_SIZE; i++) {
          for (let j = 0; j <= GRID_SIZE; j++) {
              drawDot(i, j, DOT_COLOR);
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
      // The x and y coordinates are the center of the dot.
      // They are offset by BOARD_PADDING and DOT_RADIUS to ensure the dot is fully visible
      // within the canvas, given BOARD_PADDING is the space from the canvas edge to the first dot's center.
      const x = col * cellSize + DOT_RADIUS + BOARD_PADDING;
      const y = row * cellSize + DOT_RADIUS + BOARD_PADDING;

      currentCtx.beginPath();
      currentCtx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      currentCtx.fillStyle = color;
      currentCtx.fill();
      currentCtx.closePath();
  }

  /**
   * Draws a line on the canvas.
   * @param {object} line - The line object with start and end coordinates.
   * @param {string} color - The color of the line.
   */
  function drawLine(line, color) {
      const x1 = line.start.col * cellSize + DOT_RADIUS + BOARD_PADDING;
      const y1 = line.start.row * cellSize + DOT_RADIUS + BOARD_PADDING;
      const x2 = line.end.col * cellSize + DOT_RADIUS + BOARD_PADDING;
      const y2 = line.end.row * cellSize + DOT_RADIUS + BOARD_PADDING;

      currentCtx.beginPath();
      currentCtx.moveTo(x1, y1);
      currentCtx.lineTo(x2, y2);
      currentCtx.strokeStyle = color;
      currentCtx.lineWidth = LINE_WIDTH;
      currentCtx.lineCap = 'round';
      currentCtx.stroke();
      currentCtx.closePath();
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
      playerTurn = 1;
      linesToDraw = 0;
      diceValue = 0;
      playerScores = { 1: 0, 2: 0 };
      drawnLines = []; // Array to store { start, end, player } objects
      drawnLineKeys = new Set(); // Set to store canonical string keys for quick lookup
      completedSquares = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0)); // 0: uncompleted, 1: P1, 2: P2
      selectedDot = null;
      isDrawingLine = false;
      gameOver = false;
      hasSpecialLine = false;
      clearInterval(diceAnimationIntervalId);
  }

  /**
   * Updates the score display for the current game mode.
   */
  function updateScoreDisplay() {
      if (gameMode === 'singlePlayer') {
          spPlayer1CountEl.textContent = playerScores[1];
          spPlayer2CountEl.textContent = playerScores[2];
          spPlayer1ScoreEl.classList.toggle('active', playerTurn === 1);
          spPlayer2ScoreEl.classList.toggle('active', playerTurn === 2);
          spCurrentPlayerNameDisplay.textContent = playerNames[playerTurn];
          spLinesToDrawCountEl.textContent = linesToDraw;
          spSpecialLineIndicatorEl.style.display = hasSpecialLine ? 'block' : 'none';
      } else if (gameMode === 'twoPlayers') {
          tpPlayer1CountEl.textContent = playerScores[1];
          tpPlayer2CountEl.textContent = playerScores[2];
          tpPlayer1ScoreEl.classList.toggle('active', playerTurn === 1);
          tpPlayer2ScoreEl.classList.toggle('active', playerTurn === 2);
          tpCurrentPlayerNameDisplay.textContent = playerNames[playerTurn];
          tpLinesToDrawCountEl.textContent = linesToDraw;
          tpSpecialLineIndicatorEl.style.display = hasSpecialLine ? 'block' : 'none';
      }
      console.log(`updateScoreDisplay: Player 1 Score: ${playerScores[1]}, Player 2 Score: ${playerScores[2]}`);
  }

  /**
   * Displays the current dice value.
   * @param {number} value - The value to display on the dice.
   */
  function displayDiceValue(value) {
      const diceDisplayEl = (gameMode === 'singlePlayer') ? spDiceDisplayEl : tpDiceDisplayEl;
      if (value === 0) {
          diceDisplayEl.innerHTML = diceSVGs[1]; // Show a default face when no value is rolled yet
          diceDisplayEl.classList.add('disabled');
      } else {
          diceDisplayEl.innerHTML = diceSVGs[value];
          diceDisplayEl.classList.remove('disabled');
      }
  }

  /**
   * Rolls the dice and updates the lines to draw.
   */
  function rollDice() {
      console.log(`rollDice called. Current player: ${playerTurn}, linesToDraw: ${linesToDraw}`);
      if (gameOver || linesToDraw > 0) {
          console.log("Roll dice skipped: Game over or lines pending.");
          return; // Cannot roll if game is over or lines are pending
      }

      let rollCount = 0;
      const maxRolls = 15; // Number of quick rolls before final
      const rollDuration = 50; // Milliseconds per quick roll

      const diceDisplayEl = (gameMode === 'singlePlayer') ? spDiceDisplayEl : tpDiceDisplayEl;
      diceDisplayEl.classList.add('disabled'); // Disable during roll

      clearInterval(diceAnimationIntervalId); // Clear any existing interval

      diceAnimationIntervalId = setInterval(() => {
          const randomRoll = Math.floor(Math.random() * 6) + 1;
          diceDisplayEl.innerHTML = diceSVGs[randomRoll];
          rollCount++;

          if (rollCount >= maxRolls) {
              clearInterval(diceAnimationIntervalId);
              diceValue = Math.floor(Math.random() * 6) + 1;
              displayDiceValue(diceValue);
              linesToDraw = diceValue;
              if (diceValue === SPECIAL_LINE_DICE_VALUE) {
                  hasSpecialLine = true;
                  showMessage("Special Line!", `${playerNames[playerTurn]} rolled a 6! You have a special line available.`);
              }
              updateScoreDisplay();
              diceDisplayEl.classList.remove('disabled'); // Enable after roll
              
              // Log AI's turn start after roll
              if (gameMode === 'singlePlayer' && playerTurn === 2) {
                  console.log(`AI (Player 2) rolled a ${diceValue}. Lines to draw: ${linesToDraw}. Special Line: ${hasSpecialLine}. Calling aiMakeMove.`);
                  setTimeout(aiMakeMove, AI_MOVE_DELAY);
              }
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
      playerTurn = (playerTurn === 1) ? 2 : 1;
      linesToDraw = 0; // Reset lines to draw for the new player
      displayDiceValue(0); // Show default dice face for next turn
      updateScoreDisplay();

      if (gameMode === 'singlePlayer' && playerTurn === 2 && !gameOver) {
          console.log("Switching to AI turn. AI will roll dice soon.");
          setTimeout(rollDice, AI_MOVE_DELAY); // AI rolls dice
      } else if (gameMode === 'twoPlayers' && !gameOver) {
          showMessage("Next Turn", `It's ${playerNames[playerTurn]}'s turn! Roll the dice.`);
      }
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
          return;
      }
      if (playerScores[2] > maxSquares / 2) {
          gameOver = true;
          showMessage("Game Over!", `${playerNames[2]} wins with ${playerScores[2]} squares!`);
          return;
      }

      // Check if all squares are completed or all lines are drawn
      // Total possible lines = GRID_SIZE * (GRID_SIZE + 1) * 2
      // For a 5x5 grid, it's 5 * 6 * 2 = 60 lines
      if (totalCompletedSquares === maxSquares || drawnLines.length === (GRID_SIZE * (GRID_SIZE + 1) * 2)) {
          gameOver = true;
          let winnerMessage = '';
          if (playerScores[1] > playerScores[2]) {
              winnerMessage = `${playerNames[1]} wins with ${playerScores[1]} squares!`;
          } else if (playerScores[2] > playerScores[1]) {
              winnerMessage = `${playerNames[2]} wins with ${playerScores[2]} squares!`;
          } else {
              winnerMessage = "It's a tie!";
          }
          showMessage("Game Over!", winnerMessage);
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

              if (dist < DOT_RADIUS * 1.5 && dist < minDistance) { // Increased clickable area
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
   * Handles mouse/touch down event on the canvas.
   * @param {MouseEvent|TouchEvent} event - The event object.
   */
  function handleCanvasStart(event) {
      // Prevent user input if it's AI's turn in single-player mode
      if (gameMode === 'singlePlayer' && playerTurn === 2) {
          console.log("User input ignored: AI's turn.");
          return;
      }

      if (gameOver) return;
      event.preventDefault(); // Prevent scrolling on touch devices

      let clientX, clientY;
      if (event.touches) {
          clientX = event.touches[0].clientX;
          clientY = event.touches[0].clientY;
      } else {
          clientX = event.clientX;
          clientY = event.clientY;
      }

      selectedDot = getDotAtCoordinates(clientX, clientY);
      if (selectedDot) {
          isDrawingLine = true;
          drawBoard(); // Redraw to clear previous active dot
          redrawLines(); // Redraw existing lines
          redrawSquares(); // Redraw existing squares
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

      if (gameOver || !isDrawingLine || !selectedDot) return;
      event.preventDefault(); // Prevent scrolling on touch devices

      let clientX, clientY;
      if (event.touches) {
          clientX = event.touches[0].clientX;
          clientY = event.touches[0].clientY;
      } else {
          clientX = event.clientX;
          clientY = event.clientY;
      }

      const currentDot = getDotAtCoordinates(clientX, clientY);

      // Clear canvas and redraw everything to show preview line
      drawBoard();
      redrawLines();
      redrawSquares();
      drawDot(selectedDot.row, selectedDot.col, ACTIVE_DOT_COLOR); // Keep start dot highlighted

      if (currentDot && (currentDot.row !== selectedDot.row || currentDot.col !== selectedDot.col)) {
          const previewLine = { start: selectedDot, end: currentDot };
          if (isValidLine(previewLine) && !isLineAlreadyDrawn(previewLine)) {
              // Draw a preview line (e.g., dashed or lighter color)
              currentCtx.beginPath();
              currentCtx.moveTo(selectedDot.col * cellSize + DOT_RADIUS + BOARD_PADDING, selectedDot.row * cellSize + DOT_RADIUS + BOARD_PADDING);
              currentCtx.lineTo(currentDot.col * cellSize + DOT_RADIUS + BOARD_PADDING, currentDot.row * cellSize + DOT_RADIUS + BOARD_PADDING);
              currentCtx.strokeStyle = (playerTurn === 1) ? LINE_COLOR_PLAYER1 + '80' : LINE_COLOR_PLAYER2 + '80'; // Lighter color
              currentCtx.lineWidth = LINE_WIDTH;
              currentCtx.setLineDash([5, 5]); // Dashed line
              currentCtx.stroke();
              currentCtx.setLineDash([]); // Reset line dash
              currentCtx.closePath();

              drawDot(currentDot.row, currentDot.col, ACTIVE_DOT_COLOR); // Highlight potential end dot
          }
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
          drawBoard();
          redrawLines();
          redrawSquares();
          return;
      }

      if (gameOver || !isDrawingLine || !selectedDot) {
          selectedDot = null;
          isDrawingLine = false;
          drawBoard();
          redrawLines();
          redrawSquares();
          return;
      }
      event.preventDefault(); // Prevent scrolling on touch devices

      let clientX, clientY;
      if (event.changedTouches) { // For touchend, use changedTouches
          clientX = event.changedTouches[0].clientX;
          clientY = event.changedTouches[0].clientY;
      } else {
          clientX = event.clientX;
          clientY = event.clientY;
      }

      const endDot = getDotAtCoordinates(clientX, clientY);

      console.log(`handleCanvasEnd: selectedDot: ${JSON.stringify(selectedDot)}, endDot: ${JSON.stringify(endDot)}`);

      if (endDot && (endDot.row !== selectedDot.row || endDot.col !== selectedDot.col)) {
          const line = { start: selectedDot, end: endDot, player: playerTurn }; // Include player
          const canonicalKey = getCanonicalLineKey(line.start, line.end);

          console.log(`handleCanvasEnd: Constructed line: ${JSON.stringify(line)}, Canonical Key: ${canonicalKey}`);
          console.log(`handleCanvasEnd: isValidLine: ${isValidLine(line)}, isLineAlreadyDrawn: ${drawnLineKeys.has(canonicalKey)}`);

          if (isValidLine(line) && !drawnLineKeys.has(canonicalKey)) { // Check against the Set
              if (linesToDraw > 0 || hasSpecialLine) {
                  drawnLines.push(line); // Add the full line object to the array
                  drawnLineKeys.add(canonicalKey); // Add canonical key to the Set
                  
                  drawLine(line, (playerTurn === 1) ? LINE_COLOR_PLAYER1 : LINE_COLOR_PLAYER2);

                  // Check for completed squares and update score
                  let squaresCompletedThisTurn = 0;
                  // Check for horizontal square completion
                  if (line.start.row === line.end.row) { // Horizontal line
                      const minCol = Math.min(line.start.col, line.end.col);
                      if (line.start.row > 0) {
                          console.log(`  Checking square above: (${line.start.row - 1}, ${minCol})`);
                          if (checkAndCompleteSquare(line.start.row - 1, minCol)) {
                              squaresCompletedThisTurn++;
                          }
                      }
                      if (line.start.row < GRID_SIZE) {
                          console.log(`  Checking square below: (${line.start.row}, ${minCol})`);
                          if (checkAndCompleteSquare(line.start.row, minCol)) {
                              squaresCompletedThisTurn++;
                          }
                      }
                  } else { // Vertical line
                      const minRow = Math.min(line.start.row, line.end.row);
                      if (line.start.col > 0) {
                          console.log(`  Checking square left: (${minRow}, ${line.start.col - 1})`);
                          if (checkAndCompleteSquare(minRow, line.start.col - 1)) {
                              squaresCompletedThisTurn++;
                          }
                      }
                      if (line.start.col < GRID_SIZE) {
                          console.log(`  Checking square right: (${minRow}, ${line.start.col})`);
                          if (checkAndCompleteSquare(minRow, line.start.col)) {
                              squaresCompletedThisTurn++;
                          }
                      }
                  }

                  console.log(`handleCanvasEnd: Total squares completed this turn: ${squaresCompletedThisTurn}`);
                  if (squaresCompletedThisTurn > 0) {
                      playerScores[playerTurn] += squaresCompletedThisTurn;
                      console.log(`handleCanvasEnd: Player ${playerTurn} score updated to: ${playerScores[playerTurn]}.`);
                  }

                  // Always decrement linesToDraw if it's a regular line, or consume the special line.
                  console.log(`handleCanvasEnd: Before line consumption - linesToDraw: ${linesToDraw}, hasSpecialLine: ${hasSpecialLine}`);
                  if (linesToDraw > 0) {
                      linesToDraw--;
                      console.log(`handleCanvasEnd: Lines to draw decremented to: ${linesToDraw}.`);
                  } else if (hasSpecialLine) {
                      hasSpecialLine = false; // Consume the special line
                      showMessage("Special Line Used!", "You've used your special line.");
                      console.log("handleCanvasEnd: Special line consumed.");
                  }

                  updateScoreDisplay(); // Update display after all changes
                  checkGameOver();

                  // Determine if turn switches
                  if (linesToDraw <= 0 && !hasSpecialLine) {
                      console.log("handleCanvasEnd: No lines left and no special line. Switching turn.");
                      switchTurn();
                  }

              } else {
                  showMessage("No Lines Left!", "Roll the dice to get more lines or wait for your turn.");
              }
          } else {
              showMessage("Invalid Line", "Lines must be horizontal or vertical between adjacent dots and not already drawn.");
          }
      }

      // Reset drawing state and redraw board
      selectedDot = null;
      isDrawingLine = false;
      drawBoard();
      redrawLines();
      redrawSquares();
  }


  /**
   * Handles the AI's turn in single-player mode.
   */
  function aiMakeMove() {
      console.log(`AI Make Move START: Player Turn: ${playerTurn}, Lines to Draw: ${linesToDraw}, Special Line: ${hasSpecialLine}`);
      if (gameOver) {
          console.log("AI: Game is over, not making a move.");
          return;
      }

      // If AI needs to roll dice (no lines yet and no special line)
      if (linesToDraw === 0 && !hasSpecialLine) {
          console.log("AI: No lines to draw and no special line. Rolling dice.");
          rollDice(); // This will call aiMakeMove again after rolling
          return;
      }

      // If AI has lines to draw or a special line
      if (linesToDraw > 0 || hasSpecialLine) {
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
                  
                  // AI's turn logic for decrementing linesToDraw and handling special line
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

                  console.log(`AI: Before line consumption - linesToDraw: ${linesToDraw}, hasSpecialLine: ${hasSpecialLine}`);
                  if (linesToDraw > 0) {
                      linesToDraw--;
                      console.log(`AI: Lines to draw decremented to: ${linesToDraw}.`);
                  } else if (hasSpecialLine) {
                      hasSpecialLine = false;
                      console.log("AI: Special line consumed.");
                  }

                  drawBoard(); // Clear and redraw
                  redrawLines(); // Redraw all lines
                  redrawSquares(); // Redraw all squares
                  updateScoreDisplay();
                  checkGameOver();

                  // After drawing, if AI still has lines to draw or special line, make another move
                  if (linesToDraw > 0 || hasSpecialLine) {
                      console.log(`AI: Remaining lines: ${linesToDraw}, Special Line: ${hasSpecialLine}. Scheduling next move.`);
                      setTimeout(aiMakeMove, AI_MOVE_DELAY);
                  } else {
                      console.log("AI: No more lines to draw. Turn will switch.");
                      switchTurn();
                  }
              }, AI_MOVE_DELAY);
          } else {
              console.log("AI: No valid line could be chosen from available lines. Switching turn.");
              // This happens if availableLines is empty or no valid line could be picked.
              switchTurn();
          }
      } else {
          console.log("AI Make Move END: No lines to draw or special line. Switching turn.");
          // This case should ideally not be reached if rollDice is called first and sets linesToDraw
          switchTurn();
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
  function startGame(mode) {
      gameMode = mode;
      resetGameState();

      if (gameMode === 'singlePlayer') {
          currentCanvas = spGameCanvas;
          currentCtx = spCtx;
          playerNames[1] = spPlayerNameInput.value.trim() || 'Player 1';
          playerNames[2] = 'AI Agent';
          spPlayer1NameDisplay.textContent = playerNames[1] + ' (X)';
          spPlayer2NameDisplay.textContent = playerNames[2] + ' (O)';
          showScreen(spGameScreen);
      } else { // twoPlayers
          currentCanvas = tpGameCanvas;
          currentCtx = tpCtx;
          playerNames[1] = tpPlayer1NameInput.value.trim() || 'Player 1';
          playerNames[2] = tpPlayer2NameInput.value.trim() || 'Player 2';
          tpPlayer1NameDisplay.textContent = playerNames[1] + ' (X)';
          tpPlayer2NameDisplay.textContent = playerNames[2] + ' (O)';
          showScreen(tpGameScreen);
      }

      initializeCanvasDimensions();
      drawBoard();
      updateScoreDisplay();
      displayDiceValue(0); // Set initial dice display
      showMessage("Game Start!", `It's ${playerNames[playerTurn]}'s turn. Roll the dice to begin!`);

      // Detach old listeners to prevent duplicates
      currentCanvas.removeEventListener('mousedown', handleCanvasStart);
      currentCanvas.removeEventListener('mousemove', handleCanvasMove);
      currentCanvas.removeEventListener('mouseup', handleCanvasEnd);
      currentCanvas.removeEventListener('touchstart', handleCanvasStart);
      currentCanvas.removeEventListener('touchmove', handleCanvasMove);
      currentCanvas.removeEventListener('touchend', handleCanvasEnd);

      // Attach new listeners for drag/slide functionality
      currentCanvas.addEventListener('mousedown', handleCanvasStart);
      currentCanvas.addEventListener('mousemove', handleCanvasMove);
      currentCanvas.addEventListener('mouseup', handleCanvasEnd);
      currentCanvas.addEventListener('touchstart', handleCanvasStart);
      currentCanvas.addEventListener('touchmove', handleCanvasMove);
      currentCanvas.addEventListener('touchend', handleCanvasEnd);


      // Attach dice roll listener
      const currentDiceDisplayEl = (gameMode === 'singlePlayer') ? spDiceDisplayEl : tpDiceDisplayEl;
      currentDiceDisplayEl.removeEventListener('click', rollDice);
      currentDiceDisplayEl.addEventListener('click', rollDice);

      // AI rolls first in single-player if it's AI's turn (Player 2)
      if (gameMode === 'singlePlayer' && playerTurn === 2) {
          setTimeout(rollDice, AI_MOVE_DELAY);
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
      showMessage("Coming Soon!", "Online multiplayer is currently under development. Stay tuned!");
  });

  startSinglePlayerGameBtn.addEventListener('click', () => startGame('singlePlayer'));
  startTwoPlayerGameBtn.addEventListener('click', () => startGame('twoPlayers'));

  messageBoxCloseBtn.addEventListener('click', hideMessageBox);

  // Restart and Back to Home buttons for single player
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

  // Restart and Back to Home buttons for two player
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

  // Rules and Info button listeners
  rulesBtnHome.addEventListener('click', () => rulesModal.style.display = 'block');
  infoBtnHome.addEventListener('click', () => infoModal.style.display = 'block');
  rulesModalCloseBtn.addEventListener('click', () => rulesModal.style.display = 'none');
  infoModalCloseBtn.addEventListener('click', () => infoModal.style.display = 'none');

  // --- Unit Testing Framework ---
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
      // Changed button text and style for clarity
      html += `<button onclick="hideTestResults()" class="mt-4 btn btn-secondary">Close Results</button>`;
      testResultsDiv.innerHTML = html;
      testResultsDiv.style.display = 'block';
  }

  // Expose for onclick in test results modal
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

  // Mock canvas context for testing functions that interact with it
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
      // Add any other methods used by drawLine, drawDot, drawSquareMark
  };

  // Mock canvas element for getDotAtCoordinates
  const mockCanvas = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 500 }),
      width: 500,
      height: 500
  };

  function runAllTests() {
      const results = [];
      console.groupCollapsed("Running Unit Tests"); // Group console logs for tests
      
      // Save original game state
      const originalGameState = gameLogic.getGameState();
      const originalCurrentCtx = currentCtx;
      const originalCurrentCanvas = currentCanvas;

      // Temporarily set currentCtx and currentCanvas to mock objects for tests
      currentCtx = mockCtx;
      currentCanvas = mockCanvas;
      
      // Set a default cellSize for tests, as initializeCanvasDimensions won't be called
      // This value should be consistent with how cellSize is calculated in the game.
      // For a 5x5 grid, and a mock canvas of 500, (500 - 12 - 30) / 5 = 458 / 5 = 91.6, floor to 91.
      // Or, just pick a reasonable value that allows square checks.
      cellSize = 90; // A fixed value for testing purposes

      tests.forEach(t => {
          try {
              // Reset game state before each test to ensure isolation
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
      
      // Restore original game state and canvas context after all tests
      gameLogic.setTestState(originalGameState); // Restore game state
      currentCtx = originalCurrentCtx; // Restore actual canvas context
      currentCanvas = originalCurrentCanvas; // Restore actual canvas element

      showTestResults(results);
  }

  // Expose functions for testing via gameLogic object
  gameLogic.getCanonicalLineKey = getCanonicalLineKey;
  gameLogic.isValidLine = isValidLine;
  gameLogic.isLineAlreadyDrawn = isLineAlreadyDrawn; // This will use the actual drawnLineKeys
  gameLogic.checkAndCompleteSquare = checkAndCompleteSquare; // This will use actual completedSquares, playerTurn
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
      // Ensure drawnLineKeys is an iterable (Set) before converting to Array
      drawnLineKeys: Array.from(drawnLineKeys || new Set()),
      completedSquares: completedSquares.map(row => [...row]), // Deep copy for immutability
      gameOver,
      hasSpecialLine
  });

  // --- Unit Tests ---

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
      // Manually set initial state for this test
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
      // Set up state with 3 lines for square (0,0)
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

      // Simulate drawing the top line of square (0,0)
      // This line is not "drawn" by handleCanvasEnd, but checkAndCompleteSquare needs to see it as present
      // So, we temporarily add it to drawnLineKeys for the check.
      drawnLineKeys.add(gameLogic.getCanonicalLineKey({ row: 0, col: 0 }, { row: 0, col: 1 }));

      const completed = gameLogic.checkAndCompleteSquare(0, 0);
      assertTrue(completed, 'Square (0,0) should be completed');
      assertEqual(completedSquares[0][0], 1, 'Square (0,0) should be marked by Player 1');
      // playerScores is updated by handleCanvasEnd or aiMakeMove, not directly by checkAndCompleteSquare.
      // We'll verify the score update in a larger integration-style test if needed,
      // but for unit test of checkAndCompleteSquare, we just check its return and completedSquares array.
  });

  test('checkAndCompleteSquare completes square and updates score (vertical line)', () => {
      // Set up state with 3 lines for square (0,0)
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

      // Simulate drawing the right line of square (0,0)
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
              // Only 2 lines present
          ],
          drawnLineKeys: new Set(['v_0_0', 'v_0_1']),
          completedSquares: Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0)),
          gameOver: false,
          hasSpecialLine: false
      });
      
      // Add a hypothetical line, making it 3 sides
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
          drawnLines: [], // Lines don't matter as much here, but for completeness
          drawnLineKeys: new Set(),
          completedSquares: [[1, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], // Square (0,0) already completed by P1
          gameOver: false,
          hasSpecialLine: false
      });
      
      // Try to complete it again
      const completed = gameLogic.checkAndCompleteSquare(0, 0);
      assertFalse(completed, 'Already completed square should not be completed again');
      assertEqual(completedSquares[0][0], 1, 'Square (0,0) should remain marked by Player 1');
  });

  test('resetGameState resets all game variables', () => {
      // Set some non-default values
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


  // Initial screen display
  showScreen(homeScreen);

  // Add event listener for the new "Run Unit Tests" button
  runUnitTestsBtn.addEventListener('click', runAllTests);
}; // End of window.onload