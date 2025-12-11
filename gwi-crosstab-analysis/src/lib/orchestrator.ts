import { GWICrosstabClient } from './crosstab-client';
import { CrosstabAnalyzer } from './crosstab-analyzer';
import { ResponseFormatter } from './response-formatter';

export class CrosstabAnalysisOrchestrator {
  public client: GWICrosstabClient;
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
