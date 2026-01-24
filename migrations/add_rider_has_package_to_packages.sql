-- Add rider_has_package field to track if rider collected package before cancellation
ALTER TABLE packages 
ADD COLUMN rider_has_package BOOLEAN DEFAULT NULL;

-- This field is only set when package is cancelled
-- NULL = not cancelled or not applicable
-- TRUE = rider has the package (needs to return it)
-- FALSE = rider doesn't have the package (no return needed)
