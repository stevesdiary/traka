-- Add deleted_at column to riders table for soft delete
ALTER TABLE riders ADD COLUMN deleted_at TIMESTAMP NULL;

-- Add deleted_at column to users table for cascade soft delete
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;

-- Create indexes for performance on soft delete queries
CREATE INDEX idx_riders_deleted_at ON riders(deleted_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- Add index for business_id + deleted_at for efficient business queries
CREATE INDEX idx_riders_business_deleted ON riders(business_id, deleted_at);
