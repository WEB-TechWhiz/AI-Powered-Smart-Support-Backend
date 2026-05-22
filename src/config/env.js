require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] || fallback;
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongoUri: required('MONGO_URI'),
  jwtSecret: required('JWT_SECRET'),
  openaiApiKey: required('OPENAI_API_KEY'),
  redisUrl: process.env.REDIS_URL || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
  openaiFallbackModel: process.env.OPENAI_FALLBACK_MODEL || 'gpt-5.4-mini',
  supportRateLimitPerHour: Number(process.env.SUPPORT_RATE_LIMIT_PER_HOUR || 20),
  maxConversationMessages: Number(process.env.MAX_CONVERSATION_MESSAGES || 30),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  enableRedisRateLimit: String(process.env.ENABLE_REDIS_RATE_LIMIT || 'false').toLowerCase() === 'true',
};

module.exports = config;
