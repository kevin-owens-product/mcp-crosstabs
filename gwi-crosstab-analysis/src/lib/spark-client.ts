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

// Parsed insight with extracted metrics
export interface ParsedInsight {
  id: string;
  content: string;
  metrics: {
    percentage?: number;
    index?: number;
    indexDirection?: 'over' | 'under' | 'neutral';
    sample?: number;
  };
  category: 'positive_affinity' | 'negative_affinity' | 'demographic' | 'behavioral' | 'general';
  significance: 'high' | 'medium' | 'low';
}

// Parsed response from chat_gwi tool
export interface ChatGWIResult {
  response: string;
  insights: ParsedInsight[];
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
  insights: ParsedInsight[];
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
    // Store API key - will be formatted in sendMCPRequest
    this.apiKey = apiKey.replace(/^Bearer\s+/i, '').trim();
    // Use alpha environment by default (matches GWI_API_KEY behavior)
    this.baseUrl = useAlphaEnv
      ? 'https://api-alpha.globalwebindex.com'
      : 'https://api.globalwebindex.com';
    console.log(`SparkAPIClient initialized with baseUrl: ${this.baseUrl}`);
    console.log(`API key length: ${this.apiKey.length}, starts with: ${this.apiKey.substring(0, 8)}...`);
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
   * Per documentation: https://api.globalwebindex.com/docs/spark-mcp/reference/mcp-tools/execute-gwi-mcp-tool-calls
   */
  private async sendMCPRequest(request: MCPRequest): Promise<MCPResponse> {
    const url = `${this.baseUrl}/v1/spark-api/mcp`;
    console.log(`=== MCP API REQUEST ===`);
    console.log(`MCP API URL: ${url}`);
    console.log(`MCP API tool: ${request.params.name}`);
    console.log(`MCP API request body:`, JSON.stringify(request, null, 2));

    // Try with Bearer prefix - common OAuth format
    const authHeader = this.apiKey.startsWith('Bearer ') ? this.apiKey : `Bearer ${this.apiKey}`;
    console.log(`Authorization header format: Bearer ***`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    console.log(`MCP API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`MCP API error response:`, errorText);
      throw new Error(`MCP API error (${response.status}): ${errorText}`);
    }

    const data: MCPResponse = await response.json();
    console.log('=== MCP API RESPONSE ===');
    console.log('MCP API raw response:', JSON.stringify(data, null, 2).substring(0, 3000));

    if (data.result?.isError) {
      const errorText = data.result.content.map(c => c.text).join('\n');
      console.error('MCP API returned error:', errorText);
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
      insights: parsed.insights,
      chatId: parsed.chatId,
      sources: parsed.sources,
      formattedText,
    };
  }

  /**
   * Parse the text response from chat_gwi tool
   */
  private parseChatGWIResponse(rawText: string): ChatGWIResult {
    const insights: ParsedInsight[] = [];
    const sources: SparkSource = {};
    let chatId = '';

    // Extract Chat ID
    const chatIdMatch = rawText.match(/Chat ID:\s*([a-f0-9-]{36})/i);
    if (chatIdMatch) chatId = chatIdMatch[1];

    // Extract insights - match from "Insight ID: <uuid> Content:" to the next insight or end markers
    // Using a more robust pattern that doesn't break on capital I in content
    const insightRegex = /Insight ID:\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s*Content:\s*([\s\S]+?)(?=Insight ID:|Sources\s*\n|Processing Instructions|$)/gi;

    let match;
    while ((match = insightRegex.exec(rawText)) !== null) {
      const content = match[2].trim().replace(/\s+/g, ' ');
      if (content) {
        const parsedInsight = this.parseInsightContent(match[1], content);
        insights.push(parsedInsight);
      }
    }

    // Sort insights: positive affinities first, then by significance, then by index
    insights.sort((a, b) => {
      // Priority order: positive_affinity > behavioral > demographic > negative_affinity > general
      const categoryOrder = { positive_affinity: 0, behavioral: 1, demographic: 2, negative_affinity: 3, general: 4 };
      const sigOrder = { high: 0, medium: 1, low: 2 };

      if (categoryOrder[a.category] !== categoryOrder[b.category]) {
        return categoryOrder[a.category] - categoryOrder[b.category];
      }
      if (sigOrder[a.significance] !== sigOrder[b.significance]) {
        return sigOrder[a.significance] - sigOrder[b.significance];
      }
      // Higher index values first
      return (b.metrics.index || 100) - (a.metrics.index || 100);
    });

    console.log('Parsed', insights.length, 'insights');

    // Extract sources
    const topicsMatch = rawText.match(/Topics:\s*([A-Za-z0-9\s,]+?)(?=Datasets:|Locations:|Time periods:|$)/i);
    if (topicsMatch) {
      sources.topics = topicsMatch[1].split(',').map(t => t.trim()).filter(Boolean);
    }

    const datasetsMatch = rawText.match(/Datasets:\s*(.+?)(?=Locations:|Time periods:|$)/i);
    if (datasetsMatch) {
      sources.datasets = datasetsMatch[1].split(',').map(d => {
        const m = d.trim().match(/(.+?)\s*\(([^)]+)\)/);
        return m ? { name: m[1].trim(), code: m[2].trim() } : { name: d.trim(), code: '' };
      }).filter(d => d.name);
    }

    const locMatch = rawText.match(/Locations:\s*(.+?)(?=Time periods:|$)/i);
    if (locMatch) {
      sources.locations = locMatch[1].split(',').map(l => ({ code: l.trim(), name: l.trim() })).filter(l => l.name);
    }

    const timeMatch = rawText.match(/Time periods:\s*(.+?)(?=\n\n|Processing|$)/i);
    if (timeMatch) {
      sources.waves = timeMatch[1].split(',').map(w => ({ code: w.trim(), name: w.trim() })).filter(w => w.name);
    }

    return { response: rawText, insights, chatId, sources };
  }

  /**
   * Parse insight content to extract metrics and categorize
   */
  private parseInsightContent(id: string, content: string): ParsedInsight {
    const metrics: ParsedInsight['metrics'] = {};
    let category: ParsedInsight['category'] = 'general';
    let significance: ParsedInsight['significance'] = 'medium';

    // Extract percentage (e.g., "14% of the audience")
    const percentMatch = content.match(/(\d+(?:\.\d+)?)\s*%\s*(of\s+the\s+audience)?/i);
    if (percentMatch) {
      metrics.percentage = parseFloat(percentMatch[1]);
    }

    // Extract index/likelihood (e.g., "40% more likely", "22% less likely")
    const moreLikelyMatch = content.match(/(\d+(?:\.\d+)?)\s*%\s*more\s+likely/i);
    const lessLikelyMatch = content.match(/(\d+(?:\.\d+)?)\s*%\s*less\s+likely/i);

    if (moreLikelyMatch) {
      const indexDelta = parseFloat(moreLikelyMatch[1]);
      metrics.index = 100 + indexDelta;
      metrics.indexDirection = 'over';
    } else if (lessLikelyMatch) {
      const indexDelta = parseFloat(lessLikelyMatch[1]);
      metrics.index = 100 - indexDelta;
      metrics.indexDirection = 'under';
    }

    // Categorize based on content keywords and index direction
    const lowerContent = content.toLowerCase();

    if (metrics.indexDirection === 'over') {
      category = 'positive_affinity';
    } else if (metrics.indexDirection === 'under') {
      category = 'negative_affinity';
    } else if (lowerContent.includes('age') || lowerContent.includes('gender') ||
               lowerContent.includes('income') || lowerContent.includes('household') ||
               lowerContent.includes('education') || lowerContent.includes('employed')) {
      category = 'demographic';
    } else if (lowerContent.includes('use') || lowerContent.includes('buy') ||
               lowerContent.includes('watch') || lowerContent.includes('listen') ||
               lowerContent.includes('prefer') || lowerContent.includes('engage')) {
      category = 'behavioral';
    }

    // Determine significance based on index strength
    if (metrics.index) {
      if (metrics.index >= 140 || metrics.index <= 60) {
        significance = 'high';
      } else if (metrics.index >= 120 || metrics.index <= 80) {
        significance = 'medium';
      } else {
        significance = 'low';
      }
    }

    return {
      id,
      content,
      metrics,
      category,
      significance,
    };
  }

  /**
   * Format API response into readable, user-friendly text
   */
  private formatResponse(data: ChatGWIResult): string {
    const parts: string[] = [];

    if (data.insights && data.insights.length > 0) {
      // Group insights by category
      const positive = data.insights.filter(i => i.category === 'positive_affinity');
      const negative = data.insights.filter(i => i.category === 'negative_affinity');
      const behavioral = data.insights.filter(i => i.category === 'behavioral');
      const demographic = data.insights.filter(i => i.category === 'demographic');
      const general = data.insights.filter(i => i.category === 'general');

      // Format positive affinities (over-indexed behaviors)
      if (positive.length > 0) {
        parts.push('## Over-Indexed Behaviors (Opportunities)\n\n');
        positive.forEach((insight, index) => {
          const indexStr = insight.metrics.index ? ` [Index: ${Math.round(insight.metrics.index)}]` : '';
          const sigIcon = insight.significance === 'high' ? '***' : insight.significance === 'medium' ? '**' : '*';
          parts.push(`${index + 1}. ${sigIcon}${insight.content}${sigIcon}${indexStr}\n`);
        });
        parts.push('\n');
      }

      // Format negative affinities (under-indexed behaviors)
      if (negative.length > 0) {
        parts.push('## Under-Indexed Behaviors (Gaps)\n\n');
        negative.forEach((insight, index) => {
          const indexStr = insight.metrics.index ? ` [Index: ${Math.round(insight.metrics.index)}]` : '';
          parts.push(`${index + 1}. ${insight.content}${indexStr}\n`);
        });
        parts.push('\n');
      }

      // Format behavioral insights
      if (behavioral.length > 0) {
        parts.push('## Behavioral Insights\n\n');
        behavioral.forEach((insight, index) => {
          parts.push(`${index + 1}. ${insight.content}\n`);
        });
        parts.push('\n');
      }

      // Format demographic insights
      if (demographic.length > 0) {
        parts.push('## Demographic Insights\n\n');
        demographic.forEach((insight, index) => {
          parts.push(`${index + 1}. ${insight.content}\n`);
        });
        parts.push('\n');
      }

      // Format general insights
      if (general.length > 0) {
        parts.push('## Additional Insights\n\n');
        general.forEach((insight, index) => {
          parts.push(`${index + 1}. ${insight.content}\n`);
        });
        parts.push('\n');
      }

      // Summary stats
      const highSigCount = data.insights.filter(i => i.significance === 'high').length;
      if (highSigCount > 0) {
        parts.push(`---\n**Summary:** ${data.insights.length} insights found, ${highSigCount} high-significance findings.\n\n`);
      }
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
