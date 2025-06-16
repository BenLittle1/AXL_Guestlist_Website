-- Fix for infinite recursion in RLS policies
-- Run this in your Supabase SQL Editor

-- 1. Temporarily disable RLS on profiles to fix the recursion
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop the problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;  
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;

-- 3. Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create simpler, non-recursive policies

-- Policy: Users can view their own profile (no recursion)
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile (no recursion)  
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Allow insert during registration (no recursion)
CREATE POLICY "Allow profile creation" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy: Service role can do everything (bypasses RLS)
CREATE POLICY "Service role access" ON profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 5. Fix guests table policies to be simpler
DROP POLICY IF EXISTS "Managers and admins can view guests" ON guests;
DROP POLICY IF EXISTS "Managers and admins can insert guests" ON guests;
DROP POLICY IF EXISTS "Managers and admins can update guests" ON guests;
DROP POLICY IF EXISTS "Managers and admins can delete guests" ON guests;

-- Simplified guests policies (no complex subqueries)
CREATE POLICY "Authenticated users can manage guests" ON guests
    FOR ALL USING (auth.role() = 'authenticated');

-- Service role can do everything on guests
CREATE POLICY "Service role access guests" ON guests
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 6. Grant permissions to ensure access
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON guests TO authenticated; 