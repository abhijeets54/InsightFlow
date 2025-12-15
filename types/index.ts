// Type definitions for the data analysis platform

export interface DataUpload {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  upload_date: string;
  rows_count: number;
  columns_count: number;
  status: 'processing' | 'ready' | 'error';
  raw_data?: any;
  created_at: string;
}

export interface Dataset {
  id: string;
  upload_id: string;
  user_id: string;
  dataset_name: string;
  column_names: string[];
  column_types: string[];
  data_rows: Record<string, any>[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  dataset_id: string;
  user_query: string;
  ai_response: string;
  response_type: 'text' | 'chart' | 'table';
  suggested_chart_config?: ChartConfig;
  created_at: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  dataKey?: string;
  xKey?: string;
  yKey?: string;
  filterColumn?: string;
}

export interface ParsedFileData {
  columns: string[];
  types: string[];
  rows: Record<string, any>[];
  rowCount: number;
  columnCount: number;
}

export type ColumnType = 'number' | 'date' | 'text' | 'boolean' | 'category';

export interface User {
  id: string;
  email: string;
  created_at: string;
}
