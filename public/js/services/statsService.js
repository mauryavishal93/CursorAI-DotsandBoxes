/**
 * Statistics Service for handling user stats, leaderboards, and score graphs
 */
class StatsService {
  constructor() {
    this.socket = null;
    this.currentUserStats = null;
    this.leaderboard = null;
    this.scoreChart = null;
  }

  /**
   * Initialize the service with socket connection
   * @param {Socket} socket - Socket.IO connection
   */
  initialize(socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  /**
   * Setup socket event listeners for stats updates
   */
  setupSocketListeners() {
    if (!this.socket) return;

    // Listen for stats updates after games
    this.socket.on('statsUpdated', (data) => {
      console.log('📊 Stats updated:', data);
      this.currentUserStats = data.stats;
      this.displayStatsUpdate(data);
      this.refreshCurrentUserStats();
    });

    // Listen for game result processing
    this.socket.on('gameResultProcessed', (data) => {
      console.log('🎮 Game result processed:', data);
      this.showGameResultNotification(data);
    });
  }

  /**
   * Fetch user statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats(userId) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.socket.emit('getUserStats', { userId }, (response) => {
        if (response.success) {
          this.currentUserStats = response.user;
          resolve(response);
        } else {
          reject(new Error(response.error || 'Failed to fetch user stats'));
        }
      });
    });
  }

  /**
   * Fetch leaderboard
   * @param {number} limit - Number of users to fetch
   * @param {string} sortBy - Sort field (points, wins, highestStreak, winRate)
   * @returns {Promise<Object>} Leaderboard data
   */
  async getLeaderboard(limit = 10, sortBy = 'points') {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.socket.emit('getLeaderboard', { limit, sortBy }, (response) => {
        if (response.success) {
          this.leaderboard = response.leaderboard;
          resolve(response);
        } else {
          reject(new Error(response.error || 'Failed to fetch leaderboard'));
        }
      });
    });
  }

  /**
   * Fetch platform statistics
   * @returns {Promise<Object>} Platform statistics
   */
  async getPlatformStats() {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.socket.emit('getPlatformStats', (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Failed to fetch platform stats'));
        }
      });
    });
  }

  /**
   * Fetch recent games for a specific user
   * @param {number} limit - Number of games to fetch
   * @param {string} userId - User ID to filter games for (optional, if not provided gets all games)
   * @returns {Promise<Object>} Recent games data
   */
  async getRecentGames(limit = 20, userId = null) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      const requestData = { limit };
      if (userId) {
        requestData.userId = userId;
      }

      this.socket.emit('getRecentGames', requestData, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Failed to fetch recent games'));
        }
      });
    });
  }

  /**
   * Reset user statistics (admin only)
   * @param {string} userId - User ID to reset
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Reset result
   */
  async resetUserStats(userId, adminId) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.socket.emit('resetUserStats', { userId, adminId }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Failed to reset user stats'));
        }
      });
    });
  }

  /**
   * Display stats update notification
   * @param {Object} data - Stats update data
   */
  displayStatsUpdate(data) {
    const { stats, gameResult } = data;
    
    if (gameResult) {
      const message = gameResult.won ? 
        `🎉 You won! +${gameResult.pointsChange} points` :
        `😔 You lost. ${gameResult.pointsChange} points`;
      
      this.showNotification(message, gameResult.won ? 'success' : 'info');
    }

    // Update any visible stats displays
    this.updateStatsDisplays(stats);
  }

  /**
   * Show game result notification
   * @param {Object} data - Game result data
   */
  showGameResultNotification(data) {
    // No-op: winner popup is handled by game UI; skip generic info popup
    return;
  }

  /**
   * Show notification to user
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info)
   */
  showNotification(message, type = 'info') {
    // Use existing message box system if available
    if (typeof showMessage === 'function') {
      const title = type === 'success' ? 'Success!' : 
                   type === 'error' ? 'Error!' : 'Information';
      showMessage(title, message);
    } else {
      // Fallback to console
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Update visible statistics displays
   * @param {Object} stats - User statistics
   */
  updateStatsDisplays(stats) {
    // Update profile stats if visible
    const profileStats = document.querySelectorAll('.profile-stats');
    profileStats.forEach(element => {
      this.updateProfileStatsElement(element, stats);
    });

    // Update leaderboard if user is visible
    this.updateLeaderboardUserEntry(stats);
  }

  /**
   * Update profile stats element
   * @param {Element} element - Profile stats element
   * @param {Object} stats - User statistics
   */
  updateProfileStatsElement(element, stats) {
    const pointsElement = element.querySelector('.points-value');
    const winsElement = element.querySelector('.wins-value');
    const lossesElement = element.querySelector('.losses-value');
    const streakElement = element.querySelector('.streak-value');
    const winRateElement = element.querySelector('.winrate-value');

    if (pointsElement) pointsElement.textContent = stats.points || 0;
    if (winsElement) winsElement.textContent = stats.wins || 0;
    if (lossesElement) lossesElement.textContent = stats.losses || 0;
    if (streakElement) streakElement.textContent = stats.currentStreak || 0;
    if (winRateElement) winRateElement.textContent = `${stats.winRate || 0}%`;
  }

  /**
   * Update user entry in leaderboard
   * @param {Object} stats - User statistics
   */
  updateLeaderboardUserEntry(stats) {
    const leaderboardRows = document.querySelectorAll('.leaderboard-row');
    leaderboardRows.forEach(row => {
      const username = row.querySelector('.username')?.textContent;
      if (username === stats.username) {
        this.updateLeaderboardRow(row, stats);
      }
    });
  }

  /**
   * Update leaderboard row
   * @param {Element} row - Leaderboard row element
   * @param {Object} stats - User statistics
   */
  updateLeaderboardRow(row, stats) {
    const pointsElement = row.querySelector('.points');
    const winsElement = row.querySelector('.wins');
    const streakElement = row.querySelector('.streak');

    if (pointsElement) pointsElement.textContent = stats.points || 0;
    if (winsElement) winsElement.textContent = stats.wins || 0;
    if (streakElement) streakElement.textContent = stats.currentStreak || 0;
  }

  /**
   * Create score history chart
   * @param {string} canvasId - Canvas element ID
   * @param {Array} scoreHistory - Score history data
   */
  createScoreChart(canvasId, scoreHistory) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error('Canvas element not found:', canvasId);
      return;
    }

    const ctx = canvas.getContext('2d');
    
    // Clear previous chart
    if (this.scoreChart) {
      this.scoreChart.destroy();
    }

    // Prepare data
    const labels = scoreHistory.map(entry => {
      const date = new Date(entry.timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    });
    
    const points = scoreHistory.map(entry => entry.points);
    
    const chartData = {
      labels: labels,
      datasets: [{
        label: 'Points',
        data: points,
        borderColor: '#4A90E2',
        backgroundColor: 'rgba(74, 144, 226, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#4A90E2',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };

    const config = {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Score History',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Points'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Time'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              maxTicksLimit: 8
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        hover: {
          mode: 'nearest',
          intersect: false
        }
      }
    };

    // Create chart (requires Chart.js library)
    if (typeof Chart !== 'undefined') {
      this.scoreChart = new Chart(ctx, config);
    } else {
      console.warn('Chart.js library not loaded. Score chart cannot be displayed.');
      this.createFallbackChart(canvas, scoreHistory);
    }
  }

  /**
   * Create fallback chart without Chart.js
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Array} scoreHistory - Score history data
   */
  createFallbackChart(canvas, scoreHistory) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (scoreHistory.length < 2) {
      ctx.fillStyle = '#666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Not enough data for chart', width / 2, height / 2);
      return;
    }

    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    const points = scoreHistory.map(entry => entry.points);
    const minPoints = Math.min(...points);
    const maxPoints = Math.max(...points);
    const pointRange = maxPoints - minPoints || 1;
    
    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(padding, padding, chartWidth, chartHeight);
    
    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }
    
    // Draw line
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < points.length; i++) {
      const x = padding + (chartWidth / (points.length - 1)) * i;
      const y = padding + chartHeight - ((points[i] - minPoints) / pointRange) * chartHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = '#4A90E2';
    for (let i = 0; i < points.length; i++) {
      const x = padding + (chartWidth / (points.length - 1)) * i;
      const y = padding + chartHeight - ((points[i] - minPoints) / pointRange) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Min: ${minPoints}`, padding, height - 10);
    ctx.fillText(`Max: ${maxPoints}`, width - padding, height - 10);
  }

  /**
   * Refresh current user stats display
   */
  // async refreshCurrentUserStats() {
  //   if (!this.currentUserStats) return;
    
  //   try {
  //     const response = await this.getUserStats(this.currentUserStats._id || this.currentUserStats.userId);
  //     this.updateStatsDisplays(response.user);
      
  //     // Update score chart if visible
  //     const scoreCanvas = document.getElementById('scoreChart');
  //     if (scoreCanvas && response.scoreHistory) {
  //       this.createScoreChart('scoreChart', response.scoreHistory);
  //     }
  //   } catch (error) {
  //     console.error('Error refreshing user stats:', error);
  //   }
  // }
  async refreshCurrentUserStats() {
    if (!this.currentUserStats) {
      console.warn("No currentUserStats available, skipping refresh.");
      return;
    }
  
    try {
      const userId = this.currentUserStats._id || this.currentUserStats.userId;
      if (!userId) {
        console.warn("No user ID in currentUserStats:", this.currentUserStats);
        return; // Prevent the server error
      }
  
      const response = await this.getUserStats(userId);
  
      if (response && response.user) {
        this.updateStatsDisplays(response.user);
      }
  
      // Update score chart if visible
      const scoreCanvas = document.getElementById('scoreChart');
      if (scoreCanvas && Array.isArray(response.scoreHistory)) {
        this.createScoreChart('scoreChart', response.scoreHistory);
      }
    } catch (error) {
      console.error('Error refreshing user stats:', error);
    }
  }
  /**
   * Format number with commas
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Format date for display
   * @param {string|Date} date - Date to format
   * @returns {string} Formatted date
   */
  formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
}

// Create global instance
window.statsService = new StatsService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatsService;
}
