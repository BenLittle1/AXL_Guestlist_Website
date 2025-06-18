-- Fix RLS policies to allow admin access while keeping RLS enabled
-- Run this in your Supabase SQL Editor

-- 1. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;  
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Service role access" ON profiles;

-- 2. Create comprehensive policies that work with admin access

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile  
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Allow profile creation during registration
CREATE POLICY "Allow profile creation" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy: Admin users can view ALL profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND access_level = 'admin'
        )
    );

-- Policy: Admin users can update ALL profiles  
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND access_level = 'admin'
        )
    );

-- Policy: Service role can do everything (for backend operations)
CREATE POLICY "Service role access" ON profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 3. Update guests table policies for consistency

DROP POLICY IF EXISTS "Authenticated users can manage guests" ON guests;
DROP POLICY IF EXISTS "Service role access guests" ON guests;

-- Policy: Managers and admins can view guests
CREATE POLICY "Managers and admins can view guests" ON guests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND access_level IN ('manager', 'admin')
        )
    );

-- Policy: Managers and admins can insert guests
CREATE POLICY "Managers and admins can insert guests" ON guests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND access_level IN ('manager', 'admin')
        )
    );

-- Policy: Managers and admins can update guests
CREATE POLICY "Managers and admins can update guests" ON guests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND access_level IN ('manager', 'admin')
        )
    );

-- Policy: Managers and admins can delete guests
CREATE POLICY "Managers and admins can delete guests" ON guests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND access_level IN ('manager', 'admin')
        )
    );

-- Policy: Service role can do everything on guests
CREATE POLICY "Service role access guests" ON guests
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. Ensure proper permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON guests TO authenticated;

-- 5. Verify RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY; 