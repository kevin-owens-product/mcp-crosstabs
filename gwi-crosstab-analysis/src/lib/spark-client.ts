// Spark API Client for AI-powered GWI queries

export interface SparkResponse {
  response: string;
  sources?: string[];
  confidence?: number;
  chatId?: string;
}

export interface SparkQueryOptions {
  includeContext?: boolean;
  maxTokens?: number;
}

export class SparkAPIClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, useAlphaEnv: boolean = true) {
    this.apiKey = apiKey;
    // Use alpha environment by default
    this.baseUrl = useAlphaEnv
      ? 'https://api-alpha.globalwebindex.com'
      : 'https://api.globalwebindex.com';
  }

  /**
   * Send a natural language query to the Spark API
   */
  async query(prompt: string, options?: SparkQueryOptions): Promise<SparkResponse> {
    const url = `${this.baseUrl}/v1/spark-api/generic`;
    console.log(`Spark API request to: ${url}`);
    console.log(`Spark API prompt: ${prompt}`);

    const response = await fetch(url, {
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
    console.log('Spark API raw response:', JSON.stringify(data, null, 2).substring(0, 1000));

    // Handle the actual Spark API response format
    let responseText = '';

    // Try various response fields
    if (data.message && data.message.length > 0) {
      responseText = data.message;
    } else if (data.response) {
      responseText = data.response;
    } else if (data.answer) {
      responseText = data.answer;
    } else if (data.result) {
      responseText = data.result;
    } else if (data.insights && Array.isArray(data.insights) && data.insights.length > 0) {
      // Format insights array into readable text
      responseText = data.insights.map((insight: any) => {
        if (typeof insight === 'string') return insight;
        return insight.text || insight.message || insight.content || JSON.stringify(insight);
      }).join('\n\n');
    }

    // If still empty, show helpful message
    if (!responseText) {
      responseText = 'The Spark API returned an empty response. This may happen if:\n' +
        '- The question is too broad or unclear\n' +
        '- The data requested is not available\n' +
        '- Try rephrasing your question with more specific details';
      console.warn('Empty Spark response. Full data:', JSON.stringify(data));
    }

    // Extract sources - handle both string and object formats
    const sources: string[] = [];
    if (data.sources) {
      ['topics', 'audiences', 'datasets', 'locations', 'waves'].forEach(key => {
        if (data.sources[key] && Array.isArray(data.sources[key])) {
          data.sources[key].forEach((item: any) => {
            if (typeof item === 'string') {
              sources.push(item);
            } else if (item && typeof item === 'object') {
              // Extract name or other identifying property
              const name = item.name || item.title || item.label || item.code || item.id;
              if (name) sources.push(name);
            }
          });
        }
      });
    }

    return {
      response: responseText,
      sources: sources.length > 0 ? sources : undefined,
      confidence: data.confidence,
      chatId: data.chat_id,
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
