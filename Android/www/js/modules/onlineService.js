// Socket.IO is loaded globally via script tag in index.html
// import { io } from 'socket.io-client'; // Commented out to prevent module resolution error

export class OnlineService {
  constructor() {
    // Use the global socket instance if available to avoid multiple connections
    if (window.socket) {
      this.socket = window.socket;
      console.log('OnlineService: Using existing global socket instance');
    } else {
      this.socket = io();
      window.socket = this.socket; // Set global reference
      console.log('OnlineService: Created new socket instance');
    }
    this.currentLobbyCode = null;
    this.isInLobby = false;
    this.isGameStarted = false;
    this.isCreator = false;
    this.playerRole = null;
    this.setupEventHandlers();

    // If already connected (common when reusing global socket), associate user immediately
    try {
      if (this.socket.connected && window.authService && window.authService.isUserAuthenticated()) {
        const user = window.authService.getCurrentUser();
        if (user && (user._id || user.id) && user.username) {
          const userId = user._id || user.id;
          this.socket.emit('associateUser', { userId, username: user.username });
        }
      }
    } catch (e) {
      // no-op
    }
  }

  setupEventHandlers() {
    // Socket connection event handlers
    this.socket.on('connect', () => {
      console.log('Connected to server');
      try {
        if (window.authService && window.authService.isUserAuthenticated()) {
          const user = window.authService.getCurrentUser();
          if (user && (user._id || user.id) && user.username) {
            const userId = user._id || user.id;
            this.socket.emit('associateUser', { userId, username: user.username });
          }
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
    const username = (window.authService && window.authService.getCurrentUser()) ? window.authService.getCurrentUser().username : undefined;
    const payload = username ? { username } : undefined;
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
    const username = (window.authService && window.authService.getCurrentUser()) ? window.authService.getCurrentUser().username : undefined;
    const payload = username ? { lobbyCode, username } : lobbyCode;
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
