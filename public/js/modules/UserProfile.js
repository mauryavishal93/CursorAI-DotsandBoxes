import { BaseComponent } from './BaseComponent.js';

export class UserProfile extends BaseComponent {
  constructor(profileId) {
    super(profileId);
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Close profile when clicking outside
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.hide();
      }
    });

    // Close profile with escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.element.style.display === 'block') {
        this.hide();
      }
    });
  }

  show() {
    this.updateContent();
    this.element.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  hide() {
    this.element.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  updateContent() {
    const user = window.authService.getCurrentUser();
    
    if (!user) {
      this.hide();
      return;
    }

    const modalContent = this.element.querySelector('.modal-content');
    modalContent.innerHTML = this.getProfileHTML(user);
    this.setupProfileEventListeners();
  }

  getProfileHTML(user) {
    const stats = user.stats || {};
    const winRate = stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed * 100).toFixed(1) : 0;
    
    return `
      <div class="modal-header">
        <h2>User Profile</h2>
        <span class="close" onclick="userProfile.hide()">&times;</span>
      </div>
      <div class="modal-body">
        <div class="profile-info">
          <div class="profile-avatar">
            <div class="avatar-circle">
              ${user.username.charAt(0).toUpperCase()}
            </div>
            <div class="user-type-badge ${user.isGuest ? 'guest' : 'registered'}">
              ${user.isGuest ? 'Guest' : 'Registered'}
            </div>
          </div>
          <div class="profile-details">
            <h3>${user.username}</h3>
            <p class="user-email">${user.email}</p>
            <p class="member-since">Member since: ${new Date(stats.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div class="profile-stats">
          <h4>Game Statistics</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">${stats.gamesPlayed || 0}</div>
              <div class="stat-label">Games Played</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.gamesWon || 0}</div>
              <div class="stat-label">Games Won</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${winRate}%</div>
              <div class="stat-label">Win Rate</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.totalScore || 0}</div>
              <div class="stat-label">Total Score</div>
            </div>
          </div>
        </div>

        <div class="profile-actions">
          ${user.isGuest ? `
            <button class="btn btn-primary" onclick="userProfile.showUpgradeModal()">
              Create Account
            </button>
          ` : ''}
          <button class="btn btn-secondary" onclick="userProfile.logout()">
            Logout
          </button>
        </div>

        ${user.isGuest ? `
          <div class="guest-notice">
            <p><strong>Guest Account:</strong> Your progress won't be saved. Create an account to save your statistics and game progress.</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  setupProfileEventListeners() {
    // Any additional event listeners for profile actions
  }

  showUpgradeModal() {
    this.hide();
    window.authModal.show('register');
  }

  async logout() {
    try {
      await window.authService.logout();
      this.hide();
      window.location.reload(); // Refresh to show login state
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if server request fails
      window.authService.clearStorage();
      this.hide();
      window.location.reload();
    }
  }
}

export default UserProfile;
