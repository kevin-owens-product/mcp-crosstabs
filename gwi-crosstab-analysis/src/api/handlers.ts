import type { Request, Response } from 'express';
import { CrosstabAnalysisOrchestrator } from '../lib/orchestrator';
import { TemplateAnalysisEngine } from '../lib/analysis-templates';
import { CrosstabAnalyzer } from '../lib/crosstab-analyzer';
import { ResponseFormatter } from '../lib/response-formatter';
import { SparkAPIClient, shouldUseSparkAPI, formatSparkResponse } from '../lib/spark-client';
import type { Analysis, VisualizationData, SuggestedAction, IndexedItem } from '../lib/types';

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

// ============================================================================
// VISUALIZATION & SUGGESTED ACTIONS GENERATORS
// ============================================================================

/**
 * Generate visualization data from analysis results
 */
function generateVisualizations(analysis: Analysis, crosstabName: string): VisualizationData[] {
  const visualizations: VisualizationData[] = [];

  // Over-indexed behaviors bar chart
  if (analysis.statistics.overIndexed.length > 0) {
    visualizations.push({
      id: 'over-indexed-chart',
      type: 'horizontalBar',
      title: 'Top Over-Indexed Behaviors',
      subtitle: `Behaviors where ${crosstabName} audience over-indexes vs. average`,
      data: analysis.statistics.overIndexed.slice(0, 10).map((item: IndexedItem) => ({
        label: truncateLabel(item.label, 35),
        value: item.index,
        percentage: item.percentage,
        sample: item.sample,
      })),
      config: {
        xAxisLabel: 'Index',
        yAxisLabel: 'Behavior',
        referenceValue: 100,
        maxItems: 10,
        colorScheme: 'blue',
      },
    });
  }

  // Under-indexed behaviors bar chart (if significant)
  if (analysis.statistics.underIndexed.length >= 5) {
    visualizations.push({
      id: 'under-indexed-chart',
      type: 'horizontalBar',
      title: 'Notable Under-Indexed Behaviors',
      subtitle: 'Behaviors where this audience under-indexes vs. average',
      data: analysis.statistics.underIndexed.slice(0, 8).map((item: IndexedItem) => ({
        label: truncateLabel(item.label, 35),
        value: item.index,
        percentage: item.percentage,
        sample: item.sample,
      })),
      config: {
        xAxisLabel: 'Index',
        yAxisLabel: 'Behavior',
        referenceValue: 100,
        maxItems: 8,
        colorScheme: 'red',
      },
    });
  }

  return visualizations;
}

/**
 * Truncate long labels for display
 */
function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength - 3) + '...';
}

/**
 * Generate context-aware suggested actions based on analysis results
 */
function generateSuggestedActions(
  analysis: Analysis,
  _crosstabName: string,
  hasMultipleMarkets: boolean
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  // Always offer marketing strategy if there are over-indexed items
  if (analysis.statistics.overIndexed.length > 0) {
    actions.push({
      id: 'marketing-strategy',
      label: 'Marketing Strategy',
      description: 'Get actionable marketing recommendations based on this data',
      prompt: 'Based on this analysis, what marketing strategy would you recommend?',
      icon: 'target',
      category: 'analysis',
    });
  }

  // Offer targeting opportunities if there are significant indexes
  if (analysis.statistics.topIndexes.length > 0) {
    actions.push({
      id: 'targeting-opportunities',
      label: 'Targeting Opportunities',
      description: 'Identify the best segments to target',
      prompt: 'What are the best targeting opportunities based on this data?',
      icon: 'target',
      category: 'drill-down',
    });
  }

  // Offer market comparison if multiple markets
  if (hasMultipleMarkets) {
    actions.push({
      id: 'compare-markets',
      label: 'Compare Markets',
      description: 'See how behaviors differ across markets',
      prompt: 'How do the key behaviors compare across different markets?',
      icon: 'compare',
      category: 'analysis',
    });
  }

  // Offer high-reach behaviors analysis
  const highReachInsight = analysis.insights.find(i => i.type === 'HIGH_REACH');
  if (highReachInsight) {
    actions.push({
      id: 'high-reach',
      label: 'High Reach Behaviors',
      description: 'Find behaviors with both high reach and good indexing',
      prompt: 'What behaviors have high reach that I could use for broad campaigns?',
      icon: 'chart',
      category: 'drill-down',
    });
  }

  // Offer niche targeting if available
  const nicheInsight = analysis.insights.find(i => i.type === 'NICHE_TARGETING');
  if (nicheInsight) {
    actions.push({
      id: 'niche-targeting',
      label: 'Niche Segments',
      description: 'High-index, lower-reach segments for precision targeting',
      prompt: 'What niche targeting opportunities exist in this data?',
      icon: 'filter',
      category: 'drill-down',
    });
  }

  // Always offer to show a chart if not already showing one
  actions.push({
    id: 'show-chart',
    label: 'Show Chart',
    description: 'Visualize the top behaviors',
    prompt: 'Show me a chart of the top over-indexed behaviors',
    icon: 'chart',
    category: 'visualization',
  });

  return actions;
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

// Extended result type for analysis handlers
interface AnalysisResult {
  response: string;
  visualizations?: VisualizationData[];
  suggestedActions?: SuggestedAction[];
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
    let visualizations: VisualizationData[] | null = null;
    let suggestedActions: SuggestedAction[] | null = null;

    // Classify intent
    const intent = classifyIntent(message, crosstabId);
    analysisType = intent.type;

    // Check if user wants a chart
    const wantsChart = message.toLowerCase().includes('chart') ||
                       message.toLowerCase().includes('graph') ||
                       message.toLowerCase().includes('visualiz');

    // If a crosstab is selected, handle crosstab-aware queries
    if (crosstabId) {
      switch (intent.type) {
        case 'list_crosstabs': {
          const result = await handleListIntentWithData(intent.searchTerm);
          response = result.response;
          crosstabsList = result.crosstabs;
          break;
        }

        case 'analyze_crosstab': {
          const result = await handleAnalyzeIntent(crosstabId, wantsChart);
          response = result.response;
          visualizations = result.visualizations || null;
          suggestedActions = result.suggestedActions || null;
          break;
        }

        case 'help':
          response = getHelpResponse();
          break;

        default: {
          // For any other query with a selected crosstab, use crosstab context
          const result = await handleCrosstabAwareSparkQuery(message, crosstabId, wantsChart);
          response = result.response;
          visualizations = result.visualizations || null;
          suggestedActions = result.suggestedActions || null;
          analysisType = 'crosstab_query';
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

        case 'analyze_crosstab': {
          const result = await handleAnalyzeIntent(intent.crosstabId!, wantsChart);
          response = result.response;
          visualizations = result.visualizations || null;
          suggestedActions = result.suggestedActions || null;
          break;
        }

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
    console.log('Chat response - visualizations:', visualizations?.length || 0);
    console.log('Chat response - suggestedActions:', suggestedActions?.length || 0);

    res.json({
      response,
      analysisType,
      crosstabId: crosstabId || null,
      crosstabs: crosstabsList,
      visualizations,
      suggestedActions,
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
async function handleCrosstabAwareSparkQuery(message: string, crosstabId: string, includeChart: boolean = false): Promise<AnalysisResult> {
  if (!orchestrator) {
    return { response: 'The crosstab feature is not configured. Please add the GWI_API_KEY environment variable.' };
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
      return { response: `Failed to fetch crosstab data: ${error instanceof Error ? error.message : 'Unknown error'}` };
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

    let visualizations: VisualizationData[] = [];
    let suggestedActions: SuggestedAction[] = [];

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

        // Generate visualizations
        visualizations = generateVisualizations(analysis, crosstab.name);

        // Generate suggested actions
        const hasMultipleMarkets = (crosstab.country_codes?.length || 0) > 1;
        suggestedActions = generateSuggestedActions(analysis, crosstab.name, hasMultipleMarkets);

        // Remove "Show Chart" if already showing or if user asked for one
        if (includeChart) {
          suggestedActions = suggestedActions.filter(a => a.id !== 'show-chart');
        }

        return {
          response,
          visualizations: visualizations.length > 0 ? visualizations : undefined,
          suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
        };
      } catch (analysisError) {
        console.error('Local analysis failed:', analysisError);
        response += `*Analysis error: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}*\n`;
      }
    } else {
      response += '*No data available for this crosstab. The crosstab configuration was loaded but no data points were returned.*\n';
    }

    return { response };
  } catch (error) {
    console.error('Crosstab-aware query error:', error);
    return { response: `I encountered an error analyzing the crosstab: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your question.` };
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


async function handleAnalyzeIntent(crosstabId: string, includeChart: boolean = false): Promise<AnalysisResult> {
  if (!orchestrator) {
    return { response: 'The crosstab feature is not configured. Please add the GWI_API_KEY environment variable.' };
  }

  if (!crosstabId) {
    return { response: 'Please select a crosstab from the sidebar or specify which one you want to analyze.' };
  }

  console.log(`Attempting to fetch crosstab: ${crosstabId}`);

  let crosstab;
  try {
    // Fetch crosstab WITH data for comprehensive local analysis
    crosstab = await orchestrator.client.getCrosstab(crosstabId, true);
    console.log(`Fetched crosstab with ${crosstab.data?.length || 0} data points`);
  } catch (error) {
    console.error(`Failed to fetch crosstab ${crosstabId}:`, error);
    return { response: `Failed to fetch crosstab with ID: ${crosstabId}\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check:\n- The crosstab ID is correct\n- Your API key has access to this crosstab` };
  }

  if (!crosstab) {
    return { response: `Crosstab not found with ID: ${crosstabId}` };
  }

  // Use local analyzer for analysis with visualizations
  return await analyzeWithLocalAnalyzer(crosstab, includeChart);
}

// Analyze crosstab using local analyzer with visualizations and suggested actions
async function analyzeWithLocalAnalyzer(crosstab: any, includeChart: boolean = false): Promise<AnalysisResult> {
  console.log('=== analyzeWithLocalAnalyzer called ===');
  console.log('Crosstab name:', crosstab.name);
  console.log('Data length:', crosstab.data?.length || 0);
  console.log('Include chart:', includeChart);

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

  let visualizations: VisualizationData[] = [];
  let suggestedActions: SuggestedAction[] = [];

  // Check if we have actual crosstab data to analyze
  if (crosstab.data && crosstab.data.length > 0) {
    console.log(`*** USING LOCAL ANALYZER with ${crosstab.data.length} data points ***`);

    try {
      // Use local analyzer for comprehensive insights from actual data
      const analysis = analyzer.analyze(crosstab);
      console.log('Local analysis completed successfully');
      console.log('Analysis insights count:', analysis.insights?.length || 0);
      console.log('Analysis top indexes count:', analysis.statistics?.topIndexes?.length || 0);

      // Format the full analysis (but shorter if we're showing charts)
      if (includeChart) {
        // Abbreviated text response when showing charts
        result += `### Summary\n\n`;
        result += `Analyzed **${crosstab.data.length}** data points.\n\n`;

        if (analysis.statistics.overIndexed.length > 0) {
          result += `Found **${analysis.statistics.overIndexed.length}** over-indexed behaviors and **${analysis.statistics.underIndexed.length}** under-indexed behaviors.\n\n`;
        }

        // Show top 5 in text as well
        if (analysis.statistics.topIndexes.length > 0) {
          result += `#### Top 5 Over-Indexed Behaviors\n\n`;
          analysis.statistics.topIndexes.slice(0, 5).forEach((item, i) => {
            result += `${i + 1}. **${item.label}** - Index: ${item.index}\n`;
          });
        }
      } else {
        // Full text analysis
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
      }

      // Generate visualizations (always if there's data)
      visualizations = generateVisualizations(analysis, crosstab.name);

      // Generate suggested actions
      const hasMultipleMarkets = (crosstab.country_codes?.length || 0) > 1;
      suggestedActions = generateSuggestedActions(analysis, crosstab.name, hasMultipleMarkets);

      // Remove the "Show Chart" action if we're already showing a chart
      if (includeChart) {
        suggestedActions = suggestedActions.filter(a => a.id !== 'show-chart');
      }

      console.log('*** Generated', visualizations.length, 'visualizations and', suggestedActions.length, 'suggested actions ***');

      return {
        response: result,
        visualizations: visualizations.length > 0 ? visualizations : undefined,
        suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
      };
    } catch (error) {
      console.error('*** LOCAL ANALYSIS ERROR ***:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
      result += `\n*Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}*`;
    }
  } else {
    result += '*No data available for this crosstab. The crosstab configuration was loaded but no data points were returned.*\n';
  }

  return { response: result };
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
  const result = await handleAnalyzeIntent(results[0].id);
  return result.response;
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
