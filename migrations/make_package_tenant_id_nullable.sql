-- Make tenant_id nullable in packages table
-- This allows customers (USER role) to create packages without belonging to a business

ALTER TABLE packages 
ALTER COLUMN tenant_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN packages.tenant_id IS 'Business tenant ID - null for customer packages, set for business packages';
