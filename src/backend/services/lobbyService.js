// Lobby/session management service
class LobbyService {
  constructor() {
    this.lobbies = {}; // { lobbyCode: { players: [socketId, ...], gameState: {...}, gameOver: false } }
    this.cleanupTimers = new Map(); // Track cleanup timers to prevent memory leaks
  }

  generateLobbyCode() {
    let lobbyCode;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      lobbyCode = Math.random().toString(36).substr(2, 6).toUpperCase();
      attempts++;
    } while (this.lobbies[lobbyCode] && attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
      // Fallback: use timestamp-based code if random generation fails
      lobbyCode = 'L' + Date.now().toString(36).substr(-5).toUpperCase();
      console.warn(`Generated fallback lobby code after ${maxAttempts} attempts: ${lobbyCode}`);
    }
    
    return lobbyCode;
  }

  createLobby(socketId) {
    const lobbyCode = this.generateLobbyCode();
    this.lobbies[lobbyCode] = { 
      players: [socketId], 
      gameState: null, 
      gameOver: false,
      playerRoles: { [socketId]: 1 }, // Player 1 (creator)
      createdAt: Date.now(), // Track lobby creation time
      lastActivity: Date.now(), // Track last activity
      disconnectedPlayers: [] // Track temporarily disconnected players
    };
    console.log(`Lobby ${lobbyCode} created at ${new Date().toISOString()}`);
    return lobbyCode;
  }

  joinLobby(lobbyCode, socketId) {
    if (this.lobbies[lobbyCode]) {
      const lobby = this.lobbies[lobbyCode];
      
      // Check if player is already in the lobby
      if (lobby.players.includes(socketId)) {
        console.log(`Player ${socketId} is already in lobby ${lobbyCode}`);
        lobby.lastActivity = Date.now();
        return { success: true, lobby: lobby };
      }
      
      // Check if lobby is full (2 total players)
      if (lobby.players.length >= 2) {
        return { success: false, message: 'Lobby is full.' };
      }
      
      // If player was previously disconnected, reconnect them
      if (lobby.disconnectedPlayers.includes(socketId)) {
        lobby.disconnectedPlayers = lobby.disconnectedPlayers.filter(id => id !== socketId);
        console.log(`Player ${socketId} reconnected to lobby ${lobbyCode}`);
      } else {
        // New player joining
        lobby.players.push(socketId);
        lobby.playerRoles[socketId] = 2; // Player 2 (joiner)
        console.log(`New player ${socketId} joined lobby ${lobbyCode} as Player 2`);
      }
      
      lobby.lastActivity = Date.now();
      console.log(`Player ${socketId} joined lobby ${lobbyCode} at ${new Date().toISOString()}`);
      console.log(`Lobby ${lobbyCode} now has ${lobby.players.length} players:`, lobby.players);
      return { success: true, lobby: lobby };
    }
    return { success: false, message: 'Lobby does not exist.' };
  }

  leaveLobby(lobbyCode, socketId) {
    if (this.lobbies[lobbyCode]) {
      const idx = this.lobbies[lobbyCode].players.indexOf(socketId);
      if (idx !== -1) {
        // Remove player from lobby
        this.lobbies[lobbyCode].players.splice(idx, 1);
        delete this.lobbies[lobbyCode].playerRoles[socketId];
        return { 
          success: true, 
          remainingPlayers: this.lobbies[lobbyCode].players.length,
          gameOver: this.lobbies[lobbyCode].gameOver
        };
      }
    }
    return { success: false };
  }

  destroyLobby(lobbyCode) {
    if (this.lobbies[lobbyCode]) {
      console.log(`Destroying lobby session: ${lobbyCode}`);
      
      // Clear any cleanup timer for this lobby
      if (this.cleanupTimers.has(lobbyCode)) {
        clearTimeout(this.cleanupTimers.get(lobbyCode));
        this.cleanupTimers.delete(lobbyCode);
      }
      
      delete this.lobbies[lobbyCode];
      console.log(`Lobby session ${lobbyCode} destroyed successfully`);
      return true;
    }
    return false;
  }

  getLobby(lobbyCode) {
    return this.lobbies[lobbyCode];
  }

  updateGameState(lobbyCode, gameState) {
    if (this.lobbies[lobbyCode]) {
      this.lobbies[lobbyCode].gameState = gameState;
    }
  }

  markGameOver(lobbyCode, winner, winnerRole, winnerScore) {
    if (this.lobbies[lobbyCode]) {
      this.lobbies[lobbyCode].gameOver = true;
      this.lobbies[lobbyCode].gameWinner = winner;
      this.lobbies[lobbyCode].gameWinnerRole = winnerRole;
      this.lobbies[lobbyCode].gameWinnerScore = winnerScore;
      console.log(`Game over in lobby ${lobbyCode}: Player ${winner} (Role: ${winnerRole}) wins with ${winnerScore} squares`);
    }
  }

  getAllLobbies() {
    return this.lobbies;
  }

  // Handle temporary disconnection (don't destroy lobby immediately)
  handleDisconnection(lobbyCode, socketId) {
    if (this.lobbies[lobbyCode]) {
      const lobby = this.lobbies[lobbyCode];
      
      // Mark player as disconnected but don't remove them yet
      if (!lobby.disconnectedPlayers.includes(socketId)) {
        lobby.disconnectedPlayers.push(socketId);
        lobby.lastActivity = Date.now();
        console.log(`Player ${socketId} temporarily disconnected from lobby ${lobbyCode}`);
      }
      
      // Check if all players are disconnected
      const activePlayers = lobby.players.filter(playerId => !lobby.disconnectedPlayers.includes(playerId));
      if (activePlayers.length === 0) {
        console.log(`All players disconnected from lobby ${lobbyCode}, scheduling cleanup in 5 minutes`);
        // Clear any existing cleanup timer for this lobby
        if (this.cleanupTimers.has(lobbyCode)) {
          clearTimeout(this.cleanupTimers.get(lobbyCode));
        }
        // Schedule lobby destruction after 5 minutes of inactivity
        const timer = setTimeout(() => {
          this.cleanupInactiveLobby(lobbyCode);
          this.cleanupTimers.delete(lobbyCode); // Remove timer reference
        }, 5 * 60 * 1000); // 5 minutes
        this.cleanupTimers.set(lobbyCode, timer); // Track timer for cleanup
      }
    }
  }

  // Handle reconnection
  handleReconnection(lobbyCode, socketId) {
    if (this.lobbies[lobbyCode]) {
      const lobby = this.lobbies[lobbyCode];
      
      // Remove from disconnected players
      lobby.disconnectedPlayers = lobby.disconnectedPlayers.filter(id => id !== socketId);
      lobby.lastActivity = Date.now();
      console.log(`Player ${socketId} reconnected to lobby ${lobbyCode}`);
      
      return true;
    }
    return false;
  }

  // Clean up inactive lobbies
  cleanupInactiveLobby(lobbyCode) {
    if (this.lobbies[lobbyCode]) {
      const lobby = this.lobbies[lobbyCode];
      const timeSinceLastActivity = Date.now() - lobby.lastActivity;
      
      // Only destroy if no activity for 5+ minutes
      if (timeSinceLastActivity >= 5 * 60 * 1000) {
        console.log(`Cleaning up inactive lobby ${lobbyCode} (inactive for ${Math.round(timeSinceLastActivity / 1000)}s)`);
        this.destroyLobby(lobbyCode);
        return true;
      }
    }
    return false;
  }

  // Clean up all inactive lobbies
  cleanupAllInactiveLobbies() {
    const now = Date.now();
    const inactiveLobbies = [];
    
    for (const [lobbyCode, lobby] of Object.entries(this.lobbies)) {
      const timeSinceLastActivity = now - lobby.lastActivity;
      if (timeSinceLastActivity >= 5 * 60 * 1000) { // 5 minutes
        inactiveLobbies.push(lobbyCode);
      }
    }
    
    inactiveLobbies.forEach(lobbyCode => {
      console.log(`Cleaning up inactive lobby ${lobbyCode}`);
      this.destroyLobby(lobbyCode);
    });
    
    return inactiveLobbies.length;
  }
}

module.exports = new LobbyService();
