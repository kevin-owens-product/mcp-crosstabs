# GWI Crosstab Analysis - Integration Guide

## Quick Start

### 1. Installation

```bash
npm install node-fetch  # or use native fetch in Node 18+
```

### 2. Basic Setup

```typescript
import { 
  CrosstabAnalysisOrchestrator 
} from './gwi-crosstab-client';

import { 
  TemplateAnalysisEngine 
} from './crosstab-analysis-templates';

// Initialize with your API key
const apiKey = process.env.GWI_API_KEY;
const orchestrator = new CrosstabAnalysisOrchestrator(apiKey);
const templateEngine = new TemplateAnalysisEngine();
```

### 3. Simple Analysis

```typescript
// List your crosstabs
const crosstabs = await orchestrator.listCrosstabs();
console.log(crosstabs);

// Analyze a specific one
const analysis = await orchestrator.analyzeCrosstab('your-crosstab-id');
console.log(analysis);
```

---

## Usage Patterns

### Pattern 1: Discovery & Analysis

**Use Case**: User doesn't know what crosstabs they have

```typescript
async function discoverAndAnalyze(searchTerm: string) {
  // Step 1: Search
  const searchResults = await orchestrator.listCrosstabs(searchTerm);
  
  if (searchResults.includes('No crosstabs found')) {
    return "No crosstabs found matching your search.";
  }
  
  // Step 2: Parse results and get first match
  // (In production, present options to user for disambiguation)
  const crosstabs = await orchestrator.client.searchCrosstabs(searchTerm);
  
  if (crosstabs.length === 0) {
    return "No matches found.";
  }
  
  // Step 3: Analyze
  const analysis = await orchestrator.analyzeCrosstab(crosstabs[0].id);
  
  return analysis;
}

// Example usage
const result = await discoverAndAnalyze("Gen Z social media");
console.log(result);
```

### Pattern 2: Template-Based Analysis

**Use Case**: Apply specialized analysis templates

```typescript
async function templateBasedAnalysis(crosstabId: string) {
  // Get the crosstab data
  const crosstab = await orchestrator.client.getCrosstab(crosstabId);
  
  // Run base analysis
  const analyzer = new CrosstabAnalyzer();
  const baseAnalysis = analyzer.analyze(crosstab);
  
  // Apply templates
  const templateResults = templateEngine.analyzeWithTemplates(
    crosstab,
    baseAnalysis
  );
  
  // Format all results
  let output = `# Comprehensive Analysis: ${crosstab.name}\n\n`;
  
  // Add base analysis
  const formatter = new ResponseFormatter();
  output += formatter.formatAnalysis(crosstab, baseAnalysis);
  
  // Add template analyses
  output += '\n---\n\n# Specialized Analyses\n\n';
  Object.entries(templateResults).forEach(([name, analysis]) => {
    output += templateEngine.formatTemplateAnalysis(name, analysis);
    output += '\n---\n\n';
  });
  
  return output;
}

// Example usage
const detailed = await templateBasedAnalysis("crosstab-uuid");
console.log(detailed);
```

### Pattern 3: Multi-Crosstab Comparison

**Use Case**: Compare multiple crosstabs side-by-side

```typescript
async function compareCrosstabs(crosstabIds: string[]) {
  const results = await Promise.all(
    crosstabIds.map(id => orchestrator.client.getCrosstab(id))
  );
  
  const analyzer = new CrosstabAnalyzer();
  const analyses = results.map(ct => ({
    name: ct.name,
    analysis: analyzer.analyze(ct)
  }));
  
  // Build comparison report
  let output = '# Multi-Crosstab Comparison\n\n';
  
  output += '## Overview\n\n';
  analyses.forEach((a, i) => {
    output += `### ${i + 1}. ${a.name}\n`;
    output += `- Markets: ${results[i].country_codes.join(', ')}\n`;
    output += `- Time: ${results[i].wave_codes.join(', ')}\n`;
    output += `- Data Points: ${a.analysis.structure.dataPoints.length}\n\n`;
  });
  
  output += '## Top Indexes Comparison\n\n';
  analyses.forEach((a, i) => {
    output += `### ${a.name}\n\n`;
    a.analysis.statistics.topIndexes.slice(0, 5).forEach((item, j) => {
      output += `${j + 1}. ${item.label}: ${item.index}\n`;
    });
    output += '\n';
  });
  
  return output;
}

// Example usage
const comparison = await compareCrosstabs([
  'q3-crosstab-id',
  'q4-crosstab-id'
]);
console.log(comparison);
```

---

## Advanced Usage

### With MCP Server Integration

```typescript
import { MCPClient } from '@your-org/mcp-client';

class EnhancedCrosstabAnalyzer {
  constructor(
    private orchestrator: CrosstabAnalysisOrchestrator,
    private mcpClient: MCPClient,
    private templateEngine: TemplateAnalysisEngine
  ) {}
  
  async analyzeWithContext(crosstabId: string, contextQuery?: string) {
    // Load crosstab
    const crosstab = await this.orchestrator.client.getCrosstab(crosstabId);
    
    // Run base analysis
    const analyzer = new CrosstabAnalyzer();
    const baseAnalysis = analyzer.analyze(crosstab);
    
    // Get MCP context if query provided
    let mcpContext = null;
    if (contextQuery) {
      mcpContext = await this.mcpClient.chat(contextQuery);
    } else {
      // Auto-generate context query based on crosstab
      const autoQuery = this.generateContextQuery(crosstab, baseAnalysis);
      mcpContext = await this.mcpClient.chat(autoQuery);
    }
    
    // Apply templates
    const templateResults = this.templateEngine.analyzeWithTemplates(
      crosstab,
      baseAnalysis
    );
    
    // Format comprehensive response
    return this.formatWithContext(
      crosstab,
      baseAnalysis,
      templateResults,
      mcpContext
    );
  }
  
  private generateContextQuery(crosstab: any, analysis: any): string {
    // Auto-generate relevant MCP query
    const markets = crosstab.country_codes.join(' and ');
    const topBehavior = analysis.statistics.topIndexes[0];
    
    return `What are the broader market trends for ${topBehavior?.label} in ${markets}?`;
  }
  
  private formatWithContext(
    crosstab: any,
    baseAnalysis: any,
    templateResults: any,
    mcpContext: any
  ): string {
    let output = `# Enhanced Analysis: ${crosstab.name}\n\n`;
    
    // Base analysis
    const formatter = new ResponseFormatter();
    output += formatter.formatAnalysis(crosstab, baseAnalysis);
    
    // MCP context
    if (mcpContext) {
      output += '\n## Market Context (GWI Spark)\n\n';
      output += mcpContext.content || mcpContext.response;
      output += '\n\n';
    }
    
    // Template analyses
    output += '## Specialized Analyses\n\n';
    Object.entries(templateResults).forEach(([name, analysis]) => {
      output += this.templateEngine.formatTemplateAnalysis(name, analysis);
      output += '\n';
    });
    
    return output;
  }
}

// Example usage
const enhancedAnalyzer = new EnhancedCrosstabAnalyzer(
  orchestrator,
  mcpClient,
  templateEngine
);

const result = await enhancedAnalyzer.analyzeWithContext(
  'tesla-consideration-crosstab',
  'What are EV adoption trends in UK and Germany?'
);
```

---

## Real-World Examples

### Example 1: Quick Audience Insight

```typescript
// User: "Analyze my PlayStation 5 crosstab"

async function quickInsight() {
  const crosstabs = await orchestrator.client.searchCrosstabs('PlayStation 5');
  
  if (crosstabs.length === 0) {
    return "No PlayStation 5 crosstabs found.";
  }
  
  return await orchestrator.analyzeCrosstab(crosstabs[0].id);
}
```

### Example 2: Market Strategy Development

```typescript
// User: "I need a market strategy for launching in Germany vs UK"

async function marketStrategy(crosstabId: string) {
  const crosstab = await orchestrator.client.getCrosstab(crosstabId);
  
  if (!crosstab.country_codes.includes('gb') || 
      !crosstab.country_codes.includes('de')) {
    return "This crosstab doesn't cover UK and Germany.";
  }
  
  const analyzer = new CrosstabAnalyzer();
  const analysis = analyzer.analyze(crosstab);
  
  // Apply market comparison template
  const templateResults = templateEngine.analyzeWithTemplates(
    crosstab,
    analysis
  );
  
  const marketAnalysis = templateResults['Market Comparison'];
  
  if (!marketAnalysis) {
    return "Market comparison not applicable.";
  }
  
  return templateEngine.formatTemplateAnalysis(
    'Market Comparison',
    marketAnalysis
  );
}
```

### Example 3: Trend Monitoring

```typescript
// User: "Show me how TikTok usage has changed over time"

async function monitorTrends(searchTerm: string) {
  const crosstabs = await orchestrator.client.searchCrosstabs(searchTerm);
  
  if (crosstabs.length === 0) {
    return `No crosstabs found for "${searchTerm}".`;
  }
  
  // Filter for time-series crosstabs
  const timeSeriesCrosstabs = [];
  
  for (const summary of crosstabs) {
    const full = await orchestrator.client.getCrosstab(summary.id, false);
    if (full.wave_codes && full.wave_codes.length >= 2) {
      timeSeriesCrosstabs.push(summary);
    }
  }
  
  if (timeSeriesCrosstabs.length === 0) {
    return "No time-series crosstabs found.";
  }
  
  // Analyze the most recent one
  const crosstab = await orchestrator.client.getCrosstab(
    timeSeriesCrosstabs[0].id
  );
  
  const analyzer = new CrosstabAnalyzer();
  const analysis = analyzer.analyze(crosstab);
  
  const templateResults = templateEngine.analyzeWithTemplates(
    crosstab,
    analysis
  );
  
  const trendAnalysis = templateResults['Trend Analysis'];
  
  return templateEngine.formatTemplateAnalysis(
    'Trend Analysis',
    trendAnalysis
  );
}
```

---

## Error Handling Best Practices

```typescript
async function robustAnalysis(crosstabId: string) {
  try {
    // Attempt to load crosstab
    const crosstab = await orchestrator.client.getCrosstab(crosstabId);
    
    // Check for data
    if (!crosstab.data || crosstab.data.length === 0) {
      return {
        status: 'error',
        message: 'Crosstab has no data. It may still be processing.'
      };
    }
    
    // Check sample sizes
    const validData = crosstab.data.filter(d => 
      d.metrics.positive_sample >= 50
    );
    
    if (validData.length === 0) {
      return {
        status: 'warning',
        message: 'All data points have insufficient sample size (<50). Results are directional only.',
        analysis: await orchestrator.analyzeCrosstab(crosstabId)
      };
    }
    
    if (validData.length < crosstab.data.length * 0.5) {
      return {
        status: 'warning',
        message: `Only ${Math.round(validData.length / crosstab.data.length * 100)}% of data has sufficient sample size.`,
        analysis: await orchestrator.analyzeCrosstab(crosstabId)
      };
    }
    
    // Successful analysis
    return {
      status: 'success',
      analysis: await orchestrator.analyzeCrosstab(crosstabId)
    };
    
  } catch (error) {
    if (error.message.includes('404')) {
      return {
        status: 'error',
        message: 'Crosstab not found. It may have been deleted.'
      };
    }
    
    if (error.message.includes('401') || error.message.includes('403')) {
      return {
        status: 'error',
        message: 'Authentication error. Check your API key.'
      };
    }
    
    return {
      status: 'error',
      message: `Unexpected error: ${error.message}`
    };
  }
}
```

---

## Performance Optimization

### 1. Caching Strategy

```typescript
class CachedCrosstabClient {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL = 30 * 60 * 1000; // 30 minutes
  
  constructor(private client: GWICrosstabClient) {}
  
  async getCrosstab(id: string, includeData: boolean = true) {
    const cacheKey = `${id}-${includeData}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    
    const data = await this.client.getCrosstab(id, includeData);
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  }
  
  clearCache() {
    this.cache.clear();
  }
}
```

### 2. Parallel Processing

```typescript
async function batchAnalysis(crosstabIds: string[]) {
  // Process up to 5 at a time
  const batchSize = 5;
  const results = [];
  
  for (let i = 0; i < crosstabIds.length; i += batchSize) {
    const batch = crosstabIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(id => orchestrator.analyzeCrosstab(id))
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

---

## Testing

```typescript
// Mock for testing
class MockGWICrosstabClient extends GWICrosstabClient {
  async getCrosstab(id: string) {
    return {
      id,
      name: 'Test Crosstab',
      rows: [{ id: 'q1', name: 'Age' }],
      columns: [{ id: 'c1', name: 'US' }],
      country_codes: ['us'],
      wave_codes: ['2024-Q4'],
      data: [
        {
          datapoint: 'q1_1',
          audience: 'c1',
          metrics: {
            positive_sample: 100,
            positive_size: 1000,
            audience_percentage: 45,
            datapoint_percentage: 55,
            audience_index: 150
          }
        }
      ]
    };
  }
}

// Test
const testOrchestrator = new CrosstabAnalysisOrchestrator('test-key');
testOrchestrator.client = new MockGWICrosstabClient('test-key');

const result = await testOrchestrator.analyzeCrosstab('test-id');
console.log('Test result:', result);
```

---

## Next Steps

1. **Set up your environment**
   ```bash
   export GWI_API_KEY="your-api-key-here"
   ```

2. **Run your first analysis**
   ```typescript
   const orchestrator = new CrosstabAnalysisOrchestrator(
     process.env.GWI_API_KEY
   );
   const list = await orchestrator.listCrosstabs();
   console.log(list);
   ```

3. **Integrate with MCP Server**
   - Follow GWI's MCP integration guide
   - Connect the MCP client to the orchestrator
   - Enable context-enriched analysis

4. **Deploy**
   - Wrap in API endpoints
   - Add to Claude Desktop as MCP tool
   - Integrate into your application

---

## Support & Resources

- **GWI Platform API Docs**: https://api.globalwebindex.com/docs/platform-api
- **GWI MCP Server**: https://api.globalwebindex.com/docs/spark-mcp
- **Rate Limits**: Check with GWI support for your plan
- **Sample Data**: Request test crosstabs from GWI team