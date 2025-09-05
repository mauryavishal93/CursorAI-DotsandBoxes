// Online lobby and multiplayer logic for Dots and Boxes

// Enhanced platform detection for cross-platform compatibility
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isAndroid = /Android/.test(navigator.userAgent);

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isDesktop = !isMobile;

// Cross-platform compatibility flags
const needsExtendedTimeout = isIOS || isAndroid; // Mobile devices need longer timeouts
const needsExtendedDelay = isMobile; // All mobile devices need extended delays
const isSlowDevice = isIOS || isAndroid || /Chrome/.test(navigator.userAgent) && isMobile;

console.log('Platform detected:', { 
  isIOS, 
  isAndroid, 
  isMobile, 
  isDesktop,
  needsExtendedTimeout,
  needsExtendedDelay,
  isSlowDevice,
  userAgent: navigator.userAgent 
});

// Configure socket for better cross-platform compatibility
const socket = io({
  timeout: needsExtendedTimeout ? 30000 : 20000, // Longer timeout for mobile devices
  forceNew: false, // Reuse existing connection if available
  reconnection: true,
  reconnectionDelay: needsExtendedDelay ? 2000 : 1000, // Longer delay for mobile devices
  reconnectionAttempts: isSlowDevice ? 8 : 5, // More attempts for slower devices
  maxReconnectionAttempts: isSlowDevice ? 8 : 5,
  // Cross-platform transport optimization
  transports: isMobile ? ['polling', 'websocket'] : ['websocket', 'polling'], // Prioritize polling on mobile
  upgrade: !isMobile, // Disable transport upgrade on mobile for stability
  rememberUpgrade: !isMobile // Don't remember upgrades on mobile
});

const onlineGameBtn = document.getElementById('online-game-btn');
const onlineLobbyUI = document.getElementById('online-lobby-ui');
const createLobbyBtn = document.getElementById('create-lobby-btn');
const joinLobbyBtn = document.getElementById('join-lobby-btn');
const joinLobbyCodeInput = document.getElementById('join-lobby-code');
const lobbyStatus = document.getElementById('lobby-status');
const shareIconContainer = document.getElementById('share-icon-container');

// Auto-convert lobby code input to uppercase as user types
if (joinLobbyCodeInput) {
  joinLobbyCodeInput.addEventListener('input', function(event) {
    const currentValue = event.target.value;
    const upperCaseValue = currentValue.toUpperCase();
    
    // Only update if the value actually changed to avoid cursor jumping
    if (currentValue !== upperCaseValue) {
      event.target.value = upperCaseValue;
      console.log('Lobby code input converted to uppercase:', upperCaseValue);
    }
  });
  
  // Also handle paste events
  joinLobbyCodeInput.addEventListener('paste', function(event) {
    // Small delay to allow paste to complete, then convert to uppercase
    setTimeout(() => {
      const currentValue = event.target.value;
      const upperCaseValue = currentValue.toUpperCase();
      
      if (currentValue !== upperCaseValue) {
        event.target.value = upperCaseValue;
        console.log('Pasted lobby code converted to uppercase:', upperCaseValue);
      }
    }, 10);
  });
}

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
  
  // Attempt to reconnect to lobby if we were in one
  if (currentLobbyCode && isInLobby) {
    console.log('Attempting to reconnect to lobby:', currentLobbyCode);
    socket.emit('reconnectToLobby', currentLobbyCode, (response) => {
      if (response.success) {
        console.log('Successfully reconnected to lobby:', currentLobbyCode);
        lobbyStatus.textContent = `Reconnected to lobby ${currentLobbyCode}!`;
      } else {
        console.log('Failed to reconnect to lobby:', response.message);
        lobbyStatus.textContent = 'Failed to reconnect to lobby. Please try joining again.';
        // Reset lobby state
        currentLobbyCode = null;
        isInLobby = false;
        isCreator = false;
        playerRole = null;
      }
    });
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

// Handle temporary disconnection messages (UNIFIED HANDLER)
socket.on('playerDisconnected', (data) => {
  console.log('Player disconnected:', data);
  
  if (data.isTemporary) {
    // Show temporary disconnect message in status
    if (lobbyStatus) {
      lobbyStatus.textContent = 'Your opponent has temporarily disconnected. They have 5 minutes to reconnect.';
      lobbyStatus.style.color = '#f59e0b'; // Orange color for temporary disconnect
    }
  } else {
    // Permanent disconnect - show proper popup like game over
    console.log('Game ended due to opponent disconnect. Winner:', data.winner);
    
    // Check if game was already over before showing disconnect message
    if (typeof window.gameOver === 'function' && window.gameOver()) {
      console.log('Game was already over, not showing disconnect message');
      // Just reset state and redirect to home without showing the disconnect popup
      resetOnlineGameState();
      if (typeof window.clearLobbyUIData === 'function') {
        window.clearLobbyUIData();
      }
      showScreen(document.getElementById('home-screen'));
    } else {
      // Show proper win popup like game over messages
      const winMessage = data.winner === 'you' ? 
        'Opponent Left - You Win!' : 
        'You Left - Opponent Wins!';
      
      const detailMessage = data.message || 
        (data.winner === 'you' ? 
          'Your opponent has left the game. Victory is yours!' : 
          'You have left the game.');
      
      // Use the same showMessage function as game over
      if (typeof window.showMessage === 'function') {
        window.showMessage(winMessage, detailMessage, () => {
          // Reset state and go to home after popup is closed
          resetOnlineGameState();
          if (typeof window.clearLobbyUIData === 'function') {
            window.clearLobbyUIData();
          }
          if (typeof window.showScreen === 'function' && document.getElementById('home-screen')) {
            window.showScreen(document.getElementById('home-screen'));
          }
        });
      } else {
        // Fallback if showMessage is not available
        alert(`${winMessage}\n${detailMessage}`);
        resetOnlineGameState();
        if (typeof window.clearLobbyUIData === 'function') {
          window.clearLobbyUIData();
        }
        if (document.getElementById('home-screen')) {
          document.getElementById('home-screen').style.display = 'block';
        }
      }
      
      // Disable game interactions
      if (typeof window.disableGameInteractions === 'function') {
        window.disableGameInteractions();
      }
    }
  }
});

// Handle player reconnection messages
socket.on('playerReconnected', (data) => {
  console.log('Player reconnected:', data);
  if (lobbyStatus) {
    lobbyStatus.textContent = data.message || 'Your opponent has reconnected!';
    lobbyStatus.style.color = '#22c55e'; // Green color for reconnection
  }
});

// Handle rejoin success
socket.on('rejoinSuccess', (data) => {
  console.log('🔄 Successfully rejoined lobby:', data);
  
  // Restore lobby state
  currentLobbyCode = data.lobbyCode;
  playerRole = data.playerRole;
  isInLobby = true;
  
  // Update global variables
  window.onlineLobbyCode = data.lobbyCode;
  window.onlinePlayerRole = data.playerRole;
  
  if (lobbyStatus) {
    lobbyStatus.textContent = `Reconnected to lobby ${data.lobbyCode}!`;
    lobbyStatus.style.color = '#10b981';
  }
  
  // If game was in progress, restore game state
  if (data.gameState && data.gameState.gameStarted) {
    console.log('🔄 Restoring game state after reconnection');
    if (typeof window.restoreGameState === 'function') {
      window.restoreGameState(data.gameState);
    }
  }
});

// Handle rejoin failure
socket.on('rejoinFailed', (data) => {
  console.log('🔄 Failed to rejoin lobby:', data.message);
  
  if (lobbyStatus) {
    lobbyStatus.textContent = data.message || 'Failed to rejoin lobby.';
    lobbyStatus.style.color = '#ef4444';
  }
  
  // Reset state and show lobby UI for new lobby
  resetOnlineGameState();
  showLobbyUI();
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
    console.log('Previous state:', { isInLobby, currentLobbyCode, isCreator, playerRole });
    
    // Targeted reset instead of full reset
    currentLobbyCode = null;
    isInLobby = false;
    isGameStarted = false;
    isCreator = false;
    playerRole = null;
    
    // Clear global variables
    window.onlineLobbyCode = null;
    window.onlinePlayerRole = null;
    window.lobbyCode = null;
    
    console.log('State reset complete, proceeding with lobby creation...');
    
    setTimeout(() => {
      showLobbyUI();
      // Automatically proceed with lobby creation after reset
      console.log('Auto-creating lobby after targeted reset...');
      
      // Get current username
      let currentUser = null;
      if (window.authService) {
        currentUser = window.authService.getCurrentUser();
      }
      if (!currentUser) {
        try {
          const userData = localStorage.getItem('dotsAndBoxesUser');
          if (userData) {
            currentUser = JSON.parse(userData);
          }
        } catch (error) {
          console.error('Error reading user from localStorage:', error);
        }
      }
      const currentUsername = currentUser && currentUser.username ? currentUser.username : 'Player';
      
      socket.emit('createLobby', { username: currentUsername }, (response) => {
        console.log('Create lobby response:', response);
        currentLobbyCode = response.lobbyCode;
        isInLobby = true;
        isCreator = response.isCreator || true;
        playerRole = response.playerRole || 1;
        
        console.log('🎯 Creator state after reset and creation:', {
          currentLobbyCode,
          isInLobby,
          isCreator,
          playerRole,
          socketId: socket.id
        });
        
        // Set global variables immediately after creation
        window.lobbyCode = currentLobbyCode;
        window.onlineLobbyCode = currentLobbyCode;
        window.onlinePlayerRole = playerRole;
        
        // Additional safety check - ensure creator state is maintained
        if (playerRole === 1 && !isCreator) {
          console.log('⚠️ Fixing creator state mismatch');
          isCreator = true;
        }
        
        // Store creator state for recovery if needed
        window.creatorLobbyCode = currentLobbyCode;
        window.creatorSocketId = socket.id;
        
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
        
        console.log('New lobby created successfully:', currentLobbyCode);
      });
    }, 200);
    return; // Return early, action will be performed automatically
  }
  
  // Get current username
  let currentUser = null;
  if (window.authService) {
    currentUser = window.authService.getCurrentUser();
  }
  if (!currentUser) {
    try {
      const userData = localStorage.getItem('dotsAndBoxesUser');
      if (userData) {
        currentUser = JSON.parse(userData);
      }
    } catch (error) {
      console.error('Error reading user from localStorage:', error);
    }
  }
  const currentUsername = currentUser && currentUser.username ? currentUser.username : 'Player';
  
  socket.emit('createLobby', { username: currentUsername }, (response) => {
    console.log('Create lobby response:', response);
    currentLobbyCode = response.lobbyCode;
    isInLobby = true;
    isCreator = response.isCreator || true;
    playerRole = response.playerRole || 1;
    
            console.log('🎯 Creator state (direct creation):', {
          currentLobbyCode,
          isInLobby,
          isCreator,
          playerRole,
          socketId: socket.id
        });
        
        // Set global variables immediately after creation
        window.lobbyCode = currentLobbyCode;
        window.onlineLobbyCode = currentLobbyCode;
        window.onlinePlayerRole = playerRole;
        
        // Additional safety check - ensure creator state is maintained
        if (playerRole === 1 && !isCreator) {
          console.log('⚠️ Fixing creator state mismatch');
          isCreator = true;
        }
        
        // Store creator state for recovery if needed
        window.creatorLobbyCode = currentLobbyCode;
        window.creatorSocketId = socket.id;
    
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
    
    console.log('New lobby created successfully:', currentLobbyCode);
  });
  });
}

// Function to join lobby with retry logic
function joinLobbyWithRetry(lobbyCode, maxAttempts = 3, currentAttempt = 1) {
  console.log(`Join lobby attempt ${currentAttempt}/${maxAttempts} for code: ${lobbyCode}`);
  console.log('Socket connected:', socket.connected, 'Socket ID:', socket.id);
  
  // Update status to show attempt progress
  if (lobbyStatus) {
    if (currentAttempt === 1) {
      lobbyStatus.textContent = `Joining lobby ${lobbyCode}...`;
    } else {
      lobbyStatus.textContent = `Joining lobby ${lobbyCode}... (attempt ${currentAttempt}/${maxAttempts})`;
    }
    lobbyStatus.style.color = '#3b82f6'; // Blue color for progress
  }
  
  // Ensure socket is connected before attempting to join
  if (!socket.connected) {
    console.log('Socket not connected, waiting for connection...');
    socket.once('connect', () => {
      console.log('Socket connected, proceeding with join lobby attempt');
      joinLobbyWithRetry(lobbyCode, maxAttempts, currentAttempt);
    });
    return;
  }
  
  // Set up a timeout for the join lobby request
  const joinTimeout = setTimeout(() => {
    console.log(`Join lobby attempt ${currentAttempt} timed out`);
    
    if (currentAttempt < maxAttempts) {
      const retryDelay = currentAttempt * 500;
      console.log(`Retrying join lobby in ${retryDelay}ms due to timeout...`);
      
      setTimeout(() => {
        joinLobbyWithRetry(lobbyCode, maxAttempts, currentAttempt + 1);
      }, retryDelay);
    } else {
      console.log(`All ${maxAttempts} join lobby attempts failed (timeout)`);
      if (lobbyStatus) {
        lobbyStatus.textContent = 'Failed to join lobby - connection timeout.';
        lobbyStatus.style.color = '#ef4444';
      }
    }
  }, 5000); // 5 second timeout
  
  // Get current username
  let currentUser = null;
  if (window.authService) {
    currentUser = window.authService.getCurrentUser();
  }
  if (!currentUser) {
    try {
      const userData = localStorage.getItem('dotsAndBoxesUser');
      if (userData) {
        currentUser = JSON.parse(userData);
      }
    } catch (error) {
      console.error('Error reading user from localStorage:', error);
    }
  }
  const currentUsername = currentUser && currentUser.username ? currentUser.username : 'Player';
  
  socket.emit('joinLobby', { lobbyCode: lobbyCode, username: currentUsername }, (response) => {
    // Clear the timeout since we got a response
    clearTimeout(joinTimeout);
    
    console.log(`Join lobby attempt ${currentAttempt} response:`, response);
    
    if (response.success) {
      // Success! Update all states with server-provided information
      currentLobbyCode = response.lobbyCode || lobbyCode;
      isInLobby = true;
      isCreator = response.isCreator || false;
      playerRole = response.playerRole || 2; // Use server-provided role
      
      console.log('Player joined lobby - Server assigned role:', playerRole, 'isCreator:', isCreator, 'Lobby:', currentLobbyCode);
      
      // Update UI
      if (lobbyStatus) {
        const statusText = isCreator ? 
          `Lobby ${currentLobbyCode} created! Waiting for another player...` :
          `Joined lobby ${currentLobbyCode}. Waiting for game to start...`;
        lobbyStatus.textContent = statusText;
        lobbyStatus.style.color = '#10b981'; // Green color for success
      }
      
      // Set global variables
      window.lobbyCode = currentLobbyCode;
      window.onlineLobbyCode = currentLobbyCode;
      window.onlinePlayerRole = playerRole;
      
      // Hide share icon when joining a lobby (only creators can share)
      if (shareIconContainer) {
        shareIconContainer.style.display = 'none';
        console.log('Share icon container hidden');
      }
      
      console.log(`Successfully joined lobby on attempt ${currentAttempt}:`, currentLobbyCode);
    } else {
      // Failed attempt
      console.log(`Join lobby attempt ${currentAttempt} failed:`, response.message);
      
      if (currentAttempt < maxAttempts) {
        // Try again after a short delay
        const retryDelay = currentAttempt * 500; // Increasing delay: 500ms, 1000ms, 1500ms
        console.log(`Retrying join lobby in ${retryDelay}ms...`);
        
        setTimeout(() => {
          joinLobbyWithRetry(lobbyCode, maxAttempts, currentAttempt + 1);
        }, retryDelay);
      } else {
        // All attempts failed
        console.log(`All ${maxAttempts} join lobby attempts failed`);
        if (lobbyStatus) {
          lobbyStatus.textContent = response.message || 'Failed to join lobby after multiple attempts.';
          lobbyStatus.style.color = '#ef4444'; // Red color for error
        }
      }
    }
  });
}

if (joinLobbyBtn) {
  joinLobbyBtn.addEventListener('click', () => {
    console.log('Join lobby button clicked');
    const code = joinLobbyCodeInput.value.trim().toUpperCase();
    console.log('Attempting to join lobby code:', code);
    console.log('Current state - isInLobby:', isInLobby, 'currentLobbyCode:', currentLobbyCode);
    
    if (!code) {
      if (lobbyStatus) {
        lobbyStatus.textContent = 'Please enter a lobby code.';
        lobbyStatus.style.color = '#ef4444'; // Red color for error
      }
      return;
    }
    
    // Reset any leftover state before joining new lobby
    if (isInLobby || currentLobbyCode) {
      console.log('Resetting leftover lobby state before joining new lobby');
      const savedLobbyCode = resetSocketAndLobbyState(true); // Preserve the lobby code
      
      // Wait for reset to complete, then join with retry logic
      setTimeout(() => {
        showLobbyUI();
        if (savedLobbyCode) {
          joinLobbyCodeInput.value = savedLobbyCode; // Restore the lobby code
        }
        console.log('Starting join lobby with retry after state reset...');
        joinLobbyWithRetry(savedLobbyCode || code);
      }, 300); // Slightly longer delay to ensure reset is complete
      return; // Return early, action will be performed automatically
    }
    
    // Direct join with retry logic (no state to reset)
    console.log('Starting join lobby with retry (no state reset needed)...');
    joinLobbyWithRetry(code);
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

socket.on('startGame', ({ lobbyCode, timestamp, crossPlatform, playerNames }) => {
  console.log('🎮 startGame event received:', { 
    lobbyCode, 
    currentLobbyCode, 
    isGameStarted, 
    playerRole, 
    isInLobby,
    isCreator,
    socketId: socket.id,
    timestamp,
    crossPlatform,
    playerNames
  });
  
  // Check if state was somehow corrupted and try to recover
  if (currentLobbyCode === lobbyCode && playerRole === null) {
    console.log('⚠️ Player role is null but lobby code matches - attempting state recovery');
    
    // Try to recover creator state if this is the creator's socket
    if (window.onlineLobbyCode === lobbyCode && window.onlinePlayerRole) {
      console.log('🔄 Recovering player role from global variables');
      playerRole = window.onlinePlayerRole;
      isCreator = (playerRole === 1);
      isInLobby = true;
      console.log('✅ State recovered from globals:', { playerRole, isCreator, isInLobby });
    }
    
    // Additional recovery check for creator using stored creator state
    if (window.creatorLobbyCode === lobbyCode && window.creatorSocketId === socket.id) {
      console.log('🔄 Recovering creator state from stored data');
      playerRole = 1;
      isCreator = true;
      isInLobby = true;
      window.onlinePlayerRole = 1;
      console.log('✅ Creator state recovered:', { playerRole, isCreator, isInLobby });
    }
  }
  
  // Additional check for creator state consistency
  if (currentLobbyCode === lobbyCode && playerRole === 1 && !isCreator) {
    console.log('⚠️ Creator role mismatch detected - fixing');
    isCreator = true;
    console.log('✅ Creator flag fixed');
  }
  
  // Enhanced validation logging
  console.log('🔍 startGame validation:', {
    'lobbyCode matches': currentLobbyCode === lobbyCode,
    'game not started': !isGameStarted,
    'player in lobby': isInLobby,
    'player role set': playerRole !== null,
    'is creator': isCreator
  });
  
  if (currentLobbyCode === lobbyCode && !isGameStarted && isInLobby && playerRole !== null) {
    console.log('✅ Starting game for this player - all conditions met');
    console.log(`🎯 Player details: Role ${playerRole}, ${isCreator ? 'Creator' : 'Joiner'}, Lobby ${lobbyCode}`);
    isGameStarted = true;
    lobbyStatus.textContent = `Game started in lobby ${lobbyCode}!`;
    
    // Ensure user is associated with socket before starting game
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (token && user.id && !socket.connected) {
      console.log('⚠️ Socket not connected, waiting for connection...');
      socket.once('connect', () => {
        console.log('✅ Socket reconnected, starting game...');
        startOnlineGame(lobbyCode);
      });
      return;
    }
    
    // Add cross-platform compatible delay before starting game
    // Different delays based on device type and role for better synchronization
    let startDelay;
    if (isCreator) {
      // Lobby creator needs shorter delay to initialize first
      startDelay = isMobile ? 200 : 100;
    } else {
      // Joiner needs longer delay to ensure creator is ready
      startDelay = isMobile ? 500 : 300;
    }
    
    // Additional delay for slow devices or cross-platform scenarios
    if (isSlowDevice) {
      startDelay += 200;
    }
    
    console.log(`⏳ Starting game in ${startDelay}ms for ${isCreator ? 'creator' : 'joiner'} on ${isMobile ? 'mobile' : 'desktop'} (role: ${playerRole})`);
    setTimeout(() => {
      startOnlineGame(lobbyCode, playerNames);
    }, startDelay);
  } else {
    console.log('❌ startGame event ignored - conditions not met:', { 
      'lobbyCode matches': currentLobbyCode === lobbyCode, 
      'game not started': !isGameStarted,
      'player in lobby': isInLobby,
      'player role set': playerRole !== null,
      'current lobby': currentLobbyCode,
      'received lobby': lobbyCode,
      'current role': playerRole,
      'is creator': isCreator
    });
    
    // Additional debugging for failed conditions
    if (currentLobbyCode !== lobbyCode) {
      console.log('🔍 Lobby code mismatch - player may not be in correct lobby');
    }
    if (isGameStarted) {
      console.log('🔍 Game already started for this player');
    }
    if (!isInLobby) {
      console.log('🔍 Player not marked as in lobby - lobby join may have failed');
    }
    if (playerRole === null) {
      console.log('🔍 Player role not set - server response may be missing role information');
    }
  }
});

function startOnlineGame(lobbyCode, serverPlayerNames = {}) {
    // Use server-provided player names if available, otherwise get from localStorage
    let player1Name, player2Name;
    
    if (serverPlayerNames && (serverPlayerNames[1] || serverPlayerNames[2])) {
      // Use server-provided names
      player1Name = serverPlayerNames[1] || 'Player 1';
      player2Name = serverPlayerNames[2] || 'Player 2';
      console.log('🎮 Using server-provided player names:', { player1Name, player2Name });
    } else {
      // Fallback to local username detection (for backward compatibility)
      let currentUser = null;
      if (window.authService) {
        currentUser = window.authService.getCurrentUser();
      }
      
      if (!currentUser) {
        try {
          const userData = localStorage.getItem('dotsAndBoxesUser');
          if (userData) {
            currentUser = JSON.parse(userData);
          }
        } catch (error) {
          console.error('Error reading user from localStorage:', error);
        }
      }
      
      const currentUsername = currentUser && currentUser.username ? currentUser.username : 'Player';
      player1Name = playerRole === 1 ? currentUsername : 'Opponent';
      player2Name = playerRole === 2 ? currentUsername : 'Opponent';
      console.log('🎮 Using fallback player names:', { player1Name, player2Name });
    }
    
    console.log('🎮 Starting online game with:', { 
      player1Name, 
      player2Name, 
      playerRole, 
      lobbyCode,
      isCreator,
      isInLobby,
      currentLobbyCode
    });
    
    // Start the online game with retry logic for cross-platform compatibility
    const maxAttempts = isMobile ? 8 : 5; // More attempts for mobile devices
    const retryDelay = needsExtendedDelay ? 400 : 250; // Longer delay for mobile devices
    
    const attemptStartGame = (attempt = 1) => {
      // Enhanced logging for cross-platform debugging
      console.log(`🔍 Attempt ${attempt}/${maxAttempts} - Platform: ${isMobile ? 'Mobile' : 'Desktop'}, Device: ${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Other'}`);
      console.log(`🔍 Socket status: connected=${socket.connected}, id=${socket.id}`);
      console.log(`🔍 Game functions available: startGame=${typeof window.startGame}, showScreen=${typeof window.showScreen}, showMessage=${typeof window.showMessage}`);
      
      // Additional debugging for game.js loading
      const gameScripts = document.querySelectorAll('script[src*="game"]');
      console.log('🔍 Game-related scripts found:', gameScripts.length);
      gameScripts.forEach((script, index) => {
        console.log(`  Script ${index + 1}: ${script.src}, loaded: ${script.readyState || 'unknown'}`);
      });
      
      // Check socket connection first
      if (!socket.connected) {
        console.log(`⚠️ Socket not connected on attempt ${attempt}, waiting for connection...`);
        socket.once('connect', () => {
          console.log('✅ Socket reconnected, retrying game start...');
          attemptStartGame(attempt);
        });
        return;
      }
      
      if (typeof window.startGame === 'function') {
        console.log(`Attempt ${attempt}: Calling window.startGame for ${isCreator ? 'creator' : 'joiner'}...`);
        try {
          // Add platform-specific game start parameters
          const gameOptions = { 
            player1Name, 
            player2Name, 
            playerRole, 
            lobbyCode,
            socket,
            // Cross-platform compatibility flags
            isMobile,
            isCreator,
            platform: isIOS ? 'iOS' : isAndroid ? 'Android' : isDesktop ? 'Desktop' : 'Unknown'
          };
          
          window.startGame('onlineMultiplayer', gameOptions);
          console.log(`✅ Attempt ${attempt}: window.startGame called successfully for ${isCreator ? 'creator' : 'joiner'}`);
          
          // Emit ready signal to server for synchronization
          socket.emit('gameReady', { 
            lobbyCode, 
            playerRole, 
            platform: gameOptions.platform,
            timestamp: Date.now()
          });
          
        } catch (error) {
          console.error(`❌ Attempt ${attempt}: Error calling window.startGame:`, error);
          if (attempt < maxAttempts) {
            const nextRetryDelay = attempt * retryDelay;
            console.log(`🔄 Retrying in ${nextRetryDelay}ms...`);
            setTimeout(() => attemptStartGame(attempt + 1), nextRetryDelay);
          } else {
            console.error(`💥 All ${maxAttempts} attempts failed to start game`);
            // Show user-friendly error message
            if (typeof window.showMessage === 'function') {
              window.showMessage('Game Start Error', 'Unable to start the game. Please try refreshing the page and rejoining the lobby.');
            }
          }
        }
      } else {
        console.log(`⚠️ Attempt ${attempt}: window.startGame not available, checking game.js loading...`);
        
        // Check if game.js is already loaded but startGame function isn't available yet
        if (attempt === 1) {
          console.log('🔄 Checking for existing game.js script...');
          const existingGameScript = document.querySelector('script[src="/js/game.js"]');
          
          if (existingGameScript) {
            console.log('✅ game.js script found, waiting for function to be available...');
            // Game script exists, just wait a bit longer for it to initialize
            setTimeout(() => attemptStartGame(attempt), 1000);
            return;
          } else {
            console.log('🔄 No game.js script found, force loading...');
            const gameScript = document.createElement('script');
            gameScript.src = '/js/game.js';
            gameScript.onload = () => {
              console.log('✅ game.js dynamically loaded, retrying game start...');
              setTimeout(() => attemptStartGame(attempt), 500);
            };
            gameScript.onerror = () => {
              console.error('❌ Failed to dynamically load game.js');
              if (attempt < maxAttempts) {
                setTimeout(() => attemptStartGame(attempt + 1), retryDelay);
              }
            };
            document.head.appendChild(gameScript);
            return;
          }
        }
        
        if (attempt < maxAttempts) {
          const nextRetryDelay = attempt * retryDelay;
          console.log(`🔄 Retrying in ${nextRetryDelay}ms...`);
          setTimeout(() => attemptStartGame(attempt + 1), nextRetryDelay);
        } else {
          console.error(`💥 window.startGame not available after all ${maxAttempts} attempts`);
          // Show user-friendly error message
          if (typeof window.showMessage === 'function') {
            window.showMessage('Game Loading Error', 'Game failed to load properly. Please refresh the page and try again.');
          } else {
            alert('Game failed to load. Please refresh the page and try again.');
          }
        }
      }
    };
    
    // Start with first attempt
    attemptStartGame();
  }

// Handle player ready status for cross-platform synchronization
socket.on('playerReady', (data) => {
  console.log(`🎮 Player ready status: ${data.readyCount}/${data.totalPlayers} players ready`);
  console.log(`📱 Player ${data.playerRole} on ${data.platform} is ready`);
  
  if (lobbyStatus) {
    lobbyStatus.textContent = `Players ready: ${data.readyCount}/${data.totalPlayers}`;
    lobbyStatus.style.color = '#3b82f6'; // Blue color for progress
  }
});

// Handle game start confirmation for cross-platform sync
socket.on('gameStartConfirmed', (data) => {
  console.log(`✅ Game start confirmed for lobby ${data.lobbyCode}:`, data.message);
  
  if (lobbyStatus) {
    lobbyStatus.textContent = data.message;
    lobbyStatus.style.color = '#10b981'; // Green color for success
  }
  
  // Additional confirmation that game is starting properly
  console.log(`🚀 Cross-platform game start confirmed at ${new Date(data.timestamp).toISOString()}`);
});

// Listen for game actions from the other player
socket.on('gameAction', (action) => {
  console.log('Received game action:', action);
  
  if (typeof window.handleRemoteGameAction === 'function') {
    window.handleRemoteGameAction(action);
  }
});

// Note: playerDisconnected handler is now unified above to prevent conflicts

// Function to reset all online game state
function resetOnlineGameState() {
  console.log('Resetting online game state...');
  
  // Clear any pending timers to prevent memory leaks
  if (window.onlineGameTimers) {
    window.onlineGameTimers.forEach(timer => clearTimeout(timer));
    window.onlineGameTimers.clear();
  } else {
    window.onlineGameTimers = new Set();
  }
  
  // Clear socket reconnection timer
  if (window.socketReconnectTimer) {
    clearTimeout(window.socketReconnectTimer);
    window.socketReconnectTimer = null;
  }
  
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

// Handle app switching and background/foreground detection
let isAppInBackground = false;
let backgroundStartTime = null;
let reconnectionAttempts = 0;
const maxReconnectionAttempts = 5;

// Page Visibility API to detect app switching
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // App went to background (user switched to WhatsApp, etc.)
    isAppInBackground = true;
    backgroundStartTime = Date.now();
    console.log('🔄 App went to background, connection will be preserved');
    
    // Don't disconnect immediately - keep connection alive for sharing
    if (socket && socket.connected && currentLobbyCode) {
      // Send heartbeat to server to indicate we're still active but backgrounded
      socket.emit('backgroundHeartbeat', { 
        lobbyCode: currentLobbyCode,
        timestamp: backgroundStartTime 
      });
    }
  } else {
    // App came back to foreground
    if (isAppInBackground) {
      const backgroundDuration = Date.now() - backgroundStartTime;
      console.log(`🔄 App returned to foreground after ${Math.round(backgroundDuration / 1000)}s`);
      isAppInBackground = false;
      backgroundStartTime = null;
      
      // Ensure connection is still active
      if (socket && currentLobbyCode) {
        if (!socket.connected) {
          console.log('🔄 Connection lost while in background, attempting reconnection...');
          attemptReconnection();
        } else {
          // Connection is still active, send heartbeat to confirm we're back
          socket.emit('foregroundHeartbeat', { 
            lobbyCode: currentLobbyCode,
            backgroundDuration: backgroundDuration 
          });
          
          // Reset reconnection attempts since we're back and connected
          reconnectionAttempts = 0;
        }
      }
    }
  }
});

// Handle app pause/resume events (mobile specific)
window.addEventListener('pagehide', () => {
  if (isInLobby && currentLobbyCode && socket) {
    console.log('🔄 Page hidden (mobile app switching), preserving connection');
    isAppInBackground = true;
    backgroundStartTime = Date.now();
    
    // Send background heartbeat
    if (socket.connected) {
      socket.emit('backgroundHeartbeat', { 
        lobbyCode: currentLobbyCode,
        timestamp: backgroundStartTime 
      });
    }
  }
});

window.addEventListener('pageshow', (event) => {
  if (isAppInBackground && currentLobbyCode) {
    const backgroundDuration = Date.now() - backgroundStartTime;
    console.log(`🔄 Page shown (returned from mobile app switching) after ${Math.round(backgroundDuration / 1000)}s`);
    isAppInBackground = false;
    
    // Check connection and reconnect if needed
    if (socket && !socket.connected) {
      attemptReconnection();
    } else if (socket && socket.connected) {
      socket.emit('foregroundHeartbeat', { 
        lobbyCode: currentLobbyCode,
        backgroundDuration: backgroundDuration 
      });
      reconnectionAttempts = 0;
    }
  }
});

// Improved reconnection logic
function attemptReconnection() {
  if (reconnectionAttempts >= maxReconnectionAttempts) {
    console.log('🔄 Max reconnection attempts reached, giving up');
    if (lobbyStatus) {
      lobbyStatus.textContent = 'Connection lost. Please refresh the page to rejoin.';
      lobbyStatus.style.color = '#ef4444';
    }
    return;
  }
  
  reconnectionAttempts++;
  console.log(`🔄 Reconnection attempt ${reconnectionAttempts}/${maxReconnectionAttempts}`);
  
  if (lobbyStatus) {
    lobbyStatus.textContent = `Reconnecting... (${reconnectionAttempts}/${maxReconnectionAttempts})`;
    lobbyStatus.style.color = '#f59e0b';
  }
  
  // Attempt to reconnect
  if (socket) {
    socket.connect();
    
    // Wait for connection or timeout
    const reconnectTimeout = setTimeout(() => {
      if (!socket.connected) {
        console.log('🔄 Reconnection attempt timed out, trying again...');
        setTimeout(() => attemptReconnection(), 2000); // Try again in 2 seconds
      }
    }, 5000); // 5 second timeout
    
    // Clear timeout if connection succeeds
    socket.once('connect', () => {
      clearTimeout(reconnectTimeout);
      console.log('🔄 Reconnection successful!');
      reconnectionAttempts = 0;
      
      // Rejoin lobby if we were in one
      if (currentLobbyCode) {
        socket.emit('rejoinLobby', currentLobbyCode);
        if (lobbyStatus) {
          lobbyStatus.textContent = `Reconnected to lobby ${currentLobbyCode}. Waiting for game to resume...`;
          lobbyStatus.style.color = '#10b981';
        }
      }
    });
  }
}

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
    
    // Clear any existing reconnection timer
    if (window.socketReconnectTimer) {
      clearTimeout(window.socketReconnectTimer);
    }
    
    window.socketReconnectTimer = setTimeout(() => {
      console.log('Reconnecting socket...');
      if (socket && !socket.connected) {
        socket.connect();
      }
      window.socketReconnectTimer = null;
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
