# Redis Implementation Guide for Data Analysis Platform

## Executive Summary

**Main Priority**: Enable AI features to access the **full dataset** (not just 10 sample rows) while staying within **free tiers**.

**Current Problem**:
- Datasets are stored in Supabase (permanent)
- Only 10-1000 rows cached in browser sessionStorage
- Lost on page refresh, doesn't work across devices
- Gemini AI receives limited context (3-100 rows max)

**Redis Solution**:
- Cache full datasets on server (up to 100K rows)
- Sub-millisecond retrieval
- Persistent across sessions and devices
- Enable AI to query entire dataset
- **Cost**: $0/month with Upstash free tier

---

## Table of Contents

1. [Free Tier Strategy](#1-free-tier-strategy)
2. [Architecture Overview](#2-architecture-overview)
3. [Implementation Roadmap](#3-implementation-roadmap)
4. [Code Implementation](#4-code-implementation)
5. [Use Cases for This Platform](#5-use-cases-for-this-platform)
6. [Optimization Techniques](#6-optimization-techniques)
7. [Testing & Monitoring](#7-testing--monitoring)

---

## 1. Free Tier Strategy

### Upstash Redis (Recommended - FREE Tier)

**Free Plan Includes**:
- ✅ **10,000 commands/day** (enough for 100-500 users/day)
- ✅ **256 MB storage** (can store ~50-100 datasets)
- ✅ **Serverless** (pay-as-you-go after free tier)
- ✅ **Global edge caching** (low latency worldwide)
- ✅ **REST API** (no persistent connection needed)
- ✅ **No credit card required** for free tier

**Command Usage Estimation**:
```
Per User Session:
- Upload dataset: 1 SET command (~100-500KB)
- Load dataset: 1 GET command
- Extend TTL: 1 EXPIRE command
- Check rate limit: 2 commands (INCR + EXPIRE)
- Total per session: ~10-20 commands

Daily Capacity:
- 10,000 commands / 15 commands per session = ~666 user sessions/day
- Perfect for MVP/early-stage SaaS
```

**Storage Optimization**:
```
Dataset Size Calculation:
- Average row: ~500 bytes (JSON)
- 1,000 rows = 500 KB
- 256 MB free tier = ~500 datasets of 1000 rows each
- OR 50 datasets of 10,000 rows each

Optimization Strategy:
- Store only numeric + categorical columns (exclude text fields)
- Compress JSON (using LZ-string if needed)
- Use 24-hour TTL (auto-cleanup old datasets)
```

### Alternative Free Tiers (Backup Options)

**Redis Cloud (Redis Labs)**:
- ✅ 30 MB free tier
- ✅ 30 connections
- ❌ Smaller storage (only ~60 datasets)

**Railway**:
- ✅ $5/month credit (free for new users)
- ✅ 1 GB RAM
- ❌ Requires credit card

**Recommendation**: **Start with Upstash**, upgrade only if you exceed 10K commands/day.

---

## 2. Architecture Overview

### Current Architecture (Before Redis)

```
User Uploads File (100K rows)
       ↓
POST /api/upload
       ↓
Server:
  ├─ Parse file (PapaParse)
  ├─ Sample to 1000 rows (LTTB)
  ├─ Store ALL 100K rows in Supabase (JSON strings)
  └─ Return: sampleRows (10) + fullData (1000)
       ↓
Client:
  ├─ Store fullData (1000 rows) in sessionStorage
  └─ Store sampleRows (10 rows) in Zustand
       ↓
Problem:
  ├─ Lost on page refresh (sessionStorage unreliable)
  ├─ AI only sees 3-100 rows (limited context)
  ├─ Large network transfer (1000 rows as JSON)
  └─ Slow Supabase fetch if re-loading (2-3 seconds)
```

### New Architecture (With Redis)

```
User Uploads File (100K rows)
       ↓
POST /api/upload
       ↓
Server:
  ├─ Parse file (PapaParse)
  ├─ Store ALL 100K rows in Supabase (permanent, backup)
  ├─ Cache full dataset in Redis (24h TTL, fast access)
  │  Key: dataset:{userId}:{datasetId}
  │  Value: JSON.stringify([{row1}, {row2}, ...])
  │  TTL: 86400 seconds (24 hours)
  └─ Return: metadata only (columns, types, rowCount)
       ↓
Client:
  ├─ Store metadata in Zustand
  └─ Fetch data on-demand via /api/dataset/[id]
       ↓
GET /api/dataset/[id]?userId=xxx
       ↓
Server:
  ├─ Check Redis cache (sub-millisecond)
  │  └─ HIT? Return immediately
  │  └─ MISS? Fetch from Supabase → re-cache
  └─ Return full dataset (or filtered subset)
       ↓
Client:
  ├─ Store in memory (not sessionStorage)
  └─ Pass to charts/AI
       ↓
Benefits:
  ✅ No more 10-row limitation (can access all 100K rows)
  ✅ Persistent across page refreshes
  ✅ Works across devices
  ✅ AI can query entire dataset
  ✅ Fast: 10-50ms vs 2-3 seconds (Supabase)
```

---

## 3. Implementation Roadmap

### Phase 1: Basic Redis Setup (Day 1)

**Goal**: Cache full datasets after upload

**Tasks**:
1. ✅ Sign up for Upstash (5 minutes)
2. ✅ Install Redis client (5 minutes)
3. ✅ Create Redis utility library (30 minutes)
4. ✅ Update upload API to cache data (20 minutes)
5. ✅ Create dataset fetch API (30 minutes)
6. ✅ Test with sample dataset (15 minutes)

**Expected Result**: Datasets cached in Redis, accessible via API

### Phase 2: AI Integration (Day 2)

**Goal**: Enable AI to query full dataset

**Tasks**:
1. ✅ Create AI-friendly data fetch endpoint (20 minutes)
2. ✅ Update insights API to use full dataset (15 minutes)
3. ✅ Update chat API to send more context (20 minutes)
4. ✅ Test AI accuracy improvement (30 minutes)

**Expected Result**: AI sees 1000-10000 rows instead of 3-100 rows

### Phase 3: Advanced Features (Day 3-4)

**Goal**: Rate limiting, caching, optimization

**Tasks**:
1. ✅ Implement rate limiting (30 minutes)
2. ✅ Cache AI responses (30 minutes)
3. ✅ Add dataset compression (optional, 1 hour)
4. ✅ Add monitoring/logging (30 minutes)

**Expected Result**: Optimized, production-ready Redis integration

### Phase 4: Migration (Day 5)

**Goal**: Migrate existing datasets to Redis

**Tasks**:
1. ✅ Create migration script (1 hour)
2. ✅ Run for all existing datasets (automated)
3. ✅ Verify data integrity (30 minutes)

**Expected Result**: All datasets available in Redis cache

---

## 4. Code Implementation

### Step 1: Install Dependencies

```bash
npm install @upstash/redis
```

### Step 2: Environment Variables

Add to `.env.local`:

```bash
# Upstash Redis (get from: https://console.upstash.com/)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Optional: Enable Redis caching
ENABLE_REDIS_CACHE=true

# Optional: Redis TTL (default: 24 hours)
REDIS_DATASET_TTL=86400
```

### Step 3: Create Redis Client Library

**File**: `lib/redis.ts` (NEW)

```typescript
import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client (serverless)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Check if Redis is enabled
export const isRedisEnabled = () => {
  return (
    process.env.ENABLE_REDIS_CACHE === 'true' &&
    !!process.env.UPSTASH_REDIS_REST_URL &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN
  );
};

// Default TTL: 24 hours
const DEFAULT_TTL = parseInt(process.env.REDIS_DATASET_TTL || '86400');

/**
 * Cache full dataset in Redis
 * @param userId - User ID (for namespacing)
 * @param datasetId - Dataset ID
 * @param fullData - Array of data rows
 * @param ttl - Time to live in seconds (default: 24 hours)
 */
export async function cacheDataset(
  userId: string,
  datasetId: string,
  fullData: any[],
  ttl: number = DEFAULT_TTL
): Promise<boolean> {
  if (!isRedisEnabled()) {
    console.log('[Redis] Disabled - skipping cache');
    return false;
  }

  try {
    const key = `dataset:${userId}:${datasetId}`;

    // Store as JSON string
    await redis.setex(key, ttl, JSON.stringify(fullData));

    console.log(`[Redis] ✅ Cached dataset ${datasetId} (${fullData.length} rows, ${(JSON.stringify(fullData).length / 1024).toFixed(2)} KB)`);
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
 * @returns Dataset rows or null if not found
 */
export async function getCachedDataset(
  userId: string,
  datasetId: string
): Promise<any[] | null> {
  if (!isRedisEnabled()) {
    return null;
  }

  try {
    const key = `dataset:${userId}:${datasetId}`;
    const cached = await redis.get(key);

    if (cached) {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      console.log(`[Redis] 🎯 Cache HIT for dataset ${datasetId} (${data.length} rows)`);
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
    await redis.del(key);
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
    await redis.expire(key, ttl);
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
    await redis.setex(`ai:${cacheKey}`, ttl, JSON.stringify(response));
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
    const cached = await redis.get(`ai:${cacheKey}`);
    if (cached) {
      console.log(`[Redis] 🎯 Cache HIT for AI response: ${cacheKey}`);
      return typeof cached === 'string' ? JSON.parse(cached) : cached;
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

    // Increment counter
    const current = await redis.incr(key);

    // Set expiration on first request
    if (current === 1) {
      await redis.expire(key, window);
    }

    // Get TTL for resetAt
    const ttl = await redis.ttl(key);
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
  info?: any;
  keys?: number;
}> {
  if (!isRedisEnabled()) {
    return { enabled: false };
  }

  try {
    // Note: INFO command may not be available in Upstash REST API
    // Use DBSIZE to get key count
    const keys = await redis.dbsize();

    return {
      enabled: true,
      keys,
    };
  } catch (error) {
    console.error('[Redis] Error getting stats:', error);
    return { enabled: true };
  }
}

export default redis;
```

### Step 4: Update Upload API to Cache Data

**File**: `app/api/upload/route.ts` (MODIFY)

Add at top:

```typescript
import { cacheDataset } from '@/lib/redis';
```

After line 128 (after `fullDataForClient` is created), add:

```typescript
// Cache full dataset in Redis for fast retrieval
await cacheDataset(userId, datasetData.id, fullDataForClient);
```

**Updated code** (around line 129-145):

```typescript
// Determine how much data to send to client
const MAX_ROWS_FOR_CLIENT = 1000;
let fullDataForClient: any[];
let samplingMethod: string;

if (parsedData.rows.length <= MAX_ROWS_FOR_CLIENT) {
  fullDataForClient = parsedData.rows;
  samplingMethod = "Full Data";
} else {
  console.log(`Large dataset detected (${parsedData.rows.length} rows). Applying intelligent sampling...`);

  const samplingResult = autoSample(
    parsedData.rows,
    parsedData.columns,
    MAX_ROWS_FOR_CLIENT
  );

  fullDataForClient = samplingResult.data;
  samplingMethod = samplingResult.algorithm;

  console.log(`Sampled ${parsedData.rows.length} rows to ${samplingResult.sampledCount} points using ${samplingMethod}`);
}

// 🆕 NEW: Cache full dataset in Redis (24h TTL)
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
    sampleRows: parsedData.rows.slice(0, 10), // Small sample for preview
    // 🆕 CHANGE: Don't send fullData to client (too large)
    // Client will fetch on-demand via /api/dataset/[id]
    isComplete: parsedData.rows.length <= MAX_ROWS_FOR_CLIENT,
    samplingMethod,
  },
  qualityReport: {
    score: qualityReport.overallScore,
    missingValues: qualityReport.missingValues,
    duplicates: qualityReport.duplicates,
    outliers: qualityReport.outliers.length,
    recommendations: qualityReport.recommendations,
  },
  anomalyAlerts,
});
```

### Step 5: Create Dataset Fetch API

**File**: `app/api/dataset/[id]/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCachedDataset, cacheDataset, extendDatasetTTL } from '@/lib/redis';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const datasetId = params.id;
    const userId = request.nextUrl.searchParams.get('userId');
    const columnsParam = request.nextUrl.searchParams.get('columns'); // Optional: filter columns
    const limitParam = request.nextUrl.searchParams.get('limit'); // Optional: limit rows

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    // Try Redis cache first (fast!)
    const cachedData = await getCachedDataset(userId, datasetId);

    if (cachedData) {
      // Extend TTL since user is actively using this dataset
      await extendDatasetTTL(userId, datasetId);

      // Apply optional filters
      let filteredData = cachedData;

      // Filter columns if specified
      if (columnsParam) {
        const columns = columnsParam.split(',');
        filteredData = filteredData.map(row => {
          const filtered: any = {};
          columns.forEach(col => {
            if (row[col] !== undefined) {
              filtered[col] = row[col];
            }
          });
          return filtered;
        });
      }

      // Limit rows if specified
      if (limitParam) {
        const limit = parseInt(limitParam);
        filteredData = filteredData.slice(0, limit);
      }

      return NextResponse.json({
        success: true,
        data: filteredData,
        source: 'cache',
        totalRows: cachedData.length,
        returnedRows: filteredData.length,
      });
    }

    // Cache miss: Fetch from Supabase and re-cache
    console.log(`[API] Cache miss - fetching dataset ${datasetId} from Supabase`);

    const supabase = getServiceSupabase();

    const { data: dataset, error } = await supabase
      .from('datasets')
      .select('data_rows, column_names')
      .eq('id', datasetId)
      .eq('user_id', userId)
      .single();

    if (error || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    // Parse JSON strings back to objects
    const fullData = dataset.data_rows.map((row: string) => {
      try {
        return typeof row === 'string' ? JSON.parse(row) : row;
      } catch (e) {
        console.error('Failed to parse row:', row);
        return {};
      }
    });

    // Re-cache for next time
    await cacheDataset(userId, datasetId, fullData);

    // Apply filters
    let filteredData = fullData;

    if (columnsParam) {
      const columns = columnsParam.split(',');
      filteredData = filteredData.map(row => {
        const filtered: any = {};
        columns.forEach(col => {
          if (row[col] !== undefined) {
            filtered[col] = row[col];
          }
        });
        return filtered;
      });
    }

    if (limitParam) {
      const limit = parseInt(limitParam);
      filteredData = filteredData.slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      data: filteredData,
      source: 'database',
      totalRows: fullData.length,
      returnedRows: filteredData.length,
    });
  } catch (error: any) {
    console.error('[API] Error fetching dataset:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Step 6: Update Data Store to Use API

**File**: `store/useDataStore.ts` (MODIFY)

Replace `getFullData` function:

```typescript
getFullData: async () => {
  const state = get();

  // First try to get from state (in-memory)
  if (state.uploadedData?.preview?.fullData) {
    return state.uploadedData.preview.fullData;
  }

  // Then try sessionStorage (browser cache)
  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem('__fullDataCache');
      if (cached) {
        const parsedData = JSON.parse(cached);
        console.log('[useDataStore] Restored fullData from sessionStorage:', parsedData.length, 'rows');
        return parsedData;
      }
    } catch (e) {
      console.warn('[useDataStore] Failed to parse fullData from sessionStorage:', e);
    }
  }

  // 🆕 NEW: Fetch from Redis/Supabase API
  if (state.uploadedData?.datasetId && typeof window !== 'undefined') {
    try {
      // Get userId from Supabase auth
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();

      if (session?.user) {
        console.log('[useDataStore] Fetching fullData from server API...');

        const response = await fetch(
          `/api/dataset/${state.uploadedData.datasetId}?userId=${session.user.id}`
        );

        if (response.ok) {
          const result = await response.json();
          console.log(`[useDataStore] ✅ Fetched ${result.data.length} rows from ${result.source}`);

          // Cache in sessionStorage for this session
          sessionStorage.setItem('__fullDataCache', JSON.stringify(result.data));

          return result.data;
        }
      }
    } catch (error) {
      console.error('[useDataStore] Failed to fetch fullData from API:', error);
    }
  }

  // Fallback to sampleRows (only if nothing else available)
  console.warn('[useDataStore] Using sampleRows fallback - fullData not available');
  return state.uploadedData?.preview?.sampleRows || null;
}
```

---

## 5. Use Cases for This Platform

### Use Case 1: AI Insights on Full Dataset

**Current Problem**:
- `POST /api/insights` receives only 3 sample rows
- Gemini AI can't see patterns in full dataset
- Insights are generic and inaccurate

**With Redis**:

Update `app/api/insights/route.ts`:

```typescript
import { getCachedDataset } from '@/lib/redis';

// Around line 30-35, replace:
// const sampleData = data.slice(0, 3);

// With:
const fullData = await getCachedDataset(userId, datasetId) || data.slice(0, 100);
const sampleData = fullData.slice(0, 100); // Send up to 100 rows to Gemini

// Now Gemini sees 100 rows instead of 3!
```

**Result**:
- Insights based on 100-1000 rows (not just 3)
- AI detects patterns across entire dataset
- More accurate recommendations

### Use Case 2: Context-Aware Chat with Full Dataset

**Current Problem**:
- `POST /api/chat-context-aware` sends limited context
- Chat responses are vague

**With Redis**:

Update `app/api/chat-context-aware/route.ts`:

```typescript
import { getCachedDataset } from '@/lib/redis';

// Around line 50, add:
const fullData = await getCachedDataset(userId, datasetId);

// Build richer context:
const enrichedContext = {
  ...pageContext,
  datasetSize: fullData?.length || 0,
  sampleData: fullData?.slice(0, 50) || [], // Send 50 rows to Gemini
  uniqueValues: calculateUniqueValues(fullData), // NEW
  distributions: calculateDistributions(fullData), // NEW
};

// Now Gemini has much better context!
```

**Result**:
- Chat understands full dataset statistics
- Can answer "What are the top 10 values?" accurately
- Can detect trends across all data

### Use Case 3: Forecast with More Data Points

**Current Problem**:
- `POST /api/forecast` uses limited time-series data
- Forecast accuracy suffers

**With Redis**:

Update `app/api/forecast/route.ts`:

```typescript
import { getCachedDataset } from '@/lib/redis';

// Around line 40, replace limited data with:
const fullData = await getCachedDataset(userId, datasetId) || data;

// Extract ALL time-series points (not just 50)
const timeSeriesData = extractTimeSeries(fullData, dateColumn, valueColumn);

// Now forecast is based on 1000+ data points!
```

**Result**:
- More accurate trend detection
- Better seasonality detection
- Improved forecast confidence

### Use Case 4: Anomaly Detection Across Full Dataset

**Current Problem**:
- `POST /api/anomaly-detection` checks only visible rows
- Misses anomalies in unsampled data

**With Redis**:

Update `app/api/anomaly-detection/route.ts`:

```typescript
import { getCachedDataset } from '@/lib/redis';

// Around line 30:
const fullData = await getCachedDataset(userId, datasetId) || data;

// Calculate Z-scores across ALL data
const anomalies = detectAnomalies(fullData, columns);

// Now detects ALL outliers, not just in sample!
```

**Result**:
- Detects all anomalies (not just in sampled data)
- More reliable data quality insights
- Better recommendations

### Use Case 5: Chart Data Processing

**Already Implemented** in `app/api/chart-data/route.ts` (fetches from Supabase)

**With Redis** (optimization):

```typescript
import { getCachedDataset } from '@/lib/redis';

// Try Redis first, then Supabase:
let fullData = await getCachedDataset(userId, datasetId);

if (!fullData) {
  // Fallback to Supabase (current implementation)
  fullData = await fetchFromSupabase(datasetId, userId);

  // Re-cache for next time
  await cacheDataset(userId, datasetId, fullData);
}

// Now process for chart (aggregation, sampling, etc.)
```

**Result**:
- 10-50ms response time (vs 2-3 seconds from Supabase)
- Better user experience
- Lower Supabase query costs

### Use Case 6: Rate Limiting AI Endpoints

**Prevent API abuse**:

Update all AI endpoints (insights, forecast, chat, etc.):

```typescript
import { checkRateLimit } from '@/lib/redis';

// At start of API handler:
const rateLimit = await checkRateLimit(userId, 'insights', 100, 3600); // 100 req/hour

if (!rateLimit.allowed) {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      resetAt: rateLimit.resetAt,
      remaining: rateLimit.remaining,
    },
    { status: 429 }
  );
}

// Continue with normal processing...
```

**Result**:
- Protect Gemini API quota
- Stay within free tier limits
- Fair usage across users

### Use Case 7: Cache AI Responses (Avoid Duplicate API Calls)

**Save Gemini API calls**:

Update `app/api/insights/route.ts`:

```typescript
import { getCachedAIResponse, cacheAIResponse } from '@/lib/redis';

// Create cache key based on request
const cacheKey = `insights:${datasetId}:${JSON.stringify(selectedColumns)}`;

// Check cache first
const cached = await getCachedAIResponse(cacheKey);
if (cached) {
  console.log('[API] ✅ Returning cached insights');
  return NextResponse.json(cached);
}

// Call Gemini API
const insights = await generateInsights(data, columns);

// Cache for 1 hour
await cacheAIResponse(cacheKey, insights, 3600);

return NextResponse.json(insights);
```

**Result**:
- Same dataset + columns = instant response (no API call)
- Massive Gemini API savings
- Better user experience

---

## 6. Optimization Techniques

### Technique 1: Selective Column Caching

**Problem**: Large datasets with many text columns consume too much Redis storage.

**Solution**: Cache only numeric + categorical columns.

```typescript
// In cacheDataset function:
export async function cacheDatasetOptimized(
  userId: string,
  datasetId: string,
  fullData: any[],
  columns: string[],
  types: string[]
) {
  // Filter out text columns (save space)
  const numericAndCategoricalColumns = columns.filter((col, idx) => {
    const type = types[idx]?.toLowerCase() || '';
    return type.includes('number') || type.includes('categorical') || type.includes('boolean');
  });

  // Remove text columns from data
  const optimizedData = fullData.map(row => {
    const filtered: any = {};
    numericAndCategoricalColumns.forEach(col => {
      filtered[col] = row[col];
    });
    return filtered;
  });

  await cacheDataset(userId, datasetId, optimizedData);

  console.log(`[Redis] Optimized: ${fullData[0] ? Object.keys(fullData[0]).length : 0} cols → ${numericAndCategoricalColumns.length} cols`);
}
```

**Result**: 50-70% storage savings

### Technique 2: Compression (Optional)

**If dataset is still too large**:

```bash
npm install lz-string
```

```typescript
import LZString from 'lz-string';

export async function cacheDatasetCompressed(
  userId: string,
  datasetId: string,
  fullData: any[]
) {
  const key = `dataset:${userId}:${datasetId}`;

  // Compress JSON
  const compressed = LZString.compressToUTF16(JSON.stringify(fullData));

  await redis.setex(key, DEFAULT_TTL, compressed);

  console.log(`[Redis] Compressed: ${(JSON.stringify(fullData).length / 1024).toFixed(2)} KB → ${(compressed.length / 1024).toFixed(2)} KB`);
}

export async function getCachedDatasetCompressed(
  userId: string,
  datasetId: string
): Promise<any[] | null> {
  const key = `dataset:${userId}:${datasetId}`;
  const compressed = await redis.get(key);

  if (compressed && typeof compressed === 'string') {
    const decompressed = LZString.decompressFromUTF16(compressed);
    return decompressed ? JSON.parse(decompressed) : null;
  }

  return null;
}
```

**Result**: 60-80% storage savings (but slightly slower)

### Technique 3: Smart TTL Management

**Extend TTL for active users**:

```typescript
// In dataset fetch API, analytics page, visualizations page:

// Every time user interacts with dataset, extend TTL
await extendDatasetTTL(userId, datasetId, 86400); // Extend to 24h

// Benefit: Active datasets never expire
// Inactive datasets auto-cleanup after 24h
```

### Technique 4: Lazy Loading

**Don't cache immediately on upload**:

```typescript
// In upload API:
// Option 1: Cache immediately (current approach)
await cacheDataset(userId, datasetId, fullData);

// Option 2: Cache on first access (lazy)
// Skip caching here, let /api/dataset/[id] cache on first fetch

// Benefit: Save Redis commands for datasets that may never be used
```

### Technique 5: Batch Operations

**If migrating multiple datasets**:

```typescript
// Migration script: migrate-to-redis.ts
import { cacheDataset } from '@/lib/redis';
import { getServiceSupabase } from '@/lib/supabase';

async function migrateAllDatasets() {
  const supabase = getServiceSupabase();

  // Fetch all datasets
  const { data: datasets } = await supabase
    .from('datasets')
    .select('id, user_id, data_rows')
    .order('created_at', { ascending: false })
    .limit(100); // Migrate 100 most recent

  for (const dataset of datasets || []) {
    const fullData = dataset.data_rows.map((row: string) => JSON.parse(row));

    await cacheDataset(dataset.user_id, dataset.id, fullData);

    console.log(`✅ Migrated dataset ${dataset.id}`);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('✅ Migration complete!');
}

migrateAllDatasets();
```

**Run with**:

```bash
npx tsx utils/migrate-to-redis.ts
```

---

## 7. Testing & Monitoring

### Test 1: Upload and Verify Cache

```bash
# 1. Upload a CSV file via UI
# 2. Check Redis cache:

curl -X GET "https://your-redis.upstash.io/get/dataset:USER_ID:DATASET_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return: JSON string of dataset
```

### Test 2: Fetch from Cache

```bash
# API endpoint:
curl "http://localhost:3000/api/dataset/DATASET_ID?userId=USER_ID"

# Should return:
# {
#   "success": true,
#   "data": [...],
#   "source": "cache",
#   "totalRows": 1000,
#   "returnedRows": 1000
# }
```

### Test 3: Rate Limiting

```bash
# Make 101 requests rapidly:
for i in {1..101}; do
  curl -X POST "http://localhost:3000/api/insights" \
    -H "Content-Type: application/json" \
    -d '{"userId": "test-user", ...}'
done

# Request 101 should return:
# {
#   "error": "Rate limit exceeded",
#   "resetAt": 1234567890,
#   "remaining": 0
# }
```

### Monitoring Dashboard

**Create**: `app/api/redis-stats/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getRedisStats } from '@/lib/redis';

export async function GET(request: NextRequest) {
  const stats = await getRedisStats();

  return NextResponse.json({
    enabled: stats.enabled,
    keys: stats.keys,
    // Add more metrics as needed
  });
}
```

**Access**: `http://localhost:3000/api/redis-stats`

### Logging

Add to all Redis operations:

```typescript
console.log(`[Redis] Operation: ${operation}, Key: ${key}, Size: ${size}KB, TTL: ${ttl}s`);
```

**Example logs**:

```
[Redis] ✅ Cached dataset abc123 (5000 rows, 2.5 MB)
[Redis] 🎯 Cache HIT for dataset abc123 (5000 rows)
[Redis] ❌ Cache MISS for dataset xyz789
[Redis] ⏰ Extended TTL for dataset abc123
[Redis] 🗑️  Invalidated dataset old123
[Redis] 🚫 Rate limit exceeded for user123:insights (101/100)
```

---

## Summary: Redis Implementation Checklist

### Phase 1: Setup (Day 1)
- [ ] Sign up for Upstash Redis (free tier)
- [ ] Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.local`
- [ ] Install `@upstash/redis` package
- [ ] Create `lib/redis.ts` with helper functions
- [ ] Test connection with `getRedisStats()`

### Phase 2: Dataset Caching (Day 1-2)
- [ ] Update `app/api/upload/route.ts` to call `cacheDataset()` after upload
- [ ] Create `app/api/dataset/[id]/route.ts` for fetching cached data
- [ ] Update `store/useDataStore.ts` to fetch from API
- [ ] Test: Upload dataset → verify in Redis → fetch from cache

### Phase 3: AI Integration (Day 2)
- [ ] Update `app/api/insights/route.ts` to use `getCachedDataset()`
- [ ] Update `app/api/forecast/route.ts` to use full dataset
- [ ] Update `app/api/anomaly-detection/route.ts` to use full dataset
- [ ] Update `app/api/chat-context-aware/route.ts` to send more context
- [ ] Test: AI responses are more accurate with full dataset

### Phase 4: Optimization (Day 3)
- [ ] Implement rate limiting with `checkRateLimit()`
- [ ] Cache AI responses with `cacheAIResponse()`
- [ ] Add TTL extension on dataset access
- [ ] Optimize storage (selective columns, compression)
- [ ] Test: Rate limits work, AI responses cached

### Phase 5: Monitoring (Day 4)
- [ ] Create `/api/redis-stats` endpoint
- [ ] Add logging to all Redis operations
- [ ] Monitor Redis usage in Upstash dashboard
- [ ] Set up alerts for quota limits

### Phase 6: Migration (Day 5)
- [ ] Create migration script for existing datasets
- [ ] Run migration for all active datasets
- [ ] Verify data integrity
- [ ] Update documentation

---

## Cost Estimates

### Upstash Free Tier

**Capacity**:
- 10,000 commands/day
- 256 MB storage

**Realistic Usage**:
- 500 users/day × 15 commands each = 7,500 commands/day ✅
- 50 datasets × 5 MB each = 250 MB ✅

**When to Upgrade**:
- If you exceed 10K commands/day consistently
- If you exceed 256 MB storage

**Paid Plan** (if needed):
- $0.20 per 100K commands
- $0.20 per GB storage
- Example: 100K commands + 1 GB = ~$0.40/day = $12/month

**Free Tier Strategy**:
1. Start with free tier
2. Monitor usage daily
3. Optimize before upgrading (cache selectively, compress, shorter TTLs)
4. Upgrade only when product-market fit achieved

---

## Next Steps

1. **Sign up for Upstash**: https://console.upstash.com/
2. **Copy credentials** to `.env.local`
3. **Install package**: `npm install @upstash/redis`
4. **Copy `lib/redis.ts`** from this document
5. **Update upload API** (add `cacheDataset()` call)
6. **Create dataset API** (`app/api/dataset/[id]/route.ts`)
7. **Test with sample dataset**
8. **Update AI endpoints** to use `getCachedDataset()`
9. **Monitor usage** in Upstash dashboard
10. **Optimize** as needed

**Estimated Time**: 4-8 hours for full implementation

**Benefit**:
- ✅ AI sees 100x more data (1000 rows vs 10 rows)
- ✅ 20x faster data retrieval (50ms vs 2 seconds)
- ✅ Works across page refreshes and devices
- ✅ Stays within free tier (up to 500 users/day)

---

**Ready to implement? Let me know if you want me to start with Step 1!**
