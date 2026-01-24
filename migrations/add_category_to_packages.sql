-- Add package category and fragile flag to packages table
ALTER TABLE packages 
ADD COLUMN category VARCHAR(50),
ADD COLUMN is_fragile BOOLEAN DEFAULT false;

-- Create index for category filtering
CREATE INDEX idx_packages_category ON packages(category);

-- Update existing packages to have 'Others' as default category
UPDATE packages SET category = 'Others' WHERE category IS NULL;

-- Make category NOT NULL after setting defaults
ALTER TABLE packages ALTER COLUMN category SET NOT NULL;
