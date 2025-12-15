# Redis Implementation Plan for Data Analysis Platform

## Problem We're Solving
Currently, `fullData` (up to 1000 rows) is stored in browser sessionStorage, which:
- Is lost on page refresh if not properly restored
- Has 5-10MB size limits
- Doesn't work across devices
- Client-side only

## Solution: Redis for Server-Side Data Caching

### Architecture

```
User Uploads File
      ↓
API processes & saves to Supabase (permanent storage)
      ↓
Store fullData in Redis (fast cache)
      ↓
Client receives metadata + datasetId
      ↓
Charts fetch from Redis endpoint (blazing fast)
      ↓
Redis TTL: 24 hours (auto-cleanup)
```

### Implementation Steps

#### 1. Add Redis Client

```bash
npm install ioredis
npm install @upstash/redis  # Alternative: Serverless Redis
```

#### 2. Create Redis Client (`lib/redis.ts`)

```typescript
import Redis from 'ioredis';

// Use Upstash Redis (serverless, free tier available)
export const redis = new Redis(process.env.REDIS_URL || '');

// Helper functions
export const cacheDataset = async (
  userId: string,
  datasetId: string,
  fullData: any[],
  ttl: number = 86400 // 24 hours
) => {
  const key = `dataset:${userId}:${datasetId}:fullData`;
  await redis.setex(key, ttl, JSON.stringify(fullData));
  console.log(`[Redis] Cached ${fullData.length} rows for dataset ${datasetId}`);
};

export const getCachedDataset = async (
  userId: string,
  datasetId: string
): Promise<any[] | null> => {
  const key = `dataset:${userId}:${datasetId}:fullData`;
  const cached = await redis.get(key);

  if (cached) {
    console.log(`[Redis] Cache HIT for dataset ${datasetId}`);
    return JSON.parse(cached);
  }

  console.log(`[Redis] Cache MISS for dataset ${datasetId}`);
  return null;
};

export const invalidateDataset = async (
  userId: string,
  datasetId: string
) => {
  const key = `dataset:${userId}:${datasetId}:fullData`;
  await redis.del(key);
};
```

#### 3. Update Upload API (`app/api/upload/route.ts`)

```typescript
import { cacheDataset } from '@/lib/redis';

// After successful upload (line ~145)
// Cache fullData in Redis
await cacheDataset(userId, datasetData.id, fullDataForClient);

return NextResponse.json({
  success: true,
  uploadId: uploadData.id,
  datasetId: datasetData.id,
  preview: {
    columns: parsedData.columns,
    types: parsedData.types,
    rowCount: parsedData.rowCount,
    columnCount: parsedData.columnCount,
    sampleRows: parsedData.rows.slice(0, 10),
    // Don't send fullData to client anymore - too large
    isComplete: parsedData.rows.length <= MAX_ROWS_FOR_CLIENT,
    samplingMethod,
  },
  // ... rest
});
```

#### 4. Create Data Fetch API (`app/api/dataset/[id]/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCachedDataset } from '@/lib/redis';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const datasetId = params.id;
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Try Redis cache first (fast!)
  const cachedData = await getCachedDataset(userId, datasetId);
  if (cachedData) {
    return NextResponse.json({
      success: true,
      data: cachedData,
      source: 'cache'
    });
  }

  // Fallback: Fetch from Supabase and re-cache
  const { data: dataset } = await supabase
    .from('datasets')
    .select('data_rows')
    .eq('id', datasetId)
    .eq('user_id', userId)
    .single();

  if (!dataset) {
    return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
  }

  const fullData = dataset.data_rows.map((row: string) => JSON.parse(row));

  // Re-cache for next time
  await cacheDataset(userId, datasetId, fullData);

  return NextResponse.json({
    success: true,
    data: fullData,
    source: 'database'
  });
}
```

#### 5. Update Data Store (`store/useDataStore.ts`)

```typescript
// Add function to fetch data from server
const fetchFullDataFromServer = async (datasetId: string, userId: string) => {
  const response = await fetch(`/api/dataset/${datasetId}?userId=${userId}`);
  const result = await response.json();
  return result.data;
};

// Update getFullData
getFullData: async () => {
  const state = get();

  // Try state first
  if (state.uploadedData?.preview?.fullData) {
    return state.uploadedData.preview.fullData;
  }

  // Try sessionStorage
  if (typeof window !== 'undefined') {
    const cached = sessionStorage.getItem('__fullDataCache');
    if (cached) return JSON.parse(cached);
  }

  // Fetch from server (Redis or DB)
  if (state.uploadedData?.datasetId && window.__user?.id) {
    const data = await fetchFullDataFromServer(
      state.uploadedData.datasetId,
      window.__user.id
    );

    // Cache in sessionStorage for this session
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('__fullDataCache', JSON.stringify(data));
    }

    return data;
  }

  // Fallback to sampleRows
  console.warn('[useDataStore] Using sampleRows fallback');
  return state.uploadedData?.preview?.sampleRows || null;
}
```

### Other Redis Use Cases for Your SaaS

#### Rate Limiting
```typescript
// lib/redis.ts
export const checkRateLimit = async (
  userId: string,
  action: string,
  limit: number,
  window: number = 3600 // 1 hour
): Promise<boolean> => {
  const key = `rate_limit:${userId}:${action}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, window);
  }

  return current <= limit;
};

// Usage in AI endpoint
const canMakeRequest = await checkRateLimit(userId, 'ai_insights', 100);
if (!canMakeRequest) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
}
```

#### Background Job Queue
```typescript
import { Queue } from 'bullmq';

const dataProcessingQueue = new Queue('data-processing', {
  connection: redis
});

// Add job
await dataProcessingQueue.add('process-large-file', {
  fileId,
  userId
});

// Worker processes in background
```

#### Real-time Analytics
```typescript
// Track active users
await redis.sadd('active_users', userId);
await redis.expire(`active_users`, 300); // 5 min window

// Dashboard metrics
const activeCount = await redis.scard('active_users');
```

## Cost & Hosting Options

### Free Tier Options:
1. **Upstash Redis** (Recommended)
   - 10,000 commands/day free
   - Perfect for development
   - Serverless (pay-as-you-go after)

2. **Redis Cloud**
   - 30MB free tier
   - Good for testing

3. **Railway** / **Render**
   - $5-10/month for Redis instance
   - Easy deployment

### Production Setup:
- **Upstash**: ~$20-50/month for serious usage
- **AWS ElastiCache**: Scales to enterprise
- **Redis Enterprise**: High availability

## Environment Variables

Add to `.env.local`:
```
REDIS_URL=redis://default:password@host:port
# Or for Upstash:
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Benefits Summary

| Feature | Before (SessionStorage) | After (Redis) |
|---------|------------------------|---------------|
| Data Persistence | Lost on refresh sometimes | Always available |
| Cross-Device | No | Yes |
| Max Dataset Size | ~5-10MB | Unlimited |
| Performance | Browser dependent | Sub-millisecond |
| Scalability | Per-user limit | Global cache |
| Cost | Free | ~$20/month production |

## Next Steps

1. Sign up for Upstash (5 minutes): https://upstash.com
2. Create Redis database (1 click)
3. Copy connection URL
4. Implement Redis client (20 minutes)
5. Update upload API (10 minutes)
6. Test with your dataset

## Migration Strategy

1. Deploy Redis changes
2. Existing users: Data works from Supabase fallback
3. New uploads: Cached in Redis automatically
4. Gradually migrate old datasets on-demand
5. Monitor Redis hit rate in logs

Would you like me to implement Redis integration right now?
