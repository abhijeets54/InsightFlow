# Redis Setup Guide

This guide covers setting up Redis for the InsightFlow Data Analysis Platform, supporting both local development (Docker) and production deployment (Upstash).

## Local Development with Docker

### Prerequisites
- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)

### Quick Start

1. **Start Redis locally**:
   ```bash
   docker-compose up -d
   ```

2. **Verify Redis is running**:
   ```bash
   docker ps
   # Should show: insightflow-redis running on port 6379
   ```

3. **Test Redis connection**:
   ```bash
   docker exec -it insightflow-redis redis-cli ping
   # Should return: PONG
   ```

4. **Configure environment variables**:
   Add to your `.env.local`:
   ```env
   REDIS_URL=redis://localhost:6379
   REDIS_MODE=local
   ENABLE_REDIS_CACHE=true
   ```

5. **Start your Next.js app**:
   ```bash
   npm run dev
   ```

### Docker Commands

- **Start Redis**: `docker-compose up -d`
- **Stop Redis**: `docker-compose down`
- **View logs**: `docker-compose logs -f redis`
- **Restart Redis**: `docker-compose restart redis`
- **Clear all data**: `docker exec -it insightflow-redis redis-cli FLUSHALL`
- **Check memory usage**: `docker exec -it insightflow-redis redis-cli INFO memory`

### Redis Configuration

The Docker setup includes:
- **Port**: 6379 (standard Redis port)
- **Persistence**: Append-only file (AOF) for data durability
- **Max Memory**: 256 MB (matching Upstash free tier)
- **Eviction Policy**: allkeys-lru (removes least recently used keys when full)
- **Volume**: `redis-data` for persistent storage
- **Health Check**: Automatic ping every 10 seconds

## Production Deployment with Upstash

Upstash provides serverless Redis with a generous free tier, perfect for production deployments.

### Free Tier Limits
- **Commands**: 10,000 per day
- **Storage**: 256 MB
- **Bandwidth**: 200 MB/day
- **Concurrent connections**: 100
- **Max request size**: 1 MB

### Setup Steps

1. **Create Upstash account**:
   - Go to [upstash.com](https://upstash.com)
   - Sign up for free (GitHub/Google login available)

2. **Create Redis database**:
   - Click "Create Database"
   - Choose region closest to your deployment (e.g., us-east-1)
   - Select "Free" tier
   - Enable "TLS" for security
   - Click "Create"

3. **Get connection credentials**:
   - On your database page, find "REST API" section
   - Copy `UPSTASH_REDIS_REST_URL`
   - Copy `UPSTASH_REDIS_REST_TOKEN`

4. **Configure production environment**:
   Add to your production environment variables (Vercel, Netlify, etc.):
   ```env
   UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token-here
   REDIS_MODE=upstash
   ENABLE_REDIS_CACHE=true
   ```

5. **Deploy your app**:
   The application will automatically detect Upstash credentials and use REST API mode.

## Environment Variables Reference

| Variable | Description | Local Value | Production Value |
|----------|-------------|-------------|------------------|
| `REDIS_URL` | Local Redis connection URL | `redis://localhost:6379` | (not used) |
| `UPSTASH_REDIS_REST_URL` | Upstash REST API URL | (not set) | `https://...upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash authentication token | (not set) | `your-token` |
| `REDIS_MODE` | Force specific mode | `local` or `upstash` or `auto` | `auto` |
| `ENABLE_REDIS_CACHE` | Enable/disable Redis | `true` | `true` |

### Auto-Detection Mode

If `REDIS_MODE=auto` (default), the system automatically detects which mode to use:
- **Upstash credentials present** → Uses Upstash REST API
- **No Upstash credentials** → Uses local Redis (ioredis)
- **Redis disabled** → Falls back to in-memory cache

## What Gets Cached?

### 1. Dataset Cache (7 days TTL)
- **Key**: `dataset:{userId}:{datasetId}`
- **Content**: Full dataset rows, columns, types
- **Size**: Varies (avg 50-500 KB per dataset)
- **Purpose**: Avoid re-fetching from Supabase on every page load

### 2. AI Insights Cache (24 hours TTL)
- **Key**: `insights:{datasetId}`
- **Content**: Generated AI insights (4-6 insights)
- **Size**: ~2-5 KB per dataset
- **Purpose**: Save Gemini API calls for frequently accessed datasets

### 3. Forecast Cache (12 hours TTL)
- **Key**: `forecast:{datasetId}:{dateColumn}:{valueColumn}:{periods}`
- **Content**: Forecast results and AI insights
- **Size**: ~10-20 KB per forecast
- **Purpose**: Expensive computation, cache heavily used forecasts

### 4. Rate Limiting (1 minute TTL)
- **Key**: `rate:{identifier}:{window}`
- **Content**: Request counter
- **Size**: Tiny (<100 bytes)
- **Purpose**: Prevent API abuse

## Cache Management

### View Cache Stats
The application provides a Redis stats endpoint:
```bash
# Development
curl http://localhost:3000/api/redis/stats

# Response
{
  "connected": true,
  "mode": "local",
  "totalKeys": 42,
  "memoryUsed": "2.5 MB",
  "cacheHits": 1234,
  "cacheMisses": 56
}
```

### Clear Specific Cache
```javascript
// In your code
import { invalidateDataset } from '@/lib/redis';

// Clear dataset cache
await invalidateDataset(userId, datasetId);
```

### Clear All Cache (Development Only)
```javascript
import { flushAll } from '@/lib/redis';

// WARNING: Clears ALL Redis data
await flushAll();
```

### Monitor Cache in Real-Time

**For Docker (local)**:
```bash
# Open Redis CLI
docker exec -it insightflow-redis redis-cli

# Monitor all commands
MONITOR

# List all keys
KEYS *

# Get specific key
GET dataset:user123:dataset456

# Check TTL
TTL dataset:user123:dataset456

# Delete key
DEL dataset:user123:dataset456
```

**For Upstash (production)**:
- Use Upstash web console at [console.upstash.com](https://console.upstash.com)
- Navigate to your database → "Data Browser"
- View, edit, or delete keys in the UI

## Cost Optimization

### Stay Within Free Tier

**Daily Limits** (Upstash Free):
- 10,000 commands/day
- 256 MB storage
- 200 MB bandwidth/day

**Estimated Usage**:
- Dataset upload: ~10 commands
- Dataset fetch: ~5 commands
- AI insights generation + cache: ~8 commands
- Forecast generation + cache: ~8 commands

**Rough Capacity**:
- ~300 dataset uploads/day
- ~2000 dataset fetches/day
- ~1250 AI insights generations/day

### Optimization Strategies

1. **Longer TTLs for stable data**:
   - Datasets: 7 days (rarely change after upload)
   - AI insights: 24 hours (static for given dataset)
   - Forecasts: 12 hours (computation-heavy)

2. **Compression** (future enhancement):
   ```javascript
   // Before caching large datasets
   const compressed = zlib.gzipSync(JSON.stringify(data));
   await redis.set(key, compressed);
   ```

3. **Selective caching**:
   - Only cache datasets > 100 rows (small ones fetch fast from DB)
   - Only cache AI responses (save API $$$)
   - Skip cache for real-time data

4. **Cache invalidation**:
   - Clear cache when dataset is updated
   - Use Redis LRU eviction (automatic)

## Monitoring & Debugging

### Check if Redis is being used

Look for these log messages:
```
[Redis] ✅ Initialized Redis client (mode: local)
[Upload] ✅ Cached full dataset in Redis: 1000 rows for dataset abc123
[Dataset API] ✅ Cache HIT for dataset abc123: 1000 rows
[Insights] ✅ Cache HIT for dataset abc123
```

### Common Issues

**Issue: Connection refused**
- Solution: Ensure Docker is running and Redis container is up
- Check: `docker ps` should show insightflow-redis

**Issue: Redis disabled**
- Solution: Set `ENABLE_REDIS_CACHE=true` in `.env.local`
- Restart Next.js dev server

**Issue: Upstash rate limit**
- Solution: Implement request throttling or upgrade to paid tier
- Monitor: Check Upstash dashboard for usage stats

**Issue: Cache not invalidating**
- Solution: Manually clear with `invalidateDataset()` or set shorter TTLs
- Debug: Check TTL with `TTL key` in Redis CLI

## Testing Redis Integration

### Test Dataset Caching
```bash
# 1. Upload a dataset (should cache in Redis)
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-data.csv" \
  -F "userId=test-user-123"

# 2. Fetch dataset (should hit cache)
curl "http://localhost:3000/api/dataset/{datasetId}?userId=test-user-123"

# Expected response:
# { "success": true, "source": "cache", "data": {...} }
```

### Test AI Caching
```bash
# 1. Generate insights (should cache)
curl -X POST http://localhost:3000/api/insights \
  -H "Content-Type: application/json" \
  -d '{"datasetId":"abc123","userId":"user123","sampleData":[...]}'

# 2. Request same insights again (should hit cache)
# Expected: "cached": true in response
```

## Migration from SessionStorage to Redis

**Before** (SessionStorage only):
- ❌ Data lost on page refresh
- ❌ Limited to ~5-10 MB per domain
- ❌ No sharing across devices
- ❌ Client-side only

**After** (Redis):
- ✅ Persistent across sessions
- ✅ Up to 256 MB storage
- ✅ Server-side caching
- ✅ Shared across devices (same user)
- ✅ Fast API responses (50-100ms vs 500-2000ms)

## Next Steps

1. ✅ Start local Redis with Docker
2. ✅ Configure `.env.local`
3. ✅ Test dataset upload and caching
4. ✅ Monitor cache hits in console
5. 🔜 Deploy to production with Upstash
6. 🔜 Implement LIDA AI-powered visualizations (uses cached datasets)

## Support

- **Redis Documentation**: [redis.io/docs](https://redis.io/docs)
- **Upstash Docs**: [docs.upstash.com](https://docs.upstash.com)
- **ioredis GitHub**: [github.com/luin/ioredis](https://github.com/luin/ioredis)
- **Docker Compose**: [docs.docker.com/compose](https://docs.docker.com/compose)
