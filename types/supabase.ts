// Supabase type definitions

export interface Database {
  public: {
    Tables: {
      data_uploads: {
        Row: {
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
        };
        Insert: Omit<Database['public']['Tables']['data_uploads']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['data_uploads']['Row']>;
      };
      datasets: {
        Row: {
          id: string;
          upload_id: string;
          user_id: string;
          dataset_name: string;
          column_names: string[];
          column_types: string[];
          data_rows: Record<string, any>[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['datasets']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['datasets']['Row']>;
      };
      chat_history: {
        Row: {
          id: string;
          user_id: string;
          dataset_id: string;
          user_query: string;
          ai_response: string;
          response_type: 'text' | 'chart' | 'table';
          suggested_chart_config?: any;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chat_history']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['chat_history']['Row']>;
      };
      dashboards: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description?: string;
          layout?: any;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['dashboards']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['dashboards']['Row']>;
      };
      shared_dashboards: {
        Row: {
          id: string;
          dashboard_id: string;
          share_token: string;
          created_at: string;
          expires_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['shared_dashboards']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['shared_dashboards']['Row']>;
      };
    };
  };
}
