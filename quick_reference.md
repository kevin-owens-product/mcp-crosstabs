# GWI Crosstab Analysis - Quick Reference

## 🚀 Instant Commands

```typescript
// List all crosstabs
await orchestrator.listCrosstabs()

// Search crosstabs
await orchestrator.listCrosstabs("social media")

// Analyze by ID
await orchestrator.analyzeCrosstab("crosstab-uuid")

// Search + Analyze
await orchestrator.searchAndAnalyze("Gen Z TikTok")
```

---

## 📊 Analysis Templates

| Template | When to Use | Key Insights |
|----------|-------------|--------------|
| **Audience Profiling** | Single audience, multiple attributes | Defining traits, profile strength, core identity |
| **Market Comparison** | 2+ markets | Cross-market differences, universal behaviors, local strategies |
| **Trend Analysis** | 2+ time periods | Growth/decline patterns, momentum, forecasting |
| **Competitive Comparison** | 2+ brands/competitors | Market leader, unique strengths, positioning gaps |
| **Media Consumption** | Social/media data | Platform dominance, media mix, channel priorities |

---

## 🔍 Common Query Patterns

### Discovery
```typescript
// "What crosstabs do I have about X?"
const results = await orchestrator.listCrosstabs("search term");
```

### Single Analysis
```typescript
// "Analyze my Tesla crosstab"
const analysis = await orchestrator.searchAndAnalyze("Tesla");
```

### Multi-Crosstab
```typescript
// "Compare Q3 vs Q4"
const ct1 = await orchestrator.analyzeCrosstab("q3-id");
const ct2 = await orchestrator.analyzeCrosstab("q4-id");
```

### Template-Based
```typescript
// "Give me the market comparison"
const crosstab = await client.getCrosstab(id);
const analysis = analyzer.analyze(crosstab);
const templates = templateEngine.analyzeWithTemplates(crosstab, analysis);
const marketComp = templates['Market Comparison'];
```

---

## 📈 Key Metrics to Look For

| Metric | Threshold | Meaning |
|--------|-----------|---------|
| **Index** | >150 | Strong over-indexing - core behavior |
| **Index** | 120-150 | Moderate over-indexing |
| **Index** | 80-120 | Average/baseline |
| **Index** | <80 | Under-indexing |
| **Sample** | <50 | Directional only, not statistically significant |
| **Sample** | 50-100 | Moderate confidence |
| **Sample** | >100 | High confidence |

---

## 🎯 Interpretation Guide

### Over-Indexing (Index >120)
- ✅ Target these behaviors in marketing
- ✅ Use for audience segmentation
- ✅ Build creative around these themes

### Under-Indexing (Index <80)
- ⚠️ Audience differs significantly from average
- ⚠️ Avoid messaging around these behaviors
- ⚠️ May indicate white space opportunity

### Market Variation (>30 point difference)
- 🌍 Requires localized strategy
- 🌍 Different messages per market
- 🌍 Consider market-specific products

### Trends (>20 point change)
- 📈 Growing: Double down, invest more
- 📉 Declining: Pivot or exit strategy
- ➡️ Stable: Maintain current approach

---

## 🔧 Configuration

### Environment Variables
```bash
export GWI_API_KEY="your-api-key"
export CACHE_TTL="1800"  # 30 minutes
export MAX_BATCH_SIZE="5"
```

### API Endpoints
```
Base URL: https://api.globalwebindex.com
List: GET /v2/saved/crosstabs
Get: GET /v2/saved/crosstabs/{id}
```

---

## 💡 Pro Tips

1. **Always check sample sizes** - Filter for n≥50
2. **Look for patterns** - 3+ similar behaviors = trend
3. **Context matters** - Use time periods in interpretation
4. **Market-first** - Analyze markets separately before comparing
5. **Index isn't everything** - Consider absolute percentages too

---

## 🐛 Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| "No data" | Crosstab still processing | Wait and retry |
| "401 Unauthorized" | Invalid API key | Check GWI_API_KEY |
| "404 Not Found" | Wrong ID or deleted | Verify crosstab exists |
| "Low sample sizes" | Insufficient data | Flag as directional |
| Empty results | Wrong search term | Try broader terms |

---

## 📚 Response Structure

```typescript
{
  structure: {
    dimensions: { rows, columns, totalCells },
    markets: string[],
    timePeriods: string[],
    audiences: string[],
    dataPoints: string[]
  },
  statistics: {
    topIndexes: IndexedItem[],
    bottomIndexes: IndexedItem[],
    overIndexed: IndexedItem[],
    underIndexed: IndexedItem[],
    statistically_significant: CrosstabDataRow[],
    averages: { mean_index, mean_sample }
  },
  insights: Insight[],
  recommendations: Recommendation[]
}
```

---

## 🎨 Visualization Ideas

- **Heatmap**: Show index scores across matrix
- **Bar Chart**: Top 10 over-indexed behaviors
- **Line Chart**: Trends over time periods
- **Bubble Chart**: Market comparison (size = sample, color = index)
- **Table**: Detailed breakdown with all metrics

---

## ⚡ Performance Tips

1. **Cache aggressively** - Crosstabs don't change frequently
2. **Batch requests** - Process multiple in parallel (max 5)
3. **Filter early** - Remove low-sample data before analysis
4. **Use metadata endpoint** - Get config without full data
5. **Paginate lists** - Don't load all crosstabs at once

---

## 🔗 Integration Points

### With MCP Server
```typescript
// 1. Load crosstab data
const crosstab = await client.getCrosstab(id);

// 2. Get MCP context
const context = await mcpClient.chat(
  "What are EV trends in Germany?"
);

// 3. Synthesize in Claude
// Claude combines crosstab + MCP for comprehensive analysis
```

### With Claude Desktop
```json
{
  "mcpServers": {
    "gwi_crosstabs": {
      "command": "node",
      "args": ["./crosstab-mcp-server.js"],
      "env": {
        "GWI_API_KEY": "your-key"
      }
    }
  }
}
```

---

## 📞 Support

- **API Issues**: support@gwi.com
- **Rate Limits**: Check your plan with GWI
- **Feature Requests**: Product team
- **Documentation**: https://api.globalwebindex.com/docs

---

## 🎓 Learning Path

1. ✅ **Start**: List your crosstabs
2. ✅ **Explore**: Analyze a simple one
3. ✅ **Apply Templates**: Use specialized analysis
4. ✅ **Compare**: Multi-crosstab analysis
5. ✅ **Integrate MCP**: Add context layer
6. ✅ **Automate**: Build into workflows
7. ✅ **Scale**: Batch processing & caching

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Compatibility**: GWI Platform API v2