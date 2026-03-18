const lobbyService = require('../services/lobbyService');
const ScoringService = require('../services/scoringService');
const User = require('../models/User');

class SocketController {
  constructor(io) {
    this.io = io;
    this.socketUsers = new Map(); // Map socket.id to user info
    // Cache chat public keys per lobby so late joiners can derive the shared secret.
    // Structure: Map<lobbyCode, Map<socketId, publicKeyB64>>
    this.chatPublicKeysByLobby = new Map();
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('A user connected:', socket.id);

      // Create a new lobby
      socket.on('createLobby', (data, callback) => {
        // Handle both old format (no data) and new format (with username)
        const username = (typeof data === 'object' && data.username) ? data.username : 'Player';
        const actualCallback = typeof data === 'function' ? data : callback;
        
        const lobbyCode = lobbyService.createLobby(socket.id, username);
        socket.join(lobbyCode);
        
        // Send back lobby creation information
        actualCallback({ 
          lobbyCode: lobbyCode,
          playerRole: 1,
          isCreator: true
        });
        
        console.log(`Player ${socket.id} (${username}) created lobby ${lobbyCode} as Player 1 (Creator)`);
        this.io.to(socket.id).emit('lobbyUpdate', { players: lobbyService.getLobby(lobbyCode).players });
      });

      // Join an existing lobby
      socket.on('joinLobby', (data, callback) => {
        // Handle both old format (lobbyCode, callback) and new format ({ lobbyCode, username }, callback)
        let lobbyCode, username;
        let actualCallback;
        
        if (typeof data === 'string') {
          // Old format: joinLobby(lobbyCode, callback)
          lobbyCode = data;
          username = 'Player';
          actualCallback = callback;
        } else {
          // New format: joinLobby({ lobbyCode, username }, callback)
          lobbyCode = data.lobbyCode;
          username = data.username || 'Player';
          actualCallback = callback;
        }
        
        const result = lobbyService.joinLobby(lobbyCode, socket.id, username);
        if (result.success) {
          socket.join(lobbyCode);
          
          // Send back player role information
          const playerRole = result.lobby.playerRoles[socket.id];
          actualCallback({ 
            success: true, 
            playerRole: playerRole,
            lobbyCode: lobbyCode,
            isCreator: playerRole === 1
          });
          
          console.log(`Player ${socket.id} (${username}) joined lobby ${lobbyCode} as Player ${playerRole}`);
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
                console.log(`🔍 Cross-platform check - Room ${lobbyCode} has ${socketCount} sockets`);
                
                // Double-check that both players are in the room before starting
                if (socketCount >= 2) {
                  console.log(`✅ Emitting startGame to lobby ${lobbyCode} - Cross-platform game start confirmed`);
                  
                  // Enhanced game start with cross-platform tracking and usernames
                  const lobby = lobbyService.getLobby(lobbyCode);
                  this.io.to(lobbyCode).emit('startGame', { 
                    lobbyCode,
                    timestamp: Date.now(),
                    crossPlatform: true,
                    playerNames: lobby.playerNames || {}
                  });
                  
                  console.log(`🚀 Cross-platform startGame event emitted to lobby ${lobbyCode}`);
                  
                  // Set up game ready tracking for cross-platform sync
                  result.lobby.playersReady = new Set();
                  result.lobby.gameStartConfirmed = false;
                  
                } else {
                  console.log(`⚠️ Not enough players in room (${socketCount}/2), retrying with extended delay...`);
                  // Extended retry logic for cross-platform scenarios
                  setTimeout(() => {
                    const retryRoom = this.io.sockets.adapter.rooms.get(lobbyCode);
                    const retrySocketCount = retryRoom ? retryRoom.size : 0;
                    console.log(`🔄 Cross-platform retry: Emitting startGame to lobby ${lobbyCode} - Room has ${retrySocketCount} sockets`);
                    
                    this.io.to(lobbyCode).emit('startGame', { 
                      lobbyCode,
                      timestamp: Date.now(),
                      crossPlatform: true,
                      retry: true
                    });
                    
                    console.log(`🚀 Cross-platform startGame event emitted to lobby ${lobbyCode} (retry)`);
                  }, 500); // Extended retry delay for cross-platform compatibility
                }
              }, 800); // Increased delay for cross-platform compatibility
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

      // Handle game ready signal for cross-platform synchronization
      socket.on('gameReady', ({ lobbyCode, playerRole, platform, timestamp }) => {
        console.log(`🎮 Game ready signal from player ${playerRole} on ${platform} for lobby ${lobbyCode}`);
        
        const lobby = lobbyService.getLobby(lobbyCode);
        if (lobby) {
          // Track which players are ready
          if (!lobby.playersReady) {
            lobby.playersReady = new Set();
          }
          
          lobby.playersReady.add(socket.id);
          console.log(`📊 Lobby ${lobbyCode} - ${lobby.playersReady.size}/${lobby.players.length} players ready`);
          
          // Broadcast ready status to all players in lobby
          this.io.to(lobbyCode).emit('playerReady', {
            playerRole,
            platform,
            readyCount: lobby.playersReady.size,
            totalPlayers: lobby.players.length
          });
          
          // When both players are ready, confirm game start
          if (lobby.playersReady.size >= 2 && !lobby.gameStartConfirmed) {
            lobby.gameStartConfirmed = true;
            console.log(`✅ All players ready for lobby ${lobbyCode} - Game start confirmed`);
            
            this.io.to(lobbyCode).emit('gameStartConfirmed', {
              lobbyCode,
              timestamp: Date.now(),
              message: 'All players ready - Game starting!'
            });
          }
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

      // ---- Online chat (E2EE MVP) ----
      // Public key exchange (ECDH public keys)
      socket.on('sendChatPublicKey', ({ lobbyCode, publicKey }) => {
        try {
          if (!lobbyCode || typeof publicKey !== 'string') return;

          const lobby = lobbyService.getLobby(lobbyCode);
          if (!lobby || !lobby.players.includes(socket.id)) return;

          // Cache this player's key
          if (!this.chatPublicKeysByLobby.has(lobbyCode)) {
            this.chatPublicKeysByLobby.set(lobbyCode, new Map());
          }
          const bySocketId = this.chatPublicKeysByLobby.get(lobbyCode);
          bySocketId.set(socket.id, publicKey);

          // Relay to everyone else in the lobby; server never sees message plaintext.
          socket.to(lobbyCode).emit('chatPublicKey', {
            lobbyCode,
            publicKey,
            fromSocketId: socket.id,
            timestamp: Date.now()
          });

          // Ensure the sender also receives the other player's cached public key (important for late joiners).
          const otherSocketIds = (Array.isArray(lobby.players) ? lobby.players : []).filter(id => id !== socket.id);
          const otherSocketId = otherSocketIds[0];
          if (otherSocketId && bySocketId.has(otherSocketId)) {
            const otherPublicKey = bySocketId.get(otherSocketId);
            socket.emit('chatPublicKey', {
              lobbyCode,
              publicKey: otherPublicKey,
              fromSocketId: otherSocketId,
              timestamp: Date.now(),
              cached: true
            });
          }
        } catch (error) {
          console.error('Error handling sendChatPublicKey:', error);
        }
      });

      // Encrypted message relay (ciphertext + iv, AES-GCM).
      // Clients must have derived the shared key for this lobby before encrypting.
      socket.on('sendChatMessage', ({ lobbyCode, encrypted, iv, ciphertext, message }) => {
        try {
          if (!lobbyCode) return;

          const lobby = lobbyService.getLobby(lobbyCode);
          if (!lobby || !lobby.players.includes(socket.id)) return;

          const userInfo = this.socketUsers.get(socket.id);
          const username =
            (userInfo && userInfo.username) ||
            (lobby.playerNames && (lobby.playerNames[socket.id] || lobby.playerNames[lobby.playerRoles?.[socket.id]])) ||
            'Player';

          // Legacy/compat: allow plaintext messages if provided
          if (!encrypted && typeof message === 'string') {
            const text = message.trim().slice(0, 200);
            if (!text) return;

            this.io.to(lobbyCode).emit('chatMessage', {
              lobbyCode,
              username,
              message: text,
              encrypted: false,
              timestamp: Date.now(),
              fromSocketId: socket.id
            });
            return;
          }

          // Encrypted path
          if (encrypted !== true) return;
          if (typeof iv !== 'string' || typeof ciphertext !== 'string') return;

          socket.to(lobbyCode).emit('chatMessage', {
            lobbyCode,
            username,
            encrypted: true,
            iv,
            ciphertext,
            timestamp: Date.now(),
            fromSocketId: socket.id
          });
        } catch (error) {
          console.error('Error handling sendChatMessage:', error);
        }
      });

      // Note: cached keys are cleaned up when lobbyService.destroyLobby(lobbyCode) is called.

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

      // Handle leaderboard requests
      socket.on('getLeaderboard', async (data, callback) => {
        try {
          const { limit = 10, sortBy = 'points' } = data || {};
          const result = await ScoringService.getLeaderboard(limit, sortBy);
          callback(result);
        } catch (error) {
          console.error('❌ Error fetching leaderboard:', error);
          callback({ success: false, error: error.message });
        }
      });

      // Handle user stats requests
      socket.on('getUserStats', async (data, callback) => {
        try {
          const { userId } = data || {};
          if (!userId) {
            callback({ success: false, error: 'User ID required' });
            return;
          }
          const result = await ScoringService.getUserStats(userId);
          callback(result);
        } catch (error) {
          console.error('❌ Error fetching user stats:', error);
          callback({ success: false, error: error.message });
        }
      });

      // Handle platform stats requests
      socket.on('getPlatformStats', async (callback) => {
        try {
          const result = await ScoringService.getPlatformStats();
          callback(result);
        } catch (error) {
          console.error('❌ Error fetching platform stats:', error);
          callback({ success: false, error: error.message });
        }
      });

      // Handle recent games requests
      socket.on('getRecentGames', async (data, callback) => {
        try {
          const { limit = 20, userId = null } = data || {};
          const result = await ScoringService.getRecentGames(limit, userId);
          callback(result);
        } catch (error) {
          console.error('❌ Error fetching recent games:', error);
          callback({ success: false, error: error.message });
        }
      });

      // Handle admin reset stats requests
      socket.on('resetUserStats', async (data, callback) => {
        try {
          const { userId, adminId } = data || {};
          if (!userId || !adminId) {
            callback({ success: false, error: 'User ID and Admin ID required' });
            return;
          }
          const result = await ScoringService.resetUserStats(userId, adminId);
          callback(result);
        } catch (error) {
          console.error('❌ Error resetting user stats:', error);
          callback({ success: false, error: error.message });
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
    // Capture lobby and both players BEFORE removal so we don't lose context
    const preLeaveLobby = lobbyService.getLobby(lobbyCode);
    const playerSocketIds = preLeaveLobby ? [...preLeaveLobby.players] : [];
    const playerRoles = preLeaveLobby ? { ...preLeaveLobby.playerRoles } : {};
    const player1SocketIdPre = playerSocketIds[0];
    const player2SocketIdPre = playerSocketIds[1];
    const player1UserPre = player1SocketIdPre ? this.socketUsers.get(player1SocketIdPre) : null;
    const player2UserPre = player2SocketIdPre ? this.socketUsers.get(player2SocketIdPre) : null;

    const result = lobbyService.leaveLobby(lobbyCode, socket.id);
    if (result.success) {
      // Remove socket from room before sending message
      socket.leave(lobbyCode);
      
      const lobby = lobbyService.getLobby(lobbyCode);
      // If another player remains and game not over, award win/loss and process as game over
      if (result.remainingPlayers > 0 && lobby && !lobby.gameOver) {
        // Determine remaining and leaving users based on pre-leave snapshot
        const remainingSocketId = (player1SocketIdPre === socket.id) ? player2SocketIdPre : player1SocketIdPre;
        const remainingUser = remainingSocketId ? this.socketUsers.get(remainingSocketId) : null;
        const leavingUser = this.socketUsers.get(socket.id) || (socket.id === player1SocketIdPre ? player1UserPre : player2UserPre);

        if (remainingUser && leavingUser) {
          // Build synthetic gameOver action with margin 1
          const winnerRole = (playerRoles && remainingSocketId && playerRoles[remainingSocketId]) ? playerRoles[remainingSocketId] : 1;
          const player1User = player1UserPre;
          const player2User = player2UserPre;
          const action = {
            type: 'gameOver',
            winnerRole,
            player1Score: winnerRole === 1 ? 1 : 0,
            player2Score: winnerRole === 2 ? 1 : 0,
            totalMoves: lobby.gameState?.totalMoves || 0,
            gameDuration: Math.round(((Date.now()) - (lobby.startedAt || Date.now())) / 1000),
            boardSize: lobby.gameState?.boardSize || '4x4',
            // Provide explicit user context so handleGameOver can proceed even if lobby lost a player
            player1User,
            player2User
          };
          lobbyService.markGameOver(lobbyCode, winnerRole, winnerRole, action.winnerRole === 1 ? action.player1Score : action.player2Score);
          this.handleGameOver(lobbyCode, action);
        }

        // Inform remaining player
        this.io.to(lobbyCode).emit('playerDisconnected', { 
          message: 'Your opponent has left the game. Congratulations, you win!',
          winner: remainingSocketId
        });

        // Cleanup lobby after short delay
        setTimeout(() => {
          lobbyService.destroyLobby(lobbyCode);
          this.chatPublicKeysByLobby.delete(lobbyCode);
        }, 500);
      } else if (result.remainingPlayers > 0 && result.gameOver) {
        console.log(`Player left lobby ${lobbyCode} but game was already over, destroying lobby silently`);
        lobbyService.destroyLobby(lobbyCode);
        this.chatPublicKeysByLobby.delete(lobbyCode);
      } else {
        lobbyService.destroyLobby(lobbyCode);
        this.chatPublicKeysByLobby.delete(lobbyCode);
      }
    }
    console.log('A user left lobby:', socket.id, 'from lobby:', lobbyCode);
  }

  async handleGameOver(lobbyCode, action) {
    try {
      const lobby = lobbyService.getLobby(lobbyCode);
      if (!lobby || !lobby.players) {
        console.log('❌ No lobby found for game over processing');
        return;
      }

      // Prevent duplicate processing if multiple gameOver events arrive
      if (lobby.gameResultProcessed) {
        console.log(`ℹ️ Game result already processed for lobby ${lobbyCode}, ignoring duplicate gameOver`);
        return;
      }

      // Prefer explicit users passed via action (e.g., on leave) to avoid relying on lobby state
      let player1User = action.player1User;
      let player2User = action.player2User;
      // Track socket ids for optional direct emits
      let player1SocketId = null;
      let player2SocketId = null;
      // Fallback to lobby mapping if not provided
      if (!player1User || !player2User) {
        player1SocketId = Array.isArray(lobby.players) ? lobby.players[0] : null;
        player2SocketId = Array.isArray(lobby.players) ? lobby.players[1] : null;
        player1User = player1User || (player1SocketId ? this.socketUsers.get(player1SocketId) : null);
        player2User = player2User || (player2SocketId ? this.socketUsers.get(player2SocketId) : null);
      }

      // Validate that we have both players
      if (!player1User || !player2User) {
        console.log('❌ Missing user data for one or both players');
        return;
      }

      // Get scores for both players from the action
      const winnerRole = action.winnerRole;
      const player1Score = action.player1Score || 0;
      const player2Score = action.player2Score || 0;
      
      console.log(`🎮 Game Over Processing:`, {
        lobbyCode,
        player1: `${player1User.username} (${player1Score} squares)`,
        player2: `${player2User.username} (${player2Score} squares)`,
        winner: `Player ${winnerRole}`
      });

      // Determine winner and loser
      const winner = winnerRole === 1 ? 
        { username: player1User.username, userId: player1User.userId, score: player1Score } :
        { username: player2User.username, userId: player2User.userId, score: player2Score };
        
      const loser = winnerRole === 1 ? 
        { username: player2User.username, userId: player2User.userId, score: player2Score } :
        { username: player1User.username, userId: player1User.userId, score: player1Score };

      // Generate unique game ID
      const gameId = `game_${lobbyCode}_${Date.now()}`;

      // Prepare game result data
      const gameResult = {
        gameId,
        lobbyCode,
        winner,
        loser,
        gameStats: {
          totalMoves: action.totalMoves || 0,
          gameDuration: action.gameDuration || 0,
          boardSize: action.boardSize || '4x4',
          startedAt: lobby.startedAt || new Date(Date.now() - 300000) // Default to 5 minutes ago
        }
      };

      // Mark as processed before calling scoring to avoid race conditions
      lobby.gameResultProcessed = true;

      // Process game result using the scoring service
      const result = await ScoringService.processGameResult(gameResult);
      
      if (result.success) {
        console.log(`✅ Game result processed successfully for ${gameId}`);
        
        // Emit updated stats to both players
        const player1Socket = player1SocketId ? this.io.sockets.sockets.get(player1SocketId) : null;
        const player2Socket = player2SocketId ? this.io.sockets.sockets.get(player2SocketId) : null;
        
        if (player1Socket) {
          const updatedPlayer1 = winnerRole === 1 ? result.winner : result.loser;
            player1Socket.emit('statsUpdated', {
              userId: player1User.userId,
            stats: updatedPlayer1,
            gameResult: {
              won: winnerRole === 1,
              pointsChange: winnerRole === 1 ? 5 : -3,
              opponentUsername: player2User.username
            }
          });
          console.log(`📊 Stats update sent to ${player1User.username}`);
        }
        
        if (player2Socket) {
          const updatedPlayer2 = winnerRole === 2 ? result.winner : result.loser;
            player2Socket.emit('statsUpdated', {
              userId: player2User.userId,
            stats: updatedPlayer2,
            gameResult: {
              won: winnerRole === 2,
              pointsChange: winnerRole === 2 ? 5 : -3,
              opponentUsername: player1User.username
            }
          });
          console.log(`📊 Stats update sent to ${player2User.username}`);
        }
        
        // Emit game result to both players for potential UI updates
        this.io.to(lobbyCode).emit('gameResultProcessed', {
          gameId,
          winner: result.winner,
          loser: result.loser,
          message: 'Game statistics updated successfully!'
        });
        
      } else {
        console.error('❌ Failed to process game result:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Error in handleGameOver:', error);
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
          this.chatPublicKeysByLobby.delete(lobbyCode);
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
