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
  crosstabs?: Array<{ id: string; name: string }>;
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

// ============================================================================
// ID MATCHING UTILITIES
// ============================================================================

/**
 * Check if a data value matches a definition ID.
 * Uses exact matching first, then prefix matching with common separators.
 * This prevents false positives like "q1" matching "q10" or "q12".
 *
 * @param dataValue - The value from the data row (e.g., datapoint or audience)
 * @param definitionId - The ID from the row/column definition
 * @returns true if there's a valid match
 */
export function matchesId(dataValue: string | undefined, definitionId: string): boolean {
  if (!dataValue || !definitionId) return false;

  // Exact match
  if (dataValue === definitionId) return true;

  // Prefix match with common separators (e.g., "q1_option" matches "q1", but "q10" does not)
  const separators = ['_', '-', '.', ':', '|', '/'];
  for (const sep of separators) {
    if (dataValue.startsWith(definitionId + sep)) return true;
  }

  return false;
}

/**
 * Find the best matching row definition for a datapoint.
 * Prioritizes longer (more specific) IDs to handle nested IDs correctly.
 *
 * @param datapoint - The datapoint value from the data row
 * @param rows - Array of row definitions from the crosstab
 * @returns The matching row definition or undefined
 */
export function findMatchingRow(datapoint: string | undefined, rows: RowDefinition[]): RowDefinition | undefined {
  if (!datapoint || !rows.length) return undefined;

  // Sort by ID length descending to match longer (more specific) IDs first
  const sortedRows = [...rows].sort((a, b) => b.id.length - a.id.length);

  return sortedRows.find(r => matchesId(datapoint, r.id));
}

/**
 * Find the best matching column definition for an audience.
 * Prioritizes longer (more specific) IDs to handle nested IDs correctly.
 *
 * @param audience - The audience value from the data row
 * @param columns - Array of column definitions from the crosstab
 * @returns The matching column definition or undefined
 */
export function findMatchingColumn(audience: string | undefined, columns: ColumnDefinition[]): ColumnDefinition | undefined {
  if (!audience || !columns.length) return undefined;

  // Sort by ID length descending to match longer (more specific) IDs first
  const sortedColumns = [...columns].sort((a, b) => b.id.length - a.id.length);

  return sortedColumns.find(c => matchesId(audience, c.id));
}

/**
 * Get the friendly name for a datapoint from row definitions.
 * Falls back to the datapoint value if no match is found.
 *
 * @param datapoint - The datapoint value from the data row
 * @param rows - Array of row definitions from the crosstab
 * @returns The friendly name or the original datapoint
 */
export function getRowName(datapoint: string | undefined, rows: RowDefinition[]): string {
  if (!datapoint) return 'Unknown';
  const match = findMatchingRow(datapoint, rows);
  return match?.name || datapoint;
}

/**
 * Get the friendly name for an audience from column definitions.
 * Falls back to the audience value if no match is found.
 *
 * @param audience - The audience value from the data row
 * @param columns - Array of column definitions from the crosstab
 * @returns The friendly name or the original audience
 */
export function getColumnName(audience: string | undefined, columns: ColumnDefinition[]): string {
  if (!audience) return 'Unknown';
  const match = findMatchingColumn(audience, columns);
  return match?.name || audience;
}
