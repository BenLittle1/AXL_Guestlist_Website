# AXL Building - Admin Login Credentials

## Secure Access Portal

The admin panel is now protected with a secure login system. Use one of the following credentials to access the admin functionality:

### Valid Login Credentials:

**Administrator Account:**
- Username: `admin`
- Password: `AXL2024!Security`

**Security Personnel Account:**
- Username: `security`
- Password: `BuildingAccess2024!`

**Manager Account:**
- Username: `manager`
- Password: `AXLManager!2024`

## Access Flow:

1. **Security Dashboard** (`index.html`) - Public access to view guests
2. **Login Page** (`login.html`) - Secure authentication with existing accounts
3. **Signup Page** (`signup.html`) - Create new accounts with building access code
4. **Admin Panel** (`admin.html`) - Protected area for guest management

## Creating New Accounts:

**Building Access Code:** `AXL-SECURE-2024`

To create a new account:
1. Go to the Login page and click "CREATE ACCOUNT"
2. Fill in all required information
3. Enter the building access code above
4. Choose your access level (User, Manager, or Security)
5. Create a strong password (8+ chars, uppercase, lowercase, number, special char)
6. Your account will be stored locally and ready for use

## Security Features:

- **Session Management**: 4-hour session timeout
- **Session Validation**: Automatic logout on session expiry
- **Protected Routes**: Admin panel redirects to login if not authenticated
- **User Display**: Shows logged-in username in admin panel
- **Secure Logout**: Manual logout with confirmation

## Navigation:

- From Security Dashboard → Click "ADMIN PANEL" → Login Required
- From Login Page → Enter credentials → Access Admin Panel
- From Admin Panel → Click "LOGOUT" → Return to Login Page
- From Admin Panel → Click "SECURITY DASHBOARD" → Return to main view

## Notes:

- **Default Admin Credentials**: Hardcoded for immediate access
- **User-Created Accounts**: Stored in browser localStorage
- **Password Security**: User passwords are hashed before storage
- **Building Access Code**: Required for account creation (`AXL-SECURE-2024`)
- **Session Management**: 4-hour timeout, browser-tab specific
- **Account Validation**: Real-time username/email uniqueness checking
- **Access Levels**: Different permission levels (User, Manager, Security)
- **Production Note**: In production, implement server-side authentication

---

*This is a high-security building access system. Keep credentials secure.* 