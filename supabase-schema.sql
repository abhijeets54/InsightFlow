-- AI-Powered Data Analysis Platform - Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Data Uploads Table
CREATE TABLE IF NOT EXISTS data_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT NOT NULL,
  upload_date TIMESTAMP DEFAULT NOW(),
  rows_count INTEGER,
  columns_count INTEGER,
  status TEXT CHECK (status IN ('processing', 'ready', 'error')) DEFAULT 'processing',
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Datasets Table (cleaned, structured data)
CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id UUID REFERENCES data_uploads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset_name TEXT NOT NULL,
  column_names TEXT[] NOT NULL,
  column_types TEXT[] NOT NULL,
  data_rows JSONB[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat History Table (AI queries and responses)
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  user_query TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  response_type TEXT CHECK (response_type IN ('text', 'chart', 'table')) DEFAULT 'text',
  suggested_chart_config JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Dashboards Table (saved visualizations)
CREATE TABLE IF NOT EXISTS dashboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard_name TEXT NOT NULL,
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  pinned_charts JSONB[],
  created_at TIMESTAMP DEFAULT NOW(),
  shared_with TEXT[]
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_data_uploads_user_id ON data_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_datasets_upload_id ON datasets(upload_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_dataset_id ON chat_history(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_user_id ON dashboards(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE data_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;

-- Policies for data_uploads
CREATE POLICY "Users can view their own uploads" ON data_uploads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own uploads" ON data_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads" ON data_uploads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploads" ON data_uploads
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for datasets
CREATE POLICY "Users can view their own datasets" ON datasets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own datasets" ON datasets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own datasets" ON datasets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own datasets" ON datasets
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for chat_history
CREATE POLICY "Users can view their own chat history" ON chat_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages" ON chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat history" ON chat_history
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for dashboards
CREATE POLICY "Users can view their own dashboards" ON dashboards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboards" ON dashboards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboards" ON dashboards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboards" ON dashboards
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_datasets_updated_at
  BEFORE UPDATE ON datasets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
