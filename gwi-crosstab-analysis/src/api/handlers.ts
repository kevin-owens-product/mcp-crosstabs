import type { Request, Response } from 'express';
import { CrosstabAnalysisOrchestrator } from '../lib/orchestrator';
import { TemplateAnalysisEngine } from '../lib/analysis-templates';
import { CrosstabAnalyzer } from '../lib/crosstab-analyzer';
import { ResponseFormatter } from '../lib/response-formatter';

// Initialize services
const API_KEY = process.env.GWI_API_KEY!;

if (!API_KEY) {
  console.error('GWI_API_KEY not found in environment variables');
  process.exit(1);
}

const orchestrator = new CrosstabAnalysisOrchestrator(API_KEY);
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

    // Determine intent
    const intent = classifyIntent(message, crosstabId);

    let response = '';
    const analysisType = intent.type;

    switch (intent.type) {
      case 'list_crosstabs':
        response = await handleListIntent(intent.searchTerm);
        break;

      case 'analyze_crosstab':
        response = await handleAnalyzeIntent(intent.crosstabId || crosstabId);
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
        response = 'I understand you want to analyze crosstabs. Could you be more specific? For example:\n- "List my crosstabs"\n- "Analyze [crosstab name]"\n- "Compare [crosstab 1] vs [crosstab 2]"';
    }

    res.json({
      response,
      analysisType,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Chat handler error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Intent classification
interface Intent {
  type: 'list_crosstabs' | 'analyze_crosstab' | 'search_and_analyze' | 'compare_crosstabs' | 'help' | 'unknown';
  searchTerm?: string;
  crosstabId?: string;
}

function classifyIntent(message: string, crosstabId?: string | null): Intent {
  const lower = message.toLowerCase();

  // List crosstabs
  if (lower.includes('list') || (lower.includes('show me') && lower.includes('crosstab'))) {
    const searchMatch = lower.match(/about (.+)|for (.+)|with (.+)/);
    return {
      type: 'list_crosstabs',
      searchTerm: searchMatch ? searchMatch[1] || searchMatch[2] || searchMatch[3] : undefined
    };
  }

  // Compare
  if (lower.includes('compare') || lower.includes('vs') || lower.includes('versus')) {
    return { type: 'compare_crosstabs' };
  }

  // Analyze specific (with context)
  if (crosstabId && (lower.includes('analyze') || lower.includes('tell me about') || lower.includes('show me'))) {
    return { type: 'analyze_crosstab', crosstabId };
  }

  // Search and analyze
  if (lower.includes('analyze') || lower.includes('look at') || lower.includes('show me')) {
    // Extract search term
    const searchTerm = message.replace(/analyze|look at|show me|the|my/gi, '').trim();
    return { type: 'search_and_analyze', searchTerm };
  }

  // Help
  if (lower.includes('help') || lower.includes('what can you do')) {
    return { type: 'help' };
  }

  return { type: 'unknown' };
}

// Intent handlers
async function handleListIntent(searchTerm?: string): Promise<string> {
  const crosstabs = searchTerm
    ? await orchestrator.client.searchCrosstabs(searchTerm)
    : await orchestrator.client.listCrosstabs();

  if (crosstabs.length === 0) {
    return searchTerm
      ? `No crosstabs found matching "${searchTerm}".`
      : 'No crosstabs available.';
  }

  let response = searchTerm
    ? `Found ${crosstabs.length} crosstab${crosstabs.length > 1 ? 's' : ''} matching "${searchTerm}":\n\n`
    : `You have ${crosstabs.length} crosstab${crosstabs.length > 1 ? 's' : ''}:\n\n`;

  crosstabs.slice(0, 10).forEach((ct, i) => {
    response += `${i + 1}. **${ct.name}**\n`;
    response += `   Created: ${new Date(ct.created_at).toLocaleDateString()}\n\n`;
  });

  if (crosstabs.length > 10) {
    response += `\n*...and ${crosstabs.length - 10} more*\n`;
  }

  response += '\n**Tip**: Click on a crosstab in the sidebar or say "Analyze [crosstab name]" to get insights.';

  return response;
}

async function handleAnalyzeIntent(crosstabId: string): Promise<string> {
  if (!crosstabId) {
    return 'Please select a crosstab from the sidebar or specify which one you want to analyze.';
  }

  const crosstab = await orchestrator.client.getCrosstab(crosstabId);
  const baseAnalysis = analyzer.analyze(crosstab);

  let response = formatter.formatAnalysis(crosstab, baseAnalysis);

  // Apply templates
  const templateResults = templateEngine.analyzeWithTemplates(crosstab, baseAnalysis);

  if (Object.keys(templateResults).length > 0) {
    response += '\n\n---\n\n# Specialized Analyses\n\n';

    Object.entries(templateResults).forEach(([name, analysis]) => {
      response += templateEngine.formatTemplateAnalysis(name, analysis);
      response += '\n---\n\n';
    });
  }

  return response;
}

async function handleSearchAndAnalyzeIntent(searchTerm: string): Promise<string> {
  const results = await orchestrator.client.searchCrosstabs(searchTerm);

  if (results.length === 0) {
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
  // This would need more sophisticated logic
  return 'Comparison feature coming soon! For now, you can analyze each crosstab separately.';
}

function getHelpResponse(): string {
  return `# How to Use GWI Crosstab Analysis

I can help you analyze your crosstabs in natural language. Here are some things you can ask:

## List & Search
- "What crosstabs do I have?"
- "Show me social media crosstabs"
- "List crosstabs about Tesla"

## Analysis
- "Analyze [crosstab name]"
- "Tell me about my Gen Z crosstab"
- "What are the key insights from [crosstab]?"

## Market Analysis
- "Compare UK vs Germany"
- "Show me market differences"

## Trends
- "How has this changed over time?"
- "What are the trends?"

## Tips
- Click a crosstab in the sidebar to set context
- I'll automatically apply specialized analysis templates
- All analyses include statistical significance checking

What would you like to explore?`;
}
