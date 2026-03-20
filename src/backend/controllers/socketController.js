const lobbyService = require('../services/lobbyService');
const ScoringService = require('../services/scoringService');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

class SocketController {
  constructor(io) {
    this.io = io;
    this.socketUsers = new Map(); // Map socket.id to user info
    // Cache chat public keys per lobby so late joiners can derive the shared secret.
    // Structure: Map<lobbyCode, Map<socketId, publicKeyB64>>
    this.chatPublicKeysByLobby = new Map();

    // Random matchmaking queue for "Quick Match" mode
    // Items are { socketId, username, enqueuedAt }
    this.randomMatchQueue = [];
    this.randomMatchBotTimers = new Map(); // Map<socketId, timeoutId>
    this.RANDOM_MATCH_BOT_TIMEOUT_MS = 15000; // 15s waiting for a real opponent

    // "Human-like" bot identities so it doesn't read as "Bot".
    // (Names are intentionally mixed across regions.)
    this.quickMatchBotNames = [
      'Aarav Sharma',       // Indian
      'Vihaan Patel',       // Indian
      'Arjun Mehta',        // Indian
      'Ethan Johnson',      // American
      'Liam Anderson',      // American
      'Noah Williams',      // American
      'Mei Zhang',          // Chinese
      'Xiao Li',            // Chinese
      'Wei Chen',           // Chinese
      'Santiago Alvarez',  // Latin/Spanish
      'Diego Martinez',    // Latin/Spanish
      'Tomas Novak',       // European
      'Omar Al-Farsi',     // Middle Eastern
      'Layla Hassan',      // Middle Eastern
      'Ravi Singh',        // Indian
    ];

    this.quickMatchBotDifficulty = 'hard';

    /** Prevent double-counting stats if client sends botGameOver twice */
    this.botGameSubmittedIds = new Set();

    // Single DB user to represent the bot for scoring purposes.
    // We store the in-game (display) name separately in Game.matchIntent fields.
    this.quickBotUserCache = null;

    this.setupSocketHandlers();
  }

  /**
   * Resolve the human user for random-search bot games: prefer socket association, else JWT from payload.
   */
  async resolveHumanUserForBotGame(socket, data) {
    const fromMap = this.socketUsers.get(socket.id);
    if (fromMap && fromMap.userId) {
      return {
        userId: fromMap.userId,
        username: fromMap.username || data.player1Name || 'Player'
      };
    }

    const rawToken = data && data.authToken;
    if (!rawToken || typeof rawToken !== 'string') {
      return null;
    }

    const token = rawToken.replace(/^Bearer\s+/i, '').trim();
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return null;
    }

    const UserModel = global.useInMemoryStorage
      ? require('../models/InMemoryUser')
      : require('../models/User');

    let user;
    try {
      user = await UserModel.findById(decoded.userId);
    } catch (e) {
      console.error('resolveHumanUserForBotGame findById error:', e);
      return null;
    }

    if (!user) {
      return null;
    }

    const userId = user._id || user.id;
    const username = user.username || data.player1Name || 'Player';

    this.socketUsers.set(socket.id, { userId, username });
    return { userId, username };
  }

  async getOrCreateQuickBotUser() {
    if (this.quickBotUserCache) return this.quickBotUserCache;

    // Use in-memory user store when running in demo mode.
    const UserModel = global.useInMemoryStorage
      ? require('../models/InMemoryUser')
      : require('../models/User');

    const botUsername = 'QuickBotUser';

    // Try find existing bot user
    const existing = await UserModel.findOne({ username: botUsername });
    if (existing) {
      this.quickBotUserCache = existing;
      return existing;
    }

    // Create bot user
    const created = await UserModel.create({
      username: botUsername,
      email: 'quickbotuser@local.dev',
      password: 'bot_password_' + Date.now(),
      isGuest: false,
      avatar: 'default-1'
    });

    this.quickBotUserCache = created;
    return created;
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
                    playerNames: lobby.playerNames || {},
                    // Allow clients to safely recover assignment before joinLobby callbacks complete.
                    playerRolesBySocketId: lobby.playerRoles || {}
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
                      retry: true,
                      playerRolesBySocketId: lobby.playerRoles || {}
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

      // ---- Random Matchmaking (Quick Match) ----
      // Lets two searching players be paired randomly. If nobody matches within timeout,
      // the client starts a local bot game.
      socket.on('findRandomOpponent', (data, callback) => {
        const username = (data && typeof data === 'object' && data.username) ? data.username : 'Player';
        const actualCallback = typeof callback === 'function' ? callback : null;

        console.log('🔎 findRandomOpponent:', {
          socketId: socket.id,
          username,
          queuedCount: this.randomMatchQueue.length
        });

        // Prevent duplicate queue entries
        if (this.randomMatchQueue.some(e => e.socketId === socket.id)) {
          if (actualCallback) actualCallback({ success: false, message: 'Already searching for an opponent.' });
          return;
        }

        // If we have a waiting player, pair immediately
        if (this.randomMatchQueue.length > 0) {
          const opponentEntry = this.randomMatchQueue.shift();
          const waitingSocketId = opponentEntry.socketId;

          console.log('⚡ Random match pairing:', {
            waitingSocketId,
            currentSocketId: socket.id,
            waitingUsername: opponentEntry.username,
          });

          // Clear bot fallback timer for the paired player
          if (this.randomMatchBotTimers.has(waitingSocketId)) {
            clearTimeout(this.randomMatchBotTimers.get(waitingSocketId));
            this.randomMatchBotTimers.delete(waitingSocketId);
          }

          const waitingSocket = this.io.sockets.sockets.get(waitingSocketId);
          if (!waitingSocket) {
            // Waiting socket vanished; re-queue current socket
            this.randomMatchQueue.push({ socketId: socket.id, username, enqueuedAt: Date.now() });
            if (actualCallback) actualCallback({ success: true, matched: false, message: 'Opponent vanished; searching again.' });
            return;
          }

          // Create a lobby with the waiting player as creator (role=1)
          const lobbyCode = lobbyService.createLobby(waitingSocketId, opponentEntry.username);
          const joinResult = lobbyService.joinLobby(lobbyCode, socket.id, username);
          if (!joinResult.success) {
            if (actualCallback) actualCallback({ success: false, message: joinResult.message || 'Failed to join matchmaking lobby.' });
            lobbyService.destroyLobby(lobbyCode);
            return;
          }

          // Join sockets to the room so existing online flow works
          waitingSocket.join(lobbyCode);
          socket.join(lobbyCode);

          const lobby = lobbyService.getLobby(lobbyCode);
          lobby.matchIntent = 'randomOnline';
          lobby.plannedOpponentType = 'human';
          lobby.plannedOpponentName = 'Online Opponent';
          lobby.botDifficulty = null;
          lobby.gameOver = false;
          lobby.startedAt = Date.now();
          lobby.playersReady = new Set();
          lobby.gameStartConfirmed = false;
          lobby.gameStarting = true;

          // Assignment events so clients can set currentLobbyCode/playerRole before `startGame`
          const roleWaiting = lobby.playerRoles[waitingSocketId];
          const roleCurrent = lobby.playerRoles[socket.id];

          waitingSocket.emit('randomMatchAssigned', {
            lobbyCode,
            playerRole: roleWaiting,
            isCreator: roleWaiting === 1,
            playerNames: lobby.playerNames || {}
          });

          socket.emit('randomMatchAssigned', {
            lobbyCode,
            playerRole: roleCurrent,
            isCreator: roleCurrent === 1,
            playerNames: lobby.playerNames || {}
          });

          // Start game shortly after assignment (keeps ordering reliable in practice)
          setTimeout(() => {
            this.io.to(lobbyCode).emit('startGame', {
              lobbyCode,
              timestamp: Date.now(),
              crossPlatform: true,
              playerNames: lobby.playerNames || {},
              // Used by clients to safely recover assignment even if events arrive out of order
              playerRolesBySocketId: lobby.playerRoles || {}
            });
          }, 100);

          // Reply to the current requester
          if (actualCallback) {
            actualCallback({
              success: true,
              matched: true,
              lobbyCode,
              playerRole: roleCurrent,
              isCreator: roleCurrent === 1
            });
          }
          return;
        }

        // No opponent yet: enqueue current socket and wait for timeout
        this.randomMatchQueue.push({ socketId: socket.id, username, enqueuedAt: Date.now() });

        if (actualCallback) actualCallback({ success: true, matched: false });

        const searchingSocketId = socket.id;
        const botTimer = setTimeout(() => {
          // If still waiting, kick off bot game by telling the client to start locally
          console.log('🤖 Random match bot timeout fired for socket:', searchingSocketId);
          const stillWaitingIndex = this.randomMatchQueue.findIndex(e => e.socketId === searchingSocketId);
          if (stillWaitingIndex === -1) return;

          const waitingEntry = this.randomMatchQueue[stillWaitingIndex];
          const botMatchId = `botmatch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; // unique match id
          this.randomMatchQueue.splice(stillWaitingIndex, 1);
          this.randomMatchBotTimers.delete(searchingSocketId);

          const searchingSocket = this.io.sockets.sockets.get(searchingSocketId);
          if (!searchingSocket) return;

          searchingSocket.emit('quickMatchBot', {
            playerRole: 1,
            player1Name: waitingEntry.username,
            player2Name: this.quickMatchBotNames[Math.floor(Math.random() * this.quickMatchBotNames.length)],
            botDifficulty: this.quickMatchBotDifficulty,
            botMatchId,
            matchIntent: 'randomOnlineBotFallback',
            plannedOpponentType: 'bot'
          });
        }, this.RANDOM_MATCH_BOT_TIMEOUT_MS);

        this.randomMatchBotTimers.set(socket.id, botTimer);
      });

      socket.on('cancelRandomOpponent', (data, callback) => {
        const actualCallback = typeof callback === 'function' ? callback : null;
        const searchingSocketId = socket.id;

        const idx = this.randomMatchQueue.findIndex(e => e.socketId === searchingSocketId);
        if (idx !== -1) {
          this.randomMatchQueue.splice(idx, 1);
        }

        if (this.randomMatchBotTimers.has(searchingSocketId)) {
          clearTimeout(this.randomMatchBotTimers.get(searchingSocketId));
          this.randomMatchBotTimers.delete(searchingSocketId);
        }

        if (actualCallback) actualCallback({ success: true });
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

      // ---- Bot game result submission (for bot fallback matchmaking) ----
      // Client plays locally (no opponent socket), but we still want to persist:
      //  - match intent fields (planned lobby opponent)
      //  - user stats + Game record in MongoDB
      socket.on('botGameOver', async (data, callback) => {
        try {
          if (!data) {
            if (typeof callback === 'function') callback({ success: false, error: 'Missing payload' });
            return;
          }

          const {
            botMatchId,
            player1Name,
            player2Name,
            player1Score,
            player2Score,
            botDifficulty,
            matchIntent,
            plannedOpponentType,
            plannedOpponentName,
            gameStats = {}
          } = data;

          if (!botMatchId) {
            if (typeof callback === 'function') callback({ success: false, error: 'botMatchId required' });
            return;
          }

          const matchKey = String(botMatchId);
          if (this.botGameSubmittedIds.has(matchKey)) {
            if (typeof callback === 'function') {
              callback({ success: true, duplicate: true, message: 'Bot match already recorded' });
            }
            return;
          }

          const resolved = await this.resolveHumanUserForBotGame(socket, data);
          if (!resolved || !resolved.userId) {
            if (typeof callback === 'function') {
              callback({
                success: false,
                error: 'Sign in required to record random-search bot matches, or refresh and try again.'
              });
            }
            return;
          }

          const humanUserId = resolved.userId;
          const humanUsername = resolved.username || player1Name || 'Player';

          const botUser = await this.getOrCreateQuickBotUser();
          const botUserId = botUser._id || botUser.id;
          const botDisplayName = player2Name || plannedOpponentName || botUser.username || 'Bot';

          const p1 = Number(player1Score);
          const p2 = Number(player2Score);
          const outcomeIsTie = p1 === p2;
          // Tie scores → treat as bot win for ranking (matches client checkGameOver semantics).
          const humanWon = p1 > p2;
          const reportedWinnerRole =
            typeof data.winnerRole === 'number'
              ? data.winnerRole
              : outcomeIsTie
                ? 0
                : humanWon
                  ? 1
                  : 2;

          const winner = humanWon
            ? { username: humanUsername, userId: humanUserId, score: p1 }
            : { username: botDisplayName, userId: botUserId, score: p2 };

          const loser = humanWon
            ? { username: botDisplayName, userId: botUserId, score: p2 }
            : { username: humanUsername, userId: humanUserId, score: p1 };

          const gameId = `bot_${matchKey}_${Date.now()}`;
          const startedAt = gameStats.startedAt ? new Date(gameStats.startedAt) : new Date(Date.now() - 300000);
          const endedAt = gameStats.endedAt ? new Date(gameStats.endedAt) : new Date();

          const gameResult = {
            gameId,
            lobbyCode: matchKey,
            winner,
            loser,
            gameStats: {
              totalMoves: gameStats.totalMoves || Number(gameStats.totalMoves) || 0,
              gameDuration: gameStats.gameDuration || Number(gameStats.gameDuration) || 0,
              boardSize: gameStats.boardSize || '5x5',
              startedAt,
              endedAt
            },
            matchIntent: matchIntent || 'randomOnlineBotFallback',
            plannedOpponentType: plannedOpponentType || 'bot',
            plannedOpponentName: plannedOpponentName || botDisplayName,
            botDifficulty: botDifficulty || null,
            versusBot: true,
            reportedWinnerRole,
            outcomeIsTie,
            matchSource: matchIntent || 'randomOnlineBotFallback'
          };

          const result = await ScoringService.processGameResult(gameResult);

          const statsPersisted =
            result &&
            result.success &&
            result.winner &&
            typeof result.winner.gamesPlayed === 'number';

          if (statsPersisted) {
            this.botGameSubmittedIds.add(matchKey);
            if (this.botGameSubmittedIds.size > 50000) {
              this.botGameSubmittedIds.clear();
            }
          }

          if (typeof callback === 'function') callback(result);

          // Mirror human-vs-human flow: push updated stats to the client so profile UI refreshes.
          if (statsPersisted) {
            const humanStats = humanWon ? result.winner : result.loser;
            const statsPayload = {
              ...humanStats,
              gamesWon: humanStats.gamesWon != null ? humanStats.gamesWon : humanStats.wins,
              totalScore: humanStats.totalScore != null ? humanStats.totalScore : humanStats.points
            };
            const uid = humanUserId && humanUserId.toString ? humanUserId.toString() : String(humanUserId);
            socket.emit('statsUpdated', {
              userId: uid,
              stats: statsPayload,
              gameResult: {
                won: humanWon,
                pointsChange: humanWon ? 5 : -3,
                opponentUsername: botDisplayName
              }
            });
          }
        } catch (error) {
          console.error('❌ botGameOver error:', error);
          if (typeof callback === 'function') callback({ success: false, error: error.message });
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
        matchIntent: lobby.matchIntent || null,
        plannedOpponentType: lobby.plannedOpponentType || null,
        plannedOpponentName: lobby.plannedOpponentName || null,
        botDifficulty: lobby.botDifficulty || null,
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

    // Clean up random matchmaking queue (if user was searching)
    const qIdx = this.randomMatchQueue.findIndex(e => e.socketId === socket.id);
    if (qIdx !== -1) {
      this.randomMatchQueue.splice(qIdx, 1);
    }
    if (this.randomMatchBotTimers.has(socket.id)) {
      clearTimeout(this.randomMatchBotTimers.get(socket.id));
      this.randomMatchBotTimers.delete(socket.id);
    }
    
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
