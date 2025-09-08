import { BaseComponent } from './BaseComponent.js';

export class AuthModal extends BaseComponent {
  constructor(modalId) {
    super(modalId);
    this.currentMode = 'login'; // 'login', 'register', 'guest'
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Close modal when clicking outside
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.hide();
      }
    });

    // Close modal with escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.element.style.display === 'block') {
        this.hide();
      }
    });
  }

  show(mode = 'login') {
    this.currentMode = mode;
    this.updateContent();
    this.element.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  hide() {
    this.element.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
    this.clearForm();
  }

  updateContent() {
    const modalContent = this.element.querySelector('.modal-content');
    
    switch (this.currentMode) {
      case 'login':
        modalContent.innerHTML = this.getLoginHTML();
        break;
      case 'register':
        modalContent.innerHTML = this.getRegisterHTML();
        break;
      case 'guest':
        modalContent.innerHTML = this.getGuestHTML();
        break;
    }

    this.setupFormEventListeners();
  }

  getLoginHTML() {
    return `
      <div class="modal-header">
        <h2>Welcome Back!</h2>
        <span class="close" onclick="authModal.hide()">&times;</span>
      </div>
      <div class="modal-body">
        <form id="loginForm" class="auth-form">
          <div class="form-group">
            <label for="loginEmail">Email</label>
            <input type="email" id="loginEmail" name="email" required>
          </div>
          <div class="form-group">
            <label for="loginPassword">Password</label>
            <input type="password" id="loginPassword" name="password" required>
          </div>
          <button type="submit" class="btn btn-primary">Login</button>
        </form>
        <div class="auth-links">
          <p>Don't have an account? <a href="#" onclick="authModal.show('register')">Register</a></p>
          <p>Or <a href="#" onclick="authModal.show('guest')">play as guest</a></p>
        </div>
      </div>
    `;
  }

  getRegisterHTML() {
    return `
      <div class="modal-header">
        <h2>Create Account</h2>
        <span class="close" onclick="authModal.hide()">&times;</span>
      </div>
      <div class="modal-body">
        <form id="registerForm" class="auth-form">
          <div class="form-group">
            <label for="registerUsername">Username</label>
            <input type="text" id="registerUsername" name="username" required minlength="3" maxlength="20">
            <small>3-20 characters, letters, numbers, and underscores only</small>
          </div>
          <div class="form-group">
            <label for="registerEmail">Email</label>
            <input type="email" id="registerEmail" name="email" required>
          </div>
          <div class="form-group">
            <label for="registerPassword">Password</label>
            <input type="password" id="registerPassword" name="password" required minlength="6">
            <small>At least 6 characters</small>
          </div>
          <button type="submit" class="btn btn-primary">Create Account</button>
        </form>
        <div class="auth-links">
          <p>Already have an account? <a href="#" onclick="authModal.show('login')">Login</a></p>
          <p>Or <a href="#" onclick="authModal.show('guest')">play as guest</a></p>
        </div>
      </div>
    `;
  }

  getGuestHTML() {
    return `
      <div class="modal-header">
        <h2>Play as Guest</h2>
        <span class="close" onclick="authModal.hide()">&times;</span>
      </div>
      <div class="modal-body">
        <form id="guestForm" class="auth-form">
          <div class="form-group">
            <label for="guestUsername">Choose a Username</label>
            <input type="text" id="guestUsername" name="username" required minlength="3" maxlength="20">
            <small>3-20 characters, letters, numbers, and underscores only</small>
          </div>
          <button type="submit" class="btn btn-secondary">Play as Guest</button>
        </form>
        <div class="auth-links">
          <p>Want to save your progress? <a href="#" onclick="authModal.show('register')">Create Account</a></p>
          <p>Already have an account? <a href="#" onclick="authModal.show('login')">Login</a></p>
        </div>
        <div class="guest-info">
          <p><strong>Note:</strong> Guest accounts are temporary and won't save your game progress.</p>
        </div>
      </div>
    `;
  }

  setupFormEventListeners() {
    const forms = this.element.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit(form);
      });
    });
  }

  handleFormSubmit(form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Loading...';
    submitBtn.disabled = true;

    // Handle different form types
    switch (form.id) {
      case 'loginForm':
        this.handleLogin(data);
        break;
      case 'registerForm':
        this.handleRegister(data);
        break;
      case 'guestForm':
        this.handleGuest(data);
        break;
    }

    // Reset button state after a delay
    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }, 2000);
  }

  async handleLogin(data) {
    try {
      const result = await window.authService.login(data.email, data.password);
      
      if (result.success) {
        this.showSuccess('Login successful!');
        setTimeout(() => {
          this.hide();
          window.location.reload(); // Refresh to show authenticated state
        }, 1000);
      } else {
        this.showError(result.message);
      }
    } catch (error) {
      this.showError('Login failed. Please try again.');
    }
  }

  async handleRegister(data) {
    try {
      const result = await window.authService.register(data.username, data.email, data.password);
      
      if (result.success) {
        this.showSuccess('Account created successfully!');
        setTimeout(() => {
          this.hide();
          window.location.reload(); // Refresh to show authenticated state
        }, 1000);
      } else {
        this.showError(result.message);
      }
    } catch (error) {
      this.showError('Registration failed. Please try again.');
    }
  }

  async handleGuest(data) {
    try {
      const result = await window.authService.guestLogin(data.username);
      
      if (result.success) {
        this.showSuccess('Guest login successful!');
        setTimeout(() => {
          this.hide();
          window.location.reload(); // Refresh to show authenticated state
        }, 1000);
      } else {
        this.showError(result.message);
      }
    } catch (error) {
      this.showError('Guest login failed. Please try again.');
    }
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showMessage(message, type) {
    // Remove existing messages
    const existingMessage = this.element.querySelector('.auth-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create new message
    const messageEl = document.createElement('div');
    messageEl.className = `auth-message auth-message-${type}`;
    messageEl.textContent = message;

    // Insert message
    const modalBody = this.element.querySelector('.modal-body');
    modalBody.insertBefore(messageEl, modalBody.firstChild);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.remove();
      }
    }, 5000);
  }

  clearForm() {
    const forms = this.element.querySelectorAll('form');
    forms.forEach(form => form.reset());
    
    const messages = this.element.querySelectorAll('.auth-message');
    messages.forEach(message => message.remove());
  }
}

export default AuthModal;
