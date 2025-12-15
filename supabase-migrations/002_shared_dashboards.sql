-- Create shared_dashboards table for dashboard sharing feature
CREATE TABLE IF NOT EXISTS shared_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  share_token VARCHAR(20) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  password TEXT,
  views INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on share_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_shared_dashboards_token ON shared_dashboards(share_token);

-- Create index on dataset_id for user's shared dashboards lookup
CREATE INDEX IF NOT EXISTS idx_shared_dashboards_dataset ON shared_dashboards(dataset_id);

-- Create index on user_id to find all shares by a user
CREATE INDEX IF NOT EXISTS idx_shared_dashboards_user ON shared_dashboards(user_id);

-- Enable Row Level Security
ALTER TABLE shared_dashboards ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create shares for their own datasets
CREATE POLICY "Users can create shares for own datasets"
ON shared_dashboards
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM datasets
    WHERE datasets.id = dataset_id
    AND datasets.user_id = auth.uid()
  )
);

-- Policy: Users can view their own shares
CREATE POLICY "Users can view own shares"
ON shared_dashboards
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Users can update their own shares
CREATE POLICY "Users can update own shares"
ON shared_dashboards
FOR UPDATE
USING (user_id = auth.uid());

-- Policy: Users can delete their own shares
CREATE POLICY "Users can delete own shares"
ON shared_dashboards
FOR DELETE
USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_shared_dashboards_updated_at
BEFORE UPDATE ON shared_dashboards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE shared_dashboards IS 'Stores public share links for dashboards';
COMMENT ON COLUMN shared_dashboards.share_token IS 'Unique token for the public share URL';
COMMENT ON COLUMN shared_dashboards.password IS 'Optional password protection (plain text for simplicity)';
COMMENT ON COLUMN shared_dashboards.views IS 'Number of times this share has been viewed';
COMMENT ON COLUMN shared_dashboards.is_active IS 'Whether the share link is currently active';
