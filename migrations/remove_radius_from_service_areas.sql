-- Remove radius-based columns from service_areas
ALTER TABLE service_areas DROP COLUMN IF EXISTS radius_km;
ALTER TABLE service_areas DROP COLUMN IF EXISTS latitude;
ALTER TABLE service_areas DROP COLUMN IF EXISTS longitude;
