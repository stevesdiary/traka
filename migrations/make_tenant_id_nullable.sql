-- Make tenant_id nullable in users table (customers don't need tenant_id)
ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL;
