import type { Crosstab, CrosstabSummary, CrosstabDataRow } from './types';

// API Response types based on official documentation
// https://api.globalwebindex.com/docs/platform-api/reference/crosstabs/v2-list-crosstabs
interface APIProject {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  folder_id?: string;
  copied_from?: string;
  notes?: string;
  sharing_type?: string;
}

export class GWICrosstabClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, useAlphaEnv: boolean = true) {
    // Store API key as-is (no Bearer prefix needed per documentation)
    this.apiKey = apiKey.startsWith('Bearer ') ? apiKey.replace('Bearer ', '') : apiKey;
    this.baseUrl = useAlphaEnv
      ? 'https://api-alpha.globalwebindex.com'
      : 'https://api.globalwebindex.com';
  }

  /**
   * List all saved crosstabs
   * GET /v2/saved/crosstabs
   * Docs: https://api.globalwebindex.com/docs/platform-api/reference/crosstabs/v2-list-crosstabs
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

    console.log(`Listing crosstabs from: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        // Authorization format per docs: just the API key, no Bearer prefix
        'Authorization': this.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`List crosstabs API error (${response.status}):`, errorText);
      throw new Error(`Failed to list crosstabs: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log('List crosstabs raw response:', JSON.stringify(data, null, 2).substring(0, 1500));

    // Parse response according to API documentation
    // Response format: { count: number, projects: [...] }
    let projects: APIProject[] = [];

    if (data.projects && Array.isArray(data.projects)) {
      // Correct format per documentation
      projects = data.projects;
    } else if (Array.isArray(data)) {
      // Response is directly an array
      projects = data;
    } else if (data.crosstabs && Array.isArray(data.crosstabs)) {
      // Legacy format
      projects = data.crosstabs;
    } else if (data.items && Array.isArray(data.items)) {
      projects = data.items;
    } else {
      console.warn('Unexpected response format. Keys:', Object.keys(data));
      console.warn('Full response:', JSON.stringify(data));
    }

    // Map API response to CrosstabSummary format
    const crosstabs: CrosstabSummary[] = projects.map(project => ({
      id: project.uuid,
      uuid: project.uuid,
      name: project.name,
      created_at: project.created_at,
      updated_at: project.updated_at,
      folder_id: project.folder_id,
    }));

    console.log(`Found ${crosstabs.length} crosstabs`);
    return crosstabs;
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

    console.log(`Fetching crosstab: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': this.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Get crosstab API error (${response.status}):`, errorText);
      throw new Error(`Failed to get crosstab: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
    }

    if (!includeData) {
      const data = await response.json();
      // Normalize uuid to id
      return {
        ...data,
        id: data.uuid || data.id,
      };
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
    console.log('Crosstab response (first 500 chars):', text.substring(0, 500));

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
      id: config.uuid || config.id,
      data
    };
  }
}
