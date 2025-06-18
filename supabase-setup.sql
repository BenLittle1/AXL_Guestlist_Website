-- Supabase Database Setup for AXL Guestlist System
-- Run this in your Supabase SQL Editor

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

-- 2. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Create function to handle new user registration
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

-- 4. Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.access_level = 'admin'
        )
    );

-- Policy: Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.access_level = 'admin'
        )
    );

-- Policy: Allow insert during registration
CREATE POLICY "Allow profile creation" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. Create function to get all users (admin only)
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

-- 8. Create function to update user role (admin only)
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

-- 9. Create function to check username availability
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

-- 10. Create guests table for guest management
CREATE TABLE IF NOT EXISTS guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    visit_date DATE NOT NULL,
    floors TEXT[] NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Set up RLS for guests table
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Policy: Managers and admins can view all guests
CREATE POLICY "Managers and admins can view guests" ON guests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.access_level IN ('manager', 'admin')
        )
    );

-- Policy: Managers and admins can insert guests
CREATE POLICY "Managers and admins can insert guests" ON guests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.access_level IN ('manager', 'admin')
        )
    );

-- Policy: Managers and admins can update guests
CREATE POLICY "Managers and admins can update guests" ON guests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.access_level IN ('manager', 'admin')
        )
    );

-- Policy: Managers and admins can delete guests
CREATE POLICY "Managers and admins can delete guests" ON guests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.access_level IN ('manager', 'admin')
        )
    );

-- 12. Add trigger for guests updated_at
CREATE TRIGGER update_guests_updated_at 
    BEFORE UPDATE ON guests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 13. Create function to get guests for a specific date
CREATE OR REPLACE FUNCTION get_guests_for_date(target_date DATE)
RETURNS TABLE (
    id UUID,
    name TEXT,
    floors TEXT[],
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
        g.created_by,
        g.created_at
    FROM guests g
    WHERE g.visit_date = target_date
    ORDER BY g.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Insert a default admin user (update the email to match your admin account)
-- IMPORTANT: Change 'your-admin-email@example.com' to your actual admin email
-- INSERT INTO profiles (id, email, full_name, username, access_level)
-- SELECT id, email, 'System Administrator', 'admin', 'admin'
-- FROM auth.users 
-- WHERE email = 'your-admin-email@example.com'
-- ON CONFLICT (id) DO UPDATE SET access_level = 'admin';

-- 15. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON guests TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_username_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_guests_for_date(DATE) TO authenticated; 