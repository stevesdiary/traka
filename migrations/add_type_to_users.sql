-- Add type column to users table
ALTER TABLE users ADD COLUMN type VARCHAR(50);

-- Copy existing role values to type
UPDATE users SET type = role;

-- Make type NOT NULL after populating
ALTER TABLE users ALTER COLUMN type SET NOT NULL;

-- Create index for faster lookups
CREATE INDEX idx_users_type ON users(type);
