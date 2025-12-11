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
    // Explicitly set include_data parameter
    const url = `${this.baseUrl}/v2/saved/crosstabs/${crosstabId}?include_data=${includeData}`;

    console.log(`Fetching crosstab: ${url}`);
    console.log(`includeData parameter: ${includeData}`);

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
   * The API can return either:
   * 1. JSON Lines format (multiple JSON objects separated by newlines)
   * 2. Single JSON object with data array embedded (under various keys)
   */
  private async parseJSONLinesResponse(response: Response): Promise<Crosstab> {
    const text = await response.text();
    console.log('=== PARSING CROSSTAB RESPONSE ===');
    console.log('Crosstab response length:', text.length);
    console.log('Crosstab response (first 2000 chars):', text.substring(0, 2000));

    const lines = text.split('\n').filter(l => l.trim());
    console.log('Number of response lines:', lines.length);

    if (lines.length === 0) {
      throw new Error('Empty response from API');
    }

    // First line contains configuration
    const config = JSON.parse(lines[0]);
    console.log('Config keys:', Object.keys(config));

    // Check for embedded data under various possible keys
    const possibleDataKeys = ['data', 'results', 'values', 'rows_data', 'crosstab_data'];
    for (const key of possibleDataKeys) {
      if (config[key] && Array.isArray(config[key])) {
        console.log(`Found embedded data array under "${key}" with ${config[key].length} items`);
        return {
          ...config,
          id: config.uuid || config.id,
          data: config[key], // Normalize to 'data' property
        };
      }
    }

    // Check if lines 2+ contain data (JSON Lines format)
    if (lines.length > 1) {
      const data: CrosstabDataRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        try {
          const row = JSON.parse(lines[i]);
          data.push(row);
        } catch (e) {
          console.warn(`Failed to parse data row ${i}:`, lines[i].substring(0, 100), e);
        }
      }

      console.log(`Parsed ${data.length} data rows from JSON Lines format`);

      if (data.length > 0) {
        console.log('First data row sample:', JSON.stringify(data[0], null, 2).substring(0, 500));
      }

      return {
        ...config,
        id: config.uuid || config.id,
        data
      };
    }

    // No data found - return config only
    console.log('*** WARNING: No data found in response ***');
    console.log('Full config object:', JSON.stringify(config, null, 2).substring(0, 3000));

    return {
      ...config,
      id: config.uuid || config.id,
      data: []
    };
  }
}
