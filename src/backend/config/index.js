// Server configuration constants (inline to avoid missing module issues)
const SERVER_CONFIG = {
  PORT: process.env.PORT || 3000,
  DEFAULT_LUCKY_WHEEL_ENABLED: true
};

// Parse command line arguments for Lucky Wheel configuration
const args = process.argv.slice(2);
let DEFAULT_LUCKY_WHEEL_ENABLED = SERVER_CONFIG.DEFAULT_LUCKY_WHEEL_ENABLED;

// Parse arguments like "DEFAULT_LUCKY_WHEEL_ENABLED=true" or "DEFAULT_LUCKY_WHEEL_ENABLED=false"
args.forEach(arg => {
  if (arg.startsWith('DEFAULT_LUCKY_WHEEL_ENABLED=')) {
    const value = arg.split('=')[1].toLowerCase();
    if (value === 'true') {
      DEFAULT_LUCKY_WHEEL_ENABLED = true;
    } else if (value === 'false') {
      DEFAULT_LUCKY_WHEEL_ENABLED = false;
    }
  }
});

console.log(`🎛️ Lucky Wheel Configuration: ${DEFAULT_LUCKY_WHEEL_ENABLED ? 'ENABLED' : 'DISABLED'}`);
console.log(`🚀 Server starting with Lucky Wheel: ${DEFAULT_LUCKY_WHEEL_ENABLED ? 'ON' : 'OFF'}`);

module.exports = {
  PORT: SERVER_CONFIG.PORT,
  DEFAULT_LUCKY_WHEEL_ENABLED,
  getLocalIP: () => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }
};
