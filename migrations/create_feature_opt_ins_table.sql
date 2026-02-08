-- Create feature_opt_ins table
CREATE TABLE IF NOT EXISTS feature_opt_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_feature_opt_ins_email ON feature_opt_ins(email);
CREATE INDEX idx_feature_opt_ins_feature_name ON feature_opt_ins(feature_name);
CREATE INDEX idx_feature_opt_ins_notified ON feature_opt_ins(notified) WHERE notified = FALSE;
