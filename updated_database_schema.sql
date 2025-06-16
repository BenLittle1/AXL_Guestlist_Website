-- Comprehensive Database Schema Update for AXL Guestlist System
-- This file updates all SQL functions and tables to reflect new information
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. UPDATE GUESTS TABLE WITH NEW FIELDS
-- =====================================================

-- Add new columns to guests table if they don't exist
ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS organization TEXT,
ADD COLUMN IF NOT EXISTS estimated_arrival TIME;

-- =====================================================
-- 2. UPDATE EXISTING FUNCTIONS TO INCLUDE NEW FIELDS
-- =====================================================

-- Update the get_guests_for_date function to include all new fields
CREATE OR REPLACE FUNCTION get_guests_for_date(target_date DATE)
RETURNS TABLE (
    id UUID,
    name TEXT,
    floors TEXT[],
    checked_in BOOLEAN,
    organization TEXT,
    estimated_arrival TIME,
    visit_date DATE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
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
        g.visit_date,
        g.created_by,
        g.created_at,
        g.updated_at
    FROM guests g
    WHERE g.visit_date = target_date
    ORDER BY g.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE NEW GUEST MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to add a new guest with all fields
CREATE OR REPLACE FUNCTION add_guest(
    guest_name TEXT,
    visit_date DATE,
    floors TEXT[],
    organization TEXT DEFAULT NULL,
    estimated_arrival TIME DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
    new_guest_id UUID;
BEGIN
    -- Check if user has manager or admin privileges
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND access_level IN ('manager', 'admin')
    ) THEN
        RAISE EXCEPTION 'Access denied. Manager or admin privileges required.';
    END IF;

    -- Insert the new guest
    INSERT INTO guests (name, visit_date, floors, organization, estimated_arrival, created_by, checked_in)
    VALUES (guest_name, visit_date, floors, organization, estimated_arrival, auth.uid(), FALSE)
    RETURNING id INTO new_guest_id;

    RETURN new_guest_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update guest information
CREATE OR REPLACE FUNCTION update_guest(
    guest_id UUID,
    guest_name TEXT DEFAULT NULL,
    visit_date DATE DEFAULT NULL,
    floors TEXT[] DEFAULT NULL,
    organization TEXT DEFAULT NULL,
    estimated_arrival TIME DEFAULT NULL,
    checked_in BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has manager or admin privileges
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND access_level IN ('manager', 'admin')
    ) THEN
        RAISE EXCEPTION 'Access denied. Manager or admin privileges required.';
    END IF;

    -- Update only the fields that are provided (not NULL)
    UPDATE guests 
    SET 
        name = COALESCE(guest_name, name),
        visit_date = COALESCE(visit_date, guests.visit_date),
        floors = COALESCE(floors, guests.floors),
        organization = COALESCE(organization, guests.organization),
        estimated_arrival = COALESCE(estimated_arrival, guests.estimated_arrival),
        checked_in = COALESCE(checked_in, guests.checked_in),
        updated_at = NOW()
    WHERE id = guest_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to toggle guest check-in status
CREATE OR REPLACE FUNCTION toggle_guest_checkin(
    guest_id UUID,
    new_checked_in BOOLEAN
)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has manager or admin privileges
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND access_level IN ('manager', 'admin')
    ) THEN
        RAISE EXCEPTION 'Access denied. Manager or admin privileges required.';
    END IF;

    -- Update the check-in status
    UPDATE guests 
    SET 
        checked_in = new_checked_in,
        updated_at = NOW()
    WHERE id = guest_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to delete a guest
CREATE OR REPLACE FUNCTION delete_guest(guest_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has manager or admin privileges
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND access_level IN ('manager', 'admin')
    ) THEN
        RAISE EXCEPTION 'Access denied. Manager or admin privileges required.';
    END IF;

    -- Delete the guest
    DELETE FROM guests WHERE id = guest_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get all guests with optional filtering
CREATE OR REPLACE FUNCTION get_all_guests(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    checked_in_filter BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    floors TEXT[],
    checked_in BOOLEAN,
    organization TEXT,
    estimated_arrival TIME,
    visit_date DATE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has manager or admin privileges
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND access_level IN ('manager', 'admin')
    ) THEN
        RAISE EXCEPTION 'Access denied. Manager or admin privileges required.';
    END IF;

    RETURN QUERY
    SELECT 
        g.id,
        g.name,
        g.floors,
        g.checked_in,
        g.organization,
        g.estimated_arrival,
        g.visit_date,
        g.created_by,
        g.created_at,
        g.updated_at
    FROM guests g
    WHERE 
        (start_date IS NULL OR g.visit_date >= start_date)
        AND (end_date IS NULL OR g.visit_date <= end_date)
        AND (checked_in_filter IS NULL OR g.checked_in = checked_in_filter)
    ORDER BY g.visit_date DESC, g.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. FIX RLS POLICIES FOR PROFILES
-- =====================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;  
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Service role access" ON profiles;

-- Create improved policies that avoid recursion
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow profile creation" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role access" ON profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Admin policies with proper access control
CREATE POLICY "Admin users can view all profiles" ON profiles
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level = 'admin'
        )
    );

CREATE POLICY "Admin users can update all profiles" ON profiles
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level = 'admin'
        )
    );

-- =====================================================
-- 5. FIX RLS POLICIES FOR GUESTS
-- =====================================================

-- Drop existing guest policies
DROP POLICY IF EXISTS "Managers and admins can view guests" ON guests;
DROP POLICY IF EXISTS "Managers and admins can insert guests" ON guests;
DROP POLICY IF EXISTS "Managers and admins can update guests" ON guests;
DROP POLICY IF EXISTS "Managers and admins can delete guests" ON guests;
DROP POLICY IF EXISTS "Authenticated users can manage guests" ON guests;
DROP POLICY IF EXISTS "Service role access guests" ON guests;

-- Create comprehensive guest policies
CREATE POLICY "Managers and admins can view guests" ON guests
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level IN ('manager', 'admin')
        )
    );

CREATE POLICY "Managers and admins can insert guests" ON guests
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level IN ('manager', 'admin')
        )
    );

CREATE POLICY "Managers and admins can update guests" ON guests
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level IN ('manager', 'admin')
        )
    );

CREATE POLICY "Managers and admins can delete guests" ON guests
    FOR DELETE USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level IN ('manager', 'admin')
        )
    );

CREATE POLICY "Service role access guests" ON guests
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- 6. GRANT PERMISSIONS FOR NEW FUNCTIONS
-- =====================================================

-- Grant permissions for all new functions
GRANT EXECUTE ON FUNCTION add_guest(TEXT, DATE, TEXT[], TEXT, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION update_guest(UUID, TEXT, DATE, TEXT[], TEXT, TIME, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_guest_checkin(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_guest(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_guests(DATE, DATE, BOOLEAN) TO authenticated;

-- Ensure existing functions have proper permissions
GRANT EXECUTE ON FUNCTION get_guests_for_date(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_username_exists(TEXT) TO authenticated;

-- =====================================================
-- 7. ENSURE PROPER TABLE PERMISSIONS
-- =====================================================

-- Ensure tables have proper permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON guests TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_guests_visit_date ON guests(visit_date);
CREATE INDEX IF NOT EXISTS idx_guests_checked_in ON guests(checked_in);
CREATE INDEX IF NOT EXISTS idx_guests_organization ON guests(organization);
CREATE INDEX IF NOT EXISTS idx_guests_created_by ON guests(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_access_level ON profiles(access_level);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- =====================================================
-- VERIFICATION QUERIES (UNCOMMENT TO TEST)
-- =====================================================

-- Test that the new fields exist
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'guests' 
-- ORDER BY ordinal_position;

-- Test that the functions work
-- SELECT * FROM get_guests_for_date(CURRENT_DATE);
-- SELECT * FROM get_all_guests(); 