-- Add rider_id to packages table to track assigned rider
ALTER TABLE packages ADD COLUMN rider_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX idx_packages_rider_id ON packages(rider_id);
