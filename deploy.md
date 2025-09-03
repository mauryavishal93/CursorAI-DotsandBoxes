# 🚀 Deployment Guide for Dots and Boxes Game

## Option 1: Deploy to Heroku (Free)

### Prerequisites:
1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Create a Heroku account: https://signup.heroku.com/

### Steps:

1. **Login to Heroku:**
   ```bash
   heroku login
   ```

2. **Create a new Heroku app:**
   ```bash
   heroku create your-dots-and-boxes-game
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set DEFAULT_LUCKY_WHEEL_ENABLED=true
   ```

4. **Deploy to Heroku:**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

5. **Open your deployed app:**
   ```bash
   heroku open
   ```

## Option 2: Deploy to Vercel (Free)

### Steps:

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Follow the prompts and your app will be deployed!**

## Option 3: Deploy to Railway (Free)

### Steps:

1. **Go to:** https://railway.app/
2. **Connect your GitHub repository**
3. **Railway will automatically detect Node.js and deploy**

## Option 4: Deploy to Render (Free)

### Steps:

1. **Go to:** https://render.com/
2. **Connect your GitHub repository**
3. **Select "Web Service"**
4. **Configure:**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`

## Environment Variables for Production:

```bash
NODE_ENV=production
PORT=3000
DEFAULT_LUCKY_WHEEL_ENABLED=true
```

## MongoDB Setup (Optional):

For persistent data storage, you can:
1. Use MongoDB Atlas (free tier available)
2. Set `MONGODB_URI` environment variable
3. Or keep using in-memory storage (data resets on restart)

## Quick Deploy Commands:

```bash
# For Heroku
npm run deploy:enhanced

# For Vercel
vercel --prod

# For Railway
railway up
```
