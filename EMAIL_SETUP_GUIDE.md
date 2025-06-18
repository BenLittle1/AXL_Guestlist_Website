# Email Notification Setup Guide

This guide explains how to set up email notifications for guest arrivals in the AXL Guest Management System.

## Overview

When a guest is checked in, the system automatically sends an email notification to the person who originally added that guest to the system. The email contains:

- Guest name and organization
- Visit date and estimated arrival time
- Floor access information
- Check-in confirmation

## Configuration Options

### Option 1: Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings → Security → 2-Step Verification
   - Select "App passwords" at the bottom
   - Generate a password for "Mail"
   - Copy the 16-character password

3. **Create Environment Variables**:
   Create a `.env` file in the `backend/` directory:
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-character-app-password
   EMAIL_FROM=AXL Guest System <your-email@gmail.com>
   ```

### Option 2: Outlook/Hotmail

1. **Create Environment Variables**:
   ```env
   EMAIL_SERVICE=outlook
   EMAIL_USER=your-email@outlook.com
   EMAIL_PASSWORD=your-password
   EMAIL_FROM=AXL Guest System <your-email@outlook.com>
   ```

### Option 3: Custom SMTP Server

1. **Get SMTP Settings** from your email provider
2. **Configure Environment Variables**:
   ```env
   EMAIL_SERVICE=custom
   EMAIL_HOST=smtp.yourdomain.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@yourdomain.com
   EMAIL_PASSWORD=your-password
   EMAIL_FROM=AXL Guest System <your-email@yourdomain.com>
   ```

### Option 4: Professional Email Services

For production environments, consider using dedicated email services:

- **SendGrid**: High deliverability, detailed analytics
- **AWS SES**: Cost-effective, scales well
- **Postmark**: Excellent for transactional emails
- **Mailgun**: Developer-friendly API

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `EMAIL_SERVICE` | Email service provider | `gmail`, `outlook`, `custom` |
| `EMAIL_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP server port | `587` (TLS) or `465` (SSL) |
| `EMAIL_SECURE` | Use SSL/TLS | `false` for TLS, `true` for SSL |
| `EMAIL_USER` | Your email address | `your-email@gmail.com` |
| `EMAIL_PASSWORD` | Your email password/app password | `abcd efgh ijkl mnop` |
| `EMAIL_FROM` | Sender name and email | `AXL Guest System <noreply@axl.com>` |

## Development Mode

If no email credentials are configured, the system automatically uses **Ethereal Email** for testing:

- Emails are not actually sent
- Preview URLs are logged to the console
- Perfect for development and testing

## Installation Steps

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment**:
   Create `backend/.env` with your email settings (see examples above)

3. **Start the Backend Server**:
   ```bash
   cd backend
   npm start
   ```

4. **Test Email Functionality**:
   The system includes a test endpoint you can use to verify email setup.

## Testing Email Configuration

### Method 1: Using the Test Endpoint

You can test email configuration using the built-in test endpoint:

```javascript
// In browser console (after logging in):
const testEmail = async () => {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    const response = await fetch('http://localhost:5001/api/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            testEmail: 'your-test-email@example.com',
            authToken: session.access_token
        })
    });
    
    const result = await response.json();
    console.log('Test email result:', result);
};

testEmail();
```

### Method 2: Check In a Test Guest

1. Add a test guest to any date
2. Check in the guest using the checkbox or button
3. Check your email for the notification
4. Check browser console for confirmation logs

## Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Verify email and password are correct
   - For Gmail, ensure you're using an App Password, not your regular password
   - Check if 2-Factor Authentication is enabled

2. **"Connection timeout"**
   - Check SMTP settings (host, port, secure)
   - Verify firewall/network settings
   - Try different ports (587 for TLS, 465 for SSL)

3. **"Email not received"**
   - Check spam/junk folder
   - Verify recipient email address in database
   - Check email service rate limits

4. **"No authentication token"**
   - User needs to be logged in
   - Session may have expired - try logging in again

### Debug Mode

Enable detailed logging by setting:
```env
NODE_ENV=development
```

This will log additional debug information to help diagnose issues.

## Security Considerations

### Production Environment

1. **Use Environment Variables**: Never commit email credentials to version control
2. **Secure Storage**: Store credentials in secure environment variable systems
3. **Rate Limiting**: Implement rate limiting to prevent email spam
4. **Sender Reputation**: Use a dedicated email domain for better deliverability

### Email Content Security

- All user input is sanitized before including in emails
- HTML content is escaped to prevent injection attacks
- Email templates use safe formatting practices

## Email Template Customization

The email template can be customized by editing `backend/config/email.js`:

- **HTML content**: Modify the `htmlContent` variable
- **Styling**: Update the CSS in the `<style>` section
- **Text content**: Modify the `textContent` variable
- **Subject line**: Change the `subject` variable

## Monitoring and Analytics

### Logs

The system logs:
- Successful email sends
- Failed email attempts
- Recipient information (for debugging)
- Preview URLs (in development)

### Metrics to Track

- Email delivery rate
- Open rates (if using professional service)
- Failed notifications
- User engagement with notifications

## Integration with External Services

### SendGrid Example

```env
EMAIL_SERVICE=custom
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=AXL Guest System <noreply@yourdomain.com>
```

### AWS SES Example

```env
EMAIL_SERVICE=custom
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-aws-access-key-id
EMAIL_PASSWORD=your-aws-secret-access-key
EMAIL_FROM=AXL Guest System <noreply@yourdomain.com>
```

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Test with a simple email provider like Gmail first
4. Check server logs for detailed error messages

For additional support, check the browser console and server logs for specific error messages. 