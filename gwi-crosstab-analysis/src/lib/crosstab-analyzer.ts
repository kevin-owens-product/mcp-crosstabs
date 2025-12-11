import type {
  Crosstab,
  CrosstabDataRow,
  Analysis,
  StructureAnalysis,
  StatisticsAnalysis,
  IndexedItem,
  Insight,
  Recommendation
} from './types';
import { findMatchingRow, findMatchingColumn } from './types';

export class CrosstabAnalyzer {
  /**
   * Main analysis function
   */
  analyze(crosstab: Crosstab): Analysis {
    if (!crosstab.data || crosstab.data.length === 0) {
      throw new Error('Crosstab has no data to analyze');
    }

    return {
      structure: this.analyzeStructure(crosstab),
      statistics: this.calculateStatistics(crosstab),
      insights: this.extractInsights(crosstab),
      recommendations: this.generateRecommendations(crosstab)
    };
  }

  /**
   * Analyze crosstab structure
   */
  private analyzeStructure(crosstab: Crosstab): StructureAnalysis {
    const uniqueDatapoints = new Set(
      crosstab.data!.map(d => d.datapoint)
    );

    return {
      dimensions: {
        rows: crosstab.rows.length,
        columns: crosstab.columns.length,
        totalCells: crosstab.rows.length * crosstab.columns.length
      },
      markets: crosstab.country_codes,
      timePeriods: crosstab.wave_codes,
      audiences: crosstab.bases?.map(b => b.name) || ['All Internet Users'],
      dataPoints: Array.from(uniqueDatapoints)
    };
  }

  /**
   * Calculate key statistics
   */
  private calculateStatistics(crosstab: Crosstab): StatisticsAnalysis {
    const data = crosstab.data!;

    // Filter for statistically significant data (n >= 50)
    const validData = data.filter(d => d.metrics.positive_sample >= 50);

    // Top and bottom indexes
    const sortedByIndex = [...validData].sort((a, b) =>
      b.metrics.audience_index - a.metrics.audience_index
    );

    const topIndexes = sortedByIndex.slice(0, 10).map(d => this.toIndexedItem(d, crosstab));
    const bottomIndexes = sortedByIndex.slice(-10).reverse().map(d => this.toIndexedItem(d, crosstab));

    // Over/under indexed (threshold: 20 points from 100)
    const overIndexed = validData
      .filter(d => d.metrics.audience_index >= 120)
      .sort((a, b) => b.metrics.audience_index - a.metrics.audience_index)
      .slice(0, 20)
      .map(d => this.toIndexedItem(d, crosstab));

    const underIndexed = validData
      .filter(d => d.metrics.audience_index <= 80)
      .sort((a, b) => a.metrics.audience_index - b.metrics.audience_index)
      .slice(0, 20)
      .map(d => this.toIndexedItem(d, crosstab));

    // Calculate averages
    const mean_index = validData.reduce((sum, d) =>
      sum + d.metrics.audience_index, 0
    ) / validData.length;

    const mean_sample = validData.reduce((sum, d) =>
      sum + d.metrics.positive_sample, 0
    ) / validData.length;

    return {
      topIndexes,
      bottomIndexes,
      overIndexed,
      underIndexed,
      statistically_significant: validData,
      averages: {
        mean_index: Math.round(mean_index),
        mean_sample: Math.round(mean_sample)
      }
    };
  }

  /**
   * Extract insights from data
   */
  private extractInsights(crosstab: Crosstab): Insight[] {
    const insights: Insight[] = [];
    const data = crosstab.data!;
    const validData = data.filter(d => d.metrics.positive_sample >= 50);

    // Insight 1: Strong affinities (index > 150)
    const strongAffinities = validData.filter(d =>
      d.metrics.audience_index > 150
    );

    if (strongAffinities.length > 0) {
      insights.push({
        type: 'STRONG_AFFINITY',
        title: 'Strong Behavioral Affinities Detected',
        description: `Found ${strongAffinities.length} behaviors with very high over-indexing (>150). These represent core characteristics of the audience.`,
        data: strongAffinities.slice(0, 10),
        significance: 'high'
      });
    }

    // Insight 2: Moderate over-indexing (120-150)
    const moderateAffinities = validData.filter(d =>
      d.metrics.audience_index >= 120 &&
      d.metrics.audience_index <= 150
    );

    if (moderateAffinities.length > 0) {
      insights.push({
        type: 'MODERATE_AFFINITY',
        title: 'Moderate Over-Indexing Behaviors',
        description: `Found ${moderateAffinities.length} behaviors with moderate over-indexing (120-150). These represent secondary audience characteristics worth considering.`,
        data: moderateAffinities.sort((a, b) => b.metrics.audience_index - a.metrics.audience_index).slice(0, 10),
        significance: 'medium'
      });
    }

    // Insight 3: High reach opportunities (high audience percentage with good index)
    const highReach = validData.filter(d =>
      d.metrics.audience_percentage >= 50 &&
      d.metrics.audience_index >= 100
    );

    if (highReach.length > 0) {
      insights.push({
        type: 'HIGH_REACH',
        title: 'High Reach Opportunities',
        description: `Found ${highReach.length} behaviors with high audience penetration (>50%) and positive indexing. These offer scale for broad campaigns.`,
        data: highReach.sort((a, b) => b.metrics.audience_percentage - a.metrics.audience_percentage).slice(0, 10),
        significance: 'high'
      });
    }

    // Insight 4: Niche targeting opportunities (high index, lower reach)
    const nicheTargeting = validData.filter(d =>
      d.metrics.audience_index >= 140 &&
      d.metrics.audience_percentage < 30
    );

    if (nicheTargeting.length > 0) {
      insights.push({
        type: 'NICHE_TARGETING',
        title: 'Niche Targeting Opportunities',
        description: `Found ${nicheTargeting.length} behaviors with high over-indexing but lower reach (<30%). These are ideal for precision targeting strategies.`,
        data: nicheTargeting.sort((a, b) => b.metrics.audience_index - a.metrics.audience_index).slice(0, 10),
        significance: 'medium'
      });
    }

    // Insight 5: Market variations
    if (crosstab.country_codes.length > 1) {
      const marketVariations = this.analyzeMarketVariations(crosstab);
      if (marketVariations.hasSignificantVariation) {
        insights.push({
          type: 'MARKET_VARIATION',
          title: 'Significant Cross-Market Differences',
          description: marketVariations.description,
          data: marketVariations.examples,
          significance: 'high'
        });
      }
    }

    // Insight 6: Trends (if time series data)
    if (crosstab.wave_codes.length > 1) {
      const trends = this.analyzeTrends(crosstab);
      if (trends.length > 0) {
        insights.push({
          type: 'TREND',
          title: 'Temporal Trends Identified',
          description: `Detected ${trends.length} significant trends across time periods.`,
          data: trends,
          significance: 'medium'
        });
      }
    }

    // Insight 7: Unexpected under-indexing
    const unexpectedLow = validData.filter(d =>
      d.metrics.audience_index < 50
    );

    if (unexpectedLow.length > 0) {
      insights.push({
        type: 'NEGATIVE_AFFINITY',
        title: 'Notable Negative Affinities',
        description: `Found ${unexpectedLow.length} behaviors with strong under-indexing (<50). These represent areas where the audience differs significantly from the general population.`,
        data: unexpectedLow.slice(0, 10),
        significance: 'medium'
      });
    }

    // Insight 8: Moderate under-indexing (50-80)
    const moderateLow = validData.filter(d =>
      d.metrics.audience_index >= 50 &&
      d.metrics.audience_index <= 80
    );

    if (moderateLow.length > 0) {
      insights.push({
        type: 'MODERATE_NEGATIVE',
        title: 'Moderate Under-Indexing Behaviors',
        description: `Found ${moderateLow.length} behaviors with moderate under-indexing (50-80). Consider avoiding or de-prioritizing these in targeting.`,
        data: moderateLow.sort((a, b) => a.metrics.audience_index - b.metrics.audience_index).slice(0, 10),
        significance: 'low'
      });
    }

    // Insight 9: High confidence data points (large sample sizes)
    const highConfidence = validData.filter(d =>
      d.metrics.positive_sample >= 200
    );

    if (highConfidence.length > 0) {
      const topHighConfidence = highConfidence
        .sort((a, b) => b.metrics.audience_index - a.metrics.audience_index)
        .slice(0, 10);

      insights.push({
        type: 'HIGH_CONFIDENCE',
        title: 'High Confidence Findings',
        description: `Found ${highConfidence.length} data points with large sample sizes (n>=200). These findings are statistically robust.`,
        data: topHighConfidence,
        significance: 'high'
      });
    }

    // Insight 10: Baseline behaviors (index near 100)
    const baselineBehaviors = validData.filter(d =>
      d.metrics.audience_index >= 95 &&
      d.metrics.audience_index <= 105
    );

    if (baselineBehaviors.length > 0) {
      insights.push({
        type: 'BASELINE',
        title: 'Baseline Behaviors (No Differentiation)',
        description: `Found ${baselineBehaviors.length} behaviors where this audience matches the general population (index 95-105). These don't provide targeting differentiation.`,
        data: baselineBehaviors.slice(0, 10),
        significance: 'low'
      });
    }

    return insights;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(crosstab: Crosstab): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const stats = this.calculateStatistics(crosstab);

    // Recommendation based on top indexes
    if (stats.topIndexes.length > 0) {
      recommendations.push({
        title: 'Leverage Top Affinities',
        description: `Focus on the top over-indexed behaviors: ${stats.topIndexes.slice(0, 3).map(i => i.label).join(', ')}. These represent the strongest audience characteristics.`,
        priority: 'high'
      });
    }

    // Market-specific recommendations
    if (crosstab.country_codes.length > 1) {
      crosstab.country_codes.forEach(market => {
        const marketData = crosstab.data!.filter(d =>
          d.segment === market || !d.segment
        );

        if (marketData.length > 0) {
          const topForMarket = marketData
            .filter(d => d.metrics.positive_sample >= 50)
            .sort((a, b) => b.metrics.audience_index - a.metrics.audience_index)
            .slice(0, 3);

          if (topForMarket.length > 0) {
            recommendations.push({
              title: `${market.toUpperCase()} Market Strategy`,
              description: `In ${market.toUpperCase()}, prioritize these high-index behaviors for targeting and messaging.`,
              priority: 'medium',
              market: market.toUpperCase()
            });
          }
        }
      });
    }

    // Sample size recommendations
    const lowSampleData = crosstab.data!.filter(d =>
      d.metrics.positive_sample < 50
    );

    if (lowSampleData.length > crosstab.data!.length * 0.3) {
      recommendations.push({
        title: 'Sample Size Consideration',
        description: `${Math.round(lowSampleData.length / crosstab.data!.length * 100)}% of cells have sample sizes below 50. Consider these findings as directional rather than conclusive.`,
        priority: 'low'
      });
    }

    return recommendations;
  }

  // Helper methods

  private toIndexedItem(row: CrosstabDataRow, crosstab: Crosstab): IndexedItem {
    // Find the friendly name from crosstab configuration using proper ID matching
    const rowDef = findMatchingRow(row.datapoint, crosstab.rows);
    const colDef = findMatchingColumn(row.audience, crosstab.columns);

    const label = [
      rowDef?.name || row.datapoint,
      colDef?.name || row.audience,
      row.segment
    ].filter(Boolean).join(' - ');

    return {
      label,
      index: Math.round(row.metrics.audience_index),
      percentage: Math.round(row.metrics.audience_percentage),
      sample: row.metrics.positive_sample,
      segment: row.segment
    };
  }

  private analyzeMarketVariations(crosstab: Crosstab): {
    hasSignificantVariation: boolean;
    description: string;
    examples: unknown[]
  } {
    const dataByMarket: { [key: string]: CrosstabDataRow[] } = {};

    crosstab.data!.forEach(row => {
      const market = row.segment || 'unknown';
      if (!dataByMarket[market]) {
        dataByMarket[market] = [];
      }
      dataByMarket[market].push(row);
    });

    const markets = Object.keys(dataByMarket);
    if (markets.length < 2) {
      return { hasSignificantVariation: false, description: '', examples: [] };
    }

    // Find behaviors with >30 point index difference across markets
    const variations: { datapoint: string; spread: number; max: number; min: number }[] = [];
    const datapoints = new Set(crosstab.data!.map(d => d.datapoint));

    datapoints.forEach(dp => {
      const indexes = markets.map(m => {
        const row = dataByMarket[m].find(r => r.datapoint === dp);
        return row ? row.metrics.audience_index : null;
      }).filter((i): i is number => i !== null);

      if (indexes.length >= 2) {
        const max = Math.max(...indexes);
        const min = Math.min(...indexes);
        if (max - min > 30) {
          variations.push({ datapoint: dp, spread: max - min, max, min });
        }
      }
    });

    return {
      hasSignificantVariation: variations.length > 0,
      description: `Found ${variations.length} behaviors with >30 point variation across markets. Market-specific strategies are recommended.`,
      examples: variations.slice(0, 5)
    };
  }

  private analyzeTrends(crosstab: Crosstab): {
    datapoint: string;
    change: number;
    direction: string;
    firstValue: number;
    lastValue: number
  }[] {
    // Simplified trend detection
    const trends: {
      datapoint: string;
      change: number;
      direction: string;
      firstValue: number;
      lastValue: number
    }[] = [];
    const waves = crosstab.wave_codes;

    if (waves.length < 2) return trends;

    const dataByWave: { [key: string]: CrosstabDataRow[] } = {};
    crosstab.data!.forEach(row => {
      const wave = row.wave || waves[0];
      if (!dataByWave[wave]) {
        dataByWave[wave] = [];
      }
      dataByWave[wave].push(row);
    });

    // Detect changes >20 points between first and last wave
    const firstWave = waves[0];
    const lastWave = waves[waves.length - 1];

    if (dataByWave[firstWave] && dataByWave[lastWave]) {
      const datapoints = new Set([
        ...dataByWave[firstWave].map(d => d.datapoint),
        ...dataByWave[lastWave].map(d => d.datapoint)
      ]);

      datapoints.forEach(dp => {
        const first = dataByWave[firstWave].find(d => d.datapoint === dp);
        const last = dataByWave[lastWave].find(d => d.datapoint === dp);

        if (first && last) {
          const change = last.metrics.audience_index - first.metrics.audience_index;
          if (Math.abs(change) > 20) {
            trends.push({
              datapoint: dp,
              change,
              direction: change > 0 ? 'increasing' : 'decreasing',
              firstValue: first.metrics.audience_index,
              lastValue: last.metrics.audience_index
            });
          }
        }
      });
    }

    return trends.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }
}
