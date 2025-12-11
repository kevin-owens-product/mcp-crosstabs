// MCP Tools API Client for AI-powered GWI queries
// Based on: https://api.globalwebindex.com/docs/spark-mcp/reference/mcp-tools/execute-gwi-mcp-tool-calls

// JSON-RPC 2.0 Request Format
interface MCPRequest {
  jsonrpc: '2.0';
  id: string;
  method: 'tools/call';
  params: {
    name: 'chat_gwi' | 'explore_insight_gwi';
    arguments: Record<string, unknown>;
  };
}

// JSON-RPC 2.0 Response Format
interface MCPResponse {
  jsonrpc: '2.0';
  id: string;
  result: {
    content: Array<{
      type: 'text';
      text: string;
    }>;
    isError: boolean;
  };
}

// Parsed response from chat_gwi tool
export interface ChatGWIResult {
  response: string;
  insightIds: string[];
  chatId: string;
  sources: SparkSource;
}

export interface SparkSource {
  topics?: string[];
  audiences?: Array<{ id: string; name: string; description: string }>;
  datasets?: Array<{ code: string; name: string }>;
  locations?: Array<{ code: string; name: string }>;
  waves?: Array<{ code: string; name: string }>;
}

export interface SparkResponse {
  message: string;
  insights: Array<{ id: string; text: string }>;
  chatId: string;
  sources: SparkSource;
  formattedText: string;
}

export interface SparkQueryOptions {
  chat_id?: string;
  docked_audiences?: string[];
}

export interface InsightDetail {
  insightId: string;
  text: string;
  metrics: Array<{
    name: string;
    percentage: number;
    index: number;
    sample: number;
  }>;
}

export class SparkAPIClient {
  private baseUrl: string;
  private apiKey: string;
  private currentChatId: string | null = null;
  private requestCounter: number = 0;

  constructor(apiKey: string, useAlphaEnv: boolean = true) {
    this.apiKey = apiKey;
    this.baseUrl = useAlphaEnv
      ? 'https://api-alpha.globalwebindex.com'
      : 'https://api.globalwebindex.com';
  }

  /**
   * Generate unique request ID for JSON-RPC
   */
  private generateRequestId(): string {
    this.requestCounter++;
    return `req-${Date.now()}-${this.requestCounter}`;
  }

  /**
   * Send a request to the MCP tools endpoint
   */
  private async sendMCPRequest(request: MCPRequest): Promise<MCPResponse> {
    const url = `${this.baseUrl}/v1/spark-api/mcp`;
    console.log(`MCP API request to: ${url}`);
    console.log(`MCP API request body:`, JSON.stringify(request, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MCP API error (${response.status}): ${errorText}`);
    }

    const data: MCPResponse = await response.json();
    console.log('MCP API raw response:', JSON.stringify(data, null, 2).substring(0, 3000));

    if (data.result?.isError) {
      const errorText = data.result.content.map(c => c.text).join('\n');
      throw new Error(`MCP API returned error: ${errorText}`);
    }

    return data;
  }

  /**
   * Send a natural language query using the chat_gwi tool
   * POST /v1/spark-api/mcp with tools/call method
   */
  async query(prompt: string, options?: SparkQueryOptions): Promise<SparkResponse> {
    console.log(`MCP chat_gwi prompt: ${prompt}`);

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: 'tools/call',
      params: {
        name: 'chat_gwi',
        arguments: {
          prompt,
          ...(options?.chat_id ? { chat_id: options.chat_id } : {}),
          ...(this.currentChatId && !options?.chat_id ? { chat_id: this.currentChatId } : {}),
          ...(options?.docked_audiences ? { docked_audiences: options.docked_audiences } : {}),
        },
      },
    };

    const response = await this.sendMCPRequest(request);

    // Parse the response content
    const contentText = response.result.content.map(c => c.text).join('\n');
    const parsed = this.parseChatGWIResponse(contentText);

    // Store chat_id for conversation continuity
    if (parsed.chatId) {
      this.currentChatId = parsed.chatId;
    }

    // Format the response for display
    const formattedText = this.formatResponse(parsed);

    return {
      message: parsed.response,
      insights: parsed.insightIds.map(id => ({ id, text: '' })),
      chatId: parsed.chatId,
      sources: parsed.sources,
      formattedText,
    };
  }

  /**
   * Parse the text response from chat_gwi tool
   * The MCP endpoint returns verbose text that we can use directly
   */
  private parseChatGWIResponse(text: string): ChatGWIResult {
    // The MCP endpoint returns more verbose, readable text
    // Extract any structured data if present, otherwise use the text as-is

    let chatId = '';
    let insightIds: string[] = [];
    const sources: SparkSource = {};

    // Try to extract chat_id if present in the response
    const chatIdMatch = text.match(/chat_id[:\s]+([a-zA-Z0-9-]+)/i);
    if (chatIdMatch) {
      chatId = chatIdMatch[1];
    }

    // Try to extract insight IDs if present (format: insight-xxx or similar)
    const insightMatches = text.matchAll(/insight[_-]?id[:\s]+([a-zA-Z0-9-]+)/gi);
    for (const match of insightMatches) {
      insightIds.push(match[1]);
    }

    // Extract source information if structured
    const topicsMatch = text.match(/topics?[:\s]+([^\n]+)/i);
    if (topicsMatch) {
      sources.topics = topicsMatch[1].split(',').map(t => t.trim());
    }

    const marketsMatch = text.match(/(?:markets?|locations?|countries?)[:\s]+([^\n]+)/i);
    if (marketsMatch) {
      sources.locations = marketsMatch[1].split(',').map(l => ({
        code: l.trim(),
        name: l.trim()
      }));
    }

    return {
      response: text,
      insightIds,
      chatId,
      sources,
    };
  }

  /**
   * Format API response into readable text
   * Since MCP returns verbose text, we mostly pass it through
   */
  private formatResponse(data: ChatGWIResult): string {
    // MCP endpoint returns verbose text, so we can use it directly
    // Just clean up and format nicely
    let text = data.response;

    // If the response is empty, provide helpful guidance
    if (!text || text.trim().length === 0) {
      return 'The MCP API returned an empty response. Try:\n' +
        '- Being more specific with your question\n' +
        '- Including a market (e.g., "in the UK")\n' +
        '- Specifying an audience (e.g., "among Gen Z")';
    }

    return text;
  }

  /**
   * Get detailed statistics for an insight using explore_insight_gwi tool
   */
  async exploreInsight(insightId: string): Promise<InsightDetail> {
    console.log(`MCP explore_insight_gwi for insight: ${insightId}`);

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: 'tools/call',
      params: {
        name: 'explore_insight_gwi',
        arguments: {
          insight_id: insightId,
        },
      },
    };

    const response = await this.sendMCPRequest(request);
    const contentText = response.result.content.map(c => c.text).join('\n');

    // Parse the insight detail response
    return this.parseInsightDetail(insightId, contentText);
  }

  /**
   * Parse explore_insight_gwi response
   */
  private parseInsightDetail(insightId: string, text: string): InsightDetail {
    const metrics: InsightDetail['metrics'] = [];

    // Try to extract percentage, index, and sample data from the text
    const percentageMatches = text.match(/(\d+(?:\.\d+)?)\s*%/g) || [];
    const indexMatches = [...text.matchAll(/index[:\s]+(\d+(?:\.\d+)?)/gi)];
    const sampleMatches = [...text.matchAll(/sample[:\s]+(\d+(?:,\d+)?)/gi)];

    percentageMatches.forEach((p, i) => {
      const percentage = parseFloat(p.replace('%', ''));
      const indexValue = indexMatches[i] ? parseFloat(indexMatches[i][1]) : 100;
      const sampleValue = sampleMatches[i] ? parseInt(sampleMatches[i][1].replace(',', '')) : 0;

      metrics.push({
        name: `Metric ${i + 1}`,
        percentage,
        index: indexValue,
        sample: sampleValue,
      });
    });

    return {
      insightId,
      text,
      metrics,
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
