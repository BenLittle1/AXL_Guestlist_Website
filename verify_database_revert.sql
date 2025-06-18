-- =====================================================
-- VERIFY DATABASE REVERT TO SINGLE ORGANIZATION
-- =====================================================
-- Run this after the revert script to verify everything is clean

-- =====================================================
-- 1. CHECK TABLE STRUCTURES
-- =====================================================

-- Check profiles table structure (should NOT have organization_id or is_security)
SELECT 'PROFILES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check guests table structure (should NOT have organization_id)
SELECT 'GUESTS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'guests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 2. VERIFY ORGANIZATIONS TABLE IS GONE
-- =====================================================

SELECT 'ORGANIZATIONS TABLE CHECK:' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'organizations'
        ) 
        THEN '❌ Organizations table still exists - revert may have failed'
        ELSE '✅ Organizations table successfully removed'
    END as status;

-- =====================================================
-- 3. CHECK RLS POLICIES
-- =====================================================

SELECT 'RLS POLICIES ON PROFILES:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles';

SELECT 'RLS POLICIES ON GUESTS:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'guests';

-- =====================================================
-- 4. CHECK TRIGGERS AND FUNCTIONS
-- =====================================================

SELECT 'TRIGGERS ON AUTH.USERS:' as info;
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

SELECT 'PUBLIC FUNCTIONS:' as info;
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name NOT LIKE 'update_%'  -- Filter out auto-generated functions
ORDER BY routine_name;

-- =====================================================
-- 5. CHECK CURRENT DATA
-- =====================================================

SELECT 'CURRENT PROFILES:' as info;
SELECT id, email, full_name, username, access_level, approved, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- 6. OVERALL STATUS CHECK
-- =====================================================

DO $$
DECLARE
    has_org_table BOOLEAN;
    has_org_columns BOOLEAN;
    profiles_count INTEGER;
BEGIN
    -- Check if organizations table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations'
    ) INTO has_org_table;
    
    -- Check if organization columns exist
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'organization_id'
    ) INTO has_org_columns;
    
    -- Count profiles
    SELECT COUNT(*) INTO profiles_count FROM profiles;
    
    RAISE NOTICE '=== DATABASE REVERT STATUS ===';
    
    IF has_org_table THEN
        RAISE NOTICE '❌ Organizations table still exists';
    ELSE
        RAISE NOTICE '✅ Organizations table removed';
    END IF;
    
    IF has_org_columns THEN
        RAISE NOTICE '❌ Organization columns still exist in profiles';
    ELSE
        RAISE NOTICE '✅ Organization columns removed from tables';
    END IF;
    
    RAISE NOTICE 'ℹ️  Current profiles count: %', profiles_count;
    
    IF NOT has_org_table AND NOT has_org_columns THEN
        RAISE NOTICE '🎉 DATABASE SUCCESSFULLY REVERTED TO SINGLE-ORGANIZATION!';
        RAISE NOTICE '✅ Ready for simple signup and user management';
    ELSE
        RAISE NOTICE '⚠️  Some multi-org elements still remain - may need manual cleanup';
    END IF;
    
END $$; 