import { GAME_CONFIG } from '../../shared/constants/gameConstants.js';

export class AIService {
  constructor(gameLogic, onMoveComplete) {
    this.gameLogic = gameLogic;
    this.onMoveComplete = onMoveComplete;
    this.isAITurn = false;
  }

  makeMove() {
    if (this.gameLogic.gameOver || !this.isAITurn) {
      return;
    }

    console.log(`AI Make Move START: Player Turn: ${this.gameLogic.playerTurn}, Lines to Draw: ${this.gameLogic.linesToDraw}`);

    // If AI needs to roll dice (no lines yet)
    if (this.gameLogic.linesToDraw === 0) {
      console.log("AI: No lines to draw and no special line. Rolling dice.");
      
      // Generate random dice value and animate the roll
      const randomValue = Math.floor(Math.random() * 6) + 1;
      console.log(`AI: Rolling dice, got ${randomValue}`);
      
      // Use proper dice animation
      this.animateDiceRoll(randomValue, () => {
        // Set the values after animation completes
        this.gameLogic.diceValue = randomValue;
        this.gameLogic.linesToDraw = randomValue;
        this.gameLogic.hasRolledDice = true;
        
        console.log(`AI: Dice animation complete. Got ${this.gameLogic.diceValue} lines to draw`);
        
        // Check if Lucky Draw wheel should be triggered (only when enabled)
        if (this.gameLogic.isLuckyWheelEnabled && this.gameLogic.diceValue === 6 && !this.gameLogic.hasSpunLuckyWheelThisTurn) {
          console.log('[LUCKY WHEEL] AI rolled 6, triggering Lucky Draw wheel');
          this.onMoveComplete('triggerLuckyWheel');
          return; // Let the Lucky Draw wheel handle the rest
        }
        
        // If no Lucky Draw or Lucky Wheel is disabled, continue with AI moves
        setTimeout(() => this.makeMove(), GAME_CONFIG.AI_MOVE_DELAY);
      });
      return;
    }

    // If AI has lines to draw
    if (this.gameLogic.linesToDraw > 0) {
      const availableLines = this.getAvailableLines();
      console.log("AI: Found available lines count:", availableLines.length);

      let chosenLine = null;

      // Prioritize completing a square
      for (const line of availableLines) {
        const tempDrawnLineKeys = new Set(this.gameLogic.drawnLineKeys);
        tempDrawnLineKeys.add(this.gameLogic.getCanonicalLineKey(line.start, line.end));

        let completesSquareForAI = false;
        if (line.start.row === line.end.row) { // Horizontal line
          const minCol = Math.min(line.start.col, line.end.col);
          if (line.start.row > 0 && this.gameLogic.checkHypotheticalSquareCompletion(line.start.row - 1, minCol, tempDrawnLineKeys)) completesSquareForAI = true;
          if (line.start.row < GAME_CONFIG.GRID_SIZE && this.gameLogic.checkHypotheticalSquareCompletion(line.start.row, minCol, tempDrawnLineKeys)) completesSquareForAI = true;
        } else { // Vertical line
          const minRow = Math.min(line.start.row, line.end.row);
          if (line.start.col > 0 && this.gameLogic.checkHypotheticalSquareCompletion(minRow, line.start.col - 1, tempDrawnLineKeys)) completesSquareForAI = true;
          if (line.start.col < GAME_CONFIG.GRID_SIZE && this.gameLogic.checkHypotheticalSquareCompletion(minRow, line.start.col, tempDrawnLineKeys)) completesSquareForAI = true;
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
          console.log("AI: Drawing line:", chosenLine);
          
          const result = this.gameLogic.drawLine(chosenLine);
          if (result.success) {
            console.log(`AI: Drew line, completed ${result.squaresCompleted} squares`);
            
            // After drawing, if AI still has lines to draw, make another move
            if (this.gameLogic.linesToDraw > 0) {
              console.log(`AI: Remaining lines: ${this.gameLogic.linesToDraw}. Scheduling next move.`);
              setTimeout(() => this.makeMove(), GAME_CONFIG.AI_MOVE_DELAY);
            } else {
              console.log("AI: No more lines to draw. Checking for extra roll.");
              // Check if AI has an extra roll from Double Trouble
              if (this.gameLogic.twoPlayerExtraRollAfterFinish) {
                console.log("AI: Has extra roll from Double Trouble, rolling dice again.");
                // Consume the extra roll and allow AI to roll dice again
                this.gameLogic.twoPlayerExtraRollAfterFinish = false;
                this.gameLogic.hasRolledDice = false; // allow rolling again
                // AI will roll dice and continue with its turn
                setTimeout(() => this.makeMove(), GAME_CONFIG.AI_MOVE_DELAY);
              } else {
                console.log(`[AI TURN END] AI finished drawing all lines, switching turn from Player ${this.gameLogic.playerTurn} to Player 1`);
                this.onMoveComplete('switchTurn');
              }
            }
          }
        }, GAME_CONFIG.AI_MOVE_DELAY);
      } else {
        console.log("AI: No valid line could be chosen from available lines. Checking for extra roll.");
        // Check if AI has an extra roll from Double Trouble even when no lines available
        if (this.gameLogic.twoPlayerExtraRollAfterFinish) {
          console.log("AI: Has extra roll from Double Trouble, rolling dice again.");
          // Consume the extra roll and allow AI to roll dice again
          this.gameLogic.twoPlayerExtraRollAfterFinish = false;
          this.gameLogic.hasRolledDice = false; // allow rolling again
          // AI will roll dice and continue with its turn
          setTimeout(() => this.makeMove(), GAME_CONFIG.AI_MOVE_DELAY);
        } else {
          console.log("AI: No valid lines and no extra roll. Switching turn.");
          this.onMoveComplete('switchTurn');
        }
      }
    } else {
      console.log("AI Make Move END: No lines to draw. Checking for extra roll.");
      // Check if AI has an extra roll from Double Trouble
      if (this.gameLogic.twoPlayerExtraRollAfterFinish) {
        console.log("AI: Has extra roll from Double Trouble, rolling dice again.");
        // Consume the extra roll and allow AI to roll dice again
        this.gameLogic.twoPlayerExtraRollAfterFinish = false;
        this.gameLogic.hasRolledDice = false; // allow rolling again
        // AI will roll dice and continue with its turn
        setTimeout(() => this.makeMove(), GAME_CONFIG.AI_MOVE_DELAY);
      } else {
        console.log("AI: No lines to draw and no extra roll. Switching turn.");
        this.onMoveComplete('switchTurn');
      }
    }
  }

  getAvailableLines() {
    const availableLines = [];
    for (let r = 0; r <= GAME_CONFIG.GRID_SIZE; r++) {
      for (let c = 0; c <= GAME_CONFIG.GRID_SIZE; c++) {
        // Horizontal lines
        if (c < GAME_CONFIG.GRID_SIZE) {
          const line = { start: { row: r, col: c }, end: { row: r, col: c + 1 } };
          if (this.gameLogic.isValidLine(line) && !this.gameLogic.isLineAlreadyDrawn(line)) {
            availableLines.push(line);
          }
        }
        // Vertical lines
        if (r < GAME_CONFIG.GRID_SIZE) {
          const line = { start: { row: r, col: c }, end: { row: r + 1, col: c } };
          if (this.gameLogic.isValidLine(line) && !this.gameLogic.isLineAlreadyDrawn(line)) {
            availableLines.push(line);
          }
        }
      }
    }
    return availableLines;
  }

  animateDiceRoll(finalValue, onComplete) {
    // This would integrate with the UI animation system
    // For now, we'll simulate the animation with a timeout
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 750); // Simulate animation duration
  }

  setAITurn(isAITurn) {
    this.isAITurn = isAITurn;
  }
}

export default AIService;
