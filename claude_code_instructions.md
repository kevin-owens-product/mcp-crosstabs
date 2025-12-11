# 🤖 Claude Code - Complete Build Instructions

## Overview
This guide shows you how to build a complete GWI Crosstab Analysis platform with:
- ✅ React + TypeScript frontend
- ✅ Express + TypeScript backend  
- ✅ GWI Platform API integration
- ✅ AI-powered analysis engine
- ✅ Natural language chat interface

---

## Step 1: Create Project Structure

```bash
# Create project directory
mkdir gwi-crosstab-analysis
cd gwi-crosstab-analysis

# Initialize project
npm init -y

# Create directory structure
mkdir -p src/{lib,api,components,hooks,utils,mcp} public
```

---

## Step 2: Install Dependencies

Copy the `package.json` from **Artifact 1: Complete Project Package** and run:

```bash
npm install
```

---

## Step 3: Copy Core Library Files

### From Artifact 2: "GWI Crosstab Analysis Client"

Create `src/lib/types.ts` first (use the types from Artifact 1), then:

**File: `src/lib/crosstab-client.ts`**
```typescript
// Copy GWICrosstabClient class from Artifact 2
// This includes:
// - GWICrosstabClient
// - JSON Lines parser
// - Search and retrieval methods
```

**File: `src/lib/crosstab-analyzer.ts`**
```typescript
// Copy CrosstabAnalyzer class from Artifact 2
// This includes:
// - analyzeStructure
// - calculateStatistics
// - extractInsights
// - generateRecommendations
```

**File: `src/lib/response-formatter.ts`**
```typescript
// Copy ResponseFormatter class from Artifact 2
// This includes:
// - formatAnalysis
// - formatMetadata
// - formatInsights
// - formatRecommendations
```

**File: `src/lib/orchestrator.ts`**
```typescript
// Copy CrosstabAnalysisOrchestrator from Artifact 2
import { GWICrosstabClient } from './crosstab-client';
import { CrosstabAnalyzer } from './crosstab-analyzer';
import { ResponseFormatter } from './response-formatter';

export class CrosstabAnalysisOrchestrator {
  client: GWICrosstabClient;
  private analyzer: CrosstabAnalyzer;
  private formatter: ResponseFormatter;

  constructor(apiKey: string) {
    this.client = new GWICrosstabClient(apiKey);
    this.analyzer = new CrosstabAnalyzer();
    this.formatter = new ResponseFormatter();
  }

  // Copy all methods from Artifact 2
}
```

---

## Step 4: Copy Analysis Templates

### From Artifact 3: "Crosstab Analysis Templates"

**File: `src/lib/analysis-templates.ts`**
```typescript
// Copy entire contents from Artifact 3
// This includes all 5 templates:
// - AudienceProfilingTemplate
// - MarketComparisonTemplate
// - TrendAnalysisTemplate
// - CompetitiveComparisonTemplate
// - MediaConsumptionTemplate
// - TemplateAnalysisEngine
```

---

## Step 5: Copy UI Components

### From Artifact 6: "React UI Components"

**File: `src/App.tsx`**
```typescript
// Copy App component from Artifact 6
```

**File: `src/components/ChatInterface.tsx`**
```typescript
// Copy ChatInterface component from Artifact 6
```

**File: `src/components/MessageBubble.tsx`**
```typescript
// Copy MessageBubble component from Artifact 6
```

**File: `src/components/CrosstabList.tsx`**
```typescript
// Copy CrosstabList component from Artifact 6
```

**File: `src/main.tsx`**
```typescript
// Copy main.tsx from Artifact 6
```

**File: `src/index.css`**
```css
/* Copy CSS from Artifact 6 (uncomment the Tailwind directives) */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.prose {
  color: #374151;
}

.prose strong {
  color: #111827;
}

.prose h1,
.prose h2,
.prose h3 {
  color: #111827;
}
```

---

## Step 6: Copy Backend Server

### From Artifact 7: "Express Backend Server"

**File: `src/api/server.ts`**
```typescript
// Copy server.ts from Artifact 7
```

**File: `src/api/routes.ts`**
```typescript
// Copy routes.ts from Artifact 7
```

**File: `src/api/handlers.ts`**
```typescript
// Copy handlers.ts from Artifact 7
// Make sure to import from correct paths:
import { CrosstabAnalysisOrchestrator } from '../lib/orchestrator';
import { TemplateAnalysisEngine } from '../lib/analysis-templates';
import { CrosstabAnalyzer } from '../lib/crosstab-analyzer';
import { ResponseFormatter } from '../lib/response-formatter';
```

---

## Step 7: Copy Configuration Files

### From Artifact 1: "Complete Project Package"

**File: `tsconfig.json`**
```json
// Copy from Artifact 1
```

**File: `tsconfig.node.json`**
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**File: `vite.config.ts`**
```typescript
// Copy from Artifact 1
```

**File: `tailwind.config.js`**
```javascript
// Copy from Artifact 1
```

**File: `postcss.config.js`**
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**File: `.env.example`**
```bash
# Copy from Artifact 1
```

**File: `.gitignore`**
```
# Copy from Artifact 1
```

---

## Step 8: Create HTML Entry Point

**File: `public/index.html`**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GWI Crosstab Analysis</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Step 9: Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env  # or your preferred editor
```

Add your actual GWI API key:
```bash
GWI_API_KEY=your_actual_api_key_here
```

---

## Step 10: Fix Import Paths

Make sure all imports use the correct paths. Here's a checklist:

### In `src/api/handlers.ts`:
```typescript
import { CrosstabAnalysisOrchestrator } from '../lib/orchestrator';
import { TemplateAnalysisEngine } from '../lib/analysis-templates';
import { CrosstabAnalyzer } from '../lib/crosstab-analyzer';
import { ResponseFormatter } from '../lib/response-formatter';
```

### In `src/lib/orchestrator.ts`:
```typescript
import { GWICrosstabClient } from './crosstab-client';
import { CrosstabAnalyzer } from './crosstab-analyzer';
import { ResponseFormatter } from './response-formatter';
import type { Crosstab, CrosstabSummary } from './types';
```

### In all components:
```typescript
import { ChatMessage, CrosstabSummary, etc } from '@/lib/types';
```

---

## Step 11: Build & Run

### Development Mode (Recommended)

Terminal 1 - Backend:
```bash
npm run server
```

Terminal 2 - Frontend:
```bash
npm run dev
```

Or both together:
```bash
npm run dev:full
```

### Production Build

```bash
# Build frontend
npm run build

# The dist/ folder contains the built frontend
# Serve it with any static server

# Run backend in production
NODE_ENV=production npm run server
```

---

## Step 12: Test the Application

1. **Open browser**: http://localhost:5173
2. **Check backend**: http://localhost:3001/health
3. **Test chat**:
   - "What crosstabs do I have?"
   - "List my crosstabs"
   - Click a crosstab in sidebar
   - "Analyze this crosstab"

---

## Troubleshooting

### Error: "Cannot find module '@/lib/types'"

**Fix**: Check `tsconfig.json` has the paths configuration:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

And `vite.config.ts` has the alias:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Error: "GWI_API_KEY not found"

**Fix**: Make sure `.env` file exists with:
```bash
GWI_API_KEY=your_key_here
```

### Error: "Failed to fetch /api/crosstabs"

**Fix**: Make sure backend is running on port 3001:
```bash
npm run server
```

### CORS errors

**Fix**: Check `src/api/server.ts` CORS configuration matches your frontend URL.

### TypeScript errors

**Fix**: Run type checking:
```bash
npx tsc --noEmit
```

Fix any import path issues.

---

## File Checklist

Before running, ensure you have:

```
✅ package.json
✅ tsconfig.json
✅ tsconfig.node.json
✅ vite.config.ts
✅ tailwind.config.js
✅ postcss.config.js
✅ .env
✅ .gitignore
✅ public/index.html
✅ src/main.tsx
✅ src/App.tsx
✅ src/index.css
✅ src/lib/types.ts
✅ src/lib/crosstab-client.ts
✅ src/lib/crosstab-analyzer.ts
✅ src/lib/response-formatter.ts
✅ src/lib/orchestrator.ts
✅ src/lib/analysis-templates.ts
✅ src/components/ChatInterface.tsx
✅ src/components/MessageBubble.tsx
✅ src/components/CrosstabList.tsx
✅ src/api/server.ts
✅ src/api/routes.ts
✅ src/api/handlers.ts
```

---

## Quick Start Summary

```bash
# 1. Setup
npm install
cp .env.example .env
# Edit .env with your API key

# 2. Run
npm run dev:full

# 3. Open
# http://localhost:5173
```

---

## Next Steps After Build

1. **Test with real data**: Try analyzing your actual crosstabs
2. **Add MCP integration**: Connect GWI MCP server for context
3. **Customize templates**: Add industry-specific analysis templates
4. **Deploy**: See deployment options in main README.md
5. **Add features**: 
   - Export to PDF
   - Share analysis links
   - Scheduled reports
   - Custom visualizations

---

## Support

If you encounter issues:

1. Check all import paths are correct
2. Verify `.env` file has API key
3. Ensure both frontend and backend are running
4. Check browser console for errors
5. Check terminal for server errors

---

## Success! 🎉

If you see the chat interface and can list crosstabs, you've successfully built the entire platform!

Now you can:
- 💬 Chat with natural language
- 📊 Analyze crosstabs automatically
- 🎯 Get specialized insights
- 🌍 Compare markets
- 📈 Track trends

Happy analyzing!