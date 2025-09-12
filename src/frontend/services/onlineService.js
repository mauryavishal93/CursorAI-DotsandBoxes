import { io } from 'socket.io-client';
import AuthService from './authService.js';

export class OnlineService {
  constructor() {
    this.socket = io();
    this.authService = new AuthService();
    this.currentLobbyCode = null;
    this.isInLobby = false;
    this.isGameStarted = false;
    this.isCreator = false;
    this.playerRole = null;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Socket connection event handlers
    this.socket.on('connect', () => {
      console.log('Connected to server');
      try {
        const user = this.authService.getCurrentUser();
        if (user && user._id && user.username) {
          this.socket.emit('associateUser', { userId: user._id, username: user.username });
        }
      } catch (e) {
        // no-op
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('lobbyUpdate', (data) => {
      console.log('Lobby update:', data);
      this.onLobbyUpdate(data);
    });

    this.socket.on('startGame', (data) => {
      console.log('Game started:', data);
      this.isGameStarted = true;
      this.onGameStart(data);
    });

    this.socket.on('gameAction', (action) => {
      console.log('Game action received:', action);
      this.onGameAction(action);
    });

    this.socket.on('playerDisconnected', (data) => {
      console.log('Player disconnected:', data);
      this.onPlayerDisconnected(data);
    });

    this.socket.on('lobbyDestroyed', (data) => {
      console.log('Lobby destroyed:', data);
      this.onLobbyDestroyed(data);
    });
  }

  createLobby(callback) {
    const user = this.authService.getCurrentUser();
    const payload = user && user.username ? { username: user.username } : undefined;
    this.socket.emit('createLobby', payload, (response) => {
      this.currentLobbyCode = response.lobbyCode;
      this.isInLobby = true;
      this.isCreator = true;
      this.playerRole = 1;
      console.log('Created lobby:', response.lobbyCode);
      if (callback) callback(response);
    });
  }

  joinLobby(lobbyCode, callback) {
    const user = this.authService.getCurrentUser();
    const payload = user && user.username ? { lobbyCode, username: user.username } : lobbyCode;
    this.socket.emit('joinLobby', payload, (response) => {
      if (response.success) {
        this.currentLobbyCode = lobbyCode;
        this.isInLobby = true;
        this.isCreator = false;
        this.playerRole = 2;
        console.log('Joined lobby:', lobbyCode);
      }
      if (callback) callback(response);
    });
  }

  leaveLobby() {
    if (this.currentLobbyCode) {
      this.socket.emit('leaveLobby', this.currentLobbyCode);
      this.resetLobbyState();
    }
  }

  sendGameAction(action) {
    if (this.currentLobbyCode) {
      this.socket.emit('gameAction', {
        lobbyCode: this.currentLobbyCode,
        action: action
      });
    }
  }

  resetLobbyState() {
    this.currentLobbyCode = null;
    this.isInLobby = false;
    this.isGameStarted = false;
    this.isCreator = false;
    this.playerRole = null;
  }

  // Event callbacks (to be overridden by the game)
  onLobbyUpdate(data) {
    // Override in game
  }

  onGameStart(data) {
    // Override in game
  }

  onGameAction(action) {
    // Override in game
  }

  onPlayerDisconnected(data) {
    // Override in game
  }

  onLobbyDestroyed(data) {
    // Override in game
  }

  disconnect() {
    this.socket.disconnect();
  }
}

export default OnlineService;
