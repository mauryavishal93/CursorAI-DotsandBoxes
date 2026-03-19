/**
 * Admin API — requires MongoDB + JWT + user.isAdmin
 */
const express = require('express');
const mongoose = require('mongoose');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function requireMongo(req, res, next) {
  if (global.useInMemoryStorage) {
    return res.status(503).json({
      success: false,
      message: 'Admin panel requires MongoDB. The server is running in in-memory mode.'
    });
  }
  next();
}

router.use(requireMongo);
router.use(authenticate);
router.use(requireAdmin);

function getUserModel() {
  return require('../models/User');
}

function getGameModel() {
  return require('../models/Game');
}

/** GET /api/admin/me */
router.get('/me', (req, res) => {
  res.json({
    success: true,
    admin: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      isAdmin: true
    }
  });
});

/** GET /api/admin/dashboard */
router.get('/dashboard', async (req, res) => {
  try {
    const User = getUserModel();
    const Game = getGameModel();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      registeredUsers,
      guestUsers,
      adminUsers,
      totalGames,
      gamesLast7Days,
      modeBreakdown
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isGuest: false }),
      User.countDocuments({ isGuest: true }),
      User.countDocuments({ isAdmin: true }),
      Game.countDocuments(),
      Game.countDocuments({ endedAt: { $gte: since } }),
      Game.aggregate([
        { $group: { _id: '$gameMode', count: { $sum: 1 } } }
      ])
    ]);

    const recentGames = await Game.find()
      .sort({ endedAt: -1 })
      .limit(8)
      .select('gameId gameMode endedAt lobbyCode winner.username plannedOpponentType')
      .lean();

    res.json({
      success: true,
      dashboard: {
        users: { total: totalUsers, registered: registeredUsers, guests: guestUsers, admins: adminUsers },
        games: { total: totalGames, last7Days: gamesLast7Days, byMode: modeBreakdown },
        recentGames
      }
    });
  } catch (err) {
    console.error('admin dashboard:', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
});

/** GET /api/admin/users */
router.get('/users', async (req, res) => {
  try {
    const User = getUserModel();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = (req.query.search || '').trim();

    const filter = {};
    if (search) {
      filter.$or = [
        { username: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { email: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      users: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
  } catch (err) {
    console.error('admin users list:', err);
    res.status(500).json({ success: false, message: 'Failed to list users' });
  }
});

/** GET /api/admin/users/:id */
router.get('/users/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    const User = getUserModel();
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error('admin user get:', err);
    res.status(500).json({ success: false, message: 'Failed to load user' });
  }
});

/** PATCH /api/admin/users/:id — body: { isAdmin?: boolean } */
router.patch('/users/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    const { isAdmin } = req.body;
    if (typeof isAdmin !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Body must include isAdmin (boolean)' });
    }

    const User = getUserModel();
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (target.isGuest) {
      return res.status(400).json({ success: false, message: 'Cannot change admin flag for guest accounts' });
    }

    const selfId = String(req.user._id);
    if (selfId === String(target._id) && isAdmin === false) {
      const otherAdmins = await User.countDocuments({ isAdmin: true, _id: { $ne: target._id } });
      if (otherAdmins === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove the last admin account.'
        });
      }
    }

    target.isAdmin = isAdmin;
    await target.save();

    const updated = await User.findById(req.params.id).select('-password').lean();
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('admin user patch:', err);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

/** GET /api/admin/games */
router.get('/games', async (req, res) => {
  try {
    const Game = getGameModel();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const mode = req.query.mode;

    const filter = {};
    if (mode && ['singlePlayer', 'twoPlayers', 'onlineMultiplayer'].includes(mode)) {
      filter.gameMode = mode;
    }

    const [items, total] = await Promise.all([
      Game.find(filter)
        .sort({ endedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Game.countDocuments(filter)
    ]);

    res.json({
      success: true,
      games: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
  } catch (err) {
    console.error('admin games list:', err);
    res.status(500).json({ success: false, message: 'Failed to list games' });
  }
});

/** GET /api/admin/games/detail/:gameId */
router.get('/games/detail/:gameId', async (req, res) => {
  try {
    const Game = getGameModel();
    const game = await Game.findOne({ gameId: req.params.gameId }).lean();
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }
    res.json({ success: true, game });
  } catch (err) {
    console.error('admin game get:', err);
    res.status(500).json({ success: false, message: 'Failed to load game' });
  }
});

/** GET /api/admin/leaderboard */
router.get('/leaderboard', async (req, res) => {
  try {
    const User = getUserModel();
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit, 10) || 25));

    const top = await User.find({ isGuest: false })
      .select('username email points wins losses gamesPlayed highestStreak createdAt lastLogin')
      .sort({ points: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, leaderboard: top });
  } catch (err) {
    console.error('admin leaderboard:', err);
    res.status(500).json({ success: false, message: 'Failed to load leaderboard' });
  }
});

/** GET /api/admin/system */
router.get('/system', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    success: true,
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal
      },
      env: process.env.NODE_ENV || 'development',
      database: 'mongodb'
    }
  });
});

/** GET /api/admin/settings — non-secret game / server flags */
router.get('/settings', (req, res) => {
  try {
    const config = require('../config');
    res.json({
      success: true,
      settings: {
        luckyWheelDefaultEnabled: !!config.DEFAULT_LUCKY_WHEEL_ENABLED,
        appVersion: require('../../../package.json').version || 'unknown'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to read settings' });
  }
});

module.exports = router;
