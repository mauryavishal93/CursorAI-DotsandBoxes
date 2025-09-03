# MongoDB Atlas Migration Guide

## Step 1: Create MongoDB Atlas Account and Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for a free account
3. Create a new cluster:
   - Choose **M0 Sandbox** (free tier)
   - Select a region close to your location
   - Name your cluster (e.g., "dots-and-boxes-cluster")

## Step 2: Configure Database Access

### Create Database User
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and strong password
5. Give the user "Read and write to any database" privileges

### Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. For development: Add "0.0.0.0/0" (allow access from anywhere)
4. For production: Add only your server's IP addresses

## Step 3: Get Connection String

1. Go to "Clusters" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string

## Step 4: Configure Your Application

### Option 1: Environment Variable (Recommended)
Set the `MONGODB_URI` environment variable:

```bash
# Windows (PowerShell)
$env:MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/dots-and-boxes?retryWrites=true&w=majority"

# Windows (Command Prompt)
set MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dots-and-boxes?retryWrites=true&w=majority

# Linux/Mac
export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/dots-and-boxes?retryWrites=true&w=majority"
```

### Option 2: Create .env file
Create a `.env` file in your project root:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dots-and-boxes?retryWrites=true&w=majority
SESSION_SECRET=your-super-secret-session-key-here
PORT=3000
NODE_ENV=production
DEFAULT_LUCKY_WHEEL_ENABLED=true
```

## Step 5: Data Migration (if you have existing data)

### Export from Local MongoDB
```bash
# Export all collections
mongodump --db dots-and-boxes --out ./backup

# Or export specific collections
mongoexport --db dots-and-boxes --collection users --out users.json
mongoexport --db dots-and-boxes --collection games --out games.json
```

### Import to MongoDB Atlas
```bash
# Import all collections
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/dots-and-boxes" ./backup/dots-and-boxes

# Or import specific collections
mongoimport --uri="mongodb+srv://username:password@cluster.mongodb.net/dots-and-boxes" --collection users --file users.json
mongoimport --uri="mongodb+srv://username:password@cluster.mongodb.net/dots-and-boxes" --collection games --file games.json
```

## Step 6: Test the Connection

1. Start your application:
   ```bash
   npm start
   ```

2. Check the console output - you should see:
   ```
   ✅ Connected to MongoDB
   📊 Using MongoDB storage system
   ```

3. Test the health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```

## Troubleshooting

### Common Issues:

1. **Connection Timeout**: Check your network access settings in Atlas
2. **Authentication Failed**: Verify your username and password
3. **Database Not Found**: The database will be created automatically when first accessed

### Security Best Practices:

1. Use strong passwords for database users
2. Restrict network access to specific IP addresses in production
3. Use environment variables for sensitive data
4. Enable MongoDB Atlas monitoring and alerts

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `SESSION_SECRET` | Secret key for session encryption | `your-secret-key-here` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `production` or `development` |
| `DEFAULT_LUCKY_WHEEL_ENABLED` | Enable/disable lucky wheel | `true` or `false` |
