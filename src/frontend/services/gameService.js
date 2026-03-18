import { GameLogic } from './gameLogic.js';
import { AIService } from './aiService.js';
import { OnlineService } from './onlineService.js';
import { GameBoard } from '../components/GameBoard.js';
import { GAME_MODES, DICE_SVGS, LUCKY_DRAW_OUTCOMES } from '../../shared/constants/gameConstants.js';

export class GameService {
  constructor() {
    this.gameLogic = new GameLogic();
    this.gameBoard = null;
    this.aiService = null;
    this.onlineService = null;
    this.gameMode = null;
    this.isLuckyWheelEnabled = true;
    this.setupConfiguration();
  }

  async setupConfiguration() {
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      this.isLuckyWheelEnabled = config.DEFAULT_LUCKY_WHEEL_ENABLED;
      console.log('Lucky Wheel enabled:', this.isLuckyWheelEnabled);
    } catch (error) {
      console.log('Using default Lucky Wheel setting:', this.isLuckyWheelEnabled);
    }
  }

  startGame(mode, onlineOptions = {}) {
    this.gameMode = mode;
    this.gameLogic.resetGame();
    
    // Initialize game board
    if (!this.gameBoard) {
      this.gameBoard = new GameBoard('game-canvas');
      this.gameBoard.onLineDrawn = (line) => this.handleLineDrawn(line);
    }

    // Initialize AI service for single player mode
    if (mode === GAME_MODES.SINGLE_PLAYER) {
      this.aiService = new AIService(this.gameLogic, (action) => this.handleAIAction(action));
    }

    // Initialize online service for multiplayer mode
    if (mode === GAME_MODES.ONLINE_MULTIPLAYER) {
      this.onlineService = new OnlineService();
      this.setupOnlineHandlers();
    }

    this.updateDisplay();
    this.gameBoard.drawBoard();
  }

  setupOnlineHandlers() {
    this.onlineService.onLobbyUpdate = (data) => {
      // Handle lobby updates
    };

    this.onlineService.onGameStart = (data) => {
      // Handle game start
    };

    this.onlineService.onGameAction = (action) => {
      this.handleOnlineGameAction(action);
    };

    this.onlineService.onPlayerDisconnected = (data) => {
      this.showMessage('Player Disconnected', data.message);
    };

    this.onlineService.onLobbyDestroyed = (data) => {
      this.showMessage('Lobby Destroyed', data.message);
    };
  }

  handleLineDrawn(line) {
    if (this.gameLogic.gameOver) return;

    // Check if player has rolled dice and has lines to draw
    if (this.gameLogic.linesToDraw <= 0 && !this.gameLogic.hasSpecialLine) {
      this.showMessage("Roll the Dice First!", "You need to roll the dice to get lines to draw. Click on the dice to roll!");
      return;
    }

    const result = this.gameLogic.drawLine(line);
    if (result.success) {
      // Draw the line on the board
      const color = this.gameLogic.playerTurn === 1 ? '#36454F' : '#A0522D';
      this.gameBoard.drawLine(line, color);
      
      // Redraw squares if any were completed
      if (result.squaresCompleted > 0) {
        this.gameBoard.redrawSquares(this.gameLogic.completedSquares);
      }

      // Check for extra roll from Double Trouble
      if (result.shouldSwitchTurn) {
        if (this.gameLogic.twoPlayerExtraRollAfterFinish) {
          this.gameLogic.twoPlayerExtraRollAfterFinish = false;
          this.gameLogic.hasRolledDice = false;
          this.showMessage('Lucky Draw', 'Your bonus roll is ready! Roll the dice again.');
        } else {
          this.switchTurn();
        }
      }

      this.updateDisplay();
      this.checkGameOver();

      // Send to online opponent if in multiplayer mode
      if (this.gameMode === GAME_MODES.ONLINE_MULTIPLAYER) {
        this.onlineService.sendGameAction({
          type: 'drawLine',
          line: line
        });
      }
    }
  }

  rollDice() {
    if (this.gameLogic.hasRolledDice && !this.gameLogic.twoPlayerExtraRollAfterFinish) {
      return;
    }

    const result = this.gameLogic.rollDice();
    if (result.success) {
      this.animateDiceRoll(result.value, () => {
        this.updateDisplay();

        // Show special line message if granted on this roll
        if (result.grantedSpecialLine) {
          this.showMessage('Special Line!', 'You gained a special bonus line. Use it wisely!');
        }
        
        // Lucky Wheel: only in offline modes and once per turn
        if (
          result.shouldTriggerLuckyWheel &&
          this.isLuckyWheelEnabled &&
          this.gameMode !== GAME_MODES.ONLINE_MULTIPLAYER
        ) {
          this.triggerLuckyWheel();
        } else if (this.gameMode === GAME_MODES.SINGLE_PLAYER && this.gameLogic.playerTurn === 2) {
          // Start AI turn
          this.aiService.setAITurn(true);
          setTimeout(() => this.aiService.makeMove(), 500);
        }
      });
    }
  }

  animateDiceRoll(finalValue, onComplete) {
    const diceDisplayEl = this.getDiceDisplayElement();
    let rollCount = 0;
    const maxRolls = 15;
    const rollDuration = 50;
    
    const interval = setInterval(() => {
      const randomRoll = Math.floor(Math.random() * 6) + 1;
      diceDisplayEl.innerHTML = DICE_SVGS[randomRoll];
      rollCount++;
      
      if (rollCount >= maxRolls) {
        clearInterval(interval);
        diceDisplayEl.innerHTML = DICE_SVGS[finalValue];
        if (onComplete) onComplete();
      }
    }, rollDuration);

    // Play dice audio
    const diceAudio = document.getElementById('dice-audio');
    if (diceAudio) {
      diceAudio.currentTime = 0;
      diceAudio.play();
    }
  }

  triggerLuckyWheel() {
    // Enforce global and per-turn rules
    if (!this.isLuckyWheelEnabled) {
      return;
    }
    if (this.gameMode === GAME_MODES.ONLINE_MULTIPLAYER) {
      // Lucky Wheel is disabled in online multiplayer for balanced gameplay
      return;
    }
    if (this.gameLogic.hasSpunLuckyWheelThisTurn) {
      // Already used Lucky Wheel this turn
      return;
    }

    this.gameLogic.hasSpunLuckyWheelThisTurn = true;

    const result = LUCKY_DRAW_OUTCOMES[Math.floor(Math.random() * LUCKY_DRAW_OUTCOMES.length)];
    this.showMessage('Lucky Draw', result);
    
    setTimeout(() => {
      this.handleLuckyDrawResult(result);
    }, 1000);
  }

  handleLuckyDrawResult(result) {
    switch (result) {
      case '🎯 Bullseye! +1 line':
        this.gameLogic.linesToDraw++;
        this.updateDisplay();
        break;
      case '🎲 Double Trouble! Roll again':
        this.gameLogic.twoPlayerExtraRollAfterFinish = true;
        break;
      case '💨 Poof! Turn vanished':
        this.gameLogic.linesToDraw = 0;
        this.updateDisplay();
        this.switchTurn();
        break;
      case '⚡ Lightning Strike! Skip opponent':
        // Skip opponent's next turn (implement as needed)
        break;
      default:
        // No effect
        break;
    }
  }

  switchTurn() {
    this.gameLogic.switchTurn();
    this.updateDisplay();
    
    if (this.gameMode === GAME_MODES.SINGLE_PLAYER && this.gameLogic.playerTurn === 2) {
      // Start AI turn
      this.aiService.setAITurn(true);
      setTimeout(() => this.aiService.makeMove(), 500);
    }
  }

  handleAIAction(action) {
    switch (action) {
      case 'switchTurn':
        this.switchTurn();
        break;
      case 'triggerLuckyWheel':
        this.triggerLuckyWheel();
        break;
    }
  }

  handleOnlineGameAction(action) {
    switch (action.type) {
      case 'drawLine':
        this.gameLogic.drawLine(action.line);
        const color = action.line.player === 1 ? '#36454F' : '#A0522D';
        this.gameBoard.drawLine(action.line, color);
        this.gameBoard.redrawSquares(this.gameLogic.completedSquares);
        this.updateDisplay();
        break;
      case 'syncRollDice':
        this.animateDiceRoll(action.value, () => {
          this.gameLogic.diceValue = action.value;
          this.gameLogic.linesToDraw = action.value;
          this.gameLogic.hasRolledDice = true;
          this.updateDisplay();
        });
        break;
    }
  }

  checkGameOver() {
    if (this.gameLogic.checkGameOver()) {


      const player1Score = this.gameLogic.playerScores[1];
      const player2Score = this.gameLogic.playerScores[2];
      const winner = player1Score > player2Score ? 1 : 2;
      const margin = Math.abs(player1Score - player2Score);
      const loser  = winner === 1 ? 2 : 1;
      const winnerScore=this.gameLogic.playerScores[winner]-this.gameLogic.playerScores[loser];
      this.showMessage('Game Over!', `Player ${winner} wins with ${margin} squares!`);
      
      if (this.gameMode === GAME_MODES.ONLINE_MULTIPLAYER) {
        this.onlineService.sendGameAction({
          type: 'gameOver',
          winner: winner,
          winnerRole: winner,
          winnerScore: this.gameLogic.playerScores[winner],
          player1Score: player1Score,
          player2Score: player2Score
        });
      }
    }
  }

  updateDisplay() {
    // Update score displays
    const player1ScoreEl = document.getElementById('sp-player1-count') || 
                          document.getElementById('tp-player1-count') || 
                          document.getElementById('online-player1-count');
    const player2ScoreEl = document.getElementById('sp-player2-count') || 
                          document.getElementById('tp-player2-count') || 
                          document.getElementById('online-player2-count');
    
    if (player1ScoreEl) player1ScoreEl.textContent = this.gameLogic.playerScores[1];
    if (player2ScoreEl) player2ScoreEl.textContent = this.gameLogic.playerScores[2];

    // Update lines to draw
    const linesToDrawEl = document.getElementById('sp-lines-to-draw-count') || 
                         document.getElementById('tp-lines-to-draw-count') || 
                         document.getElementById('online-lines-to-draw-count');
    if (linesToDrawEl) linesToDrawEl.textContent = this.gameLogic.linesToDraw;

    // Update dice display
    const diceDisplayEl = this.getDiceDisplayElement();
    if (diceDisplayEl) {
      if (this.gameLogic.diceValue === 0) {
        diceDisplayEl.innerHTML = DICE_SVGS[1];
        diceDisplayEl.classList.add('disabled');
      } else {
        diceDisplayEl.innerHTML = DICE_SVGS[this.gameLogic.diceValue];
        diceDisplayEl.classList.remove('disabled');
      }
    }
  }

  getDiceDisplayElement() {
    return document.getElementById('sp-dice-display') || 
           document.getElementById('tp-dice-display') || 
           document.getElementById('online-dice-display');
  }

  showMessage(title, message) {
    if (typeof window.showToast === 'function') {
      window.showToast(title || 'Message', message || '', { type: 'info' });
    } else {
      // Fallback for environments without toast helper
      alert(`${title}: ${message}`);
    }
  }
}

export default GameService;
