const Redis = require('ioredis');
const config = require('./env');

let redisClient = null;

function getRedisClient() {
  if (!config.redisUrl) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
  }

  return redisClient;
}

module.exports = { getRedisClient };
