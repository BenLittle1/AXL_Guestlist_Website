# Email Configuration - AXL Guestlist Website

## Gmail SMTP Setup (Current Configuration)

### Environment Variables for Production (Railway)

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=ben.little@queensu.ca
EMAIL_PASS=smxs erea heca zoga
EMAIL_FROM=ben.little@queensu.ca
```

### Setup Notes

- **Account:** ben.little@queensu.ca
- **Method:** Gmail App Password (not regular password)
- **2-Step Verification:** Required and enabled ✅
- **App Password Generated:** June 17, 2025
- **Purpose:** AXL Guestlist email notifications

### How to Regenerate App Password (if needed)

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Ensure 2-Step Verification is enabled
3. Find "App passwords" section
4. Generate new password for "Mail" or "AXL Guestlist"
5. Update `EMAIL_PASS` environment variable in Railway

### Current Email Features

- ✅ Guest arrival notifications
- ✅ Professional delivery from ben.little@queensu.ca
- ✅ No spam folder issues
- ✅ Real email delivery (not test emails)

### Future Email Features (Planned)

- 📧 **Inbound email processing:** Allow emails sent to a specific address to automatically add guests
- 📧 **Email templates:** Custom branded email designs
- 📧 **Bulk notifications:** Send updates to all guests at once
- 📧 **RSVP via email:** Allow guests to respond via email

### Alternative Email Services (for future consideration)

1. **SendGrid** - Better for high volume, requires DNS setup
2. **Mailgun** - Good for inbound email processing
3. **Postmark** - Excellent delivery rates
4. **AWS SES** - Cost-effective for large scale

### Troubleshooting

- **Emails not sending:** Check environment variables in Railway
- **App password expired:** Regenerate following steps above
- **Gmail blocks access:** Ensure 2-Step Verification is enabled
- **Test emails:** Temporarily comment out real email config to use ethereal.email

---
*Last updated: June 17, 2025*
*Configuration by: Ben Little* 