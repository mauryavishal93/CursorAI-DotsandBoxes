# Dots and Boxes 2D Board Game

A 2-player web game with a 5x5 board, dice rolling, and square claiming mechanics. Players take turns rolling a dice (1-6) and drawing lines to connect dots. Completing a square claims it for the player ("X" or "O"). The player with more than 50% of the squares wins. Includes player names, score tracking, and a restart button.

## Features
- 5x5 board (6x6 dots)
- Dice roll determines number of lines per turn
- Click or drag to draw lines between adjacent dots
- "X" or "O" marks for claimed squares
- Player names and score display
- Restart button

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   node server.js
   ```
3. Open [http://localhost:4000](http://localhost:4000) in your browser.

## Project Structure
- `server.js`: Express server
- `public/`: Frontend files (HTML, CSS, JS) 