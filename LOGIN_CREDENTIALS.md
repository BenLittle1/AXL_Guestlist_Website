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
2. **Login Page** (`login.html`) - Secure authentication
3. **Admin Panel** (`admin.html`) - Protected area for guest management

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

- Credentials are currently stored client-side for demonstration
- In production, implement server-side authentication
- Sessions are browser-tab specific (sessionStorage)
- Multiple users can have different access levels if needed

---

*This is a high-security building access system. Keep credentials secure.* 