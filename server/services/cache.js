import logger from '../utils/logger.js';

let redisClient = null;
const memoryCache = new Map();

// Periodic cleanup of expired memory cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (entry.expires < now) memoryCache.delete(key);
  }
}, 60000);

// Initialize Redis if configured
if (process.env.REDIS_URL) {
  try {
    const redis = await import('redis');
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: { reconnectStrategy: (retries) => Math.min(retries * 100, 3000) },
    });
    redisClient.on('error', (err) => logger.error('Redis error', { error: err.message }));
    await redisClient.connect();
    logger.info('Redis connected', { url: process.env.REDIS_URL.replace(/\/\/.*@/, '//***@') });
  } catch (error) {
    logger.warn('Redis not available, using in-memory cache', { error: error.message });
    redisClient = null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 3600) {
  if (redisClient) {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } else {
    memoryCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }
}

export async function cacheGet(key) {
  if (redisClient) {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheDel(key) {
  if (redisClient) {
    await redisClient.del(key);
  } else {
    memoryCache.delete(key);
  }
}

export async function cacheExists(key) {
  if (redisClient) return (await redisClient.exists(key)) === 1;
  const entry = memoryCache.get(key);
  if (!entry) return false;
  if (entry.expires < Date.now()) {
    memoryCache.delete(key);
    return false;
  }
  return true;
}

export function isRedisEnabled() {
  return redisClient !== null;
}
