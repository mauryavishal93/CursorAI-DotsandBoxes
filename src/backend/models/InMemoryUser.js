const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class InMemoryUser {
  constructor(data) {
    this._id = data._id || data.id || uuidv4();
    this.id = this._id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.isGuest = data.isGuest || false;
    this.gamesPlayed = data.gamesPlayed || 0;
    this.gamesWon = data.gamesWon || 0;
    this.totalScore = data.totalScore || 0;
    this.createdAt = data.createdAt || new Date();
    this.lastLogin = data.lastLogin || new Date();
    this.avatar = data.avatar || 'default-1';
  }

  async save() {
    // In memory storage - just return this instance
    return this;
  }

  async comparePassword(candidatePassword) {
    if (!candidatePassword) {
      throw new Error('Candidate password is required');
    }
    if (!this.password) {
      throw new Error('User password is not set');
    }
    return bcrypt.compare(candidatePassword, this.password);
  }

  getStats() {
    return {
      username: this.username,
      gamesPlayed: this.gamesPlayed,
      gamesWon: this.gamesWon,
      totalScore: this.totalScore,
      winRate: this.gamesPlayed > 0 ? (this.gamesWon / this.gamesPlayed * 100).toFixed(1) : 0,
      createdAt: this.createdAt,
      lastLogin: this.lastLogin,
      avatar: this.avatar
    };
  }

  async updateLastLogin() {
    this.lastLogin = new Date();
    return this;
  }

  async updateGameStats(won, score) {
    this.gamesPlayed += 1;
    if (won) this.gamesWon += 1;
    this.totalScore += score;
    return this;
  }

  static async findOne(query) {
    const users = InMemoryUser.getAllUsers();
    let userData = null;
    
    if (query.$or) {
      // Handle $or queries (for email or username)
      for (const condition of query.$or) {
        userData = users.find(u => u[Object.keys(condition)[0]] === condition[Object.keys(condition)[0]]);
        if (userData) break;
      }
    } else {
      // Handle simple queries
      const key = Object.keys(query)[0];
      const value = query[key];
      userData = users.find(u => u[key] === value);
    }
    
    // Return null if no user found
    if (!userData) return null;
    
    // Return as InMemoryUser instance to ensure methods are available
    return new InMemoryUser(userData);
  }

  static async findById(id) {
    const users = InMemoryUser.getAllUsers();
    const userData = users.find(u => u._id === id || u.id === id);
    
    // Return null if no user found
    if (!userData) return null;
    
    // Return as InMemoryUser instance to ensure methods are available
    return new InMemoryUser(userData);
  }

  static getAllUsers() {
    if (!global.inMemoryUsers) {
      global.inMemoryUsers = [];
    }
    return global.inMemoryUsers;
  }

  static async create(data) {
    // Hash password before creating user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);
    
    const userData = {
      ...data,
      password: hashedPassword,
      _id: uuidv4(),
      id: uuidv4()
    };
    
    const user = new InMemoryUser(userData);
    global.inMemoryUsers = global.inMemoryUsers || [];
    global.inMemoryUsers.push(user);
    
    return user;
  }

  static async deleteById(id) {
    if (!global.inMemoryUsers) {
      return false;
    }
    
    const initialLength = global.inMemoryUsers.length;
    global.inMemoryUsers = global.inMemoryUsers.filter(u => u._id !== id && u.id !== id);
    
    return global.inMemoryUsers.length < initialLength;
  }
}

module.exports = InMemoryUser;
