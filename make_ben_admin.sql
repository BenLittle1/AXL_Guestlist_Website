-- =====================================================
-- MAKE BEN.LITTLE@QUEENSU.CA AN ADMIN
-- This script promotes the user to admin status
-- =====================================================

-- 1. Update the user's profile to admin and approved
UPDATE profiles 
SET 
    access_level = 'admin',
    approved = TRUE,
    updated_at = NOW()
WHERE email = 'ben.little@queensu.ca';

-- 2. Update the auth.users metadata to match
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('access_level', 'admin')
WHERE email = 'ben.little@queensu.ca';

-- 3. Verify the update
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