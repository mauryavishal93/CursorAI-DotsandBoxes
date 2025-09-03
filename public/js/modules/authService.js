export class AuthService {
  constructor() {
    this.currentUser = null;
    this.token = null;
    this.isAuthenticated = false;
    this.loadFromStorage();
  }

  // Load user data from localStorage
  loadFromStorage() {
    try {
      const userData = localStorage.getItem('dotsAndBoxesUser');
      const token = localStorage.getItem('dotsAndBoxesToken');
      
      if (userData && token) {
        this.currentUser = JSON.parse(userData);
        this.token = token;
        this.isAuthenticated = true;
      }
    } catch (error) {
      console.error('Error loading user data from storage:', error);
      this.clearStorage();
    }
  }

  // Save user data to localStorage
  saveToStorage(user, token) {
    try {
      localStorage.setItem('dotsAndBoxesUser', JSON.stringify(user));
      localStorage.setItem('dotsAndBoxesToken', token);
    } catch (error) {
      console.error('Error saving user data to storage:', error);
    }
  }

  // Clear user data from localStorage
  clearStorage() {
    localStorage.removeItem('dotsAndBoxesUser');
    localStorage.removeItem('dotsAndBoxesToken');
    this.currentUser = null;
    this.token = null;
    this.isAuthenticated = false;
  }

  // Register new user
  async register(username, email, password) {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (data.success) {
        this.currentUser = data.user;
        this.token = data.token;
        this.isAuthenticated = true;
        this.saveToStorage(data.user, data.token);
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error during registration' };
    }
  }

  // Login user
  async login(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        this.currentUser = data.user;
        this.token = data.token;
        this.isAuthenticated = true;
        this.saveToStorage(data.user, data.token);
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error during login' };
    }
  }

  // Guest login
  async guestLogin(username) {
    try {
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username })
      });

      const data = await response.json();

      if (data.success) {
        this.currentUser = data.user;
        this.token = data.token;
        this.isAuthenticated = true;
        this.saveToStorage(data.user, data.token);
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Guest login error:', error);
      return { success: false, message: 'Network error during guest login' };
    }
  }

  // Logout
  async logout() {
    try {
      if (this.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearStorage();
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isUserAuthenticated() {
    return this.isAuthenticated && this.currentUser !== null;
  }

  // Check if user is guest
  isGuest() {
    return this.currentUser && this.currentUser.isGuest;
  }

  // Get authorization header
  getAuthHeader() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }

  // Update user stats
  async updateStats(won, score) {
    try {
      const response = await fetch('/api/auth/update-stats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ won, score })
      });

      const data = await response.json();

      if (data.success) {
        this.currentUser.stats = data.stats;
        this.saveToStorage(this.currentUser, this.token);
        return { success: true, stats: data.stats };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Update stats error:', error);
      return { success: false, message: 'Network error updating stats' };
    }
  }

  // Validate token
  async validateToken() {
    try {
      if (!this.token) return false;

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        }
      });

      const data = await response.json();

      if (data.success) {
        this.currentUser = data.user;
        this.saveToStorage(data.user, this.token);
        return true;
      } else {
        this.clearStorage();
        return false;
      }
    } catch (error) {
      console.error('Token validation error:', error);
      this.clearStorage();
      return false;
    }
  }
}

export default AuthService;
