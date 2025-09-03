// Lobby/session management service
class LobbyService {
  constructor() {
    this.lobbies = {}; // { lobbyCode: { players: [socketId, ...], gameState: {...}, gameOver: false } }
  }

  generateLobbyCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  createLobby(socketId) {
    const lobbyCode = this.generateLobbyCode();
    this.lobbies[lobbyCode] = { 
      players: [socketId], 
      gameState: null, 
      gameOver: false,
      playerRoles: { [socketId]: 1 } // Player 1 (creator)
    };
    return lobbyCode;
  }

  joinLobby(lobbyCode, socketId) {
    if (this.lobbies[lobbyCode] && this.lobbies[lobbyCode].players.length < 2) {
      this.lobbies[lobbyCode].players.push(socketId);
      this.lobbies[lobbyCode].playerRoles[socketId] = 2; // Player 2 (joiner)
      return { success: true, lobby: this.lobbies[lobbyCode] };
    }
    return { success: false, message: 'Lobby full or does not exist.' };
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
}

module.exports = new LobbyService();
