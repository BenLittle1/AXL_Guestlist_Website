-- Add new fields to guests table
-- Run this in your Supabase SQL Editor

-- Add new columns to guests table
ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS organization TEXT,
ADD COLUMN IF NOT EXISTS estimated_arrival TIME;

-- Update the get_guests_for_date function to include new fields
CREATE OR REPLACE FUNCTION get_guests_for_date(target_date DATE)
RETURNS TABLE (
    id UUID,
    name TEXT,
    floors TEXT[],
    checked_in BOOLEAN,
    organization TEXT,
    estimated_arrival TIME,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id,
        g.name,
        g.floors,
        g.checked_in,
        g.organization,
        g.estimated_arrival,
        g.created_by,
        g.created_at
    FROM guests g
    WHERE g.visit_date = target_date
    ORDER BY g.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 