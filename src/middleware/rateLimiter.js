const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const config = require('../config/env');
const { getRedisClient } = require('../config/redis');

/**
 * Rate limiter: 20 requests per hour per user (identified by IP as fallback,
 * or by authenticated user ID when available).
 */

const redisClient = config.enableRedisRateLimit ? getRedisClient() : null;
const store =
  redisClient && config.redisUrl
    ? new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
      })
    : undefined;

const rateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.supportRateLimitPerHour, // 20 requests per window per key
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use authenticated user ID if available, otherwise fall back to IP
    return req.user ? req.user.id : req.ip;
  },
  message: {
    success: false,
    message:
      `Too many requests. You are limited to ${config.supportRateLimitPerHour} messages per hour. Please try again later.`,
  },
  ...(store ? { store } : {}),
});

module.exports = rateLimiter;
