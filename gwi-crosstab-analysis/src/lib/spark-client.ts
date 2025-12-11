// Spark API Client for AI-powered GWI queries

export interface SparkResponse {
  response: string;
  sources?: string[];
  confidence?: number;
}

export interface SparkQueryOptions {
  includeContext?: boolean;
  maxTokens?: number;
}

export class SparkAPIClient {
  private baseUrl: string = 'https://api-alpha.globalwebindex.com';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Send a natural language query to the Spark API
   */
  async query(prompt: string, options?: SparkQueryOptions): Promise<SparkResponse> {
    const response = await fetch(`${this.baseUrl}/v1/spark-api/generic`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        ...options,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Spark API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    return {
      response: data.response || data.answer || data.result || JSON.stringify(data),
      sources: data.sources,
      confidence: data.confidence,
    };
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
   * Check if the API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple test query
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
 * Format Spark API response for display
 */
export function formatSparkResponse(response: SparkResponse): string {
  let output = response.response;

  if (response.sources && response.sources.length > 0) {
    output += '\n\n---\n**Sources:** ' + response.sources.join(', ');
  }

  if (response.confidence !== undefined) {
    const confidenceLabel = response.confidence > 0.8 ? 'High' :
                           response.confidence > 0.5 ? 'Medium' : 'Low';
    output += `\n\n*Confidence: ${confidenceLabel}*`;
  }

  return output;
}
