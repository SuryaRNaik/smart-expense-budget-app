const app = require('./app');
const config = require('./config');

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`SEBM backend listening on port ${PORT} [${config.nodeEnv}]`);
});

// Graceful shutdown handling
const handleShutdown = async (signal) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    try {
      const db = require('./db');
      await db.closePool();
    } catch (err) {
      console.error('Error closing database pool during shutdown:', err);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = server;
