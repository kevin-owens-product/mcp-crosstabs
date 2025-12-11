// Spark API Client for AI-powered GWI queries
// Based on: https://api.globalwebindex.com/docs/spark-api/reference/chat/chat-with-the-service

// API Response Types
export interface SparkInsight {
  id: string;
  text: string;
}

export interface SparkSource {
  topics?: string[];
  audiences?: Array<{ id: string; name: string; description: string }>;
  datasets?: Array<{ code: string; name: string }>;
  locations?: Array<{ code: string; name: string }>;
  waves?: Array<{ code: string; name: string }>;
}

export interface SparkAPIResponse {
  message: string;
  insights: SparkInsight[];
  chat_id: string;
  sources: SparkSource;
}

export interface SparkResponse {
  message: string;
  insights: SparkInsight[];
  chatId: string;
  sources: SparkSource;
  formattedText: string;
}

export interface SparkQueryOptions {
  chat_id?: string;
  docked_audiences?: string[];
}

export interface InsightDetail {
  insight: {
    id: string;
    text: string;
    metrics: string[];
  };
  calculations: Array<{
    percentage: number;
    index: number;
    sample: number;
  }>;
}

export class SparkAPIClient {
  private baseUrl: string;
  private apiKey: string;
  private currentChatId: string | null = null;

  constructor(apiKey: string, useAlphaEnv: boolean = true) {
    this.apiKey = apiKey;
    this.baseUrl = useAlphaEnv
      ? 'https://api-alpha.globalwebindex.com'
      : 'https://api.globalwebindex.com';
  }

  /**
   * Send a natural language query to the Spark API
   * POST /v1/spark-api/generic
   */
  async query(prompt: string, options?: SparkQueryOptions): Promise<SparkResponse> {
    const url = `${this.baseUrl}/v1/spark-api/generic`;
    console.log(`Spark API request to: ${url}`);
    console.log(`Spark API prompt: ${prompt}`);

    const requestBody: Record<string, unknown> = { prompt };

    // Include chat_id for conversation continuity
    if (options?.chat_id) {
      requestBody.chat_id = options.chat_id;
    } else if (this.currentChatId) {
      requestBody.chat_id = this.currentChatId;
    }

    // Include docked audiences if provided
    if (options?.docked_audiences) {
      requestBody.docked_audiences = options.docked_audiences;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Spark API error (${response.status}): ${errorText}`);
    }

    const data: SparkAPIResponse = await response.json();
    console.log('Spark API raw response:', JSON.stringify(data, null, 2).substring(0, 2000));

    // Store chat_id for conversation continuity
    if (data.chat_id) {
      this.currentChatId = data.chat_id;
    }

    // Format the response for display
    const formattedText = this.formatResponse(data);

    return {
      message: data.message || '',
      insights: data.insights || [],
      chatId: data.chat_id,
      sources: data.sources || {},
      formattedText,
    };
  }

  /**
   * Format API response into readable text
   */
  private formatResponse(data: SparkAPIResponse): string {
    const parts: string[] = [];

    // Add main message if present
    if (data.message && data.message.trim().length > 0) {
      parts.push(data.message);
    }

    // Add insights as bullet points
    if (data.insights && data.insights.length > 0) {
      if (parts.length > 0) {
        parts.push(''); // Empty line separator
      }
      parts.push('**Key Insights:**\n');
      data.insights.forEach((insight, index) => {
        parts.push(`${index + 1}. ${insight.text}`);
      });
    }

    // Add sources section
    const sourceTexts: string[] = [];

    if (data.sources) {
      if (data.sources.topics && data.sources.topics.length > 0) {
        sourceTexts.push(`Topics: ${data.sources.topics.join(', ')}`);
      }
      if (data.sources.locations && data.sources.locations.length > 0) {
        const locationNames = data.sources.locations.map(l => l.name).join(', ');
        sourceTexts.push(`Markets: ${locationNames}`);
      }
      if (data.sources.waves && data.sources.waves.length > 0) {
        const waveNames = data.sources.waves.map(w => w.name).join(', ');
        sourceTexts.push(`Time Period: ${waveNames}`);
      }
      if (data.sources.datasets && data.sources.datasets.length > 0) {
        const datasetNames = data.sources.datasets.map(d => d.name).join(', ');
        sourceTexts.push(`Dataset: ${datasetNames}`);
      }
      if (data.sources.audiences && data.sources.audiences.length > 0) {
        const audienceNames = data.sources.audiences.map(a => a.name).join(', ');
        sourceTexts.push(`Audiences: ${audienceNames}`);
      }
    }

    if (sourceTexts.length > 0) {
      parts.push('');
      parts.push('---');
      parts.push('**Sources:**');
      sourceTexts.forEach(s => parts.push(`- ${s}`));
    }

    // Handle empty response
    if (parts.length === 0 || (parts.length === 1 && parts[0].trim() === '')) {
      return 'The Spark API returned an empty response. Try:\n' +
        '- Being more specific with your question\n' +
        '- Including a market (e.g., "in the UK")\n' +
        '- Specifying an audience (e.g., "among Gen Z")';
    }

    return parts.join('\n');
  }

  /**
   * Get detailed information about a specific insight
   * GET /v1/spark-api/generic/insights/{id}
   */
  async getInsightDetails(insightId: string): Promise<InsightDetail> {
    const url = `${this.baseUrl}/v1/spark-api/generic/insights/${insightId}`;
    console.log(`Fetching insight details: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Spark API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Query with crosstab context
   */
  async queryWithContext(
    prompt: string,
    crosstabContext?: {
      name: string;
      markets: string[];
      waves: string[];
      audience?: string;
    }
  ): Promise<SparkResponse> {
    let contextualPrompt = prompt;

    if (crosstabContext) {
      contextualPrompt = `Context: Analyzing data for ${crosstabContext.name}. ` +
        `Markets: ${crosstabContext.markets.join(', ')}. ` +
        `Time period: ${crosstabContext.waves.join(', ')}. ` +
        (crosstabContext.audience ? `Audience: ${crosstabContext.audience}. ` : '') +
        `\n\nQuestion: ${prompt}`;
    }

    return this.query(contextualPrompt);
  }

  /**
   * Start a new conversation (clear chat_id)
   */
  clearConversation(): void {
    this.currentChatId = null;
  }

  /**
   * Check if the API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('What is GWI?');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Determine if a query should go to Spark API vs Platform API
 */
export function shouldUseSparkAPI(message: string): boolean {
  const lower = message.toLowerCase();

  // Queries that should use Spark API (general GWI data questions)
  const sparkPatterns = [
    // Demographic questions
    /what (is|are) the (average|median|percentage|proportion)/,
    /how many (people|users|consumers)/,
    /what percentage/,
    /who (uses|buys|watches|listens)/,

    // Comparative questions about populations
    /compare .* (users|consumers|audience)/,
    /difference between .* and .*/,
    /more likely to/,
    /less likely to/,

    // Behavioral questions
    /what (do|does) .* (think|feel|believe|prefer)/,
    /why (do|does)/,
    /attitudes? (toward|about|on)/,

    // Market/trend questions without specific crosstab
    /market (size|share|trend)/,
    /trend.* (in|for|of)/,
    /growth (of|in)/,

    // General GWI data questions
    /according to gwi/,
    /gwi data (shows|says|indicates)/,
    /in (which|what) (country|market|region)/,

    // Questions about specific demographics
    /gen z|millennials|boomers|generation/,
    /age group/,
    /income (level|bracket|group)/,
  ];

  // Check if message matches Spark patterns
  for (const pattern of sparkPatterns) {
    if (pattern.test(lower)) {
      return true;
    }
  }

  // Keywords that suggest Spark API usage
  const sparkKeywords = [
    'average', 'percentage', 'proportion', 'likelihood',
    'demographics', 'population', 'consumers', 'users',
    'attitudes', 'behaviors', 'preferences',
    'global', 'worldwide', 'countries',
  ];

  const keywordMatches = sparkKeywords.filter(kw => lower.includes(kw));

  // If 2+ keywords match, likely a Spark query
  if (keywordMatches.length >= 2) {
    return true;
  }

  return false;
}

/**
 * Format Spark API response for display (legacy compatibility)
 */
export function formatSparkResponse(response: SparkResponse): string {
  return response.formattedText;
}
