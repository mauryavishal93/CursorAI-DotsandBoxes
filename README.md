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

## 📋 Changelog

### Version 2.2.0 (Current)
- **Enhanced Lucky Draw System**: Improved Lucky Wheel mechanics with clear outcome descriptions
- **Fixed Game Logic**: Resolved button clickability issues and canvas context initialization
- **Improved UI**: Better arrow pointer positioning and result highlighting on the wheel
- **Bug Fixes**: Fixed result calculation to ensure equal probability for all Lucky Wheel outcomes
- **Code Optimization**: Improved canvas context management and event handling

### Version 2.1.0
- **Lucky Draw Wheel**: Added spinning wheel for Two Players mode on dice roll 6
- **Enhanced Gameplay**: Multiple random effects including extra lines, turn skips, and bonus rolls
- **Improved UI**: Better visual feedback and responsive design
- **Bug Fixes**: Various gameplay and UI improvements

### Version 2.0.0
- **Three Game Modes**: Single Player, Two Players, and Online Multiplayer
- **AI Opponent**: Intelligent AI with strategic gameplay
- **Online Multiplayer**: Real-time multiplayer with lobby system
- **Enhanced Graphics**: Smooth line drawing and visual effects

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

## Game Rules (v2.2.0)

### Lucky Draw (Two Players only)
- When a player rolls a 6 in Two Players mode, a Lucky Draw spinning wheel appears with random effects:
  - **"Bonus stroke! +1 line"** - Player gets 1 extra line to draw immediately
  - **"Double down! Roll again (adds)"** - Player gets an extra dice roll after finishing current lines
  - **"Oops! Your turn just vanished"** - Player's remaining lines are set to 0, turn passes immediately
  - **"Sneak attack! Opponent skips"** - Opponent's next turn will be skipped
  - **"Better Luck Next time."** - No effect (appears multiple times on the wheel)

**Important Notes:**
- Lucky Wheel can only be triggered once per turn (even with extra rolls)
- Extra rolls from "Double down" are granted after completing current lines
- Turn skipping effects apply on the next turn cycle

### Core Gameplay Features
- **Dice Rolling System** - Roll dice to determine how many lines you can draw
- **Special Line Feature** - Rolling a 1 grants a special line (when >5 boxes remain)
- **Square Completion** - Complete squares to earn points and continue your turn
- **Turn Management** - Turn switches when you run out of lines to draw
- **AI Opponent** - Intelligent AI in Single Player mode with strategic gameplay

### Game Modes
- **Single Player** - Play against an intelligent AI opponent
- **Two Players** - Local multiplayer with Lucky Draw wheel on dice roll 6
- **Online Multiplayer** - Real-time online play with lobby system

### Popups & Messages
- **Special Line!** — You rolled a 1 and have a special line available (if >5 boxes left)
- **Special Line Ended!** — No one will get special lines for dice roll 1 anymore (when 5 boxes left)
- **Game Over!** — Shown when the game ends
- **Roll the Dice First!** — Shown if you try to draw a line before rolling the dice
- **Special Line Used!** — Shown when you use your special line
- **Lucky Draw Messages** — Various messages for Lucky Wheel outcomes
- Game Start! — Shown at the start of the game.

### Version
- Current version/tag: **2.2.0**

### Basic Gameplay
1. Players take turns drawing horizontal or vertical lines between adjacent dots
2. Complete the fourth side of a square to claim it and earn 1 point
3. Completing a square does NOT grant an extra turn
4. The game ends when all possible lines are drawn
5. Player with the most completed squares wins!

### Dice Mechanics
- Roll the dice at the start of your turn
- Dice values 1-5: Draw that many lines during your turn
- Rolling a 6 (Two Players only): Triggers the Lucky Draw wheel
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