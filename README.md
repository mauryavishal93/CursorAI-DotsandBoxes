# Dots and Boxes 2D Board Game v2.3.0

A modern, feature-rich implementation of the classic Dots and Boxes game with AI opponent, online multiplayer, and enhanced gameplay mechanics. Built with HTML5 Canvas, JavaScript, Node.js, and Socket.IO for real-time multiplayer functionality.

## 🎯 Game Modes

### 🎮 Single Player vs AI
- Play against an intelligent AI opponent with enhanced behavior
- AI automatically handles dice rolling, Lucky Wheel spinning, and line drawing
- **NEW**: AI Message Box auto-closes after 2.4 seconds for better UX
- **NEW**: AI Lucky Wheel auto-spins and auto-closes with proper timing
- **NEW**: AI turn management follows proper sequence: wheel close → message close → line drawing
- Perfect for solo practice and skill development

### 👥 Two Players (Local)
- Play with a friend on the same device
- Customizable player names
- Real-time turn switching and score tracking
- **NEW**: Enhanced Lucky Wheel system with all outcomes working properly
- **NEW**: Proper turn switching after Lucky Wheel outcomes

### 🌐 Online Multiplayer
- Create or join lobbies with unique 6-character codes
- Real-time synchronization between players
- Cross-platform compatibility (Desktop & Mobile)

## 🎲 Core Features

### 🎲 Enhanced Dice System
- **NEW**: Dice now rolls random values 1-6 for dynamic gameplay
- Rolling a 6: Triggers the Lucky Draw wheel in Single Player and Two Player modes only
- **IMPORTANT**: Lucky Wheel can only be triggered once per turn (even with extra rolls)
- This rule applies to ALL outcomes including Lightning Strike, Poof, and others

### 🎛️ Lucky Wheel Deployment Configuration
- **NEW**: Lucky Draw wheel can be enabled/disabled during app deployment
- **Deployment Control**: Set via configuration parameter (not user-controllable)
- **Visual Feedback**: Status indicators show current Lucky Wheel state
- **Classic Mode**: When disabled, game plays without Lucky Wheel (dice roll 6 = normal 6 lines)

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

### Version 2.3.0 (Current) - Major Enhancements
- **🎲 Random Dice Values**: Dice now rolls random values 1-6 for dynamic gameplay
- **🎛️ Lucky Wheel Deployment Configuration**: 
  - Lucky Draw wheel can be enabled/disabled during app deployment
  - Deployment-only setting (not user-controllable)
  - Visual status indicators show current Lucky Wheel state
- **🎯 Enhanced Lucky Wheel System**: 
  - Works in ALL game modes (Single Player, Two Players, Online)
  - All outcomes properly implemented and tested
  - "Once per turn" rule strictly enforced for all outcomes
- **🤖 Improved AI Behavior**:
  - AI Message Box auto-closes after 2.4 seconds for better UX
  - AI Lucky Wheel auto-spins and auto-closes with proper timing
  - AI turn management follows correct sequence: wheel close → message close → line drawing
  - AI properly handles all Lucky Wheel outcomes including "Poof! Turn vanished"
- **⚡ Lightning Strike Enhancement**: Lightning Strike case properly respects "once per turn" rule
- **🔄 Turn Management Fixes**: Proper turn switching after Lucky Wheel outcomes in all modes
- **⏱️ Timing Optimizations**: 
  - Wheel shows result for 1.5 seconds
  - Message box auto-closes after 2.4 seconds
  - AI actions start after 2.45 seconds (ensuring proper sequence)
- **🐛 Bug Fixes**: 
  - Fixed Lucky Wheel not working in Single Player mode
  - Fixed turn switching issues after AI turns
  - Fixed "Double Trouble" extra roll functionality
  - Fixed all Lucky Wheel outcomes working properly

### Version 2.2.0
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

## 🎮 Game Rules (v2.3.0)

### 🎲 Lucky Draw System (All Modes)
- **Trigger**: When a player rolls a 6 (hardcoded value) in ANY mode
- **Wheel Outcomes**:
  - **"🎯 Bullseye! +1 line"** - Player gets 1 extra line to draw immediately
  - **"🎲 Double Trouble! Roll again"** - Player gets an extra dice roll after finishing current lines  
  - **"💨 Poof! Turn vanished"** - Player's remaining lines are set to 0, turn passes immediately
  - **"⚡ Lightning Strike! Skip opponent"** - Opponent's next turn will be skipped
  - **"🤞 Better Luck Next time."** - No effect (appears multiple times on the wheel)

**CRITICAL RULES:**
- ✅ **Lucky Wheel can only be triggered ONCE per turn** (even with extra rolls)
- ✅ **This rule applies to ALL outcomes** including Lightning Strike, Poof, and others
- ✅ **Works consistently in ALL game modes** (Single Player, Two Players, Online)
- ✅ **Extra rolls from "Double Trouble" are granted after completing current lines**
- ✅ **Turn skipping effects apply on the next turn cycle**

### 🎮 Single Player Mode Enhancements
- **AI Behavior**: AI automatically handles all game actions
- **Lucky Wheel**: AI auto-spins and auto-closes the wheel
- **Message Timing**: AI message boxes auto-close after 2.4 seconds
- **Turn Sequence**: AI follows proper sequence: wheel close → message close → line drawing
- **Outcome Handling**: AI properly handles all Lucky Wheel outcomes including turn vanishing

### 🎮 Two Player Mode Enhancements
- **Lucky Wheel**: Both players can trigger the wheel on dice roll 6
- **Turn Management**: Proper turn switching after all Lucky Wheel outcomes
- **Extra Rolls**: "Double Trouble" extra rolls work correctly for both players
- **Consistent Behavior**: All outcomes work the same as in Single Player mode

### 🎲 Core Gameplay Features
- **Dice Rolling System** - Roll dice to determine how many lines you can draw
- **Special Line Feature** - Rolling a 1 grants a special line (when >5 boxes remain)
- **Square Completion** - Complete squares to earn points and continue your turn
- **Turn Management** - Turn switches when you run out of lines to draw
- **AI Opponent** - Intelligent AI in Single Player mode with strategic gameplay

### 🎮 Game Modes
- **Single Player** - Play against an intelligent AI opponent with enhanced Lucky Draw wheel
- **Two Players** - Local multiplayer with full Lucky Draw wheel functionality
- **Online Multiplayer** - Real-time online play with lobby system

### 📱 Popups & Messages
- **Special Line!** — You rolled a 1 and have a special line available (if >5 boxes left)
- **Special Line Ended!** — No one will get special lines for dice roll 1 anymore (when 5 boxes left)
- **Game Over!** — Shown when the game ends
- **Roll the Dice First!** — Shown if you try to draw a line before rolling the dice
- **Special Line Used!** — Shown when you use your special line
- **Lucky Draw Messages** — Various messages for Lucky Wheel outcomes
- **Game Start!** — Shown at the start of the game

### 🎲 Dice Mechanics
- **Random Values**: Dice rolls random values 1-6 for dynamic gameplay
- **Lucky Wheel Trigger**: Rolling a 6 triggers the Lucky Draw wheel in Single Player and Two Player modes only
- **Special Line Limit**: You can only hold one special line at a time
- **Turn-based Rolling**: Roll dice at the start of each turn

### 🎯 Strategy Tips
- Try to complete squares while preventing your opponent from doing the same
- Use your special line strategically - save it for crucial moments
- Plan ahead and think about which lines will benefit you most
- Watch your opponent's moves to understand their strategy
- **NEW**: Use Lucky Wheel outcomes strategically - they can turn the tide of the game!

## 🌟 Key Features

### 🎮 Game Modes
- ✅ Single Player vs AI (Enhanced)
- ✅ Two Players (Local) (Enhanced)
- ✅ Online Multiplayer

### 🎲 Game Mechanics
- ✅ Hardcoded dice value (6) for consistent Lucky Wheel triggers
- ✅ Enhanced Lucky Draw wheel system (ALL modes)
- ✅ "Once per turn" rule strictly enforced
- ✅ All Lucky Wheel outcomes working properly
- ✅ Enhanced AI behavior and timing
- ✅ Proper turn management and switching
- ✅ Square completion detection
- ✅ Real-time score tracking

### 🎨 User Experience
- ✅ Smooth line drawing with mouse/touch
- ✅ Visual feedback and previews
- ✅ Responsive design for all devices
- ✅ Cross-platform compatibility
- ✅ Real-time multiplayer synchronization
- ✅ Enhanced AI timing and behavior
- ✅ Consistent Lucky Wheel experience across all modes

### 🛡️ Technical Features
- ✅ Comprehensive error handling
- ✅ Canvas optimization
- ✅ Event handling optimization
- ✅ Memory management
- ✅ Browser compatibility
- ✅ Enhanced timing controls
- ✅ Robust turn management system

## 🧪 Testing & Quality Assurance

### ✅ Tested Features
- **Single Player Mode**: All Lucky Wheel outcomes, AI behavior, turn management
- **Two Player Mode**: All Lucky Wheel outcomes, turn switching, extra rolls
- **Lucky Wheel System**: All outcomes working correctly, "once per turn" rule enforced
- **AI Behavior**: Proper timing, sequence, and outcome handling
- **Turn Management**: Correct switching after all Lucky Wheel outcomes
- **Cross-mode Consistency**: Same behavior in Single Player and Two Player modes

### 🔧 Technical Improvements
- **Code Quality**: Enhanced error handling and logging
- **Performance**: Optimized timing and state management
- **User Experience**: Better AI behavior and message timing
- **Reliability**: Robust turn management and outcome handling

## 🚀 Deployment

### 🎛️ Lucky Wheel Deployment Configuration

The Lucky Wheel feature can be enabled or disabled during deployment using command-line arguments:

#### **Method 1: Direct Command Line**
```bash
# Enable Lucky Wheel (Enhanced Mode)
npm start DEFAULT_LUCKY_WHEEL_ENABLED=true

# Disable Lucky Wheel (Classic Mode)
npm start DEFAULT_LUCKY_WHEEL_ENABLED=false
```

#### **Method 2: Convenient Scripts**
```bash
# Enable Lucky Wheel
npm run start:lucky-wheel-on
npm run deploy:enhanced

# Disable Lucky Wheel
npm run start:lucky-wheel-off
npm run deploy:classic
```

#### **Method 3: Custom Value**
```bash
# Any custom configuration
npm start DEFAULT_LUCKY_WHEEL_ENABLED=true
npm start DEFAULT_LUCKY_WHEEL_ENABLED=false
```

**Note**: This is a deployment-only setting. Players cannot change this during gameplay - it's controlled entirely by the deployment configuration.

#### **Server Configuration Endpoint**
The server provides a configuration endpoint at `/api/config` that returns the current Lucky Wheel setting:
```json
{
  "DEFAULT_LUCKY_WHEEL_ENABLED": true,
  "message": "Lucky Wheel is ENABLED for this deployment"
}
```

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
**Version:** 2.3.0  
**Organization:** TBD

## 🎯 Game Benefits

- Enhances strategic thinking and planning
- Improves focus and concentration
- Develops spatial reasoning skills
- Provides engaging multiplayer experience
- **NEW**: Enhanced Lucky Wheel system adds excitement and unpredictability
- **NEW**: Improved AI opponent provides better solo practice experience
- Accessible to players of all ages

---

**Enjoy the enhanced game with all the new Lucky Wheel features and improved AI behavior!** 🧠✨🎁 