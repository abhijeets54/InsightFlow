/**
 * Redis Client Configuration
 *
 * Supports both:
 * 1. Local Redis (Docker) - for development
 * 2. Upstash Redis (Serverless) - for production
 *
 * Auto-detects based on environment variables
 */

import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';

// Determine which Redis client to use
const REDIS_MODE = process.env.REDIS_MODE || 'auto'; // 'local', 'upstash', 'auto'

// Local Redis configuration (Docker)
const LOCAL_REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Upstash Redis configuration
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Check if Redis is enabled
export const isRedisEnabled = (): boolean => {
  if (process.env.ENABLE_REDIS_CACHE === 'false') {
    return false;
  }

  // Check if we have valid configuration
  if (REDIS_MODE === 'upstash' || (REDIS_MODE === 'auto' && UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN)) {
    return true;
  }

  if (REDIS_MODE === 'local' || REDIS_MODE === 'auto') {
    return true;
  }

  return false;
};

// Determine which mode we're using
const getRedisMode = (): 'upstash' | 'local' | 'disabled' => {
  if (!isRedisEnabled()) {
    return 'disabled';
  }

  if (REDIS_MODE === 'upstash') {
    return 'upstash';
  }

  if (REDIS_MODE === 'local') {
    return 'local';
  }

  // Auto-detect
  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    return 'upstash';
  }

  return 'local';
};

const redisMode = getRedisMode();

// Initialize Redis clients
let localRedisClient: Redis | null = null;
let upstashRedisClient: UpstashRedis | null = null;

// Initialize local Redis (ioredis)
if (redisMode === 'local') {
  try {
    localRedisClient = new Redis(LOCAL_REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ECONNREFUSED'];
        if (targetErrors.some(e => err.message.includes(e))) {
          return true;
        }
        return false;
      },
    });

    localRedisClient.on('connect', () => {
      console.log('[Redis] ✅ Connected to local Redis (Docker)');
    });

    localRedisClient.on('error', (err) => {
      console.error('[Redis] ❌ Local Redis error:', err.message);
    });
  } catch (error) {
    console.error('[Redis] Failed to initialize local Redis:', error);
  }
}

// Initialize Upstash Redis
if (redisMode === 'upstash') {
  try {
    upstashRedisClient = new UpstashRedis({
      url: UPSTASH_REDIS_REST_URL!,
      token: UPSTASH_REDIS_REST_TOKEN!,
    });

    console.log('[Redis] ✅ Configured for Upstash Redis (Serverless)');
  } catch (error) {
    console.error('[Redis] Failed to initialize Upstash Redis:', error);
  }
}

// Log current mode
console.log(`[Redis] Mode: ${redisMode}`, {
  enabled: isRedisEnabled(),
  url: redisMode === 'local' ? LOCAL_REDIS_URL : 'Upstash REST API',
});

// Default TTL: 24 hours
const DEFAULT_TTL = parseInt(process.env.REDIS_DATASET_TTL || '86400');

/**
 * Unified Redis interface
 * Works with both local and Upstash Redis
 */

/**
 * Dataset cache structure
 */
export interface CachedDataset {
  rows: any[];
  columns: string[];
  types: string[];
  rowCount: number;
  columnCount: number;
}

/**
 * Cache full dataset in Redis
 * @param userId - User ID (for namespacing)
 * @param datasetId - Dataset ID
 * @param fullData - Dataset object with rows, columns, types, etc.
 * @param ttl - Time to live in seconds (default: 24 hours)
 */
export async function cacheDataset(
  userId: string,
  datasetId: string,
  fullData: CachedDataset,
  ttl: number = DEFAULT_TTL
): Promise<boolean> {
  if (!isRedisEnabled()) {
    console.log('[Redis] Disabled - skipping cache');
    return false;
  }

  try {
    const key = `dataset:${userId}:${datasetId}`;
    const value = JSON.stringify(fullData);
    const sizeKB = (value.length / 1024).toFixed(2);

    if (redisMode === 'upstash' && upstashRedisClient) {
      await upstashRedisClient.setex(key, ttl, value);
    } else if (redisMode === 'local' && localRedisClient) {
      await localRedisClient.setex(key, ttl, value);
    } else {
      console.warn('[Redis] No client available');
      return false;
    }

    console.log(`[Redis] ✅ Cached dataset ${datasetId} (${fullData.rowCount} rows, ${sizeKB} KB)`);
    return true;
  } catch (error) {
    console.error('[Redis] ❌ Failed to cache dataset:', error);
    return false;
  }
}

/**
 * Get cached dataset from Redis
 * @param userId - User ID
 * @param datasetId - Dataset ID
 * @returns Dataset object or null if not found
 */
export async function getCachedDataset(
  userId: string,
  datasetId: string
): Promise<CachedDataset | null> {
  if (!isRedisEnabled()) {
    return null;
  }

  try {
    const key = `dataset:${userId}:${datasetId}`;
    let cached: string | null = null;

    if (redisMode === 'upstash' && upstashRedisClient) {
      cached = await upstashRedisClient.get(key);
    } else if (redisMode === 'local' && localRedisClient) {
      cached = await localRedisClient.get(key);
    } else {
      return null;
    }

    if (cached) {
      const data: CachedDataset = JSON.parse(cached);
      console.log(`[Redis] 🎯 Cache HIT for dataset ${datasetId} (${data.rowCount} rows)`);
      return data;
    }

    console.log(`[Redis] ❌ Cache MISS for dataset ${datasetId}`);
    return null;
  } catch (error) {
    console.error('[Redis] Error retrieving dataset:', error);
    return null;
  }
}

/**
 * Invalidate (delete) cached dataset
 */
export async function invalidateDataset(
  userId: string,
  datasetId: string
): Promise<boolean> {
  if (!isRedisEnabled()) {
    return false;
  }

  try {
    const key = `dataset:${userId}:${datasetId}`;

    if (redisMode === 'upstash' && upstashRedisClient) {
      await upstashRedisClient.del(key);
    } else if (redisMode === 'local' && localRedisClient) {
      await localRedisClient.del(key);
    }

    console.log(`[Redis] 🗑️  Invalidated dataset ${datasetId}`);
    return true;
  } catch (error) {
    console.error('[Redis] Error invalidating dataset:', error);
    return false;
  }
}

/**
 * Extend TTL for active dataset (user is using it)
 */
export async function extendDatasetTTL(
  userId: string,
  datasetId: string,
  ttl: number = DEFAULT_TTL
): Promise<boolean> {
  if (!isRedisEnabled()) {
    return false;
  }

  try {
    const key = `dataset:${userId}:${datasetId}`;

    if (redisMode === 'upstash' && upstashRedisClient) {
      await upstashRedisClient.expire(key, ttl);
    } else if (redisMode === 'local' && localRedisClient) {
      await localRedisClient.expire(key, ttl);
    }

    console.log(`[Redis] ⏰ Extended TTL for dataset ${datasetId}`);
    return true;
  } catch (error) {
    console.error('[Redis] Error extending TTL:', error);
    return false;
  }
}

/**
 * Cache AI response (to avoid duplicate API calls)
 */
export async function cacheAIResponse(
  cacheKey: string,
  response: any,
  ttl: number = 3600 // 1 hour
): Promise<boolean> {
  if (!isRedisEnabled()) {
    return false;
  }

  try {
    const key = `ai:${cacheKey}`;
    const value = JSON.stringify(response);

    if (redisMode === 'upstash' && upstashRedisClient) {
      await upstashRedisClient.setex(key, ttl, value);
    } else if (redisMode === 'local' && localRedisClient) {
      await localRedisClient.setex(key, ttl, value);
    }

    console.log(`[Redis] 💾 Cached AI response for key: ${cacheKey}`);
    return true;
  } catch (error) {
    console.error('[Redis] Error caching AI response:', error);
    return false;
  }
}

/**
 * Get cached AI response
 */
export async function getCachedAIResponse(cacheKey: string): Promise<any | null> {
  if (!isRedisEnabled()) {
    return null;
  }

  try {
    const key = `ai:${cacheKey}`;
    let cached: string | null = null;

    if (redisMode === 'upstash' && upstashRedisClient) {
      cached = await upstashRedisClient.get(key);
    } else if (redisMode === 'local' && localRedisClient) {
      cached = await localRedisClient.get(key);
    }

    if (cached) {
      console.log(`[Redis] 🎯 Cache HIT for AI response: ${cacheKey}`);
      return JSON.parse(cached);
    }

    return null;
  } catch (error) {
    console.error('[Redis] Error retrieving AI response:', error);
    return null;
  }
}

/**
 * Rate limiting: Check if user can make request
 * @param userId - User ID
 * @param action - Action type (e.g., 'insights', 'forecast', 'chat')
 * @param limit - Max requests per window
 * @param window - Time window in seconds (default: 1 hour)
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  limit: number,
  window: number = 3600
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (!isRedisEnabled()) {
    return { allowed: true, remaining: limit, resetAt: Date.now() + window * 1000 };
  }

  try {
    const key = `rate_limit:${userId}:${action}`;
    let current = 0;

    if (redisMode === 'upstash' && upstashRedisClient) {
      current = await upstashRedisClient.incr(key);
      if (current === 1) {
        await upstashRedisClient.expire(key, window);
      }
    } else if (redisMode === 'local' && localRedisClient) {
      current = await localRedisClient.incr(key);
      if (current === 1) {
        await localRedisClient.expire(key, window);
      }
    }

    // Get TTL for resetAt
    let ttl = window;
    if (redisMode === 'upstash' && upstashRedisClient) {
      ttl = await upstashRedisClient.ttl(key) || window;
    } else if (redisMode === 'local' && localRedisClient) {
      ttl = await localRedisClient.ttl(key) || window;
    }

    const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : window * 1000);
    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);

    if (!allowed) {
      console.log(`[Redis] 🚫 Rate limit exceeded for ${userId}:${action} (${current}/${limit})`);
    }

    return { allowed, remaining, resetAt };
  } catch (error) {
    console.error('[Redis] Error checking rate limit:', error);
    // Fail open (allow request on error)
    return { allowed: true, remaining: limit, resetAt: Date.now() + window * 1000 };
  }
}

/**
 * Get Redis stats (for monitoring)
 */
export async function getRedisStats(): Promise<{
  enabled: boolean;
  mode: string;
  info?: any;
  keys?: number;
}> {
  if (!isRedisEnabled()) {
    return { enabled: false, mode: 'disabled' };
  }

  try {
    let keys = 0;

    if (redisMode === 'upstash' && upstashRedisClient) {
      keys = await upstashRedisClient.dbsize();
    } else if (redisMode === 'local' && localRedisClient) {
      keys = await localRedisClient.dbsize();
    }

    return {
      enabled: true,
      mode: redisMode,
      keys,
    };
  } catch (error) {
    console.error('[Redis] Error getting stats:', error);
    return { enabled: true, mode: redisMode };
  }
}

/**
 * Flush all Redis data (development only!)
 */
export async function flushAll(): Promise<boolean> {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Redis] ⛔ FLUSHALL is disabled in production!');
    return false;
  }

  if (!isRedisEnabled()) {
    return false;
  }

  try {
    if (redisMode === 'upstash' && upstashRedisClient) {
      await upstashRedisClient.flushdb();
    } else if (redisMode === 'local' && localRedisClient) {
      await localRedisClient.flushall();
    }

    console.log('[Redis] 🗑️  Flushed all data (development mode)');
    return true;
  } catch (error) {
    console.error('[Redis] Error flushing data:', error);
    return false;
  }
}

/**
 * Close Redis connection (cleanup)
 */
export async function closeRedis(): Promise<void> {
  if (localRedisClient) {
    await localRedisClient.quit();
    console.log('[Redis] Disconnected from local Redis');
  }

  // Upstash is REST-based, no connection to close
}

// Export clients for advanced use cases
export { localRedisClient, upstashRedisClient, redisMode };

// Default export
export default {
  isEnabled: isRedisEnabled,
  cacheDataset,
  getCachedDataset,
  invalidateDataset,
  extendDatasetTTL,
  cacheAIResponse,
  getCachedAIResponse,
  checkRateLimit,
  getRedisStats,
  flushAll,
  closeRedis,
  mode: redisMode,
};
