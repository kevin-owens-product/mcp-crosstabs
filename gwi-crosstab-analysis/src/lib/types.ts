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
  expression?: unknown;
}

export interface ColumnDefinition {
  id: string;
  name: string;
  full_name?: string;
  expression?: unknown;
}

export interface BaseDefinition {
  id: string;
  name: string;
  full_name?: string;
  expression?: unknown;
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
  data: unknown;
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

export interface VisualizationSpec {
  type: 'heatmap' | 'bar' | 'line' | 'table';
  title: string;
  data: unknown;
}

export interface AnalysisTemplate {
  name: string;
  description: string;
  applicableWhen: (crosstab: Crosstab) => boolean;
  analyze: (crosstab: Crosstab, analysis: Analysis) => TemplateAnalysis;
}
