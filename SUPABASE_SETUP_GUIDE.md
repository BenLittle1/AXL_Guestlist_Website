# Supabase Setup Guide for AXL Guestlist System

This guide will help you set up the real Supabase integrations for the user management system.

## 🚀 Quick Setup Steps

### 1. Run the Database Setup

1. **Open your Supabase Dashboard**
2. **Go to SQL Editor**
3. **Copy and paste the contents of `supabase-setup.sql`**
4. **Click "RUN"**

This will create:
- `profiles` table for user data
- `guests` table for guest management
- Database functions for user management
- Row Level Security (RLS) policies
- Automatic user profile creation triggers

### 2. Set Your Admin Account

After running the setup SQL, you need to make your account an admin:

**Option A: Through SQL Editor**
```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE profiles 
SET access_level = 'admin' 
WHERE email = 'your-email@example.com';
```

**Option B: Through Database Editor**
1. Go to Database → Tables → profiles
2. Find your user record
3. Change `access_level` to `admin`
4. Save changes

### 3. Test the Integration

1. **Refresh your webapp**
2. **Login with your admin account**
3. **Go to Admin Panel → Manage Users**
4. **You should see real user data (not sample data)**

## 📋 What Gets Created

### Tables
- **`profiles`**: Stores user information and roles
- **`guests`**: Stores guest access information

### Functions
- **`get_all_users()`**: Fetches all users (admin only)
- **`update_user_role()`**: Updates user permissions (admin only)
- **`check_username_exists()`**: Validates username availability
- **`get_guests_for_date()`**: Fetches guests for a specific date

### Security
- **Row Level Security (RLS)** enabled on all tables
- **Admin-only policies** for user management
- **Role-based access** for guest management

## 🔧 Features Now Available

### ✅ Real User Management
- View all registered users from Supabase Auth
- Update user roles and permissions
- Email verification status tracking
- User registration date tracking

### ✅ Secure Permission System
- **User**: Security dashboard access only
- **Manager**: Guest management + dashboard
- **Admin**: Full system access + user management

### ✅ Database Integration
- Automatic profile creation on user signup
- Real-time username validation
- Secure role updates through database functions
- Guest data stored in database (ready for implementation)

## 🐛 Troubleshooting

### "Function does not exist" Error
**Problem**: Database functions weren't created
**Solution**: Run the `supabase-setup.sql` file in SQL Editor

### "Access denied" Error
**Problem**: Your account doesn't have admin privileges
**Solution**: Update your profile's `access_level` to `admin`

### "No users found" Message
**Problem**: No users have registered yet
**Solution**: Register some test accounts or check if profiles table exists

### Empty User List
**Problem**: Profiles table exists but has no data
**Solution**: 
1. Check if trigger `on_auth_user_created` exists
2. Register a new account to test auto-profile creation
3. Manually insert existing users if needed

## 🔄 Migration from Sample Data

If you were using the old system with sample data:

1. **Run the setup SQL** to create real tables
2. **Set admin permissions** for your account
3. **Register real user accounts** through the signup page
4. **Old localStorage data** will be replaced with real database data

## 🎯 Next Steps

With real Supabase integration set up, you can now:

1. **Implement guest database storage** (tables already created)
2. **Add user profile editing** features
3. **Create user invitation system**
4. **Add email notifications**
5. **Implement audit logging**

## 📞 Support

If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify all SQL was executed successfully in Supabase
3. Ensure your user account has admin privileges
4. Test with a fresh user registration

The system now uses real Supabase database tables and functions instead of localStorage and sample data! 