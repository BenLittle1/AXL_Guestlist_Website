# Email Notification Installation Instructions

## Quick Setup

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Configure Email Settings

Create a `.env` file in the `backend/` directory with your email configuration:

**For Gmail (Recommended for Development):**
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
EMAIL_FROM=AXL Guest System <your-email@gmail.com>
```

**For Other Providers:**
```env
EMAIL_SERVICE=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
EMAIL_FROM=AXL Guest System <your-email@outlook.com>
```

### 3. Start the Backend Server

```bash
cd backend
npm start
```

The server will start on port 5001 by default.

### 4. Test the Email System

1. **Option 1 - Use Test Endpoint:**
   - Log into your guest management system
   - Open browser console
   - Run the test command from the EMAIL_SETUP_GUIDE.md

2. **Option 2 - Check In a Guest:**
   - Add a test guest to any date
   - Check in the guest
   - Verify email notification is sent

## Gmail App Password Setup

1. Go to your Google Account settings
2. Security → 2-Step Verification  
3. Select "App passwords" at the bottom
4. Generate a password for "Mail"
5. Use the 16-character password in your .env file

## Development Mode

If no email credentials are configured, the system uses Ethereal Email for testing:
- Emails aren't actually sent
- Preview URLs are logged to console
- Perfect for development

## Notes

- Never commit your `.env` file to version control
- For production, use professional email services like SendGrid or AWS SES
- Check the EMAIL_SETUP_GUIDE.md for comprehensive configuration options
- The backend must be running for email notifications to work 