// GWI Crosstab Analysis Client - Core Implementation

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CrosstabMetrics {
  positive_sample: number;      // Sample count
  positive_size: number;         // Weighted universe
  audience_percentage: number;   // % within audience
  datapoint_percentage: number;  // % within datapoint
  audience_index: number;        // Index vs base (100 = average)
}

interface CrosstabDataRow {
  audience: string;
  datapoint: string;
  segment?: string;
  wave?: string;
  metrics: CrosstabMetrics;
}

interface RowDefinition {
  id: string;
  name: string;
  full_name?: string;
  expression?: any;
}

interface ColumnDefinition {
  id: string;
  name: string;
  full_name?: string;
  expression?: any;
}

interface BaseDefinition {
  id: string;
  name: string;
  full_name?: string;
  expression?: any;
}

interface Crosstab {
  id: string;
  uuid: string;
  name: string;
  rows: RowDefinition[];
  columns: ColumnDefinition[];
  bases?: BaseDefinition[];
  country_codes: string[];
  wave_codes: string[];
  created_at: string;
  updated_at: string;
  data?: CrosstabDataRow[];
}

interface CrosstabSummary {
  id: string;
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  folder_id?: string;
}

interface Analysis {
  structure: StructureAnalysis;
  statistics: StatisticsAnalysis;
  insights: Insight[];
  recommendations: Recommendation[];
}

interface StructureAnalysis {
  dimensions: {
    rows: number;
    columns: number;
    totalCells: number;
  };
  markets: string[];
  timePeriods: string[];
  audiences: string[];
  dataPoints: string[];
}

interface StatisticsAnalysis {
  topIndexes: IndexedItem[];
  bottomIndexes: IndexedItem[];
  overIndexed: IndexedItem[];
  underIndexed: IndexedItem[];
  statistically_significant: CrosstabDataRow[];
  averages: {
    mean_index: number;
    mean_sample: number;
  };
}

interface IndexedItem {
  label: string;
  index: number;
  percentage: number;
  sample: number;
  segment?: string;
}

interface Insight {
  type: string;
  title: string;
  description: string;
  data: any;
  significance: 'high' | 'medium' | 'low';
}

interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  market?: string;
}

// ============================================================================
// GWI PLATFORM API CLIENT
// ============================================================================

class GWICrosstabClient {
  private baseUrl: string = 'https://api.globalwebindex.com';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * List all saved crosstabs
   */
  async listCrosstabs(params?: {
    folder_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<CrosstabSummary[]> {
    const url = new URL(`${this.baseUrl}/v2/saved/crosstabs`);
    
    if (params) {
      if (params.folder_id) url.searchParams.append('folder_id', params.folder_id);
      if (params.limit) url.searchParams.append('limit', params.limit.toString());
      if (params.offset) url.searchParams.append('offset', params.offset.toString());
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list crosstabs: ${response.statusText}`);
    }

    const data = await response.json();
    return data.crosstabs || [];
  }

  /**
   * Get a specific crosstab with or without data
   */
  async getCrosstab(
    crosstabId: string,
    includeData: boolean = true
  ): Promise<Crosstab> {
    const url = `${this.baseUrl}/v2/saved/crosstabs/${crosstabId}` +
                (includeData ? '' : '?include_data=false');

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get crosstab: ${response.statusText}`);
    }

    if (!includeData) {
      return await response.json();
    }

    // Parse JSON Lines response for full data
    return await this.parseJSONLinesResponse(response);
  }

  /**
   * Search crosstabs by name
   */
  async searchCrosstabs(query: string): Promise<CrosstabSummary[]> {
    const all = await this.listCrosstabs();
    
    const lowerQuery = query.toLowerCase();
    return all.filter(ct => 
      ct.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Parse JSON Lines format response
   */
  private async parseJSONLinesResponse(response: Response): Promise<Crosstab> {
    const text = await response.text();
    const lines = text.split('\n').filter(l => l.trim());

    if (lines.length === 0) {
      throw new Error('Empty response from API');
    }

    // First line contains configuration
    const config = JSON.parse(lines[0]);

    // Subsequent lines are data rows
    const data: CrosstabDataRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      try {
        data.push(JSON.parse(lines[i]));
      } catch (e) {
        console.warn(`Failed to parse data row ${i}:`, e);
      }
    }

    return {
      ...config,
      data
    };
  }
}

// ============================================================================
// CROSSTAB ANALYZER
// ============================================================================

class CrosstabAnalyzer {
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

    // Insight 1: Strong affinities (index > 150)
    const strongAffinities = data.filter(d => 
      d.metrics.audience_index > 150 && 
      d.metrics.positive_sample >= 50
    );

    if (strongAffinities.length > 0) {
      insights.push({
        type: 'STRONG_AFFINITY',
        title: 'Strong Behavioral Affinities Detected',
        description: `Found ${strongAffinities.length} behaviors with very high over-indexing (>150). These represent core characteristics of the audience.`,
        data: strongAffinities.slice(0, 5),
        significance: 'high'
      });
    }

    // Insight 2: Market variations
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

    // Insight 3: Trends (if time series data)
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

    // Insight 4: Unexpected under-indexing
    const unexpectedLow = data.filter(d => 
      d.metrics.audience_index < 50 && 
      d.metrics.positive_sample >= 50
    );

    if (unexpectedLow.length > 0) {
      insights.push({
        type: 'NEGATIVE_AFFINITY',
        title: 'Notable Negative Affinities',
        description: `Found ${unexpectedLow.length} behaviors with strong under-indexing (<50). These represent areas where the audience differs significantly from the general population.`,
        data: unexpectedLow.slice(0, 5),
        significance: 'medium'
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
    // Find the friendly name from crosstab configuration
    const rowDef = crosstab.rows.find(r => row.datapoint.includes(r.id));
    const colDef = crosstab.columns.find(c => row.audience?.includes(c.id));

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

  private analyzeMarketVariations(crosstab: Crosstab): any {
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
      return { hasSignificantVariation: false };
    }

    // Find behaviors with >30 point index difference across markets
    const variations: any[] = [];
    const datapoints = new Set(crosstab.data!.map(d => d.datapoint));

    datapoints.forEach(dp => {
      const indexes = markets.map(m => {
        const row = dataByMarket[m].find(r => r.datapoint === dp);
        return row ? row.metrics.audience_index : null;
      }).filter(i => i !== null) as number[];

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

  private analyzeTrends(crosstab: Crosstab): any[] {
    // Simplified trend detection
    const trends: any[] = [];
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

// ============================================================================
// RESPONSE FORMATTER
// ============================================================================

class ResponseFormatter {
  formatAnalysis(crosstab: Crosstab, analysis: Analysis): string {
    let output = '';

    // Header
    output += `# Analysis: ${crosstab.name}\n\n`;
    
    // Metadata
    output += this.formatMetadata(crosstab, analysis);
    
    // Key Findings
    output += `## Key Findings\n\n`;
    output += this.formatInsights(analysis.insights);
    
    // Top Performers
    output += `\n## Top Over-Indexed Behaviors\n\n`;
    output += this.formatTopIndexes(analysis.statistics.topIndexes);
    
    // Market Breakdown (if applicable)
    if (crosstab.country_codes.length > 1) {
      output += `\n## Market Breakdown\n\n`;
      output += this.formatMarketBreakdown(crosstab, analysis);
    }
    
    // Recommendations
    output += `\n## Recommendations\n\n`;
    output += this.formatRecommendations(analysis.recommendations);
    
    return output;
  }

  private formatMetadata(crosstab: Crosstab, analysis: Analysis): string {
    const totalSample = crosstab.data!.reduce((sum, d) => 
      sum + d.metrics.positive_sample, 0
    );

    return `**Time Period**: ${crosstab.wave_codes.join(', ')}
**Markets**: ${crosstab.country_codes.map(c => c.toUpperCase()).join(', ')}
**Base**: ${crosstab.bases?.[0]?.name || 'All Internet Users'}
**Total Sample**: ${totalSample.toLocaleString()} respondents
**Data Points**: ${analysis.structure.dataPoints.length}

---

`;
  }

  private formatInsights(insights: Insight[]): string {
    if (insights.length === 0) {
      return '*No significant insights detected.*\n';
    }

    return insights.map(insight => {
      const emoji = insight.significance === 'high' ? '🔴' : 
                   insight.significance === 'medium' ? '🟡' : '🟢';
      
      return `${emoji} **${insight.title}**\n${insight.description}\n`;
    }).join('\n');
  }

  private formatTopIndexes(items: IndexedItem[]): string {
    if (items.length === 0) {
      return '*No significant over-indexing detected.*\n';
    }

    return items.slice(0, 10).map((item, i) => 
      `${i + 1}. **${item.label}**\n   - Index: ${item.index}\n   - ${item.percentage}% of audience\n   - Sample: ${item.sample}\n`
    ).join('\n');
  }

  private formatMarketBreakdown(crosstab: Crosstab, analysis: Analysis): string {
    const markets = crosstab.country_codes;
    let output = '';

    markets.forEach(market => {
      const marketData = crosstab.data!.filter(d => 
        d.segment === market || (!d.segment && markets.length === 1)
      );

      if (marketData.length === 0) return;

      const topForMarket = marketData
        .filter(d => d.metrics.positive_sample >= 50)
        .sort((a, b) => b.metrics.audience_index - a.metrics.audience_index)
        .slice(0, 5);

      output += `### ${market.toUpperCase()}\n\n`;
      
      if (topForMarket.length > 0) {
        topForMarket.forEach((row, i) => {
          const rowDef = crosstab.rows.find(r => row.datapoint.includes(r.id));
          const label = rowDef?.name || row.datapoint;
          
          output += `${i + 1}. **${label}**: Index ${Math.round(row.metrics.audience_index)}\n`;
        });
      } else {
        output += '*Insufficient sample size for reliable insights.*\n';
      }
      
      output += '\n';
    });

    return output;
  }

  private formatRecommendations(recommendations: Recommendation[]): string {
    if (recommendations.length === 0) {
      return '*No specific recommendations generated.*\n';
    }

    const byPriority = {
      high: recommendations.filter(r => r.priority === 'high'),
      medium: recommendations.filter(r => r.priority === 'medium'),
      low: recommendations.filter(r => r.priority === 'low')
    };

    let output = '';

    if (byPriority.high.length > 0) {
      output += '### High Priority\n\n';
      byPriority.high.forEach((rec, i) => {
        output += `${i + 1}. **${rec.title}**\n   ${rec.description}\n\n`;
      });
    }

    if (byPriority.medium.length > 0) {
      output += '### Medium Priority\n\n';
      byPriority.medium.forEach((rec, i) => {
        output += `${i + 1}. **${rec.title}**\n   ${rec.description}\n\n`;
      });
    }

    return output;
  }
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

class CrosstabAnalysisOrchestrator {
  private client: GWICrosstabClient;
  private analyzer: CrosstabAnalyzer;
  private formatter: ResponseFormatter;

  constructor(apiKey: string) {
    this.client = new GWICrosstabClient(apiKey);
    this.analyzer = new CrosstabAnalyzer();
    this.formatter = new ResponseFormatter();
  }

  /**
   * List and search crosstabs
   */
  async listCrosstabs(searchQuery?: string): Promise<string> {
    try {
      const crosstabs = searchQuery 
        ? await this.client.searchCrosstabs(searchQuery)
        : await this.client.listCrosstabs();

      if (crosstabs.length === 0) {
        return searchQuery 
          ? `No crosstabs found matching "${searchQuery}"`
          : 'No crosstabs found';
      }

      let output = `Found ${crosstabs.length} crosstab${crosstabs.length > 1 ? 's' : ''}`;
      if (searchQuery) {
        output += ` matching "${searchQuery}"`;
      }
      output += ':\n\n';

      crosstabs.forEach((ct, i) => {
        output += `${i + 1}. **${ct.name}**\n`;
        output += `   ID: ${ct.id}\n`;
        output += `   Created: ${new Date(ct.created_at).toLocaleDateString()}\n\n`;
      });

      return output;
    } catch (error) {
      return `Error listing crosstabs: ${error}`;
    }
  }

  /**
   * Analyze a specific crosstab
   */
  async analyzeCrosstab(crosstabId: string): Promise<string> {
    try {
      // Fetch crosstab data
      const crosstab = await this.client.getCrosstab(crosstabId);

      // Analyze
      const analysis = this.analyzer.analyze(crosstab);

      // Format response
      return this.formatter.formatAnalysis(crosstab, analysis);
    } catch (error) {
      return `Error analyzing crosstab: ${error}`;
    }
  }

  /**
   * Search and analyze in one step
   */
  async searchAndAnalyze(searchQuery: string): Promise<string> {
    try {
      const crosstabs = await this.client.searchCrosstabs(searchQuery);

      if (crosstabs.length === 0) {
        return `No crosstabs found matching "${searchQuery}"`;
      }

      if (crosstabs.length > 1) {
        return `Found ${crosstabs.length} crosstabs. Please specify which one:\n\n` +
               crosstabs.map((ct, i) => 
                 `${i + 1}. ${ct.name} (ID: ${ct.id})`
               ).join('\n');
      }

      // Analyze the single result
      return await this.analyzeCrosstab(crosstabs[0].id);
    } catch (error) {
      return `Error: ${error}`;
    }
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

// Initialize the orchestrator
const orchestrator = new CrosstabAnalysisOrchestrator('YOUR_API_KEY_HERE');

// Example 1: List all crosstabs
// const list = await orchestrator.listCrosstabs();
// console.log(list);

// Example 2: Search for specific crosstabs
// const searchResults = await orchestrator.listCrosstabs('social media');
// console.log(searchResults);

// Example 3: Analyze a specific crosstab by ID
// const analysis = await orchestrator.analyzeCrosstab('crosstab-uuid-here');
// console.log(analysis);

// Example 4: Search and analyze in one step
// const result = await orchestrator.searchAndAnalyze('Gen Z TikTok');
// console.log(result);

export {
  GWICrosstabClient,
  CrosstabAnalyzer,
  ResponseFormatter,
  CrosstabAnalysisOrchestrator
};