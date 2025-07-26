const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4000;
const http = require('http');
const { Server } = require('socket.io');

// Serve static files from public directory
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/socket.io', express.static(path.join(__dirname, 'node_modules', 'socket.io', 'client-dist')));

// Serve index.html from root directory
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Lobby/session management
const lobbies = {}; // { lobbyCode: { players: [socketId, ...], gameState: {...}, gameOver: false } }

function generateLobbyCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Function to completely destroy a lobby session
function destroyLobbySession(lobbyCode) {
  if (lobbies[lobbyCode]) {
    console.log(`Destroying lobby session: ${lobbyCode}`);
    
    // Notify all players in the lobby that session is destroyed
    io.to(lobbyCode).emit('lobbyDestroyed', {
      message: 'Lobby session has been destroyed.',
      lobbyCode: lobbyCode
    });
    
    // Remove all players from the room
    const lobby = lobbies[lobbyCode];
    if (lobby && lobby.players) {
      lobby.players.forEach(playerId => {
        const playerSocket = io.sockets.sockets.get(playerId);
        if (playerSocket) {
          playerSocket.leave(lobbyCode);
        }
      });
    }
    
    // Delete the lobby object
    delete lobbies[lobbyCode];
    console.log(`Lobby session ${lobbyCode} destroyed successfully`);
  }
}

const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Create a new lobby
  socket.on('createLobby', (callback) => {
    const lobbyCode = generateLobbyCode();
    lobbies[lobbyCode] = { 
      players: [socket.id], 
      gameState: null, 
      gameOver: false,
      playerRoles: { [socket.id]: 1 } // Player 1 (creator)
    };
    socket.join(lobbyCode);
    callback({ lobbyCode });
    io.to(socket.id).emit('lobbyUpdate', { players: lobbies[lobbyCode].players });
  });

  // Join an existing lobby
  socket.on('joinLobby', (lobbyCode, callback) => {
    if (lobbies[lobbyCode] && lobbies[lobbyCode].players.length < 2) {
      lobbies[lobbyCode].players.push(socket.id);
      lobbies[lobbyCode].playerRoles[socket.id] = 2; // Player 2 (joiner)
      socket.join(lobbyCode);
      callback({ success: true });
      io.to(lobbyCode).emit('lobbyUpdate', { players: lobbies[lobbyCode].players });
      // Start game if 2 players
      if (lobbies[lobbyCode].players.length === 2) {
        lobbies[lobbyCode].gameOver = false;
        io.to(lobbyCode).emit('startGame', { lobbyCode });
      }
    } else {
      callback({ success: false, message: 'Lobby full or does not exist.' });
    }
  });

  // Handle game state updates
  socket.on('gameAction', ({ lobbyCode, action }) => {
    console.log('Game action received:', action.type, 'in lobby:', lobbyCode);
    
    // Broadcast action to the other player in the lobby
    socket.to(lobbyCode).emit('gameAction', action);
    
    // If the action is game over, mark the lobby as finished
    if (action && action.type === 'gameOver') {
      if (lobbies[lobbyCode]) {
        lobbies[lobbyCode].gameOver = true;
      }
    }
  });

  // Handle player leaving lobby (disconnect, back to home, restart)
  socket.on('leaveLobby', (lobbyCode) => {
    if (lobbies[lobbyCode]) {
      const idx = lobbies[lobbyCode].players.indexOf(socket.id);
      if (idx !== -1) {
        // Remove player from lobby
        lobbies[lobbyCode].players.splice(idx, 1);
        delete lobbies[lobbyCode].playerRoles[socket.id];
        
        // Remove socket from room before sending message
        socket.leave(lobbyCode);
        
        // Notify remaining players with win message
        if (lobbies[lobbyCode].players.length > 0) {
          io.to(lobbyCode).emit('playerDisconnected', { 
            message: 'Your opponent has left the game. Congratulations, you win!',
            winner: lobbies[lobbyCode].players[0] // The remaining player wins
          });
          
          // Destroy the lobby session immediately after message delivery
          setTimeout(() => {
            destroyLobbySession(lobbyCode);
          }, 500); // Reduced delay for faster cleanup
        } else {
          // If no players left, destroy immediately
          destroyLobbySession(lobbyCode);
        }
      }
    }
    console.log('A user left lobby:', socket.id, 'from lobby:', lobbyCode);
  });

  // Handle disconnects
  socket.on('disconnect', () => {
    for (const [lobbyCode, lobby] of Object.entries(lobbies)) {
      const idx = lobby.players.indexOf(socket.id);
      if (idx !== -1) {
        // Remove player from lobby
        lobby.players.splice(idx, 1);
        delete lobby.playerRoles[socket.id];
        
        // Remove socket from room before sending message
        socket.leave(lobbyCode);
        
        // Notify remaining players with win message
        if (lobby.players.length > 0) {
          io.to(lobbyCode).emit('playerDisconnected', { 
            message: 'Your opponent has left the game. Congratulations, you win!',
            winner: lobby.players[0] // The remaining player wins
          });
          
          // Destroy the lobby session immediately after message delivery
          setTimeout(() => {
            destroyLobbySession(lobbyCode);
          }, 500); // Reduced delay for faster cleanup
        } else {
          // If no players left, destroy immediately
          destroyLobbySession(lobbyCode);
        }
      }
    }
    console.log('A user disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Dots and Boxes app running at http://localhost:${PORT}`);
}); 