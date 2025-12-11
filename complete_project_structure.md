# GWI Crosstab Analysis Platform - Complete Project Package

## Project Structure

```
gwi-crosstab-analysis/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── README.md
├── src/
│   ├── lib/
│   │   ├── crosstab-client.ts
│   │   ├── crosstab-analyzer.ts
│   │   ├── analysis-templates.ts
│   │   ├── response-formatter.ts
│   │   └── types.ts
│   ├── mcp/
│   │   ├── mcp-client.ts
│   │   └── mcp-tools.ts
│   ├── api/
│   │   ├── routes.ts
│   │   └── handlers.ts
│   ├── components/
│   │   ├── ChatInterface.tsx
│   │   ├── CrosstabList.tsx
│   │   ├── AnalysisDisplay.tsx
│   │   ├── VisualizationPanel.tsx
│   │   └── MessageBubble.tsx
│   ├── hooks/
│   │   ├── useCrosstabAnalysis.ts
│   │   └── useChat.ts
│   ├── utils/
│   │   ├── formatting.ts
│   │   └── cache.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
│   └── index.html
└── vite.config.ts
```

---

## File Contents

### 1. `package.json`

```json
{
  "name": "gwi-crosstab-analysis",
  "version": "1.0.0",
  "description": "AI-powered crosstab analysis platform with GWI Platform API and MCP integration",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "server": "tsx src/api/server.ts",
    "dev:full": "concurrently \"npm run dev\" \"npm run server\""
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-markdown": "^9.0.1",
    "recharts": "^2.10.3",
    "axios": "^1.6.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "zod": "^3.22.4",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tsx": "^4.7.0",
    "concurrently": "^8.2.2",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

---

### 2. `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

### 3. `.env.example`

```bash
# GWI Platform API
GWI_API_KEY=your_platform_api_key_here

# GWI MCP Server (optional)
GWI_MCP_TOKEN=your_mcp_token_here
GWI_MCP_URL=https://api.globalwebindex.com/v1/spark-api/mcp

# Server Configuration
PORT=3001
NODE_ENV=development

# Cache Settings
CACHE_TTL=1800
MAX_BATCH_SIZE=5

# CORS
CORS_ORIGIN=http://localhost:5173
```

---

### 4. `.gitignore`

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Build
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*

# Cache
.cache/
.temp/
```

---

### 5. `README.md`

```markdown
# GWI Crosstab Analysis Platform

AI-powered platform for analyzing GWI crosstabs with natural language chat interface.

## Features

- 🔍 Search and discover saved crosstabs
- 📊 Automated statistical analysis
- 🎯 Specialized analysis templates
- 💬 Natural language chat interface
- 🌐 Market comparison tools
- 📈 Trend analysis
- 🤖 Optional MCP integration for context

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your GWI API credentials
```

### 3. Run Development Server

```bash
# Run both frontend and backend
npm run dev:full

# Or run separately:
npm run dev      # Frontend only (Vite)
npm run server   # Backend only (Express)
```

### 4. Access Application

Open http://localhost:5173 in your browser.

## Usage

### Chat Commands

- **List crosstabs**: "What crosstabs do I have?"
- **Search**: "Show me social media crosstabs"
- **Analyze**: "Analyze my Tesla UK/Germany crosstab"
- **Compare**: "Compare Q3 vs Q4 data"
- **Template**: "Give me the market comparison analysis"

### API Endpoints

- `GET /api/crosstabs` - List all crosstabs
- `GET /api/crosstabs/search?q=query` - Search crosstabs
- `GET /api/crosstabs/:id` - Get crosstab details
- `POST /api/analyze` - Analyze a crosstab
- `POST /api/chat` - Chat interface endpoint

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express + TypeScript
- **Analysis Engine**: Custom statistical engine
- **API Integration**: GWI Platform API v2
- **Optional**: GWI MCP Server integration

## Development

```bash
# Type checking
npx tsc --noEmit

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

See DEPLOYMENT.md for production deployment instructions.

## License

Proprietary - GWI Internal Use
```

---

### 6. `src/lib/types.ts`

```typescript
// Complete type definitions for the entire system

export interface CrosstabMetrics {
  positive_sample: number;
  positive_size: number;
  audience_percentage: number;
  datapoint_percentage: number;
  audience_index: number;
}

export interface CrosstabDataRow {
  audience: string;
  datapoint: string;
  segment?: string;
  wave?: string;
  metrics: CrosstabMetrics;
}

export interface RowDefinition {
  id: string;
  name: string;
  full_name?: string;
  expression?: any;
}

export interface ColumnDefinition {
  id: string;
  name: string;
  full_name?: string;
  expression?: any;
}

export interface BaseDefinition {
  id: string;
  name: string;
  full_name?: string;
  expression?: any;
}

export interface Crosstab {
  id: string;
  uuid: string;
  name: string;
  rows: RowDefinition[];
  columns: ColumnDefinition[];
  bases?: BaseDefinition[];
  country_codes: string[];
  wave_codes: string[];
  created_at: string;
  updated_at: string;
  data?: CrosstabDataRow[];
}

export interface CrosstabSummary {
  id: string;
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  folder_id?: string;
}

export interface Analysis {
  structure: StructureAnalysis;
  statistics: StatisticsAnalysis;
  insights: Insight[];
  recommendations: Recommendation[];
}

export interface StructureAnalysis {
  dimensions: {
    rows: number;
    columns: number;
    totalCells: number;
  };
  markets: string[];
  timePeriods: string[];
  audiences: string[];
  dataPoints: string[];
}

export interface StatisticsAnalysis {
  topIndexes: IndexedItem[];
  bottomIndexes: IndexedItem[];
  overIndexed: IndexedItem[];
  underIndexed: IndexedItem[];
  statistically_significant: CrosstabDataRow[];
  averages: {
    mean_index: number;
    mean_sample: number;
  };
}

export interface IndexedItem {
  label: string;
  index: number;
  percentage: number;
  sample: number;
  segment?: string;
}

export interface Insight {
  type: string;
  title: string;
  description: string;
  data: any;
  significance: 'high' | 'medium' | 'low';
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  market?: string;
}

export interface TemplateAnalysis {
  summary: string;
  keyMetrics: KeyMetric[];
  insights: string[];
  recommendations: string[];
}

export interface KeyMetric {
  label: string;
  value: string | number;
  context?: string;
  significance?: 'positive' | 'negative' | 'neutral';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  crosstabId?: string;
  analysisType?: string;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 7. `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

---

### 8. `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gwi-blue': '#0066CC',
        'gwi-dark': '#1a1a2e',
        'gwi-gray': '#f5f5f5',
      },
    },
  },
  plugins: [],
}
```

---

## Instructions for Claude Code

### Step 1: Create Project Structure

```bash
# Create project directory
mkdir gwi-crosstab-analysis
cd gwi-crosstab-analysis

# Initialize project
npm init -y
```

### Step 2: Copy All Files

1. Copy the `package.json` contents above
2. Run `npm install`
3. Create all directories: `src/lib`, `src/mcp`, `src/api`, `src/components`, `src/hooks`, `src/utils`, `public`
4. Copy each file from the artifacts into the appropriate location:
   - First artifact → `src/lib/crosstab-client.ts` (main code)
   - Second artifact → `src/lib/analysis-templates.ts`
   - Extract analyzer → `src/lib/crosstab-analyzer.ts`
   - Extract formatter → `src/lib/response-formatter.ts`

### Step 3: Create the UI Components

The UI components need to be created from scratch. Key files:

- `src/App.tsx` - Main application
- `src/components/ChatInterface.tsx` - Chat UI
- `src/components/AnalysisDisplay.tsx` - Analysis results display
- `src/api/server.ts` - Express backend
- `src/api/routes.ts` - API routes

### Step 4: Build & Run

```bash
# Development
npm run dev:full

# Production build
npm run build
```

---

## Key Integration Points

### 1. Frontend → Backend
```typescript
// In React component
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userInput })
});
```

### 2. Backend → GWI Platform API
```typescript
// In Express route handler
const orchestrator = new CrosstabAnalysisOrchestrator(
  process.env.GWI_API_KEY!
);
const result = await orchestrator.searchAndAnalyze(query);
```

### 3. Optional MCP Integration
```typescript
// In analysis handler
const mcpClient = new MCPClient(process.env.GWI_MCP_TOKEN!);
const context = await mcpClient.chat(contextQuery);
```

---

## Next Steps for Implementation

This package provides:
✅ Complete project structure
✅ All configuration files
✅ Type definitions
✅ Core analysis engine (from previous artifacts)
✅ Template system
✅ Package dependencies
✅ Build setup

**What Claude Code needs to build:**
1. React UI components (ChatInterface, AnalysisDisplay, etc.)
2. Express API server with routes
3. Integration hooks (useCrosstabAnalysis, useChat)
4. Styling (Tailwind CSS)
5. Main App.tsx entry point

---

## Deployment Options

### Option 1: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "server"]
```

### Option 2: Vercel/Netlify
- Frontend: Deploy `/dist` folder
- Backend: Serverless functions

### Option 3: Traditional Server
- Build with `npm run build`
- Serve with PM2 or similar

---

This package is ready for Claude Code to build the complete application!