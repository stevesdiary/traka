-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'REWARDED')),
  first_delivery_at TIMESTAMP,
  rewarded_at TIMESTAMP,
  reward_amount DECIMAL(10, 2) DEFAULT 1000.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_referrals_referrer ON referrals(referrer_rider_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_rider_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_status ON referrals(status);

-- Add comment
COMMENT ON TABLE referrals IS 'Tracks rider referrals and rewards - both riders get ₦1,000 when referred rider completes first delivery';
