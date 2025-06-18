-- =====================================================
-- REVERT TO SINGLE ORGANIZATION DATABASE
-- =====================================================
-- This script reverts all multi-organization changes back to the original simple structure
-- Run this in your Supabase SQL Editor to clean up the database

-- =====================================================
-- 1. DROP MULTI-ORGANIZATION TRIGGERS AND FUNCTIONS
-- =====================================================

-- Drop profile creation trigger for multi-org
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;

-- Drop multi-org functions
DROP FUNCTION IF EXISTS create_user_profile();
DROP FUNCTION IF EXISTS get_organizations();
DROP FUNCTION IF EXISTS add_guest(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TEXT);
DROP FUNCTION IF EXISTS get_guests_for_date(DATE);
DROP FUNCTION IF EXISTS get_all_guests(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS get_all_users();
DROP FUNCTION IF EXISTS update_user_organization(UUID, UUID);
DROP FUNCTION IF EXISTS toggle_security_role(UUID, BOOLEAN);

-- =====================================================
-- 2. DROP MULTI-ORGANIZATION RLS POLICIES
-- =====================================================

-- Drop multi-org RLS policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Admin users can view organization profiles" ON profiles;
DROP POLICY IF EXISTS "Admin users can update organization profiles" ON profiles;
DROP POLICY IF EXISTS "Security users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role access profiles" ON profiles;

-- Drop multi-org RLS policies on guests
DROP POLICY IF EXISTS "Users can view organization guests" ON guests;
DROP POLICY IF EXISTS "Security users can view all guests" ON guests;
DROP POLICY IF EXISTS "Users can insert organization guests" ON guests;
DROP POLICY IF EXISTS "Users can update organization guests" ON guests;
DROP POLICY IF EXISTS "Users can delete organization guests" ON guests;
DROP POLICY IF EXISTS "Service role access guests" ON guests;

-- Drop organization table policies
DROP POLICY IF EXISTS "All authenticated users can view active organizations" ON organizations;
DROP POLICY IF EXISTS "Admin users can manage organizations" ON organizations;
DROP POLICY IF EXISTS "Service role access organizations" ON organizations;

-- =====================================================
-- 3. REMOVE ORGANIZATION COLUMNS FROM EXISTING TABLES
-- =====================================================

-- Remove organization-related columns from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS organization_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS is_security;

-- Remove organization-related columns from guests  
ALTER TABLE guests DROP COLUMN IF EXISTS organization_id;

-- =====================================================
-- 4. DROP ORGANIZATIONS TABLE
-- =====================================================

-- Drop the organizations table completely
DROP TABLE IF EXISTS organizations CASCADE;

-- =====================================================
-- 5. RESTORE ORIGINAL SIMPLE RLS POLICIES
-- =====================================================

-- Restore simple RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow profile creation" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can view all profiles  
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level = 'admin' 
            AND approved = TRUE
        )
    );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level = 'admin' 
            AND approved = TRUE
        )
    );

-- Restore simple RLS policies for guests
CREATE POLICY "Managers and admins can view guests" ON guests
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level IN ('manager', 'admin') 
            AND approved = TRUE
        )
    );

CREATE POLICY "Managers and admins can insert guests" ON guests
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level IN ('manager', 'admin') 
            AND approved = TRUE
        )
    );

CREATE POLICY "Managers and admins can update guests" ON guests
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level IN ('manager', 'admin') 
            AND approved = TRUE
        )
    );

CREATE POLICY "Managers and admins can delete guests" ON guests
    FOR DELETE USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE access_level IN ('manager', 'admin') 
            AND approved = TRUE
        )
    );

-- =====================================================
-- 6. RESTORE ORIGINAL PROFILE CREATION TRIGGER
-- =====================================================

-- Create the original simple profile creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, username, access_level, approved)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Unknown User'),
        COALESCE(NEW.raw_user_meta_data ->> 'username', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data ->> 'access_level', 'user'),
        FALSE  -- Default to not approved (requires admin approval)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the original trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 7. CLEAN UP AUTH USER METADATA
-- =====================================================

-- Remove organization-related metadata from auth.users
UPDATE auth.users 
SET raw_user_meta_data = (
    CASE 
        WHEN raw_user_meta_data IS NULL THEN NULL
        ELSE raw_user_meta_data - 'organization_id' - 'is_security'
    END
);

-- =====================================================
-- 8. RESTORE ORIGINAL ACCESS LEVELS
-- =====================================================

-- Convert any 'user' access levels back to 'manager' if needed
-- (Uncomment the line below if you want to restore managers)
-- UPDATE profiles SET access_level = 'manager' WHERE access_level = 'user';

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================

-- Check that profiles table is back to original structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check that guests table is back to original structure  
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'guests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify organizations table is gone
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
) AS organizations_table_exists;

-- Check current profiles
SELECT id, email, full_name, username, access_level, approved, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database successfully reverted to single-organization structure!';
    RAISE NOTICE '✅ Multi-organization tables, columns, and policies removed';
    RAISE NOTICE '✅ Original RLS policies and triggers restored';
    RAISE NOTICE '✅ Ready for single-organization usage';
END $$; 