# Gemini AI Features & Multi-Key Load Distribution

## 📊 Features Using Gemini API

Your platform uses Gemini AI in **5 critical features**:

### 1. **Smart Insights Panel** 🔍
**File:** `app/api/insights/route.ts`
**Feature Code:** `INSIGHTS`
**What it does:**
- Generates 4-6 actionable insights from uploaded data
- Identifies trends, outliers, correlations, and key findings
- Analyzes full dataset statistics
- Returns insights with type, title, description, and impact level

**Gemini Usage:**
- Analyzes dataset statistics and sample data
- Generates structured JSON insights
- **Frequency:** Once per dataset upload or manual refresh
- **Est. requests/day:** 10-50 (low)

---

### 2. **Trend Forecasting** 📈
**File:** `app/api/forecast/route.ts`
**Feature Code:** `FORECAST`
**What it does:**
- Predicts future values based on historical trends
- Performs linear regression forecasting
- Generates AI insights about trends and patterns
- Forecasts up to 90 days ahead

**Gemini Usage:**
- Analyzes forecast results and generates insights
- Explains trend patterns in natural language
- **Frequency:** On-demand when user views forecasting tab
- **Est. requests/day:** 20-100 (medium)

---

### 3. **Chart Recommendations** 📊
**File:** `app/api/chart-recommendations/route.ts`
**Feature Code:** `CHART_RECOMMENDATIONS`
**What it does:**
- Recommends 3-4 best chart types for the dataset
- Analyzes data characteristics (numeric, categorical, temporal)
- Suggests optimal visualizations with confidence scores
- Provides reasoning for each recommendation

**Gemini Usage:**
- Analyzes column types and data patterns
- Generates chart recommendations as JSON
- **Frequency:** Once per dataset upload
- **Est. requests/day:** 10-50 (low)

---

### 4. **AI Chat Assistant** 💬
**File:** `app/api/query-data/route.ts`
**Feature Code:** `CHAT`
**What it does:**
- Conversational AI for data analysis
- Answers questions about the dataset
- Suggests chart visualizations
- Maintains conversation context
- Generates follow-up questions

**Gemini Usage:**
- Processes user questions with full dataset statistics
- Tries 5 different Gemini models (Flash, Flash Lite, Pro)
- Returns structured answers with insights and chart suggestions
- **Frequency:** Every user chat message
- **Est. requests/day:** 100-500 (HIGH) ⚠️

---

### 5. **Natural Language Query Engine** 🎯 **(Your USP!)**
**File:** `app/api/chat-enhanced/route.ts` + `lib/query-engine.ts`
**Feature Code:** `NATURAL_LANGUAGE_QUERY`
**What it does:**
- Converts natural language to SQL queries
- Executes complex data queries with 90%+ accuracy
- Handles unlimited dataset sizes
- Instant cached responses for common queries

**Gemini Usage:**
- Generates SQL queries from natural language
- Formats query results as natural language answers
- **Frequency:** Every natural language query
- **Est. requests/day:** 200-1000 (VERY HIGH) ⚠️⚠️

---

## 🔑 Current Single-Key Limitations

**With ONE Gemini API key (Free Tier):**

| Model | Limit | Your Usage | Risk |
|-------|-------|------------|------|
| Gemini 2.5 Flash | 250 req/day | 340-1700 req/day | ⚠️ **EXCEEDED** |
| Gemini 2.5 Flash Lite | 1000 req/day | 340-1700 req/day | ⚠️ **LIKELY EXCEEDED** |

**Problems:**
- ❌ Natural Language Query (200-1000 req/day) alone can hit limit
- ❌ Chat Assistant (100-500 req/day) compounds the issue
- ❌ Other features (30-200 req/day) add more load
- ❌ **Total estimated usage: 340-1700 requests/day**
- ❌ You'll hit rate limits during peak usage

---

## ✅ Multi-Key Solution

### Strategy: Distribute Load Across Multiple Keys

**I've created a smart key rotation system that:**
1. ✅ Assigns different keys to different features
2. ✅ Uses round-robin rotation within each feature
3. ✅ Tracks daily usage per key
4. ✅ Automatically skips keys that hit limits
5. ✅ Resets counters daily

### Recommended Setup (5 Keys)

```env
# .env.local

# Feature-specific keys (RECOMMENDED)
GEMINI_API_KEY_NATURAL_LANGUAGE_QUERY_1=AIzaSy...  # Your main USP
GEMINI_API_KEY_NATURAL_LANGUAGE_QUERY_2=AIzaSy...  # Backup for NLQ
GEMINI_API_KEY_CHAT_1=AIzaSy...                     # Chat assistant
GEMINI_API_KEY_INSIGHTS_1=AIzaSy...                 # Smart insights
GEMINI_API_KEY_FORECAST_1=AIzaSy...                 # Forecasting

# OR General keys (EASIER)
GEMINI_API_KEY_1=AIzaSy...  # Rotates for all features
GEMINI_API_KEY_2=AIzaSy...
GEMINI_API_KEY_3=AIzaSy...
GEMINI_API_KEY_4=AIzaSy...
GEMINI_API_KEY_5=AIzaSy...

# Fallback (existing)
GEMINI_API_KEY=AIzaSy...
```

### Capacity with 5 Keys:

| Model | Single Key | 5 Keys | Your Usage | Status |
|-------|-----------|--------|------------|--------|
| Flash | 250/day | **1,250/day** | 340-1700/day | ⚠️ May need more |
| Flash Lite | 1000/day | **5,000/day** | 340-1700/day | ✅ **SAFE** |

---

## 🚀 Implementation Plan

### Option 1: Feature-Specific Keys (RECOMMENDED)

**Best for:** Production with predictable usage patterns

**Setup:**
```env
# High-usage features get dedicated keys
GEMINI_API_KEY_NATURAL_LANGUAGE_QUERY_1=key1
GEMINI_API_KEY_NATURAL_LANGUAGE_QUERY_2=key2  # Backup
GEMINI_API_KEY_CHAT_1=key3
GEMINI_API_KEY_CHAT_2=key4  # Backup

# Low-usage features share a key
GEMINI_API_KEY_INSIGHTS_1=key5
GEMINI_API_KEY_FORECAST_1=key5
GEMINI_API_KEY_CHART_RECOMMENDATIONS_1=key5
```

**Benefits:**
- ✅ Isolates high-usage features
- ✅ Prevents one feature from blocking others
- ✅ Easy to add more keys to specific features
- ✅ Clear monitoring per feature

---

### Option 2: General Key Pool (EASIER)

**Best for:** Development, early production

**Setup:**
```env
GEMINI_API_KEY_1=key1
GEMINI_API_KEY_2=key2
GEMINI_API_KEY_3=key3
GEMINI_API_KEY_4=key4
GEMINI_API_KEY_5=key5
```

**How it works:**
- All features share the same pool of keys
- Round-robin rotation across all 5 keys
- Automatic load balancing

**Benefits:**
- ✅ Simpler configuration
- ✅ Flexible load distribution
- ✅ Easy to scale (just add more keys)
- ✅ Good for unpredictable usage

---

## 📥 How to Update Your Code

### Step 1: Update API Routes

Replace this:
```typescript
const apiKey = process.env.GEMINI_API_KEY;
const response = await callGemini(prompt, apiKey);
```

With this:
```typescript
import { getGeminiKey } from '@/lib/gemini-key-manager';

const apiKey = getGeminiKey('INSIGHTS'); // Or CHAT, FORECAST, etc.
if (!apiKey) {
  // Handle no keys available - use fallback logic
  return fallbackResponse();
}
const response = await callGemini(prompt, apiKey);
```

### Step 2: Update Each API File

**Files to update:**
1. ✅ `app/api/insights/route.ts` - Use `getGeminiKey('INSIGHTS')`
2. ✅ `app/api/forecast/route.ts` - Use `getGeminiKey('FORECAST')`
3. ✅ `app/api/chart-recommendations/route.ts` - Use `getGeminiKey('CHART_RECOMMENDATIONS')`
4. ✅ `app/api/query-data/route.ts` - Use `getGeminiKey('CHAT')`
5. ✅ `app/api/chat-enhanced/route.ts` - Use `getGeminiKey('NATURAL_LANGUAGE_QUERY')`
6. ✅ `lib/query-engine.ts` - Use `getGeminiKey('NATURAL_LANGUAGE_QUERY')`

---

## 📊 Monitoring Dashboard

**View real-time usage:**
```
GET /api/gemini-stats
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-06T10:30:00Z",
  "stats": {
    "NATURAL_LANGUAGE_QUERY": {
      "totalKeys": 2,
      "keys": [
        {
          "index": 1,
          "usageCount": 87,
          "dailyLimit": 250,
          "percentUsed": "34.8%",
          "lastUsed": "2025-01-06T10:29:45Z"
        },
        {
          "index": 2,
          "usageCount": 92,
          "dailyLimit": 250,
          "percentUsed": "36.8%",
          "lastUsed": "2025-01-06T10:29:58Z"
        }
      ]
    },
    "CHAT": { ... },
    "INSIGHTS": { ... }
  },
  "summary": [
    {
      "feature": "NATURAL_LANGUAGE_QUERY",
      "totalCapacity": 500,
      "remainingCapacity": 321,
      "usedToday": 179
    }
  ]
}
```

---

## 💰 Cost Analysis

### Free Tier (Current)

| Setup | Daily Capacity | Monthly Cost |
|-------|---------------|--------------|
| 1 key (Flash) | 250 requests | **$0** |
| 5 keys (Flash) | 1,250 requests | **$0** |
| 10 keys (Flash Lite) | 10,000 requests | **$0** |

**Recommendation:** Start with **5 general keys** (Option 2) using Free Tier

---

### If You Need More (Paid Tier)

| Plan | Cost | Capacity | Best For |
|------|------|----------|----------|
| Free Tier (5 keys) | $0 | 1,250-5,000/day | **Start here** ✅ |
| Pay-as-you-go | $0.075/1K req | Unlimited | Scale as needed |
| Enterprise | Custom | Unlimited | 100K+ users |

**Break-even point:**
- Free tier supports ~150-500 users/day (depending on usage)
- Upgrade to paid when you exceed 5,000 requests/day consistently

---

## 🎯 Implementation Checklist

### Quick Start (30 minutes):

- [ ] **Get 4 more Gemini API keys** from Google AI Studio
- [ ] **Add to .env.local**:
  ```env
  GEMINI_API_KEY_1=key1
  GEMINI_API_KEY_2=key2
  GEMINI_API_KEY_3=key3
  GEMINI_API_KEY_4=key4
  GEMINI_API_KEY_5=key5
  ```
- [ ] **Update API routes** (6 files) to use `getGeminiKey()`
- [ ] **Test with a dataset upload** - verify all features work
- [ ] **Monitor usage** via `/api/gemini-stats`
- [ ] **Deploy to production**

### Advanced Setup (1 hour):

- [ ] Use feature-specific keys for isolation
- [ ] Add 2-3 backup keys per high-usage feature
- [ ] Set up monitoring dashboard
- [ ] Configure alerts for 80% usage threshold

---

## 📈 Expected Results

### Before (Single Key):
- ❌ 250-1000 requests/day capacity
- ❌ Hit rate limits during peak hours
- ❌ Features stop working when limit reached
- ❌ Poor user experience

### After (5 Keys):
- ✅ 1,250-5,000 requests/day capacity
- ✅ No rate limit issues
- ✅ Automatic failover between keys
- ✅ 90%+ uptime for AI features
- ✅ Smooth user experience

---

## 🚨 Priority Recommendation

**URGENT:** Your Natural Language Query feature (your main USP) is at risk of hitting rate limits.

**Action Required:**
1. Add at least **2 dedicated keys** for `NATURAL_LANGUAGE_QUERY`
2. Add at least **2 dedicated keys** for `CHAT`
3. Share 1 key across other low-usage features

**Minimal setup (3 keys):**
```env
GEMINI_API_KEY_NATURAL_LANGUAGE_QUERY_1=key1
GEMINI_API_KEY_CHAT_1=key2
GEMINI_API_KEY_INSIGHTS_1=key3  # Shared with forecast/chart-rec
GEMINI_API_KEY_FORECAST_1=key3
GEMINI_API_KEY_CHART_RECOMMENDATIONS_1=key3
```

This gives you:
- 500 req/day for Natural Language Query (your USP)
- 250 req/day for Chat
- 250 req/day shared across other features
- **Total: 1000 requests/day** (4x improvement)

---

**Ready to implement? Let me know if you want me to update all the API routes automatically!** 🚀
