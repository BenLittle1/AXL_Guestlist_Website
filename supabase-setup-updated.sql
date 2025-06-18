-- Updated Supabase Database Setup for AXL Guestlist System
-- This is the complete, updated setup file with all new features
-- Run this in your Supabase SQL Editor for new installations

-- 1. Create profiles table to store user data
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    username TEXT UNIQUE,
    access_level TEXT DEFAULT 'user' CHECK (access_level IN ('user', 'manager', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, username, access_level)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'username', ''),
        COALESCE(NEW.raw_user_meta_data->>'access_level', 'user')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Set up Row Level Security (RLS) for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow profile creation" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role access" ON profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

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

-- 8. Create function to get all users (admin only)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    username TEXT,
    access_level TEXT,
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

    -- Return all users with email verification status
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.username,
        p.access_level,
        p.created_at,
        p.updated_at,
        (au.email_confirmed_at IS NOT NULL) as email_verified
    FROM profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to update user role (admin only)
CREATE OR REPLACE FUNCTION update_user_role(
    target_user_id UUID,
    new_role TEXT
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

    -- Validate role
    IF new_role NOT IN ('user', 'manager', 'admin') THEN
        RAISE EXCEPTION 'Invalid role. Must be user, manager, or admin.';
    END IF;

    -- Update the user's role
    UPDATE profiles 
    SET access_level = new_role 
    WHERE id = target_user_id;

    -- Update auth.users metadata as well
    UPDATE auth.users 
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('access_level', new_role)
    WHERE id = target_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to check username availability
CREATE OR REPLACE FUNCTION check_username_exists(username_to_check TEXT)
RETURNS BOOLEAN
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE username = username_to_check 
        AND id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create guests table with all new fields
CREATE TABLE IF NOT EXISTS guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    visit_date DATE NOT NULL,
    floors TEXT[] NOT NULL DEFAULT '{}',
    checked_in BOOLEAN DEFAULT FALSE,
    organization TEXT,
    estimated_arrival TIME,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Set up RLS for guests table
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies for guests
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

-- 14. Add trigger for guests updated_at
CREATE TRIGGER update_guests_updated_at 
    BEFORE UPDATE ON guests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 15. Create comprehensive guest management functions
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

-- 16. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guests_visit_date ON guests(visit_date);
CREATE INDEX IF NOT EXISTS idx_guests_checked_in ON guests(checked_in);
CREATE INDEX IF NOT EXISTS idx_guests_organization ON guests(organization);
CREATE INDEX IF NOT EXISTS idx_guests_created_by ON guests(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_access_level ON profiles(access_level);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- 17. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON guests TO authenticated;

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_username_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_guests_for_date(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION add_guest(TEXT, DATE, TEXT[], TEXT, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION update_guest(UUID, TEXT, DATE, TEXT[], TEXT, TIME, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_guest_checkin(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_guest(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_guests(DATE, DATE, BOOLEAN) TO authenticated;

-- 18. Insert a default admin user (update the email to match your admin account)
-- IMPORTANT: Change 'your-admin-email@example.com' to your actual admin email
-- INSERT INTO profiles (id, email, full_name, username, access_level)
-- SELECT id, email, 'System Administrator', 'admin', 'admin'
-- FROM auth.users 
-- WHERE email = 'your-admin-email@example.com'
-- ON CONFLICT (id) DO UPDATE SET access_level = 'admin'; 