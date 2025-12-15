import { NextResponse } from 'next/server';
import { getGeminiUsageStats, getKeyManager } from '@/lib/gemini-key-manager';

/**
 * GET /api/gemini-stats
 * Returns current Gemini API key usage statistics
 */
export async function GET() {
  try {
    const manager = getKeyManager();
    const stats = getGeminiUsageStats();

    // Calculate totals
    const features = ['INSIGHTS', 'FORECAST', 'CHART_RECOMMENDATIONS', 'CHAT', 'NATURAL_LANGUAGE_QUERY'];
    const summary = features.map(feature => ({
      feature,
      totalCapacity: manager.getTotalCapacity(feature),
      remainingCapacity: manager.getRemainingCapacity(feature),
      usedToday: manager.getTotalCapacity(feature) - manager.getRemainingCapacity(feature),
    }));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
      summary,
    });
  } catch (error) {
    console.error('Failed to get Gemini stats:', error);
    return NextResponse.json({
      error: 'Failed to retrieve API usage statistics',
    }, { status: 500 });
  }
}
