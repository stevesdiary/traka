-- Add referral_code_updated_at column to riders table
ALTER TABLE riders 
ADD COLUMN referral_code_updated_at TIMESTAMP;

-- Add comment
COMMENT ON COLUMN riders.referral_code_updated_at IS 'Timestamp of last referral code update - enforces 14-day cooldown';
