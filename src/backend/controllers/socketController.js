const lobbyService = require('../services/lobbyService');

class SocketController {
  constructor(io) {
    this.io = io;
    this.socketUsers = new Map(); // Map socket.id to user info
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('A user connected:', socket.id);

      // Create a new lobby
      socket.on('createLobby', (callback) => {
        const lobbyCode = lobbyService.createLobby(socket.id);
        socket.join(lobbyCode);
        callback({ lobbyCode });
        this.io.to(socket.id).emit('lobbyUpdate', { players: lobbyService.getLobby(lobbyCode).players });
      });

      // Join an existing lobby
      socket.on('joinLobby', (lobbyCode, callback) => {
        const result = lobbyService.joinLobby(lobbyCode, socket.id);
        if (result.success) {
          socket.join(lobbyCode);
          callback({ success: true });
          this.io.to(lobbyCode).emit('lobbyUpdate', { players: result.lobby.players });
          // Start game if 2 players - add delay to ensure socket is properly joined (increased for iOS compatibility)
          console.log(`Lobby ${lobbyCode} has ${result.lobby.players.length} players:`, result.lobby.players);
          if (result.lobby.players.length === 2) {
            result.lobby.gameOver = false;
            console.log(`🎮 Starting game for lobby ${lobbyCode} with ${result.lobby.players.length} players`);
            console.log(`Players in lobby:`, result.lobby.players);
            console.log(`Player roles:`, result.lobby.playerRoles);
            
            // Increased delay to ensure socket is properly joined to room (especially for iOS)
            // Use a flag to prevent multiple game starts
            if (!result.lobby.gameStarting) {
              result.lobby.gameStarting = true; // Prevent multiple game starts
              
              setTimeout(() => {
                const room = this.io.sockets.adapter.rooms.get(lobbyCode);
                const socketCount = room ? room.size : 0;
                console.log(`🔍 Checking room ${lobbyCode} - Room has ${socketCount} sockets`);
                
                // Double-check that both players are in the room before starting
                if (socketCount >= 2) {
                  console.log(`✅ Emitting startGame to lobby ${lobbyCode} - Both players confirmed in room`);
                  this.io.to(lobbyCode).emit('startGame', { lobbyCode });
                  console.log(`🚀 startGame event emitted to lobby ${lobbyCode}`);
                } else {
                  console.log(`⚠️ Not enough players in room (${socketCount}/2), retrying in 200ms...`);
                  // Retry after another delay if not enough players
                  setTimeout(() => {
                    const retryRoom = this.io.sockets.adapter.rooms.get(lobbyCode);
                    const retrySocketCount = retryRoom ? retryRoom.size : 0;
                    console.log(`🔄 Retry: Emitting startGame to lobby ${lobbyCode} - Room has ${retrySocketCount} sockets`);
                    this.io.to(lobbyCode).emit('startGame', { lobbyCode });
                    console.log(`🚀 startGame event emitted to lobby ${lobbyCode} (retry)`);
                  }, 200);
                }
              }, 300); // Increased from 100ms to 300ms for better iOS compatibility
            } else {
              console.log(`⚠️ Game start already in progress for lobby ${lobbyCode}, skipping duplicate start`);
            }
          } else {
            console.log(`⏳ Lobby ${lobbyCode} has ${result.lobby.players.length} players, waiting for more players...`);
          }
        } else {
          callback({ success: false, message: result.message });
        }
      });

      // Associate socket with user
      socket.on('associateUser', ({ userId, username }) => {
        this.socketUsers.set(socket.id, { userId, username });
        console.log(`Socket ${socket.id} associated with user ${username} (${userId})`);
      });

      // Handle reconnection to existing lobby
      socket.on('reconnectToLobby', (lobbyCode, callback) => {
        console.log(`Player ${socket.id} attempting to reconnect to lobby ${lobbyCode}`);
        const success = lobbyService.handleReconnection(lobbyCode, socket.id);
        if (success) {
          socket.join(lobbyCode);
          const lobby = lobbyService.getLobby(lobbyCode);
          callback({ success: true, lobby });
          // Notify other players about reconnection
          this.io.to(lobbyCode).emit('playerReconnected', { 
            message: 'Your opponent has reconnected!',
            reconnectedPlayer: socket.id
          });
          console.log(`Player ${socket.id} successfully reconnected to lobby ${lobbyCode}`);
        } else {
          callback({ success: false, message: 'Lobby not found or reconnection failed' });
        }
      });

      // Handle game state updates
      socket.on('gameAction', ({ lobbyCode, action }) => {
        try {
          // Validate input
          if (!lobbyCode || !action || !action.type) {
            console.error('Invalid gameAction received:', { lobbyCode, action });
            return;
          }
          
          console.log('Game action received:', action.type, 'in lobby:', lobbyCode);
          
          // Verify lobby exists and player is in it
          const lobby = lobbyService.getLobby(lobbyCode);
          if (!lobby || !lobby.players.includes(socket.id)) {
            console.error('Player not in lobby or lobby does not exist:', { lobbyCode, socketId: socket.id });
            return;
          }
          
          // Broadcast action to the other player in the lobby
          socket.to(lobbyCode).emit('gameAction', action);
          
          // If the action is game over, mark the lobby as finished and update stats
          if (action.type === 'gameOver') {
            lobbyService.markGameOver(lobbyCode, action.winner, action.winnerRole, action.winnerScore);
            this.handleGameOver(lobbyCode, action);
          }
        } catch (error) {
          console.error('Error handling gameAction:', error);
        }
      });

      // Handle player leaving lobby (disconnect, back to home, restart)
      socket.on('leaveLobby', (lobbyCode) => {
        try {
          if (!lobbyCode) {
            console.error('Invalid leaveLobby request - no lobby code provided');
            return;
          }
          this.handlePlayerLeave(socket, lobbyCode);
        } catch (error) {
          console.error('Error handling leaveLobby:', error);
        }
      });

      // Handle background/foreground heartbeats for app switching
      socket.on('backgroundHeartbeat', (data) => {
        console.log(`Player ${socket.id} went to background in lobby ${data.lobbyCode}`);
        // Update lobby activity to prevent premature cleanup
        if (data.lobbyCode && lobbyService.getLobby(data.lobbyCode)) {
          const lobby = lobbyService.getLobby(data.lobbyCode);
          lobby.lastActivity = Date.now();
          console.log(`Updated lobby ${data.lobbyCode} activity due to background heartbeat`);
        }
      });

      socket.on('foregroundHeartbeat', (data) => {
        console.log(`Player ${socket.id} returned to foreground in lobby ${data.lobbyCode} after ${Math.round(data.backgroundDuration / 1000)}s`);
        // Update lobby activity and potentially notify other players
        if (data.lobbyCode && lobbyService.getLobby(data.lobbyCode)) {
          const lobby = lobbyService.getLobby(data.lobbyCode);
          lobby.lastActivity = Date.now();
          
          // If player was marked as disconnected, reconnect them
          if (lobby.disconnectedPlayers.includes(socket.id)) {
            lobbyService.handleReconnection(data.lobbyCode, socket.id);
            // Notify other players about reconnection
            socket.to(data.lobbyCode).emit('playerReconnected', {
              message: 'Your opponent has reconnected!',
              reconnectedPlayer: socket.id
            });
          }
        }
      });

      // Handle rejoin lobby requests (for reconnection after app switching)
      socket.on('rejoinLobby', (lobbyCode) => {
        console.log(`Player ${socket.id} attempting to rejoin lobby ${lobbyCode}`);
        
        const lobby = lobbyService.getLobby(lobbyCode);
        if (lobby) {
          // Check if player was in this lobby
          if (lobby.players.includes(socket.id) || lobby.disconnectedPlayers.includes(socket.id)) {
            // Rejoin the socket room
            socket.join(lobbyCode);
            
            // Handle reconnection
            if (lobby.disconnectedPlayers.includes(socket.id)) {
              lobbyService.handleReconnection(lobbyCode, socket.id);
              console.log(`Player ${socket.id} successfully reconnected to lobby ${lobbyCode}`);
              
              // Notify about successful reconnection
              socket.emit('rejoinSuccess', {
                lobbyCode: lobbyCode,
                playerRole: lobby.playerRoles[socket.id],
                players: lobby.players.length,
                gameState: lobby.gameState
              });
              
              // Notify other players
              socket.to(lobbyCode).emit('playerReconnected', {
                message: 'Your opponent has reconnected!',
                reconnectedPlayer: socket.id
              });
            } else {
              // Player was never disconnected, just confirm rejoin
              socket.emit('rejoinSuccess', {
                lobbyCode: lobbyCode,
                playerRole: lobby.playerRoles[socket.id],
                players: lobby.players.length,
                gameState: lobby.gameState
              });
            }
          } else {
            console.log(`Player ${socket.id} was not in lobby ${lobbyCode}, cannot rejoin`);
            socket.emit('rejoinFailed', { message: 'You were not in this lobby.' });
          }
        } else {
          console.log(`Lobby ${lobbyCode} no longer exists, cannot rejoin`);
          socket.emit('rejoinFailed', { message: 'Lobby no longer exists.' });
        }
      });

      // Handle disconnects
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  handlePlayerLeave(socket, lobbyCode) {
    const result = lobbyService.leaveLobby(lobbyCode, socket.id);
    if (result.success) {
      // Remove socket from room before sending message
      socket.leave(lobbyCode);
      
      // Check if game was already over before showing disconnect message
      if (result.remainingPlayers > 0 && !result.gameOver) {
        // Game was not over, so show the opponent left message
        this.io.to(lobbyCode).emit('playerDisconnected', { 
          message: 'Your opponent has left the game. Congratulations, you win!',
          winner: lobbyService.getLobby(lobbyCode).players[0] // The remaining player wins
        });
        
        // Destroy the lobby session immediately after message delivery
        setTimeout(() => {
          lobbyService.destroyLobby(lobbyCode);
        }, 500); // Reduced delay for faster cleanup
      } else if (result.remainingPlayers > 0 && result.gameOver) {
        // Game was already over, just destroy the lobby without showing disconnect message
        console.log(`Player left lobby ${lobbyCode} but game was already over, destroying lobby silently`);
        lobbyService.destroyLobby(lobbyCode);
      } else {
        // If no players left, destroy immediately
        lobbyService.destroyLobby(lobbyCode);
      }
    }
    console.log('A user left lobby:', socket.id, 'from lobby:', lobbyCode);
  }

  async handleGameOver(lobbyCode, action) {
    try {
      const lobby = lobbyService.getLobby(lobbyCode);
      if (!lobby || !lobby.players) return;

      // Get user info for both players
      const player1SocketId = lobby.players[0];
      const player2SocketId = lobby.players[1];
      
      const player1User = this.socketUsers.get(player1SocketId);
      const player2User = this.socketUsers.get(player2SocketId);

      // Get scores for both players from the action
      const winnerRole = action.winnerRole;
      const winnerScore = action.winnerScore;
      const player1Score = action.player1Score || 0; // Use actual score or 0 if not provided
      const player2Score = action.player2Score || 0; // Use actual score or 0 if not provided
      
      console.log(`Game over - Player 1: ${player1Score} points, Player 2: ${player2Score} points, Winner: ${winnerRole}`);
      console.log(`Player 1 User:`, player1User ? `${player1User.username} (${player1User.userId})` : 'Not found');
      console.log(`Player 2 User:`, player2User ? `${player2User.username} (${player2User.userId})` : 'Not found');
      
      // Update statistics for both players with their actual scores
      if (player1User) {
        const isWinner = winnerRole === 1; // Only player 1 wins if winnerRole is 1
        await this.updateUserStats(player1User.userId, isWinner, player1Score);
        console.log(`Updated Player 1 (${player1User.username}) stats: won=${isWinner}, score=${player1Score}`);
        
        // Emit stats update to player 1's socket
        const player1Socket = this.io.sockets.sockets.get(player1SocketId);
        if (player1Socket) {
          const User = global.useInMemoryStorage 
            ? require('../models/InMemoryUser')
            : require('../models/User');
          const updatedUser = await User.findById(player1User.userId);
          if (updatedUser) {
            player1Socket.emit('statsUpdated', {
              userId: player1User.userId,
              stats: updatedUser.getStats()
            });
            console.log(`Emitted stats update to Player 1 (${player1User.username})`);
          }
        }
      }
      
      if (player2User) {
        const isWinner = winnerRole === 2; // Only player 2 wins if winnerRole is 2
        await this.updateUserStats(player2User.userId, isWinner, player2Score);
        console.log(`Updated Player 2 (${player2User.username}) stats: won=${isWinner}, score=${player2Score}`);
        
        // Emit stats update to player 2's socket
        const player2Socket = this.io.sockets.sockets.get(player2SocketId);
        if (player2Socket) {
          const User = global.useInMemoryStorage 
            ? require('../models/InMemoryUser')
            : require('../models/User');
          const updatedUser = await User.findById(player2User.userId);
          if (updatedUser) {
            player2Socket.emit('statsUpdated', {
              userId: player2User.userId,
              stats: updatedUser.getStats()
            });
            console.log(`Emitted stats update to Player 2 (${player2User.username})`);
          }
        }
      }
      
      console.log(`Game statistics updated for lobby ${lobbyCode}`);
    } catch (error) {
      console.error('Error updating game statistics:', error);
    }
  }

  async updateUserStats(userId, won, score, gameMode = 'online') {
    try {
      // Get the appropriate user model based on storage type
      const User = global.useInMemoryStorage 
        ? require('../models/InMemoryUser')
        : require('../models/User');

      const user = await User.findById(userId);
      if (user) {
        console.log(`Before update - User ${userId} stats:`, user.getStats());
        
        // Update statistics based on game mode
        if (gameMode === 'online') {
          await user.updateOnlineStats(won, score);
        } else if (gameMode === 'ai') {
          await user.updateAIStats(won, score);
        } else {
          // Fallback to legacy method
          await user.updateGameStats(won, score);
        }
        
        console.log(`After update - User ${userId} stats:`, user.getStats());
        console.log(`Updated ${gameMode} stats for user ${userId}: won=${won}, score=${score}`);
      } else {
        console.log(`User ${userId} not found in database`);
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  }

  handleDisconnect(socket) {
    // Clean up socket user mapping
    this.socketUsers.delete(socket.id);
    
    const lobbies = lobbyService.getAllLobbies();
    for (const [lobbyCode, lobby] of Object.entries(lobbies)) {
      const idx = lobby.players.indexOf(socket.id);
      if (idx !== -1) {
        // Remove socket from room
        socket.leave(lobbyCode);
        
        // Check if game was already over
        if (lobby.gameOver) {
          // Game was already over, just destroy the lobby without showing disconnect message
          console.log(`Player disconnected from lobby ${lobbyCode} but game was already over, destroying lobby silently`);
          lobbyService.destroyLobby(lobbyCode);
        } else {
          // Game is still active, handle as temporary disconnection
          console.log(`Player ${socket.id} disconnected from active lobby ${lobbyCode}, treating as temporary disconnection`);
          lobbyService.handleDisconnection(lobbyCode, socket.id);
          
          // Notify remaining players about temporary disconnection
          const activePlayers = lobby.players.filter(playerId => !lobby.disconnectedPlayers.includes(playerId));
          if (activePlayers.length > 0) {
            this.io.to(lobbyCode).emit('playerDisconnected', { 
              message: 'Your opponent has temporarily disconnected. They have 5 minutes to reconnect.',
              isTemporary: true,
              disconnectedPlayer: socket.id
            });
          }
        }
      }
    }
    console.log('A user disconnected:', socket.id);
  }
}

module.exports = SocketController;
