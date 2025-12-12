import type { Request, Response } from 'express';
import { CrosstabAnalysisOrchestrator } from '../lib/orchestrator';
import { TemplateAnalysisEngine } from '../lib/analysis-templates';
import { CrosstabAnalyzer } from '../lib/crosstab-analyzer';
import { ResponseFormatter } from '../lib/response-formatter';
import { SparkAPIClient, shouldUseSparkAPI, formatSparkResponse } from '../lib/spark-client';

// Initialize services
const API_KEY = process.env.GWI_API_KEY;
const SPARK_API_KEY = process.env.GWI_MCP_KEY;

console.log('=== API KEY CONFIGURATION ===');
console.log('GWI_API_KEY:', API_KEY ? `set (length=${API_KEY.length}, starts=${API_KEY.substring(0, 10)}...)` : 'NOT SET');
console.log('GWI_MCP_KEY:', SPARK_API_KEY ? `set (length=${SPARK_API_KEY.length}, starts=${SPARK_API_KEY.substring(0, 10)}...)` : 'NOT SET');
console.log('Keys are same:', API_KEY === SPARK_API_KEY ? 'YES' : 'NO');

if (!API_KEY) {
  console.warn('GWI_API_KEY not found - crosstab features will be unavailable');
}

if (!SPARK_API_KEY) {
  console.warn('GWI_MCP_KEY not found - Spark AI features will be unavailable');
}

// Initialize clients (may be null if keys not provided)
const orchestrator = API_KEY ? new CrosstabAnalysisOrchestrator(API_KEY) : null;
const sparkClient = SPARK_API_KEY ? new SparkAPIClient(SPARK_API_KEY) : null;
const templateEngine = new TemplateAnalysisEngine();
const analyzer = new CrosstabAnalyzer();
const formatter = new ResponseFormatter();

// Cache for crosstab data (30 min TTL)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '1800') * 1000; // 30 minutes

function getFromCache(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Handler: List all crosstabs
export async function listCrosstabs(_req: Request, res: Response) {
  if (!orchestrator) {
    return res.status(503).json({ error: 'Crosstab API not configured' });
  }

  try {
    const cached = getFromCache('crosstabs-list');
    if (cached) {
      return res.json({ crosstabs: cached });
    }

    const crosstabs = await orchestrator.client.listCrosstabs();
    setCache('crosstabs-list', crosstabs);

    res.json({ crosstabs });
  } catch (error: unknown) {
    console.error('List crosstabs error:', error);
    res.status(500).json({
      error: 'Failed to list crosstabs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Handler: Search crosstabs
export async function searchCrosstabs(req: Request, res: Response) {
  if (!orchestrator) {
    return res.status(503).json({ error: 'Crosstab API not configured' });
  }

  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await orchestrator.client.searchCrosstabs(q);

    res.json({ results, count: results.length });
  } catch (error: unknown) {
    console.error('Search crosstabs error:', error);
    res.status(500).json({
      error: 'Failed to search crosstabs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Handler: Get specific crosstab
export async function getCrosstab(req: Request, res: Response) {
  if (!orchestrator) {
    return res.status(503).json({ error: 'Crosstab API not configured' });
  }

  try {
    const { id } = req.params;
    const includeData = req.query.includeData !== 'false';

    const cacheKey = `crosstab-${id}-${includeData}`;
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const crosstab = await orchestrator.client.getCrosstab(id, includeData);
    setCache(cacheKey, crosstab);

    res.json(crosstab);
  } catch (error: unknown) {
    console.error('Get crosstab error:', error);

    if (error instanceof Error && error.message.includes('404')) {
      return res.status(404).json({ error: 'Crosstab not found' });
    }

    res.status(500).json({
      error: 'Failed to get crosstab',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Handler: Analyze crosstab
export async function analyzeCrosstab(req: Request, res: Response) {
  if (!orchestrator) {
    return res.status(503).json({ error: 'Crosstab API not configured' });
  }

  try {
    const { crosstabId, applyTemplates = true } = req.body;

    if (!crosstabId) {
      return res.status(400).json({ error: 'crosstabId is required' });
    }

    // Get crosstab data
    const crosstab = await orchestrator.client.getCrosstab(crosstabId);

    // Run base analysis
    const baseAnalysis = analyzer.analyze(crosstab);

    // Format base response
    let response = formatter.formatAnalysis(crosstab, baseAnalysis);

    // Apply templates if requested
    if (applyTemplates) {
      const templateResults = templateEngine.analyzeWithTemplates(
        crosstab,
        baseAnalysis
      );

      if (Object.keys(templateResults).length > 0) {
        response += '\n\n---\n\n# Specialized Analyses\n\n';

        Object.entries(templateResults).forEach(([name, analysis]) => {
          response += templateEngine.formatTemplateAnalysis(name, analysis);
          response += '\n---\n\n';
        });
      }
    }

    res.json({
      crosstabId,
      crosstabName: crosstab.name,
      analysis: response,
      baseAnalysis,
      appliedTemplates: applyTemplates ? templateEngine.selectTemplates(crosstab).map(t => t.name) : [],
    });
  } catch (error: unknown) {
    console.error('Analyze crosstab error:', error);
    res.status(500).json({
      error: 'Failed to analyze crosstab',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Handler: Chat message (intelligent routing)
export async function handleChatMessage(req: Request, res: Response) {
  try {
    const { message, crosstabId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let response = '';
    let analysisType = 'unknown';
    let crosstabsList: Array<{ id: string; name: string }> | null = null;

    // Classify intent
    const intent = classifyIntent(message, crosstabId);
    analysisType = intent.type;

    // If a crosstab is selected, handle crosstab-aware queries
    if (crosstabId) {
      switch (intent.type) {
        case 'list_crosstabs': {
          const result = await handleListIntentWithData(intent.searchTerm);
          response = result.response;
          crosstabsList = result.crosstabs;
          break;
        }

        case 'analyze_crosstab':
          response = await handleAnalyzeIntent(crosstabId);
          break;

        case 'help':
          response = getHelpResponse();
          break;

        default:
          // For any other query with a selected crosstab, use Spark with crosstab context
          if (sparkClient) {
            response = await handleCrosstabAwareSparkQuery(message, crosstabId);
            analysisType = 'crosstab_spark_query';
          } else {
            // Fallback to local analysis
            response = await handleAnalyzeIntent(crosstabId);
            analysisType = 'analyze_crosstab';
          }
      }
    } else {
      // No crosstab selected - route based on intent
      switch (intent.type) {
        case 'list_crosstabs': {
          const result = await handleListIntentWithData(intent.searchTerm);
          response = result.response;
          crosstabsList = result.crosstabs;
          break;
        }

        case 'analyze_crosstab':
          response = await handleAnalyzeIntent(intent.crosstabId!);
          break;

        case 'search_and_analyze':
          response = await handleSearchAndAnalyzeIntent(intent.searchTerm!);
          break;

        case 'compare_crosstabs':
          response = await handleCompareIntent();
          break;

        case 'help':
          response = getHelpResponse();
          break;

        default:
          // Use Spark API for general queries
          if (sparkClient) {
            response = await handleSparkQuery(message);
            analysisType = 'spark_query';
          } else {
            response = 'I understand you want to analyze data. Could you be more specific? For example:\n- "List my crosstabs"\n- "Analyze [crosstab name]"\n- "What percentage of Gen Z use TikTok daily?"';
          }
      }
    }

    // Debug logging
    console.log('Chat response - crosstabsList:', JSON.stringify(crosstabsList, null, 2));
    console.log('Chat response - crosstabsList length:', crosstabsList?.length || 0);

    res.json({
      response,
      analysisType,
      crosstabId: crosstabId || null,
      crosstabs: crosstabsList,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Chat handler error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error stack:', errorStack);
    res.status(500).json({
      error: 'Failed to process message',
      message: errorMessage,
      details: errorStack?.split('\n').slice(0, 3).join('\n')
    });
  }
}

// Intent classification
interface Intent {
  type: 'list_crosstabs' | 'analyze_crosstab' | 'search_and_analyze' | 'compare_crosstabs' | 'spark_query' | 'help' | 'unknown';
  searchTerm?: string;
  crosstabId?: string;
}

function classifyIntent(message: string, crosstabId?: string | null): Intent {
  const lower = message.toLowerCase();

  // Check for UUID pattern (crosstab ID) in the message
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const uuidMatch = message.match(uuidPattern);

  // If message contains a UUID, treat it as analyze request
  if (uuidMatch) {
    return { type: 'analyze_crosstab', crosstabId: uuidMatch[0] };
  }

  // List crosstabs
  if (lower.includes('list') || (lower.includes('show me') && lower.includes('crosstab'))) {
    const searchMatch = lower.match(/about (.+)|for (.+)|with (.+)/);
    return {
      type: 'list_crosstabs',
      searchTerm: searchMatch ? searchMatch[1] || searchMatch[2] || searchMatch[3] : undefined
    };
  }

  // What crosstabs do I have
  if (lower.includes('what crosstabs') || lower.includes('my crosstabs')) {
    return { type: 'list_crosstabs' };
  }

  // Compare
  if (lower.includes('compare') || lower.includes('vs') || lower.includes('versus')) {
    return { type: 'compare_crosstabs' };
  }

  // Analyze specific (with context)
  if (crosstabId && (lower.includes('analyze') || lower.includes('tell me about') || lower.includes('insights'))) {
    return { type: 'analyze_crosstab', crosstabId };
  }

  // Search and analyze
  if (lower.includes('analyze') || lower.includes('look at')) {
    const searchTerm = message.replace(/analyze|look at|the|my/gi, '').trim();
    if (searchTerm.length > 2) {
      return { type: 'search_and_analyze', searchTerm };
    }
  }

  // Help
  if (lower.includes('help') || lower.includes('what can you do')) {
    return { type: 'help' };
  }

  // Check if it's a Spark API query
  if (shouldUseSparkAPI(message)) {
    return { type: 'spark_query' };
  }

  return { type: 'unknown' };
}

// Spark API query handler (for general queries without crosstab)
async function handleSparkQuery(message: string): Promise<string> {
  if (!sparkClient) {
    return 'The Spark AI feature is not configured. Please add the GWI_MCP_KEY environment variable to enable AI-powered queries about GWI data.';
  }

  try {
    const sparkResponse = await sparkClient.query(message);
    return formatSparkResponse(sparkResponse);
  } catch (error) {
    console.error('Spark API error:', error);
    return `I encountered an error querying GWI data: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your question.`;
  }
}

// Crosstab-aware query handler - uses local analyzer with actual crosstab data
async function handleCrosstabAwareSparkQuery(message: string, crosstabId: string): Promise<string> {
  if (!orchestrator) {
    return 'The crosstab feature is not configured. Please add the GWI_API_KEY environment variable.';
  }

  console.log(`handleCrosstabAwareSparkQuery called with crosstabId: ${crosstabId}, message: "${message}"`);

  try {
    // Fetch crosstab WITH full data for accurate analysis
    let crosstab;
    try {
      crosstab = await orchestrator.client.getCrosstab(crosstabId, true);
      console.log(`Fetched crosstab "${crosstab.name}" with ${crosstab.data?.length || 0} data points`);
    } catch (error) {
      console.error('Failed to fetch crosstab:', error);
      return `Failed to fetch crosstab data: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Build context for response header
    const context = {
      name: crosstab.name,
      markets: crosstab.country_codes || [],
      waves: crosstab.wave_codes || [],
      audience: crosstab.bases?.[0]?.name,
    };

    // Build response header
    let response = `## ${crosstab.name}\n\n`;

    const contextParts: string[] = [];
    if (context.markets.length > 0) {
      contextParts.push(`**Markets:** ${context.markets.slice(0, 5).join(', ')}${context.markets.length > 5 ? ` +${context.markets.length - 5} more` : ''}`);
    }
    if (context.waves.length > 0) {
      contextParts.push(`**Period:** ${context.waves.join(', ')}`);
    }
    if (context.audience) {
      contextParts.push(`**Audience:** ${context.audience}`);
    }
    if (contextParts.length > 0) {
      response += contextParts.join(' | ') + '\n\n---\n\n';
    }

    // Analyze the question type to provide relevant insights
    const lowerMessage = message.toLowerCase();
    const isMarketingQuestion = lowerMessage.includes('marketing') || lowerMessage.includes('strategy') || lowerMessage.includes('campaign');
    const isTargetingQuestion = lowerMessage.includes('target') || lowerMessage.includes('reach') || lowerMessage.includes('audience');

    // Use local analyzer if we have data
    if (crosstab.data && crosstab.data.length > 0) {
      console.log(`Using local analyzer for question: "${message}"`);

      try {
        const analysis = analyzer.analyze(crosstab);

        if (isMarketingQuestion) {
          // Focus on actionable marketing insights
          response += `### Marketing Strategy Insights\n\n`;
          response += `Based on the analysis of **${crosstab.name}**, here are key insights for your marketing strategy:\n\n`;

          // Top affinities for targeting
          if (analysis.statistics.overIndexed.length > 0) {
            response += `#### Top Audience Affinities (High Index = Strong Fit)\n\n`;
            analysis.statistics.overIndexed.slice(0, 10).forEach((item, i) => {
              response += `${i + 1}. **${item.label}** - Index: ${item.index}, Reach: ${item.percentage}%\n`;
            });
            response += '\n';
          }

          // Recommendations
          if (analysis.recommendations.length > 0) {
            response += `#### Strategic Recommendations\n\n`;
            analysis.recommendations.forEach((rec, i) => {
              response += `${i + 1}. **${rec.title}** (${rec.priority} priority)\n   ${rec.description}\n\n`;
            });
          }

          // Key insights
          const highInsights = analysis.insights.filter(i => i.significance === 'high');
          if (highInsights.length > 0) {
            response += `#### Key Findings\n\n`;
            highInsights.slice(0, 5).forEach(insight => {
              response += `- **${insight.title}**: ${insight.description}\n`;
            });
          }
        } else if (isTargetingQuestion) {
          // Focus on targeting opportunities
          response += `### Targeting Opportunities\n\n`;

          if (analysis.statistics.overIndexed.length > 0) {
            response += `#### High-Index Behaviors (Best for Targeting)\n\n`;
            analysis.statistics.overIndexed.slice(0, 15).forEach((item, i) => {
              response += `${i + 1}. **${item.label}**\n   - Index: ${item.index} | Reach: ${item.percentage}% | Sample: ${item.sample}\n`;
            });
          }
        } else {
          // General analysis
          response += formatter.formatAnalysis(crosstab, analysis);
        }

        return response;
      } catch (analysisError) {
        console.error('Local analysis failed:', analysisError);
        response += `*Analysis error: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}*\n`;
      }
    } else {
      response += '*No data available for this crosstab. The crosstab configuration was loaded but no data points were returned.*\n';
    }

    return response;
  } catch (error) {
    console.error('Crosstab-aware query error:', error);
    return `I encountered an error analyzing the crosstab: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your question.`;
  }
}

// Intent handlers

// Returns both response text and crosstabs data for UI rendering
async function handleListIntentWithData(searchTerm?: string): Promise<{
  response: string;
  crosstabs: Array<{ id: string; name: string }> | null;
}> {
  if (!orchestrator) {
    return {
      response: 'The crosstab feature is not configured. Please add the GWI_API_KEY environment variable.',
      crosstabs: null
    };
  }

  const crosstabs = searchTerm
    ? await orchestrator.client.searchCrosstabs(searchTerm)
    : await orchestrator.client.listCrosstabs();

  if (crosstabs.length === 0) {
    const baseMessage = searchTerm
      ? `No crosstabs found matching "${searchTerm}".`
      : 'No saved crosstabs found in your account.';

    return {
      response: `${baseMessage}\n\nThis could mean:\n- The API key doesn't have access to any saved crosstabs\n- No crosstabs have been created in this account\n- The API key may need different permissions\n\nYou can try using the **GWI Data Queries** prompts to ask questions about GWI data directly.`,
      crosstabs: null
    };
  }

  let response = searchTerm
    ? `Found ${crosstabs.length} crosstab${crosstabs.length > 1 ? 's' : ''} matching "${searchTerm}":\n\n`
    : `You have ${crosstabs.length} crosstab${crosstabs.length > 1 ? 's' : ''}. Click one below to select it for analysis:\n\n`;

  // Return crosstabs data for UI to render as buttons
  const crosstabsData = crosstabs.slice(0, 10).map(ct => ({
    id: ct.id,
    name: ct.name
  }));

  // Debug: Log the crosstabs data being returned
  console.log('handleListIntentWithData - crosstabs fetched:', crosstabs.length);
  console.log('handleListIntentWithData - crosstabsData:', JSON.stringify(crosstabsData, null, 2));
  console.log('handleListIntentWithData - first crosstab:', crosstabs[0] ? JSON.stringify(crosstabs[0], null, 2) : 'none');

  if (crosstabs.length > 10) {
    response += `\n*Showing first 10 of ${crosstabs.length} crosstabs*\n`;
  }

  return {
    response,
    crosstabs: crosstabsData
  };
}


async function handleAnalyzeIntent(crosstabId: string): Promise<string> {
  if (!orchestrator) {
    return 'The crosstab feature is not configured. Please add the GWI_API_KEY environment variable.';
  }

  if (!crosstabId) {
    return 'Please select a crosstab from the sidebar or specify which one you want to analyze.';
  }

  console.log(`Attempting to fetch crosstab: ${crosstabId}`);

  let crosstab;
  try {
    // Fetch crosstab WITH data for comprehensive local analysis
    crosstab = await orchestrator.client.getCrosstab(crosstabId, true);
    console.log(`Fetched crosstab with ${crosstab.data?.length || 0} data points`);
  } catch (error) {
    console.error(`Failed to fetch crosstab ${crosstabId}:`, error);
    return `Failed to fetch crosstab with ID: ${crosstabId}\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check:\n- The crosstab ID is correct\n- Your API key has access to this crosstab`;
  }

  if (!crosstab) {
    return `Crosstab not found with ID: ${crosstabId}`;
  }

  // Use Spark/MCP API for analysis with crosstab context
  if (sparkClient) {
    return await analyzeWithSpark(crosstab);
  }

  // Fallback: Return crosstab structure summary if Spark not available
  return formatCrosstabSummary(crosstab);
}

// Analyze crosstab using full data from Platform API
async function analyzeWithSpark(crosstab: any): Promise<string> {
  console.log('=== analyzeWithSpark called ===');
  console.log('Crosstab keys:', Object.keys(crosstab));
  console.log('Has data property:', 'data' in crosstab);
  console.log('Data is array:', Array.isArray(crosstab.data));
  console.log('Data length:', crosstab.data?.length || 0);

  if (crosstab.data && crosstab.data.length > 0) {
    console.log('First data row sample:', JSON.stringify(crosstab.data[0], null, 2).substring(0, 500));
  }

  const context = buildCrosstabContext(crosstab);

  // Build formatted result header
  let result = `## ${crosstab.name}\n\n`;

  // Add context header
  const contextParts: string[] = [];
  if (context.markets.length > 0) {
    const mkts = context.markets.slice(0, 5).join(', ');
    contextParts.push(`**Markets:** ${mkts}${context.markets.length > 5 ? ` +${context.markets.length - 5} more` : ''}`);
  }
  if (context.waves.length > 0) {
    contextParts.push(`**Period:** ${context.waves.join(', ')}`);
  }
  if (context.audiences.length > 0) {
    contextParts.push(`**Audience:** ${context.audiences.join(', ')}`);
  }

  if (contextParts.length > 0) {
    result += contextParts.join(' | ') + '\n\n---\n\n';
  }

  // Check if we have actual crosstab data to analyze
  if (crosstab.data && crosstab.data.length > 0) {
    console.log(`*** USING LOCAL ANALYZER with ${crosstab.data.length} data points ***`);

    try {
      // Use local analyzer for comprehensive insights from actual data
      const analysis = analyzer.analyze(crosstab);
      console.log('Local analysis completed successfully');
      console.log('Analysis insights count:', analysis.insights?.length || 0);
      console.log('Analysis top indexes count:', analysis.statistics?.topIndexes?.length || 0);

      // Format the full analysis
      result += formatter.formatAnalysis(crosstab, analysis);

      // Apply specialized templates for additional insights
      const templateResults = templateEngine.analyzeWithTemplates(crosstab, analysis);

      if (Object.keys(templateResults).length > 0) {
        result += '\n---\n\n## Specialized Analyses\n\n';
        Object.entries(templateResults).forEach(([name, templateAnalysis]) => {
          result += templateEngine.formatTemplateAnalysis(name, templateAnalysis);
          result += '\n';
        });
      }

      console.log('*** LOCAL ANALYSIS RESULT LENGTH:', result.length);
      return result;
    } catch (error) {
      console.error('*** LOCAL ANALYSIS ERROR ***:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
      // Fall back to Spark API if local analysis fails
    }
  } else {
    console.log('*** NO DATA - FALLING BACK TO SPARK API ***');
  }

  // Use MCP endpoint for analysis
  if (sparkClient) {
    console.log('=== USING MCP ENDPOINT FOR ANALYSIS ===');

    // Build a rich context-aware prompt from the crosstab definition
    const marketStr = context.markets.length > 0 ? context.markets.slice(0, 5).join(', ') : 'global markets';
    const audienceStr = context.audiences.length > 0 ? context.audiences.join(' and ') : 'general internet users';
    const rowTopics = context.rows.length > 0 ? context.rows.slice(0, 10).join(', ') : '';
    const columnTopics = context.columns.length > 0 ? context.columns.slice(0, 10).join(', ') : '';
    const waveStr = context.waves.length > 0 ? context.waves.join(', ') : 'latest available data';

    // Build a comprehensive prompt that asks for detailed analysis
    let prompt = `Analyze consumer insights for the following crosstab:\n\n`;
    prompt += `**Crosstab Name:** ${crosstab.name}\n`;
    prompt += `**Markets:** ${marketStr}\n`;
    prompt += `**Time Period:** ${waveStr}\n`;
    prompt += `**Target Audience:** ${audienceStr}\n`;

    if (rowTopics) {
      prompt += `**Row Variables (Topics):** ${rowTopics}\n`;
    }
    if (columnTopics) {
      prompt += `**Column Variables (Segments):** ${columnTopics}\n`;
    }

    prompt += `\nProvide a comprehensive analysis including:\n`;
    prompt += `1. Key over-indexed behaviors (what this audience does more than average)\n`;
    prompt += `2. Key under-indexed behaviors (what this audience does less than average)\n`;
    prompt += `3. Demographic insights\n`;
    prompt += `4. Actionable marketing recommendations\n`;
    prompt += `5. Notable trends or patterns\n\n`;
    prompt += `Include specific percentages and index values where available.`;

    console.log('MCP prompt:', prompt);

    try {
      const response = await sparkClient.query(prompt);
      console.log('MCP response received, insights count:', response.insights?.length || 0);
      result += response.formattedText;

      // If we got insights, also try to explore the top ones for more detail
      if (response.insights && response.insights.length > 0) {
        const topInsights = response.insights
          .filter(i => i.significance === 'high')
          .slice(0, 3);

        if (topInsights.length > 0) {
          result += '\n\n## Detailed Insight Analysis\n\n';
          for (const insight of topInsights) {
            try {
              console.log(`Exploring insight: ${insight.id}`);
              const detail = await sparkClient.exploreInsight(insight.id);
              if (detail.metrics && detail.metrics.length > 0) {
                result += `### ${insight.content.substring(0, 100)}...\n`;
                detail.metrics.forEach(m => {
                  result += `- ${m.name}: ${m.percentage}% (Index: ${m.index})\n`;
                });
                result += '\n';
              }
            } catch (exploreError) {
              console.warn(`Failed to explore insight ${insight.id}:`, exploreError);
            }
          }
        }
      }

      return result;
    } catch (error) {
      console.error('MCP API error:', error);
      return result + `\n*MCP analysis unavailable: ${error instanceof Error ? error.message : 'Unknown error'}*`;
    }
  }

  return result + '\n*No analysis API configured. Please ensure GWI_MCP_KEY is set.*';
}

// Build context object from crosstab definition
function buildCrosstabContext(crosstab: any): {
  markets: string[];
  waves: string[];
  audiences: string[];
  rows: string[];
  columns: string[];
} {
  const markets = crosstab.country_codes || [];
  const waves = crosstab.wave_codes || [];
  const audiences = (crosstab.bases || []).map((b: any) => b.name || b.full_name).filter(Boolean);
  const rows = (crosstab.rows || []).map((r: any) => r.name || r.full_name).filter(Boolean);
  const columns = (crosstab.columns || []).map((c: any) => c.name || c.full_name).filter(Boolean);

  return { markets, waves, audiences, rows, columns };
}

// Format crosstab summary when Spark is not available
function formatCrosstabSummary(crosstab: any): string {
  const context = buildCrosstabContext(crosstab);

  let summary = `## ${crosstab.name}\n\n`;

  if (context.markets.length > 0) {
    summary += `**Markets:** ${context.markets.join(', ')}\n`;
  }

  if (context.waves.length > 0) {
    summary += `**Time Period:** ${context.waves.join(', ')}\n`;
  }

  if (context.audiences.length > 0) {
    summary += `\n### Audiences\n`;
    context.audiences.forEach(a => summary += `- ${a}\n`);
  }

  if (context.rows.length > 0) {
    summary += `\n### Row Variables\n`;
    context.rows.slice(0, 10).forEach(r => summary += `- ${r}\n`);
    if (context.rows.length > 10) {
      summary += `- ... and ${context.rows.length - 10} more\n`;
    }
  }

  if (context.columns.length > 0) {
    summary += `\n### Column Variables\n`;
    context.columns.slice(0, 10).forEach(c => summary += `- ${c}\n`);
    if (context.columns.length > 10) {
      summary += `- ... and ${context.columns.length - 10} more\n`;
    }
  }

  summary += '\n---\n';
  summary += '\n*Note: For detailed insights, please ensure the GWI_MCP_KEY is configured.*';

  return summary;
}

async function handleSearchAndAnalyzeIntent(searchTerm: string): Promise<string> {
  if (!orchestrator) {
    return 'The crosstab feature is not configured. Please add the GWI_API_KEY environment variable.';
  }

  const results = await orchestrator.client.searchCrosstabs(searchTerm);

  if (results.length === 0) {
    // No crosstabs found - try Spark API if available
    if (sparkClient) {
      return handleSparkQuery(`Tell me about ${searchTerm}`);
    }
    return `No crosstabs found matching "${searchTerm}". Try a different search term.`;
  }

  if (results.length > 1) {
    let response = `Found ${results.length} crosstabs matching "${searchTerm}". Which one would you like me to analyze?\n\n`;

    results.slice(0, 5).forEach((ct, i) => {
      response += `${i + 1}. **${ct.name}**\n`;
    });

    return response;
  }

  // Single result - analyze it
  return await handleAnalyzeIntent(results[0].id);
}

async function handleCompareIntent(): Promise<string> {
  return 'Comparison feature coming soon! For now, you can analyze each crosstab separately.';
}

function getHelpResponse(): string {
  const hasSparkAPI = !!sparkClient;
  const hasCrosstabAPI = !!orchestrator;

  let response = `# How to Use GWI Crosstab Analysis

I can help you with GWI data in multiple ways:\n\n`;

  if (hasCrosstabAPI) {
    response += `## Crosstab Analysis
- "What crosstabs do I have?"
- "Show me social media crosstabs"
- "Analyze [crosstab name]"
- "What are the key insights?"
- Click a crosstab in the sidebar to set context\n\n`;
  }

  if (hasSparkAPI) {
    response += `## AI-Powered GWI Queries
Ask questions about GWI data in natural language:
- "What percentage of Gen Z use TikTok daily?"
- "How do millennials in the UK differ from Germany?"
- "What are the top social platforms for gamers?"
- "Compare attitudes toward sustainability by age group"
- "What drives purchase decisions for luxury brands?"\n\n`;
  }

  response += `## Tips
- I'll automatically route your question to the right data source
- For crosstab analysis, select one from the sidebar first
- For general GWI questions, just ask naturally\n\n`;

  if (!hasCrosstabAPI && !hasSparkAPI) {
    response += `**Note**: No API keys are configured. Please add GWI_API_KEY and/or GWI_MCP_KEY environment variables.\n`;
  }

  response += `What would you like to explore?`;

  return response;
}
