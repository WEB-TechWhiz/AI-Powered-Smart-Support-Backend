const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/db');

async function start() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { start };
