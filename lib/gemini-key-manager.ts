/**
 * Gemini API Key Manager with Advanced Load Balancing
 * Distributes API load across multiple keys with 0-downtime failover
 *
 * Features:
 * - Round-robin load balancing
 * - Circuit breaker pattern (auto-disable failing keys)
 * - Health monitoring & auto-recovery
 * - Weighted distribution (prioritize healthier keys)
 * - Real-time capacity tracking
 *
 * Free Tier Limits per key:
 * - Gemini 2.5 Flash: 250 requests/day
 * - Gemini 2.5 Flash Lite: 1000 requests/day
 * - Total with 5 keys: 1250 requests/day (Flash) or 5000 requests/day (Flash Lite)
 */

interface KeyUsage {
  key: string;
  usageCount: number;
  lastUsed: Date;
  dailyLimit: number;
  feature: string;
  // Circuit breaker fields
  failureCount: number;
  consecutiveFailures: number;
  lastFailure: Date | null;
  isHealthy: boolean;
  healthCheckAt: Date | null;
  responseTimeMs: number[]; // Track last 10 response times
}

class GeminiKeyManager {
  private keys: Map<string, KeyUsage[]> = new Map();
  private keyRotationIndex: Map<string, number> = new Map();

  // Circuit breaker configuration
  private readonly CIRCUIT_BREAKER_THRESHOLD = 3; // Consecutive failures before marking unhealthy
  private readonly HEALTH_CHECK_INTERVAL_MS = 60000; // 1 minute
  private readonly RESPONSE_TIME_SAMPLES = 10; // Track last 10 response times

  constructor() {
    this.initializeKeys();
    this.startHealthMonitoring();
  }

  /**
   * Initialize keys from environment variables
   * Supports up to 10 keys per feature
   */
  private initializeKeys() {
    // Feature-specific keys
    const features = [
      'INSIGHTS',
      'FORECAST',
      'CHART_RECOMMENDATIONS',
      'CHAT',
      'NATURAL_LANGUAGE_QUERY',
      'CONTEXT_ANALYTICS',
      'CONTEXT_VISUALIZATIONS',
      'NARRATIVE_GENERATION', // NEW: AI-powered narrative generation
      'ANOMALY_DETECTION',    // NEW: Anomaly detection
      'CORRELATION_ANALYSIS', // NEW: Correlation analysis
      'CHART_AI_CONFIG',      // NEW: Chart AI Config (8-key pool for AI mode)
      'LIDA_SUMMARIZER',      // LIDA: Dataset summarization
      'LIDA_GOAL_EXPLORER',   // LIDA: Visualization goals
      'CHART_AI_CONFIG',      // NEW: Chart AI Config (8-key pool for AI mode)
      'LIDA_SUMMARIZER',      // LIDA: Dataset summarization
      'LIDA_GOAL_EXPLORER',   // LIDA: Visualization goals
      'LIDA_VISGENERATOR'     // LIDA: Chart specification generation
    ];

    features.forEach(feature => {
      const featureKeys: KeyUsage[] = [];

      // Try to load up to 10 keys for each feature
      for (let i = 1; i <= 10; i++) {
        const keyName = `GEMINI_API_KEY_${feature}_${i}`;
        const key = process.env[keyName];

        if (key) {
          featureKeys.push({
            key,
            usageCount: 0,
            lastUsed: new Date(0), // Epoch start
            dailyLimit: 250, // Conservative limit for Flash
            feature,
            failureCount: 0,
            consecutiveFailures: 0,
            lastFailure: null,
            isHealthy: true,
            healthCheckAt: null,
            responseTimeMs: []
          });
        }
      }

      // If no feature-specific keys, use general keys
      if (featureKeys.length === 0) {
        for (let i = 1; i <= 10; i++) {
          const keyName = `GEMINI_API_KEY_${i}`;
          const key = process.env[keyName];

          if (key) {
            featureKeys.push({
              key,
              usageCount: 0,
              lastUsed: new Date(0),
              dailyLimit: 250,
              feature,
              failureCount: 0,
              consecutiveFailures: 0,
              lastFailure: null,
              isHealthy: true,
              healthCheckAt: null,
              responseTimeMs: []
            });
          }
        }
      }

      // Fallback to main GEMINI_API_KEY
      if (featureKeys.length === 0 && process.env.GEMINI_API_KEY) {
        featureKeys.push({
          key: process.env.GEMINI_API_KEY,
          usageCount: 0,
          lastUsed: new Date(0),
          dailyLimit: 250,
          feature,
          failureCount: 0,
          consecutiveFailures: 0,
          lastFailure: null,
          isHealthy: true,
          healthCheckAt: null,
          responseTimeMs: []
        });
      }

      if (featureKeys.length > 0) {
        this.keys.set(feature, featureKeys);
        this.keyRotationIndex.set(feature, 0);
      }
    });
  }

  /**
   * Get the next available key for a feature using intelligent load balancing
   * with circuit breaker pattern for 0-downtime failover
   */
  getKey(feature: string): string | null {
    const featureKeys = this.keys.get(feature);

    if (!featureKeys || featureKeys.length === 0) {
      console.warn(`No API keys configured for feature: ${feature}`);
      return null;
    }

    // Reset daily counters if it's a new day
    this.resetDailyCounters(featureKeys);

    // Find healthy keys with available capacity
    const healthyKeys = featureKeys.filter(
      k => k.isHealthy && k.usageCount < k.dailyLimit
    );

    if (healthyKeys.length === 0) {
      // No healthy keys available - attempt recovery
      console.warn(`No healthy keys for ${feature}. Attempting recovery...`);
      this.attemptKeyRecovery(feature);

      // Try again after recovery attempt
      const recoveredKeys = featureKeys.filter(
        k => k.isHealthy && k.usageCount < k.dailyLimit
      );

      if (recoveredKeys.length === 0) {
        console.error(`All keys for ${feature} are unhealthy or at limit!`);
        return null;
      }

      // Use recovered key
      const selectedKey = this.selectBestKey(recoveredKeys);
      const keyIndex = featureKeys.indexOf(selectedKey);
      this.incrementUsage(feature, keyIndex);
      return selectedKey.key;
    }

    // Select best key using weighted distribution
    const selectedKey = this.selectBestKey(healthyKeys);
    const keyIndex = featureKeys.indexOf(selectedKey);

    // Increment usage
    this.incrementUsage(feature, keyIndex);

    return selectedKey.key;
  }

  /**
   * Select the best key based on health score and load
   */
  private selectBestKey(keys: KeyUsage[]): KeyUsage {
    if (keys.length === 1) return keys[0];

    // Calculate health scores for each key
    const scores = keys.map(key => {
      const capacityScore = (key.dailyLimit - key.usageCount) / key.dailyLimit;
      const healthScore = key.consecutiveFailures === 0 ? 1 : 0.5;
      const avgResponseTime = key.responseTimeMs.length > 0
        ? key.responseTimeMs.reduce((a, b) => a + b, 0) / key.responseTimeMs.length
        : 1000;
      const speedScore = Math.max(0, 1 - (avgResponseTime / 5000)); // Normalize to 5s

      return {
        key,
        score: (capacityScore * 0.5) + (healthScore * 0.3) + (speedScore * 0.2)
      };
    });

    // Sort by score (highest first) and return best
    scores.sort((a, b) => b.score - a.score);
    return scores[0].key;
  }

  /**
   * Attempt to recover unhealthy keys
   */
  private attemptKeyRecovery(feature: string) {
    const featureKeys = this.keys.get(feature);
    if (!featureKeys) return;

    const now = new Date();
    featureKeys.forEach(key => {
      if (!key.isHealthy && key.lastFailure) {
        const timeSinceFailure = now.getTime() - key.lastFailure.getTime();

        // Auto-recover after 2 minutes
        if (timeSinceFailure > 120000) {
          console.log(`Auto-recovering key for ${feature} after 2 minutes`);
          key.isHealthy = true;
          key.consecutiveFailures = 0;
          key.healthCheckAt = now;
        }
      }
    });
  }

  /**
   * Report key success (for circuit breaker)
   */
  reportSuccess(feature: string, responseTimeMs: number) {
    const featureKeys = this.keys.get(feature);
    if (!featureKeys) return;

    const currentIndex = this.keyRotationIndex.get(feature) || 0;
    const key = featureKeys[currentIndex - 1 < 0 ? featureKeys.length - 1 : currentIndex - 1];

    if (key) {
      key.consecutiveFailures = 0;
      key.isHealthy = true;

      // Track response time (keep last 10)
      key.responseTimeMs.push(responseTimeMs);
      if (key.responseTimeMs.length > this.RESPONSE_TIME_SAMPLES) {
        key.responseTimeMs.shift();
      }
    }
  }

  /**
   * Report key failure (for circuit breaker)
   */
  reportFailure(feature: string) {
    const featureKeys = this.keys.get(feature);
    if (!featureKeys) return;

    const currentIndex = this.keyRotationIndex.get(feature) || 0;
    const key = featureKeys[currentIndex - 1 < 0 ? featureKeys.length - 1 : currentIndex - 1];

    if (key) {
      key.failureCount++;
      key.consecutiveFailures++;
      key.lastFailure = new Date();

      // Circuit breaker: mark unhealthy after threshold
      if (key.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
        key.isHealthy = false;
        console.warn(`Circuit breaker triggered for ${feature} key after ${key.consecutiveFailures} failures`);
      }
    }
  }

  /**
   * Health monitoring background task
   */
  private startHealthMonitoring() {
    // Only run in server environment
    if (typeof window === 'undefined') {
      setInterval(() => {
        this.keys.forEach((featureKeys, feature) => {
          featureKeys.forEach(key => {
            // Auto-recover keys that have been unhealthy for > 5 minutes
            if (!key.isHealthy && key.lastFailure) {
              const now = new Date();
              const timeSinceFailure = now.getTime() - key.lastFailure.getTime();

              if (timeSinceFailure > 300000) { // 5 minutes
                console.log(`Health monitor: Auto-recovering ${feature} key`);
                key.isHealthy = true;
                key.consecutiveFailures = 0;
                key.healthCheckAt = now;
              }
            }
          });
        });
      }, this.HEALTH_CHECK_INTERVAL_MS);
    }
  }

  /**
   * Increment usage counter for a specific key
   */
  private incrementUsage(feature: string, keyIndex: number) {
    const featureKeys = this.keys.get(feature);
    if (featureKeys && featureKeys[keyIndex]) {
      featureKeys[keyIndex].usageCount++;
      featureKeys[keyIndex].lastUsed = new Date();
    }
  }

  /**
   * Reset daily counters if it's a new day
   */
  private resetDailyCounters(featureKeys: KeyUsage[]) {
    const now = new Date();
    const today = now.toDateString();

    featureKeys.forEach(keyUsage => {
      const lastUsedDate = keyUsage.lastUsed.toDateString();
      if (lastUsedDate !== today) {
        keyUsage.usageCount = 0;
      }
    });
  }

  /**
   * Get usage statistics for monitoring
   */
  getUsageStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    this.keys.forEach((featureKeys, feature) => {
      const healthyCount = featureKeys.filter(k => k.isHealthy).length;
      const totalCapacity = featureKeys.reduce((sum, k) => sum + k.dailyLimit, 0);
      const totalUsed = featureKeys.reduce((sum, k) => sum + k.usageCount, 0);

      stats[feature] = {
        totalKeys: featureKeys.length,
        healthyKeys: healthyCount,
        totalCapacity,
        totalUsed,
        capacityRemaining: totalCapacity - totalUsed,
        utilizationPercent: ((totalUsed / totalCapacity) * 100).toFixed(1) + '%',
        keys: featureKeys.map((k, index) => {
          const avgResponseTime = k.responseTimeMs.length > 0
            ? Math.round(k.responseTimeMs.reduce((a, b) => a + b, 0) / k.responseTimeMs.length)
            : 0;

          return {
            index: index + 1,
            isHealthy: k.isHealthy,
            usageCount: k.usageCount,
            dailyLimit: k.dailyLimit,
            percentUsed: ((k.usageCount / k.dailyLimit) * 100).toFixed(1) + '%',
            lastUsed: k.lastUsed,
            failureCount: k.failureCount,
            consecutiveFailures: k.consecutiveFailures,
            avgResponseTimeMs: avgResponseTime
          };
        })
      };
    });

    return stats;
  }

  /**
   * Get total capacity across all keys for a feature
   */
  getTotalCapacity(feature: string): number {
    const featureKeys = this.keys.get(feature);
    if (!featureKeys) return 0;
    return featureKeys.reduce((sum, key) => sum + key.dailyLimit, 0);
  }

  /**
   * Get remaining capacity for a feature today
   */
  getRemainingCapacity(feature: string): number {
    const featureKeys = this.keys.get(feature);
    if (!featureKeys) return 0;

    this.resetDailyCounters(featureKeys);

    return featureKeys.reduce((sum, key) => {
      return sum + (key.dailyLimit - key.usageCount);
    }, 0);
  }
}

// Singleton instance
let keyManagerInstance: GeminiKeyManager | null = null;

export function getKeyManager(): GeminiKeyManager {
  if (!keyManagerInstance) {
    keyManagerInstance = new GeminiKeyManager();
  }
  return keyManagerInstance;
}

/**
 * Convenience function to get a key for a specific feature
 */
export function getGeminiKey(
  feature: 'INSIGHTS' | 'FORECAST' | 'CHART_RECOMMENDATIONS' | 'CHAT' |
           'NATURAL_LANGUAGE_QUERY' | 'CONTEXT_ANALYTICS' | 'CONTEXT_VISUALIZATIONS' |
           'NARRATIVE_GENERATION' | 'ANOMALY_DETECTION' | 'CORRELATION_ANALYSIS' |
           'CHART_AI_CONFIG' | 'LIDA_SUMMARIZER' | 'LIDA_GOAL_EXPLORER' | 'LIDA_VISGENERATOR'
): string | null {
  const manager = getKeyManager();
  return manager.getKey(feature);
}

/**
 * Report successful API call (for circuit breaker)
 */
export function reportGeminiSuccess(
  feature: 'INSIGHTS' | 'FORECAST' | 'CHART_RECOMMENDATIONS' | 'CHAT' |
           'NATURAL_LANGUAGE_QUERY' | 'CONTEXT_ANALYTICS' | 'CONTEXT_VISUALIZATIONS' |
           'NARRATIVE_GENERATION' | 'ANOMALY_DETECTION' | 'CORRELATION_ANALYSIS' |
           'CHART_AI_CONFIG',
  responseTimeMs: number
) {
  const manager = getKeyManager();
  manager.reportSuccess(feature, responseTimeMs);
}

/**
 * Report failed API call (for circuit breaker)
 */
export function reportGeminiFailure(
  feature: 'INSIGHTS' | 'FORECAST' | 'CHART_RECOMMENDATIONS' | 'CHAT' |
           'NATURAL_LANGUAGE_QUERY' | 'CONTEXT_ANALYTICS' | 'CONTEXT_VISUALIZATIONS' |
           'NARRATIVE_GENERATION' | 'ANOMALY_DETECTION' | 'CORRELATION_ANALYSIS' |
           'CHART_AI_CONFIG'
) {
  const manager = getKeyManager();
  manager.reportFailure(feature);
}

/**
 * Get usage statistics
 */
export function getGeminiUsageStats() {
  const manager = getKeyManager();
  return manager.getUsageStats();
}
