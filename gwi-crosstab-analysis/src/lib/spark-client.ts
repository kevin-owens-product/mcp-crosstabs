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
  insights: Array<{ id: string; content: string }>;
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
      insights: parsed.insights.map(i => ({ id: i.id, text: i.content })),
      chatId: parsed.chatId,
      sources: parsed.sources,
      formattedText,
    };
  }

  /**
   * Parse the text response from chat_gwi tool
   * Format: Insight ID: <uuid> Content: <text>
   */
  private parseChatGWIResponse(rawText: string): ChatGWIResult {
    let chatId = '';
    const insights: Array<{ id: string; content: string }> = [];
    const sources: SparkSource = {};

    // Normalize line endings
    const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Extract Chat ID
    const chatIdMatch = text.match(/Chat ID:\s*([a-f0-9-]{36})/i);
    if (chatIdMatch) {
      chatId = chatIdMatch[1];
    }

    // Simple approach: find all "Insight ID: xxx Content: yyy" patterns
    // Split by "Insight ID:" to get each insight block
    const insightBlocks = text.split(/Insight ID:\s*/i).slice(1); // Skip first empty element

    for (const block of insightBlocks) {
      // Extract UUID (first 36 chars that look like a UUID)
      const uuidMatch = block.match(/^([a-f0-9-]{36})/i);
      if (!uuidMatch) continue;

      const uuid = uuidMatch[1];

      // Find "Content:" and extract everything after it until the next section
      const contentMatch = block.match(/Content:\s*(.+?)(?=Insight ID:|Sources|Processing Instructions|$)/is);
      if (contentMatch) {
        const content = contentMatch[1].trim().replace(/\n+/g, ' ');
        if (content.length > 0) {
          insights.push({ id: uuid, content });
        }
      }
    }

    console.log('Parsed insights count:', insights.length);

    // Extract sources
    const topicsMatch = text.match(/Topics:\s*([^\n]+)/i);
    if (topicsMatch) {
      let topicsText = topicsMatch[1];
      const nextSection = topicsText.search(/Datasets:|Locations:|Time periods:/i);
      if (nextSection > 0) topicsText = topicsText.substring(0, nextSection);
      sources.topics = topicsText.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }

    const datasetsMatch = text.match(/Datasets:\s*([^\n]+)/i);
    if (datasetsMatch) {
      let datasetsText = datasetsMatch[1];
      const nextSection = datasetsText.search(/Locations:|Time periods:/i);
      if (nextSection > 0) datasetsText = datasetsText.substring(0, nextSection);
      sources.datasets = datasetsText.split(',').map(d => {
        const m = d.trim().match(/(.+?)\s*\(([^)]+)\)/);
        return m ? { name: m[1].trim(), code: m[2].trim() } : { name: d.trim(), code: d.trim() };
      }).filter(d => d.name.length > 0);
    }

    const locationsMatch = text.match(/Locations:\s*([^\n]+)/i);
    if (locationsMatch) {
      let locText = locationsMatch[1];
      const nextSection = locText.search(/Time periods:/i);
      if (nextSection > 0) locText = locText.substring(0, nextSection);
      sources.locations = locText.split(',').map(l => ({ code: l.trim(), name: l.trim() })).filter(l => l.name.length > 0);
    }

    const wavesMatch = text.match(/Time periods:\s*([^\n]+)/i);
    if (wavesMatch) {
      sources.waves = wavesMatch[1].split(',').map(w => ({ code: w.trim(), name: w.trim() })).filter(w => w.name.length > 0);
    }

    return { response: text, insights, chatId, sources };
  }

  /**
   * Format API response into readable, user-friendly text
   */
  private formatResponse(data: ChatGWIResult): string {
    const parts: string[] = [];

    // Add insights as the main content
    if (data.insights && data.insights.length > 0) {
      parts.push('## Key Insights\n');
      data.insights.forEach((insight, index) => {
        parts.push(`${index + 1}. ${insight.content}\n`);
      });
    }

    // Add sources section
    if (data.sources) {
      const sourceLines: string[] = [];

      if (data.sources.topics && data.sources.topics.length > 0) {
        sourceLines.push(`**Topics:** ${data.sources.topics.join(', ')}`);
      }

      if (data.sources.datasets && data.sources.datasets.length > 0) {
        const datasetNames = data.sources.datasets.map(d => d.name).join(', ');
        sourceLines.push(`**Dataset:** ${datasetNames}`);
      }

      if (data.sources.waves && data.sources.waves.length > 0) {
        const waveNames = data.sources.waves.map(w => w.name).join(', ');
        sourceLines.push(`**Time Period:** ${waveNames}`);
      }

      if (data.sources.locations && data.sources.locations.length > 0) {
        // Show first 5 locations + count if more
        const locationNames = data.sources.locations.slice(0, 5).map(l => l.name);
        const remaining = data.sources.locations.length - 5;
        let locationText = locationNames.join(', ');
        if (remaining > 0) {
          locationText += ` and ${remaining} more markets`;
        }
        sourceLines.push(`**Markets:** ${locationText}`);
      }

      if (sourceLines.length > 0) {
        parts.push('\n---\n');
        parts.push('### Sources\n');
        sourceLines.forEach(line => parts.push(line + '\n'));
      }
    }

    // Handle empty response
    if (parts.length === 0) {
      // Fall back to raw response if no structured data was parsed
      if (data.response && data.response.trim().length > 0) {
        return data.response;
      }
      return 'The MCP API returned an empty response. Try:\n' +
        '- Being more specific with your question\n' +
        '- Including a market (e.g., "in the UK")\n' +
        '- Specifying an audience (e.g., "among Gen Z")';
    }

    return parts.join('');
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
