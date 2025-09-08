const express = require('express');
const router = express.Router();

// Configuration endpoint for Lucky Wheel setting
router.get('/config', (req, res) => {
  const config = require('../config');
  res.json({
    DEFAULT_LUCKY_WHEEL_ENABLED: config.DEFAULT_LUCKY_WHEEL_ENABLED,
    message: `Lucky Wheel is ${config.DEFAULT_LUCKY_WHEEL_ENABLED ? 'ENABLED' : 'DISABLED'} for this deployment`
  });
});

module.exports = router;
