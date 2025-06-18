-- =====================================================
-- MIGRATION: New Permission System
-- Changes: 
-- 1. Remove 'manager' role, keep only 'admin' and 'user'
-- 2. Add 'approved' column to profiles
-- 3. Update all functions and policies
-- 4. Migrate existing managers to users
-- =====================================================

-- 1. Add approved column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE;

-- 2. Update existing users - approve all current users by default
UPDATE profiles SET approved = TRUE WHERE access_level IS NOT NULL;

-- 3. Migrate existing managers to users (but keep them approved)
UPDATE profiles 
SET access_level = 'user' 
WHERE access_level = 'manager';

-- 4. Create function to update user role and approval (admin only)
CREATE OR REPLACE FUNCTION update_user_role_and_approval(
    target_user_id UUID,
    new_role TEXT DEFAULT NULL,
    new_approved BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.access_level = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Validate role if provided
    IF new_role IS NOT NULL AND new_role NOT IN ('user', 'admin') THEN
        RAISE EXCEPTION 'Invalid role. Must be user or admin.';
    END IF;

    -- Update the user's role and/or approval status
    UPDATE profiles 
    SET 
        access_level = COALESCE(new_role, access_level),
        approved = COALESCE(new_approved, approved)
    WHERE id = target_user_id;

    -- Update auth.users metadata as well if role is being changed
    IF new_role IS NOT NULL THEN
        UPDATE auth.users 
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('access_level', new_role)
        WHERE id = target_user_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. Replace the old update_user_role function
DROP FUNCTION IF EXISTS update_user_role(UUID, TEXT);

-- 6. Update get_all_users function to include approval status
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    username TEXT,
    access_level TEXT,
    approved BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN
) 
SECURITY DEFINER
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.access_level = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Return all users with email verification status and approval status
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.username,
        p.access_level,
        p.approved,
        p.created_at,
        p.updated_at,
        (au.email_confirmed_at IS NOT NULL) as email_verified
    FROM profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. Update guest management functions to only check for approved users with appropriate access
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
    -- Check if user has appropriate privileges and is approved
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND access_level IN ('admin', 'user')
        AND approved = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Approved user or admin privileges required.';
    END IF;

    -- Insert the new guest
    INSERT INTO guests (name, visit_date, floors, organization, estimated_arrival, created_by, checked_in)
    VALUES (guest_name, visit_date, floors, organization, estimated_arrival, auth.uid(), FALSE)
    RETURNING id INTO new_guest_id;

    RETURN new_guest_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Update guest update function
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
    -- Check if user has appropriate privileges and is approved
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND access_level IN ('admin', 'user')
        AND approved = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Approved user or admin privileges required.';
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

-- 9. Update guest check-in toggle function
CREATE OR REPLACE FUNCTION toggle_guest_checkin(
    guest_id UUID,
    new_checked_in BOOLEAN
)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has appropriate privileges and is approved
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND access_level IN ('admin', 'user')
        AND approved = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Approved user or admin privileges required.';
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

-- 10. Update guest deletion function
CREATE OR REPLACE FUNCTION delete_guest(guest_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has appropriate privileges and is approved
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND access_level IN ('admin', 'user')
        AND approved = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Approved user or admin privileges required.';
    END IF;

    -- Delete the guest
    DELETE FROM guests WHERE id = guest_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 11. Update get_all_guests function
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
    -- Check if user has appropriate privileges and is approved
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND access_level IN ('admin', 'user')
        AND approved = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Approved user or admin privileges required.';
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

-- 12. Update get_guests_for_date function
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
    -- Check if user has appropriate privileges and is approved
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND access_level IN ('admin', 'user')
        AND approved = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Approved user or admin privileges required.';
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
    WHERE g.visit_date = target_date
    ORDER BY g.name;
END;
$$ LANGUAGE plpgsql;

-- 13. Update RLS policies for profiles
DROP POLICY IF EXISTS "Admin users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin users can update all profiles" ON profiles;

-- Recreate admin policies with approval checks
CREATE POLICY "Admin users can view all profiles" ON profiles
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level = 'admin' 
            AND approved = TRUE
        )
    );

CREATE POLICY "Admin users can update all profiles" ON profiles
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level = 'admin' 
            AND approved = TRUE
        )
    );

-- 14. Update RLS policies for guests
DROP POLICY IF EXISTS "Managers and admins can view guests" ON guests;
DROP POLICY IF EXISTS "Managers and admins can insert guests" ON guests;
DROP POLICY IF EXISTS "Managers and admins can update guests" ON guests;
DROP POLICY IF EXISTS "Managers and admins can delete guests" ON guests;

-- Recreate guest policies for approved users and admins
CREATE POLICY "Approved users and admins can view guests" ON guests
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level IN ('admin', 'user')
            AND approved = TRUE
        )
    );

CREATE POLICY "Approved users and admins can insert guests" ON guests
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level IN ('admin', 'user')
            AND approved = TRUE
        )
    );

CREATE POLICY "Approved users and admins can update guests" ON guests
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level IN ('admin', 'user')
            AND approved = TRUE
        )
    );

CREATE POLICY "Approved users and admins can delete guests" ON guests
    FOR DELETE USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level IN ('admin', 'user')
            AND approved = TRUE
        )
    );

-- 15. Grant permissions on new function
GRANT EXECUTE ON FUNCTION update_user_role_and_approval(UUID, TEXT, BOOLEAN) TO authenticated;

-- 16. Create function to approve/reject user (admin only)
CREATE OR REPLACE FUNCTION approve_user(
    target_user_id UUID,
    approval_status BOOLEAN
)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.access_level = 'admin'
        AND profiles.approved = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Update the user's approval status
    UPDATE profiles 
    SET approved = approval_status
    WHERE id = target_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions on approval function
GRANT EXECUTE ON FUNCTION approve_user(UUID, BOOLEAN) TO authenticated;

-- 17. Update signup to create unapproved users by default
-- (This will be handled in the application code, but we ensure the default is FALSE)
ALTER TABLE profiles 
ALTER COLUMN approved SET DEFAULT FALSE;

-- 18. Ensure all existing admins remain approved
UPDATE profiles 
SET approved = TRUE 
WHERE access_level = 'admin';

-- Migration complete!
-- Summary of changes:
-- 1. Added 'approved' column to profiles (default FALSE for new users)
-- 2. Removed 'manager' role - migrated to 'user'
-- 3. Updated all functions to require approval + appropriate role
-- 4. Updated RLS policies
-- 5. All existing users are approved by default
-- 6. New signups will be unapproved until admin approves them 