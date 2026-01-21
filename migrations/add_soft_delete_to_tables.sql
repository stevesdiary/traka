-- Add soft delete to tenants (businesses)
ALTER TABLE tenants ADD COLUMN deletedAt TIMESTAMP NULL;
CREATE INDEX idx_tenants_deleted_at ON tenants(deletedAt);

-- Add soft delete to packages
ALTER TABLE packages ADD COLUMN deletedAt TIMESTAMP NULL;
CREATE INDEX idx_packages_deleted_at ON packages(deletedAt);

-- Add soft delete to commissions
ALTER TABLE commissions ADD COLUMN deletedAt TIMESTAMP NULL;
CREATE INDEX idx_commissions_deleted_at ON commissions(deletedAt);

-- Add soft delete to wallets
ALTER TABLE wallets ADD COLUMN deletedAt TIMESTAMP NULL;
CREATE INDEX idx_wallets_deleted_at ON wallets(deletedAt);
