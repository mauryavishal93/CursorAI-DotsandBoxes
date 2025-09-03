import { GAME_CONFIG, COLORS, DICE_SVGS, LUCKY_DRAW_OUTCOMES, GAME_MODES } from './gameConstants.js';

export class GameLogic {
  constructor() {
    this.resetGame();
  }

  resetGame() {
    this.playerTurn = 1;
    this.linesToDraw = 0;
    this.diceValue = 0;
    this.playerScores = { 1: 0, 2: 0 };
    this.drawnLines = [];
    this.drawnLineKeys = new Set();
    this.completedSquares = Array(GAME_CONFIG.GRID_SIZE).fill(0).map(() => Array(GAME_CONFIG.GRID_SIZE).fill(0));
    this.gameOver = false;
    this.hasSpecialLine = false;
    this.hasRolledDice = false;
    this.twoPlayerExtraRollAfterFinish = false;
    this.hasSpunLuckyWheelThisTurn = false;
  }

  getCanonicalLineKey(dot1, dot2) {
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

  isValidLine(line) {
    const { start, end } = line;
    
    // Check if dots are adjacent (horizontally or vertically)
    const rowDiff = Math.abs(start.row - end.row);
    const colDiff = Math.abs(start.col - end.col);
    
    // Valid if exactly one coordinate differs by 1
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  isLineAlreadyDrawn(line) {
    const key = this.getCanonicalLineKey(line.start, line.end);
    return this.drawnLineKeys.has(key);
  }

  checkHypotheticalSquareCompletion(r, c, linesSet) {
    if (r < 0 || r >= GAME_CONFIG.GRID_SIZE || c < 0 || c >= GAME_CONFIG.GRID_SIZE) {
      return false;
    }
    
    const topLine = `h_${r}_${c}`;
    const bottomLine = `h_${r + 1}_${c}`;
    const leftLine = `v_${r}_${c}`;
    const rightLine = `v_${r}_${c + 1}`;
    
    return linesSet.has(topLine) && linesSet.has(bottomLine) && 
           linesSet.has(leftLine) && linesSet.has(rightLine);
  }

  checkAndCompleteSquare(r, c) {
    if (r < 0 || r >= GAME_CONFIG.GRID_SIZE || c < 0 || c >= GAME_CONFIG.GRID_SIZE) {
      return false;
    }
    
    const topLine = `h_${r}_${c}`;
    const bottomLine = `h_${r + 1}_${c}`;
    const leftLine = `v_${r}_${c}`;
    const rightLine = `v_${r}_${c + 1}`;
    
    if (this.drawnLineKeys.has(topLine) && this.drawnLineKeys.has(bottomLine) && 
        this.drawnLineKeys.has(leftLine) && this.drawnLineKeys.has(rightLine)) {
      
      // Mark the square as completed by the current player
      this.completedSquares[r][c] = this.playerTurn;
      this.playerScores[this.playerTurn]++;
      return true;
    }
    
    return false;
  }

  drawLine(line) {
    if (this.linesToDraw > 0 || this.hasSpecialLine) {
      const canonicalKey = this.getCanonicalLineKey(line.start, line.end);
      this.drawnLines.push(line);
      this.drawnLineKeys.add(canonicalKey);
      
      // Check for completed squares and update score
      let squaresCompletedThisTurn = 0;
      
      // Check for horizontal square completion
      if (line.start.row === line.end.row) { // Horizontal line
        const minCol = Math.min(line.start.col, line.end.col);
        if (line.start.row > 0) {
          if (this.checkAndCompleteSquare(line.start.row - 1, minCol)) {
            squaresCompletedThisTurn++;
          }
        }
        if (line.start.row < GAME_CONFIG.GRID_SIZE) {
          if (this.checkAndCompleteSquare(line.start.row, minCol)) {
            squaresCompletedThisTurn++;
          }
        }
      } else { // Vertical line
        const minRow = Math.min(line.start.row, line.end.row);
        if (line.start.col > 0) {
          if (this.checkAndCompleteSquare(minRow, line.start.col - 1)) {
            squaresCompletedThisTurn++;
          }
        }
        if (line.start.col < GAME_CONFIG.GRID_SIZE) {
          if (this.checkAndCompleteSquare(minRow, line.start.col)) {
            squaresCompletedThisTurn++;
          }
        }
      }

      // Always decrement linesToDraw for a regular line
      if (this.linesToDraw > 0) {
        this.linesToDraw--;
      }
      
      return {
        success: true,
        squaresCompleted: squaresCompletedThisTurn,
        shouldSwitchTurn: this.linesToDraw <= 0 && !this.twoPlayerExtraRollAfterFinish
      };
    }
    
    return { success: false };
  }

  rollDice() {
    if (this.hasRolledDice && !this.twoPlayerExtraRollAfterFinish) {
      return { success: false, message: 'Dice already rolled this turn' };
    }
    
    const randomValue = Math.floor(Math.random() * 6) + 1;
    this.diceValue = randomValue;
    this.linesToDraw = randomValue;
    this.hasRolledDice = true;
    
    return { 
      success: true, 
      value: randomValue,
      shouldTriggerLuckyWheel: randomValue === 6
    };
  }

  switchTurn() {
    this.playerTurn = this.playerTurn === 1 ? 2 : 1;
    this.hasRolledDice = false;
    this.hasSpunLuckyWheelThisTurn = false;
    this.twoPlayerExtraRollAfterFinish = false;
  }

  checkGameOver() {
    // Game is over when all possible lines are drawn
    const totalPossibleLines = GAME_CONFIG.GRID_SIZE * (GAME_CONFIG.GRID_SIZE + 1) * 2;
    if (this.drawnLines.length >= totalPossibleLines) {
      this.gameOver = true;
      return true;
    }
    return false;
  }

  getGameState() {
    return {
      playerTurn: this.playerTurn,
      linesToDraw: this.linesToDraw,
      diceValue: this.diceValue,
      playerScores: this.playerScores,
      drawnLines: this.drawnLines,
      drawnLineKeys: Array.from(this.drawnLineKeys),
      completedSquares: this.completedSquares,
      gameOver: this.gameOver,
      hasSpecialLine: this.hasSpecialLine,
      hasRolledDice: this.hasRolledDice,
      twoPlayerExtraRollAfterFinish: this.twoPlayerExtraRollAfterFinish,
      hasSpunLuckyWheelThisTurn: this.hasSpunLuckyWheelThisTurn
    };
  }

  setGameState(state) {
    this.playerTurn = state.playerTurn;
    this.linesToDraw = state.linesToDraw;
    this.diceValue = state.diceValue;
    this.playerScores = state.playerScores;
    this.drawnLines = state.drawnLines;
    this.drawnLineKeys = new Set(state.drawnLineKeys);
    this.completedSquares = state.completedSquares;
    this.gameOver = state.gameOver;
    this.hasSpecialLine = state.hasSpecialLine;
    this.hasRolledDice = state.hasRolledDice;
    this.twoPlayerExtraRollAfterFinish = state.twoPlayerExtraRollAfterFinish;
    this.hasSpunLuckyWheelThisTurn = state.hasSpunLuckyWheelThisTurn;
  }
}

export default GameLogic;
