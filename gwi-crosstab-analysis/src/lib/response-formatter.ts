import type { Crosstab, Analysis, IndexedItem, Insight, Recommendation } from './types';

export class ResponseFormatter {
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
      const emoji = insight.significance === 'high' ? '**HIGH**' :
                   insight.significance === 'medium' ? '**MEDIUM**' : '**LOW**';

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

  private formatMarketBreakdown(crosstab: Crosstab, _analysis: Analysis): string {
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
