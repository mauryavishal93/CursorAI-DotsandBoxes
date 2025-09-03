// Online lobby and multiplayer logic for Dots and Boxes

// Platform detection for iOS-specific handling
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

console.log('Platform detected:', { isIOS, userAgent: navigator.userAgent });

// Configure socket for better iOS compatibility
const socket = io({
  transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
  timeout: isIOS ? 30000 : 20000, // Longer timeout for iOS
  forceNew: false, // Reuse existing connection if available
  reconnection: true,
  reconnectionDelay: isIOS ? 2000 : 1000, // Longer delay for iOS
  reconnectionAttempts: 5,
  maxReconnectionAttempts: 5
});

const onlineGameBtn = document.getElementById('online-game-btn');
const onlineLobbyUI = document.getElementById('online-lobby-ui');
const createLobbyBtn = document.getElementById('create-lobby-btn');
const joinLobbyBtn = document.getElementById('join-lobby-btn');
const joinLobbyCodeInput = document.getElementById('join-lobby-code');
const lobbyStatus = document.getElementById('lobby-status');
const shareIconContainer = document.getElementById('share-icon-container');

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

if (onlineGameBtn) {
  onlineGameBtn.addEventListener('click', () => {
    showLobbyUI();
  });
}

// Socket connection event handlers
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
  
  // Associate socket with current user if logged in
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (token && user.id) {
    socket.emit('associateUser', {
      userId: user.id,
      username: user.username
    });
    console.log('Socket associated with user:', user.username);
  }
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
  // Show user-friendly error message
  if (lobbyStatus) {
    lobbyStatus.textContent = 'Connection error. Please check your internet connection.';
  }
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Socket reconnected after', attemptNumber, 'attempts');
  if (lobbyStatus) {
    lobbyStatus.textContent = 'Reconnected! Game should continue normally.';
  }
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
  if (lobbyStatus && reason !== 'io client disconnect') {
    lobbyStatus.textContent = 'Connection lost. Attempting to reconnect...';
  }
});

socket.on('reconnect_error', (error) => {
  console.error('Socket reconnection error:', error);
  if (lobbyStatus) {
    lobbyStatus.textContent = 'Reconnection failed. Please refresh the page.';
  }
});

// Expose socket globally for game.js
window.socket = socket;

if (createLobbyBtn) {
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
        
        // Update lobby status with text
        const statusText = `Lobby created! Code: ${currentLobbyCode}. Waiting for another player...`;
        console.log('Setting lobby status:', statusText);
        
        // Set the lobby status text
        lobbyStatus.textContent = statusText;
        
        // Show the share icon container
        if (shareIconContainer) {
                     shareIconContainer.style.display = 'block';
          console.log('Share icon container shown');
        } else {
          console.error('Share icon container not found!');
        }
        
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
    
    // Update lobby status with text
    const statusText = `Lobby created! Code: ${currentLobbyCode}. Waiting for another player...`;
    console.log('Setting lobby status:', statusText);
    
    // Set the lobby status text
    lobbyStatus.textContent = statusText;
    
    // Show the share icon container
    if (shareIconContainer) {
                 shareIconContainer.style.display = 'block';
      console.log('Share icon container shown');
    } else {
      console.error('Share icon container not found!');
    }
    
    window.lobbyCode = currentLobbyCode;
    console.log('New lobby created successfully:', currentLobbyCode);
  });
  });
}

if (joinLobbyBtn) {
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
          console.log('Player joined lobby - Role set to:', playerRole, 'Lobby:', currentLobbyCode);
          lobbyStatus.textContent = `Joined lobby ${currentLobbyCode}. Waiting for another player...`;
          window.lobbyCode = currentLobbyCode;
          
          // Hide share icon when joining a lobby (only creators can share)
          if (shareIconContainer) {
            shareIconContainer.style.display = 'none';
            console.log('Share icon container hidden');
          }
          
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
      console.log('Player joined lobby - Role set to:', playerRole, 'Lobby:', currentLobbyCode);
      lobbyStatus.textContent = `Joined lobby ${code}. Waiting for another player...`;
      window.lobbyCode = currentLobbyCode;
      
      // Hide share icon when joining a lobby (only creators can share)
      if (shareIconContainer) {
        shareIconContainer.style.display = 'none';
        console.log('Share icon container hidden');
      }
      
      console.log('Successfully joined lobby:', currentLobbyCode);
    } else {
      lobbyStatus.textContent = response.message || 'Failed to join lobby.';
      console.log('Failed to join lobby:', response.message);
    }
  });
  });
}

socket.on('lobbyUpdate', ({ players }) => {
  console.log('Lobby update received:', { players: players.length, currentLobbyCode, isInLobby, playerRole });
  if (isInLobby && currentLobbyCode) {
    if (players.length === 1) {
      lobbyStatus.textContent = `Lobby ${currentLobbyCode}: Waiting for another player...`;
      console.log('Waiting for another player...');
    } else if (players.length === 2) {
      lobbyStatus.textContent = `Lobby ${currentLobbyCode}: Both players connected! Starting game...`;
      console.log('Both players connected! Game should start soon...');
    }
  }
});

socket.on('startGame', ({ lobbyCode }) => {
  console.log('startGame event received:', { lobbyCode, currentLobbyCode, isGameStarted, playerRole, socketId: socket.id });
  
  if (currentLobbyCode === lobbyCode && !isGameStarted) {
    isGameStarted = true;
    lobbyStatus.textContent = `Game started in lobby ${lobbyCode}!`;
    
    // Ensure user is associated with socket before starting game
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (token && user.id && !socket.connected) {
      console.log('Socket not connected, waiting for connection...');
      socket.once('connect', () => {
        console.log('Socket reconnected, starting game...');
        startOnlineGame(lobbyCode);
      });
      return;
    }
    
    // Add delay for iOS compatibility before starting game
    const startDelay = isIOS ? 300 : 100;
    setTimeout(() => {
      startOnlineGame(lobbyCode);
    }, startDelay);
  } else {
    console.log('startGame event ignored:', { 
      lobbyCodeMatch: currentLobbyCode === lobbyCode, 
      gameAlreadyStarted: isGameStarted 
    });
  }
});

function startOnlineGame(lobbyCode) {
    // Set player names based on role
    let player1Name = playerRole === 1 ? 'You' : 'Opponent';
    let player2Name = playerRole === 2 ? 'You' : 'Opponent';
    
    console.log('Starting online game with:', { player1Name, player2Name, playerRole, lobbyCode });
    
    // Start the online game with retry logic for iOS compatibility
    const maxAttempts = isIOS ? 5 : 3; // More attempts for iOS
    const retryDelay = isIOS ? 300 : 200; // Longer delay for iOS
    
    const attemptStartGame = (attempt = 1) => {
      if (typeof window.startGame === 'function') {
        console.log(`Attempt ${attempt}: Calling window.startGame...`);
        try {
          window.startGame('onlineMultiplayer', { 
            player1Name, 
            player2Name, 
            playerRole, 
            lobbyCode,
            socket 
          });
          console.log(`Attempt ${attempt}: window.startGame called successfully`);
        } catch (error) {
          console.error(`Attempt ${attempt}: Error calling window.startGame:`, error);
          if (attempt < maxAttempts) {
            console.log(`Retrying in ${attempt * retryDelay}ms...`);
            setTimeout(() => attemptStartGame(attempt + 1), attempt * retryDelay);
          } else {
            console.error('All attempts failed to start game');
          }
        }
      } else {
        console.log(`Attempt ${attempt}: window.startGame not available`);
        if (attempt < maxAttempts) {
          console.log(`Retrying in ${attempt * retryDelay}ms...`);
          setTimeout(() => attemptStartGame(attempt + 1), attempt * retryDelay);
        } else {
          console.error('window.startGame not available after all attempts');
        }
      }
    };
    
    // Start with first attempt
    attemptStartGame();
  }

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
      if (homeScreen) {
        homeScreen.style.display = 'flex';
      }
    }
    
    // Ensure lobby UI is visible and ready for new lobbies
    setTimeout(() => {
      showLobbyUI();
      console.log('Lobby UI shown - ready for new lobby');
    }, 200);
  }
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
  
  // Hide share icon container
  if (shareIconContainer) {
    shareIconContainer.style.display = 'none';
    console.log('Share icon container hidden during reset');
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
  
  // Hide share icon container
  if (shareIconContainer) {
    shareIconContainer.style.display = 'none';
    console.log('Share icon container hidden during reset');
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

// Share lobby functionality
if (shareIconContainer) {
  const shareLobbyIcon = shareIconContainer.querySelector('#share-lobby-icon');
  if (shareLobbyIcon) {
    shareLobbyIcon.addEventListener('click', () => {
      if (currentLobbyCode) {
        shareLobby(currentLobbyCode);
      }
    });
    console.log('Share icon event listener attached');
  }
}

function shareLobby(lobbyCode) {
  const shareMessage = `Let's play Dots and Boxes!
Think you can outsmart me in the ultimate grid showdown? 😏
Join my lobby and let's find out!

🔗 Game Link: https://dotsandboxes-ey9u.onrender.com/

🔐 Lobby Code: ${lobbyCode}

Tap the link, enter the code, and let the battle begin! 🚀📦🖊️`;

  // Check if Web Share API is available (mobile devices)
  if (navigator.share) {
    navigator.share({
      title: 'Join my Dots and Boxes lobby!',
      text: shareMessage
    }).catch((error) => {
      console.log('Error sharing:', error);
      // Fallback to clipboard copy
      copyToClipboard(shareMessage);
    });
  } else {
    // Fallback for desktop browsers - copy to clipboard
    copyToClipboard(shareMessage);
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showShareSuccess();
    }).catch(() => {
      // Fallback for older browsers
      fallbackCopyToClipboard(text);
    });
  } else {
    // Fallback for older browsers
    fallbackCopyToClipboard(text);
  }
}

function fallbackCopyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    showShareSuccess();
  } catch (err) {
    console.error('Fallback copy failed:', err);
    showShareError();
  }
  
  document.body.removeChild(textArea);
}

function showShareSuccess() {
  // Show success message in lobby status
  const originalText = lobbyStatus.textContent;
  lobbyStatus.textContent = 'Lobby code copied to clipboard! 📋';
  lobbyStatus.style.color = '#22c55e';
  
  setTimeout(() => {
    lobbyStatus.textContent = originalText;
    lobbyStatus.style.color = '';
  }, 3000);
}

function showShareError() {
  // Show error message in lobby status
  const originalText = lobbyStatus.textContent;
  lobbyStatus.textContent = 'Failed to copy lobby code. Please try again.';
  lobbyStatus.style.color = '#ef4444';
  
  setTimeout(() => {
    lobbyStatus.textContent = originalText;
    lobbyStatus.style.color = '';
  }, 3000);
}

// Listen for statistics updates from the server
socket.on('statsUpdated', (data) => {
  console.log('Received stats update from server:', data);
  
  // Update the profile statistics display if user is logged in
  if (typeof window.authService !== 'undefined' && window.authService.isLoggedIn()) {
    // Update the current user's stats in localStorage
    const currentUser = window.authService.getCurrentUser();
    if (currentUser && currentUser.id === data.userId) {
      currentUser.stats = data.stats;
      window.authService.saveToStorage(currentUser, window.authService.getToken());
      
      // Update the profile display
      updateProfileStatsDisplay(data.stats);
    }
  }
});

// Function to update profile statistics display
function updateProfileStatsDisplay(stats) {
  const gamesPlayedEl = document.getElementById('stat-games-played');
  const gamesWonEl = document.getElementById('stat-games-won');
  const winRateEl = document.getElementById('stat-win-rate');
  const totalScoreEl = document.getElementById('stat-total-score');
  
  if (gamesPlayedEl) gamesPlayedEl.textContent = stats.gamesPlayed || 0;
  if (gamesWonEl) gamesWonEl.textContent = stats.gamesWon || 0;
  if (winRateEl) {
    const winRate = stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed * 100).toFixed(1) : 0;
    winRateEl.textContent = `${winRate}%`;
  }
  if (totalScoreEl) totalScoreEl.textContent = stats.totalScore || 0;
  
  console.log('Profile statistics display updated:', stats);
}

// Expose functions globally for game.js
window.currentLobbyCode = () => currentLobbyCode;
window.isCreator = () => isCreator;
window.playerRole = () => playerRole;

// Add manual reset function for debugging
window.manualResetLobby = () => {
  console.log('Manual lobby reset triggered');
  resetSocketAndLobbyState();
  showLobbyUI();
  console.log('Manual reset complete - ready for new lobby');
};
