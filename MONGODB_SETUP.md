# MongoDB Atlas Setup Guide

## Quick Setup for Dots and Boxes Game

### Option 1: Use the provided MongoDB Atlas cluster (Recommended)

The game is already configured to use a MongoDB Atlas cluster. Just start the server:

```bash
npm start
```

### Option 2: Set up your own MongoDB Atlas cluster

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account

2. **Create a Cluster**
   - Click "Build a Database"
   - Choose "FREE" tier (M0)
   - Select a cloud provider and region
   - Click "Create"

3. **Set up Database Access**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Create a username and password
   - Set privileges to "Read and write to any database"

4. **Set up Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)

5. **Get Connection String**
   - Go to "Database" in the left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `dots-and-boxes`

6. **Set Environment Variable**
   ```bash
   # Windows PowerShell
   $env:MONGODB_URI="your_connection_string_here"
   
   # Windows Command Prompt
   set MONGODB_URI=your_connection_string_here
   
   # Linux/Mac
   export MONGODB_URI="your_connection_string_here"
   ```

### Option 3: Use Local MongoDB

1. **Install MongoDB Community Server**
   - Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - Install and start the MongoDB service

2. **Start the server**
   ```bash
   npm start
   ```

## Testing the Setup

Once MongoDB is connected, you can:

1. **Create a user account** - Register with email, username, and password
2. **Login as guest** - Play without registration (temporary account created)
3. **View user stats** - Track games played, wins, and scores

## Troubleshooting

- **Connection timeout**: Check your internet connection and MongoDB Atlas cluster status
- **Authentication failed**: Verify your database username and password
- **Network access denied**: Ensure your IP is whitelisted in MongoDB Atlas
- **Database not found**: The database will be created automatically when first user registers

## Features

- ✅ User registration and login
- ✅ Guest account creation with temporary usernames
- ✅ Game statistics tracking
- ✅ Session management
- ✅ Password hashing
- ✅ JWT authentication
