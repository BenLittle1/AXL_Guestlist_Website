-- =====================================================
-- STEP 1: RUN THE DATABASE MIGRATION FIRST
-- This adds the approved column and updates the permission system
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

-- 4. Ensure all existing admins remain approved
UPDATE profiles 
SET approved = TRUE 
WHERE access_level = 'admin';

-- 5. Update signup to create unapproved users by default
ALTER TABLE profiles 
ALTER COLUMN approved SET DEFAULT FALSE;

-- =====================================================
-- STEP 2: NOW MAKE BEN AN ADMIN
-- =====================================================

-- Update Ben's profile to admin and approved
UPDATE profiles 
SET 
    access_level = 'admin',
    approved = TRUE,
    updated_at = NOW()
WHERE email = 'ben.little@queensu.ca';

-- Update the auth.users metadata to match
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('access_level', 'admin')
WHERE email = 'ben.little@queensu.ca';

-- Verify the update
SELECT 
    id,
    email,
    full_name,
    access_level,
    approved,
    created_at,
    updated_at
FROM profiles 
WHERE email = 'ben.little@queensu.ca';

-- Expected result should show:
-- email: ben.little@queensu.ca
-- access_level: admin  
-- approved: true 