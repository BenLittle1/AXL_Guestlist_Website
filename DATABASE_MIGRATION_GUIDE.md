# Database Migration Guide for AXL Guestlist System

## Overview
This guide explains the updates made to the SQL functions and tables to reflect new information in the AXL Guestlist System.

## What's New

### 1. Enhanced Guest Table
The `guests` table now includes three new fields:
- `checked_in` (BOOLEAN) - Track whether a guest has checked in
- `organization` (TEXT) - Store the guest's organization/company
- `estimated_arrival` (TIME) - Expected arrival time

### 2. Updated Functions
All guest-related functions have been updated to handle the new fields:
- `get_guests_for_date()` - Now returns all new fields
- New `add_guest()` function for adding guests with all fields
- New `update_guest()` function for updating guest information
- New `toggle_guest_checkin()` function for check-in/out operations
- New `delete_guest()` function for removing guests
- New `get_all_guests()` function with filtering capabilities

### 3. Improved Security
- Fixed RLS (Row Level Security) policies to avoid recursion issues
- Enhanced admin access controls
- Better separation of permissions between users, managers, and admins

### 4. Performance Improvements
- Added database indexes for faster queries
- Optimized query structures

## Migration Options

### Option 1: For Existing Databases (Recommended)
Run the `updated_database_schema.sql` file to update your existing database:

```sql
-- This file updates existing databases with all new features
-- Run in your Supabase SQL Editor
\i updated_database_schema.sql
```

### Option 2: For Fresh Installations
Use the `supabase-setup-updated.sql` file for new database setups:

```sql
-- This file creates a completely new database with all features
-- Run in your Supabase SQL Editor for new installations
\i supabase-setup-updated.sql
```

## Step-by-Step Migration Process

### Step 1: Backup Your Data
Before making any changes, ensure you have a backup of your current database.

### Step 2: Apply Database Updates
1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `updated_database_schema.sql`
4. Run the script

### Step 3: Verify Migration
After running the migration, verify that:

1. **New columns exist:**
   ```sql
   SELECT column_name, data_type, is_nullable, column_default 
   FROM information_schema.columns 
   WHERE table_name = 'guests' 
   ORDER BY ordinal_position;
   ```

2. **Functions work correctly:**
   ```sql
   SELECT * FROM get_guests_for_date(CURRENT_DATE);
   ```

3. **Permissions are set:**
   ```sql
   SELECT * FROM information_schema.table_privileges 
   WHERE table_name IN ('guests', 'profiles');
   ```

### Step 4: Update Frontend Code (If Needed)
The frontend JavaScript already supports the new fields, but ensure your admin interface can:
- Display organization information
- Show estimated arrival times
- Handle check-in/check-out operations

## New Database Functions

### Guest Management Functions

#### `add_guest()`
```sql
SELECT add_guest(
    'John Doe',                    -- guest_name
    '2024-01-15'::DATE,           -- visit_date  
    ARRAY['1', '2'],              -- floors
    'ABC Company',                -- organization (optional)
    '14:30'::TIME                 -- estimated_arrival (optional)
);
```

#### `update_guest()`
```sql
SELECT update_guest(
    'guest-uuid-here',            -- guest_id
    'Jane Doe',                   -- new_name (optional)
    '2024-01-16'::DATE,          -- new_visit_date (optional)
    ARRAY['3'],                   -- new_floors (optional)
    'XYZ Corp',                   -- new_organization (optional)
    '15:00'::TIME,               -- new_estimated_arrival (optional)
    TRUE                          -- checked_in status (optional)
);
```

#### `toggle_guest_checkin()`
```sql
SELECT toggle_guest_checkin('guest-uuid-here', TRUE);
```

#### `delete_guest()`
```sql
SELECT delete_guest('guest-uuid-here');
```

#### `get_all_guests()`
```sql
-- Get all guests
SELECT * FROM get_all_guests();

-- Get guests for a date range
SELECT * FROM get_all_guests('2024-01-01'::DATE, '2024-01-31'::DATE);

-- Get only checked-in guests
SELECT * FROM get_all_guests(NULL, NULL, TRUE);
```

## Security Model

### Access Levels
- **User**: Basic access, can view own profile
- **Manager**: Can manage guests, view guest lists
- **Admin**: Full access, can manage users and guests

### RLS Policies
- Users can only view/edit their own profiles
- Managers and admins can manage guests
- Admins can manage all user accounts
- Service role has full access for backend operations

## Performance Optimizations

### New Indexes
- `idx_guests_visit_date` - Fast date-based queries
- `idx_guests_checked_in` - Quick check-in status filtering
- `idx_guests_organization` - Organization-based searches
- `idx_guests_created_by` - User-specific guest lists
- `idx_profiles_access_level` - Role-based access control
- `idx_profiles_username` - Username lookups

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Ensure RLS policies are properly applied
   - Check user access levels in the profiles table

2. **Function Not Found Errors**
   - Verify all functions were created successfully
   - Check function permissions with `GRANT EXECUTE`

3. **Column Does Not Exist Errors**
   - Ensure the `ALTER TABLE` statements ran successfully
   - Check column existence with the information_schema query

### Verification Queries

```sql
-- Check if new columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'guests' 
AND column_name IN ('checked_in', 'organization', 'estimated_arrival');

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%guest%';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('guests', 'profiles');
```

## Rollback Plan

If you need to rollback the changes:

1. **Remove new columns:**
   ```sql
   ALTER TABLE guests 
   DROP COLUMN IF EXISTS checked_in,
   DROP COLUMN IF EXISTS organization,
   DROP COLUMN IF EXISTS estimated_arrival;
   ```

2. **Drop new functions:**
   ```sql
   DROP FUNCTION IF EXISTS add_guest(TEXT, DATE, TEXT[], TEXT, TIME);
   DROP FUNCTION IF EXISTS update_guest(UUID, TEXT, DATE, TEXT[], TEXT, TIME, BOOLEAN);
   DROP FUNCTION IF EXISTS toggle_guest_checkin(UUID, BOOLEAN);
   DROP FUNCTION IF EXISTS delete_guest(UUID);
   DROP FUNCTION IF EXISTS get_all_guests(DATE, DATE, BOOLEAN);
   ```

3. **Restore original function:**
   ```sql
   -- Restore the original get_guests_for_date function
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
   ```

## Support

If you encounter any issues during migration:
1. Check the Supabase logs for detailed error messages
2. Verify your user has the necessary permissions
3. Ensure you're running the scripts in the correct order
4. Test each function individually after migration 