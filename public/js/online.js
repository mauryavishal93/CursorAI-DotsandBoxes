// Online lobby and multiplayer logic for Dots and Boxes
const socket = io();

const onlineGameBtn = document.getElementById('online-game-btn');
const onlineLobbyUI = document.getElementById('online-lobby-ui');
const createLobbyBtn = document.getElementById('create-lobby-btn');
const joinLobbyBtn = document.getElementById('join-lobby-btn');
const joinLobbyCodeInput = document.getElementById('join-lobby-code');
const lobbyStatus = document.getElementById('lobby-status');

let currentLobbyCode = null;
let isInLobby = false;
let isGameStarted = false;
let isCreator = false;
let playerRole = null;

function showLobbyUI() {
  onlineLobbyUI.style.display = 'block';
}

function hideLobbyUI() {
  onlineLobbyUI.style.display = 'none';
}

onlineGameBtn.addEventListener('click', () => {
  showLobbyUI();
});

// Socket connection event handlers
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});

socket.on('connect_error', (error) => {
  console.log('Socket connection error:', error);
});

// Expose socket globally for game.js
window.socket = socket;

createLobbyBtn.addEventListener('click', () => {
  console.log('Create lobby button clicked');
  console.log('Current state - isInLobby:', isInLobby, 'currentLobbyCode:', currentLobbyCode);
  
  // Reset any leftover state before creating new lobby
  if (isInLobby || currentLobbyCode) {
    console.log('Resetting leftover lobby state before creating new lobby');
    resetSocketAndLobbyState();
    setTimeout(() => {
      showLobbyUI();
      // Automatically proceed with lobby creation after reset
      console.log('Auto-creating lobby after reset...');
      socket.emit('createLobby', (response) => {
        console.log('Create lobby response:', response);
        currentLobbyCode = response.lobbyCode;
        isInLobby = true;
        isCreator = true;
        playerRole = 1;
        lobbyStatus.textContent = `Lobby created! Code: ${currentLobbyCode}. Waiting for another player...`;
        window.lobbyCode = currentLobbyCode;
        console.log('New lobby created successfully:', currentLobbyCode);
      });
    }, 200);
    return; // Return early, action will be performed automatically
  }
  
  socket.emit('createLobby', (response) => {
    console.log('Create lobby response:', response);
    currentLobbyCode = response.lobbyCode;
    isInLobby = true;
    isCreator = true;
    playerRole = 1;
    lobbyStatus.textContent = `Lobby created! Code: ${currentLobbyCode}. Waiting for another player...`;
    window.lobbyCode = currentLobbyCode;
    console.log('New lobby created successfully:', currentLobbyCode);
  });
});

joinLobbyBtn.addEventListener('click', () => {
  console.log('Join lobby button clicked');
  const code = joinLobbyCodeInput.value.trim().toUpperCase();
  console.log('Attempting to join lobby code:', code);
  console.log('Current state - isInLobby:', isInLobby, 'currentLobbyCode:', currentLobbyCode);
  
  if (!code) {
    lobbyStatus.textContent = 'Please enter a lobby code.';
    return;
  }
  
  // Reset any leftover state before joining new lobby
  if (isInLobby || currentLobbyCode) {
    console.log('Resetting leftover lobby state before joining new lobby');
    const savedLobbyCode = resetSocketAndLobbyState(true); // Preserve the lobby code
    setTimeout(() => {
      showLobbyUI();
      if (savedLobbyCode) {
        joinLobbyCodeInput.value = savedLobbyCode; // Restore the lobby code
      }
      // Automatically proceed with lobby joining after reset
      console.log('Auto-joining lobby after reset...');
      socket.emit('joinLobby', savedLobbyCode || code, (response) => {
        console.log('Join lobby response:', response);
        if (response.success) {
          currentLobbyCode = savedLobbyCode || code;
          isInLobby = true;
          isCreator = false;
          playerRole = 2;
          lobbyStatus.textContent = `Joined lobby ${currentLobbyCode}. Waiting for another player...`;
          window.lobbyCode = currentLobbyCode;
          console.log('Successfully joined lobby:', currentLobbyCode);
        } else {
          lobbyStatus.textContent = response.message || 'Failed to join lobby.';
          console.log('Failed to join lobby:', response.message);
        }
      });
    }, 200);
    return; // Return early, action will be performed automatically
  }
  
  socket.emit('joinLobby', code, (response) => {
    console.log('Join lobby response:', response);
    if (response.success) {
      currentLobbyCode = code;
      isInLobby = true;
      isCreator = false;
      playerRole = 2;
      lobbyStatus.textContent = `Joined lobby ${code}. Waiting for another player...`;
      window.lobbyCode = currentLobbyCode;
      console.log('Successfully joined lobby:', currentLobbyCode);
    } else {
      lobbyStatus.textContent = response.message || 'Failed to join lobby.';
      console.log('Failed to join lobby:', response.message);
    }
  });
});

socket.on('lobbyUpdate', ({ players }) => {
  if (isInLobby && currentLobbyCode) {
    if (players.length === 1) {
      lobbyStatus.textContent = `Lobby ${currentLobbyCode}: Waiting for another player...`;
    } else if (players.length === 2) {
      lobbyStatus.textContent = `Lobby ${currentLobbyCode}: Both players connected! Starting game...`;
    }
  }
});

socket.on('startGame', ({ lobbyCode }) => {
  if (currentLobbyCode === lobbyCode && !isGameStarted) {
    isGameStarted = true;
    lobbyStatus.textContent = `Game started in lobby ${lobbyCode}!`;
    
    // Set player names based on role
    let player1Name = playerRole === 1 ? 'You' : 'Opponent';
    let player2Name = playerRole === 2 ? 'You' : 'Opponent';
    
    // Start the online game
    if (typeof window.startGame === 'function') {
      window.startGame('onlineMultiplayer', { 
        player1Name, 
        player2Name, 
        playerRole, 
        lobbyCode,
        socket 
      });
    } else {
      // Fallback if startGame is not available yet
      setTimeout(() => {
        if (typeof window.startGame === 'function') {
          window.startGame('onlineMultiplayer', { 
            player1Name, 
            player2Name, 
            playerRole, 
            lobbyCode,
            socket 
          });
        }
      }, 100);
    }
  }
});

// Listen for game actions from the other player
socket.on('gameAction', (action) => {
  console.log('Received game action:', action);
  
  if (typeof window.handleRemoteGameAction === 'function') {
    window.handleRemoteGameAction(action);
  }
});

// Handle opponent disconnect
socket.on('playerDisconnected', ({ message, winner }) => {
  console.log('Player disconnected:', message, 'Winner:', winner);
  
  // Check if game was already over before showing disconnect message
  if (typeof window.gameOver === 'function' && window.gameOver()) {
    console.log('Game was already over, not showing disconnect message');
    // Just reset state and redirect to home without showing the disconnect popup
    resetOnlineGameState();
    
    // Redirect to home screen
    console.log('Redirecting to home screen...');
    if (typeof window.showScreen === 'function' && window.homeScreen) {
      console.log('Using showScreen function...');
      window.showScreen(window.homeScreen);
    } else {
      // Fallback: direct DOM manipulation
      console.log('Using fallback DOM manipulation...');
      const homeScreen = document.getElementById('home-screen');
      const onlineLobbyUI = document.getElementById('online-lobby-ui');
      const onlineGameScreen = document.getElementById('online-game-screen');
      
      if (homeScreen) {
        // Hide all game screens first
        if (onlineGameScreen) {
          onlineGameScreen.style.display = 'none';
        }
        // Use the proper showScreen function if available, otherwise set flex display
        if (typeof window.showScreen === 'function') {
          window.showScreen(homeScreen);
        } else {
          homeScreen.style.display = 'flex';
        }
        // Show lobby UI
        if (onlineLobbyUI) {
          onlineLobbyUI.style.display = 'block';
        }
        console.log('Home screen shown via fallback');
      }
    }
    
    // Ensure lobby UI is visible and ready for new lobbies
    setTimeout(() => {
      showLobbyUI();
      console.log('Lobby UI shown - ready for new lobby');
    }, 200);
    return;
  }
  
  // Disable game interactions for the remaining player
  if (typeof window.disableGameInteractions === 'function') {
    window.disableGameInteractions();
  }
  
  // Show winning popup first, then redirect to home after OK is clicked
  if (typeof window.showMessage === 'function') {
    console.log('Showing winning popup with message:', message);
    window.showMessage('Game Over - You Win!', message, () => {
      console.log('OK button clicked on winning popup');
      
      // Only after user clicks OK, reset state and redirect to home
      resetOnlineGameState();
      
      // Redirect to home screen
      console.log('Redirecting to home screen...');
      if (typeof window.showScreen === 'function' && window.homeScreen) {
        console.log('Using showScreen function...');
        window.showScreen(window.homeScreen);
      } else {
        // Fallback: direct DOM manipulation
        console.log('Using fallback DOM manipulation...');
        const homeScreen = document.getElementById('home-screen');
        const onlineLobbyUI = document.getElementById('online-lobby-ui');
        const onlineGameScreen = document.getElementById('online-game-screen');
        
        if (homeScreen) {
          // Hide all game screens first
          if (onlineGameScreen) {
            onlineGameScreen.style.display = 'none';
          }
          // Use the proper showScreen function if available, otherwise set flex display
          if (typeof window.showScreen === 'function') {
            window.showScreen(homeScreen);
          } else {
            homeScreen.style.display = 'flex';
          }
          // Show lobby UI
          if (onlineLobbyUI) {
            onlineLobbyUI.style.display = 'block';
          }
          console.log('Home screen shown via fallback');
        }
      }
      
      // Ensure lobby UI is visible and ready for new lobbies
      setTimeout(() => {
        showLobbyUI();
        console.log('Lobby UI shown - ready for new lobby');
      }, 200);
    });
  } else {
    // Fallback: alert and redirect
    console.log('showMessage function not available, using alert fallback');
    alert(message);
    resetOnlineGameState();
    
    // Use the proper showScreen function
    if (typeof window.showScreen === 'function' && window.homeScreen) {
      window.showScreen(window.homeScreen);
    } else {
      // Fallback: direct DOM manipulation
      const homeScreen = document.getElementById('home-screen');
      const onlineGameScreen = document.getElementById('online-game-screen');
      
      if (homeScreen) {
        if (onlineGameScreen) {
          onlineGameScreen.style.display = 'none';
        }
        homeScreen.style.display = 'flex';
      }
    }
    
    showLobbyUI();
    console.log('Lobby UI shown via alert fallback - ready for new lobby');
  }
});

// Handle lobby destruction
socket.on('lobbyDestroyed', () => {
  console.log('Lobby destroyed - resetting state');
  
  // Reset all state
  resetSocketAndLobbyState();
  
  // Redirect to home screen
  const homeScreen = document.getElementById('home-screen');
  const onlineLobbyUI = document.getElementById('online-lobby-ui');
  const onlineGameScreen = document.getElementById('online-game-screen');
  
  if (homeScreen) {
    // Hide game screens
    if (onlineGameScreen) {
      onlineGameScreen.style.display = 'none';
    }
    // Use the proper showScreen function if available, otherwise set flex display
    if (typeof window.showScreen === 'function') {
      window.showScreen(homeScreen);
    } else {
      homeScreen.style.display = 'flex';
    }
    // Show lobby UI
    if (onlineLobbyUI) {
      onlineLobbyUI.style.display = 'block';
    }
  }
  
  // Show lobby UI after a short delay to ensure home screen is properly displayed
  setTimeout(() => {
    showLobbyUI();
    console.log('Lobby UI shown after lobby destruction - ready for new lobby');
  }, 200);
});

// Function to reset all online game state
function resetOnlineGameState() {
  console.log('Resetting online game state...');
  
  // Reset all lobby variables
  isInLobby = false;
  isGameStarted = false;
  currentLobbyCode = null;
  isCreator = false;
  playerRole = null;
  
  // Reset global variables
  if (typeof window.gameMode !== 'undefined') {
    window.gameMode = null;
  }
  if (typeof window.onlinePlayerRole !== 'undefined') {
    window.onlinePlayerRole = null;
  }
  if (typeof window.onlineSocket !== 'undefined') {
    window.onlineSocket = null;
  }
  if (typeof window.onlineLobbyCode !== 'undefined') {
    window.onlineLobbyCode = null;
  }
  if (typeof window.gameOver !== 'undefined') {
    window.gameOver = false;
  }
  
  // Clear UI elements
  if (lobbyStatus) {
    lobbyStatus.textContent = '';
  }
  if (joinLobbyCodeInput) {
    joinLobbyCodeInput.value = '';
  }
  
  // Ensure client leaves socket room
  if (socket && currentLobbyCode) {
    socket.leave(currentLobbyCode);
  }
  
  // Reset game state
  if (typeof window.resetOnlineGameState === 'function') {
    window.resetOnlineGameState();
  }
  if (typeof window.resetGameState === 'function') {
    window.resetGameState();
  }
  
  // Ensure lobby UI is visible and ready
  showLobbyUI();
  
  console.log('Online game state reset complete - ready for new lobby');
  console.log('Current state after reset:');
  console.log('  - isInLobby:', isInLobby);
  console.log('  - currentLobbyCode:', currentLobbyCode);
  console.log('  - isCreator:', isCreator);
  console.log('  - playerRole:', playerRole);
}

// Handle page unload to notify opponent when user leaves
window.addEventListener('beforeunload', () => {
  if (isInLobby && currentLobbyCode && socket) {
    socket.emit('leaveLobby', currentLobbyCode);
  }
});

// Function to reset and show lobby UI for new lobby creation/joining
function resetAndShowLobbyUI() {
  console.log('Resetting and showing lobby UI for new lobby');
  resetOnlineGameState();
  showLobbyUI();
}

// Function to completely reset socket connection and lobby state
function resetSocketAndLobbyState(preserveLobbyCode = false) {
  console.log('Performing complete socket and lobby state reset...');
  
  // Store the lobby code if we need to preserve it
  const savedLobbyCode = preserveLobbyCode ? joinLobbyCodeInput.value : null;
  
  // Reset all lobby variables
  currentLobbyCode = null;
  isInLobby = false;
  isGameStarted = false;
  isCreator = false;
  playerRole = null;
  
  // Reset global variables
  if (typeof window.gameMode !== 'undefined') {
    window.gameMode = null;
  }
  if (typeof window.onlinePlayerRole !== 'undefined') {
    window.onlinePlayerRole = null;
  }
  if (typeof window.onlineSocket !== 'undefined') {
    window.onlineSocket = null;
  }
  if (typeof window.onlineLobbyCode !== 'undefined') {
    window.onlineLobbyCode = null;
  }
  if (typeof window.gameOver !== 'undefined') {
    window.gameOver = false;
  }
  
  // Clear UI elements
  if (lobbyStatus) {
    lobbyStatus.textContent = '';
  }
  if (joinLobbyCodeInput && !preserveLobbyCode) {
    joinLobbyCodeInput.value = '';
  }
  
  // Reset game state
  if (typeof window.resetOnlineGameState === 'function') {
    window.resetOnlineGameState();
  }
  if (typeof window.resetGameState === 'function') {
    window.resetGameState();
  }
  
  // Disconnect and reconnect socket if needed
  if (socket && socket.connected) {
    console.log('Disconnecting socket for fresh connection...');
    socket.disconnect();
    setTimeout(() => {
      console.log('Reconnecting socket...');
      socket.connect();
    }, 100);
  }
  
  console.log('Complete socket and lobby state reset finished');
  
  // Return the saved lobby code if it was preserved
  return savedLobbyCode;
}

// Expose functions globally for game.js
window.currentLobbyCode = () => currentLobbyCode;
window.isCreator = () => isCreator;
window.playerRole = () => playerRole;
window.resetOnlineGameState = resetOnlineGameState;
window.resetAndShowLobbyUI = resetAndShowLobbyUI;
window.resetSocketAndLobbyState = resetSocketAndLobbyState;

// Add manual reset function for debugging
window.manualResetLobby = () => {
  console.log('Manual lobby reset triggered');
  resetSocketAndLobbyState();
  showLobbyUI();
  console.log('Manual reset complete - ready for new lobby');
}; 