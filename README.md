# 🎮 Dots and Boxes 2D Board Game v2.0.0

A modern, feature-rich implementation of the classic Dots and Boxes game with AI opponent, online multiplayer, and enhanced gameplay mechanics. Built with HTML5 Canvas, JavaScript, Node.js, and Socket.IO for real-time multiplayer functionality.

## 🎯 Game Modes

### 🎮 Single Player vs AI
- Play against an intelligent AI opponent
- AI uses strategic thinking to complete squares and block your moves
- Perfect for solo practice and skill development

### 👥 Two Players (Local)
- Play with a friend on the same device
- Customizable player names
- Real-time turn switching and score tracking

### 🌐 Online Multiplayer
- Create or join lobbies with unique 6-character codes
- Real-time synchronization between players
- Cross-platform compatibility (Desktop & Mobile)

## 🎲 Core Features

### 🎲 Dice System
- Roll dice at the start of each turn to determine lines you can draw
- Dice values 1-5: Draw that many lines during your turn
- Rolling a 6: Grants a "Special Line" that can be used anytime
- Special Line: Can be used even when you run out of regular lines

### 🎨 Enhanced Gameplay
- **Smooth Line Drawing**: Click and drag to draw lines smoothly
- **Visual Feedback**: See preview while drawing lines
- **Player Symbols**: Completed squares show X (Player 1) or O (Player 2)
- **Score Tracking**: Real-time score updates for both players
- **Turn Indicators**: Clear display of current player's turn
- **Special Line Indicator**: Shows when special line is available

### 🏆 Winning Conditions
- **Normal Win**: Player with most squares when all lines are drawn
- **Early Win**: Player who completes more than 50% of total squares wins immediately
- **Tie Game**: If scores are equal when game ends

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd dots-and-boxes
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open [http://localhost:8000](http://localhost:8000) in your browser

## 🛠️ Technology Stack

- **Frontend**: HTML5 Canvas, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Real-time Communication**: Socket.IO
- **Styling**: Custom CSS with responsive design
- **Audio**: Web Audio API for dice roll sounds

## 📁 Project Structure

```
dots-and-boxes/
├── server.js              # Express server with Socket.IO
├── package.json           # Project dependencies and scripts
├── index.html            # Main game interface
├── public/
│   ├── css/
│   │   └── styles.css    # Game styling and responsive design
│   ├── js/
│   │   ├── game.js       # Core game logic and AI
│   │   └── online.js     # Online multiplayer functionality
│   └── assets/
│       └── dice-roll.wav # Dice roll sound effect
└── README.md             # This file
```

## 🎯 Game Rules

### Basic Gameplay
1. Players take turns drawing horizontal or vertical lines between adjacent dots
2. Complete the fourth side of a square to claim it and earn 1 point
3. Completing a square does NOT grant an extra turn
4. The game ends when all possible lines are drawn
5. Player with the most completed squares wins!

### Dice Mechanics
- Roll the dice at the start of your turn
- Dice values 1-5: Draw that many lines during your turn
- Rolling a 6: Grants a "Special Line" that can be used anytime
- Special Line: Can be used even when you run out of regular lines
- Special Line Limit: You can only hold one special line at a time

### Strategy Tips
- Try to complete squares while preventing your opponent from doing the same
- Use your special line strategically - save it for crucial moments
- Plan ahead and think about which lines will benefit you most
- Watch your opponent's moves to understand their strategy

## 🌟 Key Features

### 🎮 Game Modes
- ✅ Single Player vs AI
- ✅ Two Players (Local)
- ✅ Online Multiplayer

### 🎲 Game Mechanics
- ✅ Dice-based line drawing system
- ✅ Special line mechanics
- ✅ Square completion detection
- ✅ Real-time score tracking
- ✅ Turn management

### 🎨 User Experience
- ✅ Smooth line drawing with mouse/touch
- ✅ Visual feedback and previews
- ✅ Responsive design for all devices
- ✅ Cross-platform compatibility
- ✅ Real-time multiplayer synchronization

### 🛡️ Technical Features
- ✅ Comprehensive error handling
- ✅ Canvas optimization
- ✅ Event handling optimization
- ✅ Memory management
- ✅ Browser compatibility

## 🚀 Deployment

### Local Development
```bash
npm start
```

### Production Deployment
1. Set up your Node.js server
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Configure your domain to point to port 8000

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Developer

**Developer:** Vishal Maurya  
**Version:** 2.0.0  
**Organization:** TBD

## 🎯 Game Benefits

- Enhances strategic thinking and planning
- Improves focus and concentration
- Develops spatial reasoning skills
- Provides engaging multiplayer experience
- Accessible to players of all ages

---

**Enjoy the game and challenge your mind!** 🧠✨ 