import type { Crosstab, CrosstabSummary, CrosstabDataRow } from './types';

export class GWICrosstabClient {
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
