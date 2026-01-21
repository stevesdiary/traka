-- Add unique rider_id column to riders table
ALTER TABLE riders ADD COLUMN rider_id VARCHAR(20) UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_riders_rider_id ON riders(rider_id);

-- Generate rider_id for existing riders (TRK-XXXX format)
-- This will assign sequential numbers to existing riders
DO $$
DECLARE
    rider_record RECORD;
    counter INTEGER := 1000;
BEGIN
    FOR rider_record IN SELECT id FROM riders WHERE rider_id IS NULL ORDER BY created_at
    LOOP
        UPDATE riders 
        SET rider_id = 'TRK-' || LPAD(counter::TEXT, 4, '0')
        WHERE id = rider_record.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Make rider_id NOT NULL after populating existing records
ALTER TABLE riders ALTER COLUMN rider_id SET NOT NULL;
