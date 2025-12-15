// lib/redis.ts
import Redis from 'ioredis';
import logger from './logger';

let redis: Redis | null = null;

if (process.env.NEXT_PUBLIC_REDIS_URL) {
  redis = new Redis(process.env.NEXT_PUBLIC_REDIS_URL, {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    commandTimeout: 30000,
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error:', err);
  });

  redis.on('connect', () => {
    logger.info('Successfully connected to Redis');
  });
} else {
  logger.warn('REDIS_URL not found, Redis client not initialized');
}

export { redis };