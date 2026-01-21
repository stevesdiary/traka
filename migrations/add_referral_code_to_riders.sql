-- Add referral_code column to riders table
ALTER TABLE riders 
ADD COLUMN referral_code VARCHAR(20) UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_riders_referral_code ON riders(referral_code);

-- Add comment
COMMENT ON COLUMN riders.referral_code IS 'Unique referral code format: FIRSTNAME## (e.g., SAMUEL34)';
