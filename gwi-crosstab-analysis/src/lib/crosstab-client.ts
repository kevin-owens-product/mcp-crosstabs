import type { Crosstab, CrosstabSummary, CrosstabDataRow, Audience, AudienceSummary } from './types';

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

// API Response types for audiences
// https://api.globalwebindex.com/docs/platform-api/reference/audiences/v2-list-audiences
interface APIAudience {
  id: string;
  v1_id?: string;
  name: string;
  expression: unknown;
  created_at: string;
  updated_at: string;
  folder_id?: string | null;
  position?: number;
  permissions?: {
    accessible?: boolean;
    containsUnknownData?: boolean;
  };
  datasets?: string[];
  flags?: string[];
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
    // First, fetch the crosstab configuration
    const configUrl = `${this.baseUrl}/v2/saved/crosstabs/${crosstabId}`;
    console.log(`Fetching crosstab config: ${configUrl}`);

    const configResponse = await fetch(configUrl, {
      headers: {
        'Authorization': this.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!configResponse.ok) {
      const errorText = await configResponse.text();
      console.error(`Get crosstab config API error (${configResponse.status}):`, errorText);
      throw new Error(`Failed to get crosstab: ${configResponse.status} ${configResponse.statusText} - ${errorText.substring(0, 200)}`);
    }

    const config = await configResponse.json();
    console.log('Crosstab config keys:', Object.keys(config));
    console.log('Crosstab name:', config.name);
    console.log('Rows count:', config.rows?.length || 0);
    console.log('Columns count:', config.columns?.length || 0);

    // If we don't need data, just return the config
    if (!includeData) {
      return {
        ...config,
        id: config.uuid || config.id,
        data: []
      };
    }

    // Fetch actual data using the Bulk Query endpoint
    console.log('=== FETCHING CROSSTAB DATA VIA BULK QUERY ===');
    try {
      const data = await this.queryCrosstabData(config);
      console.log(`Fetched ${data.length} data rows`);

      return {
        ...config,
        id: config.uuid || config.id,
        data
      };
    } catch (error) {
      console.error('Failed to fetch crosstab data:', error);
      // Return config without data if query fails
      return {
        ...config,
        id: config.uuid || config.id,
        data: []
      };
    }
  }

  /**
   * Query actual crosstab data using the Bulk Query endpoint
   * POST /v2/query/crosstab
   * Docs: https://api.globalwebindex.com/docs/platform-api/reference/query/v2-crosstab-bulk-query
   */
  private async queryCrosstabData(config: any): Promise<CrosstabDataRow[]> {
    const url = `${this.baseUrl}/v2/query/crosstab`;

    // Build the request body from the crosstab config
    const requestBody = {
      rows: config.rows || [],
      columns: config.columns || [],
      locations: config.country_codes || [],
      waves: config.wave_codes || [],
      base_audience: config.bases?.[0] || null
    };

    console.log('Bulk Query URL:', url);
    console.log('Bulk Query request:', JSON.stringify({
      rows_count: requestBody.rows.length,
      columns_count: requestBody.columns.length,
      locations: requestBody.locations,
      waves: requestBody.waves,
      has_base: !!requestBody.base_audience
    }));

    // Store rows and columns for index-to-ID mapping
    const rowsArray = config.rows || [];
    const columnsArray = config.columns || [];
    console.log('Row definitions for mapping:', rowsArray.slice(0, 3).map((r: any) => ({ id: r.id, name: r.name })));
    console.log('Column definitions for mapping:', columnsArray.slice(0, 3).map((c: any) => ({ id: c.id, name: c.name })));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json-seq'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Bulk Query response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Bulk Query API error (${response.status}):`, errorText);
      throw new Error(`Failed to query crosstab data: ${response.status} - ${errorText.substring(0, 500)}`);
    }

    // Parse JSON-seq response (stream of JSON objects)
    const text = await response.text();
    console.log('Bulk Query response length:', text.length);
    console.log('Bulk Query response (first 1000 chars):', text.substring(0, 1000));

    const data: CrosstabDataRow[] = [];
    const lines = text.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const row = JSON.parse(line);

        // Map row_index and column_index back to actual IDs from config
        // The Bulk Query API returns indices that correspond to the order of rows/columns in the request
        let datapointId: string;
        let audienceId: string;

        // Priority: use row.id if available, otherwise map index to config ID
        if (row.row?.id) {
          datapointId = row.row.id;
        } else if (typeof row.row_index === 'number' && rowsArray[row.row_index]) {
          datapointId = rowsArray[row.row_index].id;
        } else {
          datapointId = row.row_index?.toString() || '';
        }

        if (row.column?.id) {
          audienceId = row.column.id;
        } else if (typeof row.column_index === 'number' && columnsArray[row.column_index]) {
          audienceId = columnsArray[row.column_index].id;
        } else {
          audienceId = row.column_index?.toString() || '';
        }

        // Transform the response to match our CrosstabDataRow format
        data.push({
          datapoint: datapointId,
          audience: audienceId,
          segment: row.column?.name || (typeof row.column_index === 'number' && columnsArray[row.column_index] ? columnsArray[row.column_index].name : undefined),
          wave: row.wave,
          metrics: {
            positive_sample: row.intersect?.sample || 0,
            positive_size: row.intersect?.size || 0,
            audience_percentage: row.intersect?.percentage || 0,
            datapoint_percentage: row.audiences?.row?.percentage || 0,
            audience_index: row.intersect?.index || 100
          }
        });
      } catch (e) {
        console.warn('Failed to parse data row:', line.substring(0, 100), e);
      }
    }

    console.log(`Parsed ${data.length} data rows from Bulk Query`);
    if (data.length > 0) {
      console.log('First data row:', JSON.stringify(data[0], null, 2));
      // Show if ID mapping worked
      const firstRow = data[0];
      console.log(`First row datapoint ID: "${firstRow.datapoint}" (mapped from config: ${rowsArray[0]?.id})`);
      console.log(`First row audience ID: "${firstRow.audience}" (mapped from config: ${columnsArray[0]?.id})`);
    }

    return data;
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

  // ============================================================================
  // AUDIENCE METHODS
  // ============================================================================

  /**
   * List all saved audiences
   * GET /v2/saved/audiences
   * Docs: https://api.globalwebindex.com/docs/platform-api/reference/audiences/v2-list-audiences
   */
  async listAudiences(params?: {
    folder_id?: string;
    flags?: string[];
  }): Promise<AudienceSummary[]> {
    const url = new URL(`${this.baseUrl}/v2/saved/audiences`);

    if (params) {
      if (params.folder_id) url.searchParams.append('folder_id', params.folder_id);
      if (params.flags && params.flags.length > 0) {
        params.flags.forEach(flag => url.searchParams.append('flags', flag));
      }
    }

    console.log(`Listing audiences from: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': this.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`List audiences API error (${response.status}):`, errorText);
      throw new Error(`Failed to list audiences: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log('List audiences raw response:', JSON.stringify(data, null, 2).substring(0, 1500));

    // Parse response - could be { data: [...] } or direct array
    let audiences: APIAudience[] = [];

    if (data.data && Array.isArray(data.data)) {
      audiences = data.data;
    } else if (Array.isArray(data)) {
      audiences = data;
    } else if (data.audiences && Array.isArray(data.audiences)) {
      audiences = data.audiences;
    } else {
      console.warn('Unexpected audiences response format. Keys:', Object.keys(data));
      console.warn('Full response:', JSON.stringify(data));
    }

    // Map API response to AudienceSummary format
    const result: AudienceSummary[] = audiences.map(audience => ({
      id: audience.id,
      v1_id: audience.v1_id,
      name: audience.name,
      created_at: audience.created_at,
      updated_at: audience.updated_at,
      folder_id: audience.folder_id,
      flags: audience.flags,
    }));

    console.log(`Found ${result.length} audiences`);
    return result;
  }

  /**
   * Get a specific audience by ID
   * GET /v2/saved/audiences/{id}
   * Docs: https://api.globalwebindex.com/docs/platform-api/reference/audiences/v2-audience-detail
   */
  async getAudience(audienceId: string): Promise<Audience> {
    const url = `${this.baseUrl}/v2/saved/audiences/${audienceId}`;
    console.log(`Fetching audience: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': this.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Get audience API error (${response.status}):`, errorText);
      throw new Error(`Failed to get audience: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log('Audience detail keys:', Object.keys(data));
    console.log('Audience name:', data.name);

    // Map to Audience type
    const audience: Audience = {
      id: data.id,
      v1_id: data.v1_id,
      name: data.name,
      expression: data.expression || {},
      created_at: data.created_at,
      updated_at: data.updated_at,
      folder_id: data.folder_id,
      position: data.position,
      permissions: data.permissions,
      datasets: data.datasets,
      flags: data.flags,
    };

    return audience;
  }

  /**
   * Search audiences by name
   */
  async searchAudiences(query: string): Promise<AudienceSummary[]> {
    const all = await this.listAudiences();

    const lowerQuery = query.toLowerCase();
    return all.filter(audience =>
      audience.name.toLowerCase().includes(lowerQuery)
    );
  }

}
