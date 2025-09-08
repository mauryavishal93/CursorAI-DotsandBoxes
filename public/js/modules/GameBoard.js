import { BaseComponent } from './BaseComponent.js';
import { GAME_CONFIG, COLORS } from './gameConstants.js';

export class GameBoard extends BaseComponent {
  constructor(canvasId) {
    super(canvasId);
    this.ctx = this.element.getContext('2d');
    this.cellSize = 0;
    this.boardSize = 0;
    this.selectedDot = null;
    this.isDrawingLine = false;
    this.isDragging = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.element.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.element.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.element.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.element.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.element.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.element.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  }

  calculateBoardSize() {
    const canvas = this.element;
    const minDimension = Math.min(canvas.width, canvas.height);
    this.boardSize = minDimension - (GAME_CONFIG.BOARD_PADDING * 2);
    this.cellSize = this.boardSize / GAME_CONFIG.GRID_SIZE;
  }

  getDotAtCoordinates(x, y) {
    const rect = this.element.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;
    
    const col = Math.round((canvasX - GAME_CONFIG.BOARD_PADDING) / this.cellSize);
    const row = Math.round((canvasY - GAME_CONFIG.BOARD_PADDING) / this.cellSize);
    
    if (row >= 0 && row <= GAME_CONFIG.GRID_SIZE && col >= 0 && col <= GAME_CONFIG.GRID_SIZE) {
      return { row, col };
    }
    return null;
  }

  drawBoard() {
    this.calculateBoardSize();
    this.ctx.clearRect(0, 0, this.element.width, this.element.height);
    
    // Draw dots
    for (let row = 0; row <= GAME_CONFIG.GRID_SIZE; row++) {
      for (let col = 0; col <= GAME_CONFIG.GRID_SIZE; col++) {
        const x = col * this.cellSize + GAME_CONFIG.BOARD_PADDING;
        const y = row * this.cellSize + GAME_CONFIG.BOARD_PADDING;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, GAME_CONFIG.DOT_RADIUS, 0, 2 * Math.PI);
        this.ctx.fillStyle = COLORS.DOT_COLOR;
        this.ctx.fill();
      }
    }
  }

  drawLine(line, color) {
    const startX = line.start.col * this.cellSize + GAME_CONFIG.BOARD_PADDING;
    const startY = line.start.row * this.cellSize + GAME_CONFIG.BOARD_PADDING;
    const endX = line.end.col * this.cellSize + GAME_CONFIG.BOARD_PADDING;
    const endY = line.end.row * this.cellSize + GAME_CONFIG.BOARD_PADDING;
    
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = GAME_CONFIG.LINE_WIDTH;
    this.ctx.stroke();
  }

  drawSquareMark(row, col, player) {
    const x = col * this.cellSize + GAME_CONFIG.BOARD_PADDING;
    const y = row * this.cellSize + GAME_CONFIG.BOARD_PADDING;
    const markSize = this.cellSize * 0.3;
    
    this.ctx.font = `${markSize}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = player === 1 ? COLORS.SQUARE_MARK_COLOR_PLAYER1 : COLORS.SQUARE_MARK_COLOR_PLAYER2;
    this.ctx.fillText(player === 1 ? 'X' : 'O', x, y);
  }

  highlightSelectedDot(dot) {
    if (dot) {
      const x = dot.col * this.cellSize + GAME_CONFIG.BOARD_PADDING;
      const y = dot.row * this.cellSize + GAME_CONFIG.BOARD_PADDING;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, GAME_CONFIG.DOT_RADIUS + 3, 0, 2 * Math.PI);
      this.ctx.strokeStyle = COLORS.ACTIVE_DOT_COLOR;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    }
  }

  redrawLines(lines) {
    lines.forEach(line => {
      const color = line.player === 1 ? COLORS.LINE_COLOR_PLAYER1 : COLORS.LINE_COLOR_PLAYER2;
      this.drawLine(line, color);
    });
  }

  redrawSquares(completedSquares) {
    for (let row = 0; row < GAME_CONFIG.GRID_SIZE; row++) {
      for (let col = 0; col < GAME_CONFIG.GRID_SIZE; col++) {
        if (completedSquares[row][col] !== 0) {
          this.drawSquareMark(row, col, completedSquares[row][col]);
        }
      }
    }
  }

  // Event handlers
  handleMouseDown(event) {
    this.handleStart(event.clientX, event.clientY);
  }

  handleMouseMove(event) {
    this.handleMove(event.clientX, event.clientY);
  }

  handleMouseUp(event) {
    this.handleEnd(event.clientX, event.clientY);
  }

  handleTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    this.handleStart(touch.clientX, touch.clientY);
  }

  handleTouchMove(event) {
    event.preventDefault();
    const touch = event.touches[0];
    this.handleMove(touch.clientX, touch.clientY);
  }

  handleTouchEnd(event) {
    event.preventDefault();
    const touch = event.changedTouches[0];
    this.handleEnd(touch.clientX, touch.clientY);
  }

  handleStart(clientX, clientY) {
    const dot = this.getDotAtCoordinates(clientX, clientY);
    if (dot) {
      this.selectedDot = dot;
      this.isDrawingLine = true;
      this.drawBoard();
      this.highlightSelectedDot(this.selectedDot);
    }
  }

  handleMove(clientX, clientY) {
    if (this.isDrawingLine && this.selectedDot) {
      this.isDragging = true;
      // Could add visual feedback here
    }
  }

  handleEnd(clientX, clientY) {
    if (this.isDrawingLine && this.selectedDot) {
      const endDot = this.getDotAtCoordinates(clientX, clientY);
      if (endDot && this.isValidLine(this.selectedDot, endDot)) {
        this.onLineDrawn({
          start: this.selectedDot,
          end: endDot
        });
      }
    }
    
    this.selectedDot = null;
    this.isDrawingLine = false;
    this.isDragging = false;
    this.drawBoard();
  }

  isValidLine(start, end) {
    const rowDiff = Math.abs(start.row - end.row);
    const colDiff = Math.abs(start.col - end.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  // Callback for when a line is drawn
  onLineDrawn(line) {
    // Override in game
  }
}

export default GameBoard;
