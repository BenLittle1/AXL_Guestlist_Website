const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
    // Debug logging
    console.log('🔍 Email Config Debug:');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Missing');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ Missing');
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST ? '✅ Set' : '❌ Missing');
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT ? '✅ Set' : '❌ Missing');
    
    // Use custom SMTP config instead of service
    const emailConfig = {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD
        }
    };

    // Fallback for development/testing - use ethereal email
    if (!process.env.EMAIL_USER || (!process.env.EMAIL_PASS && !process.env.EMAIL_PASSWORD)) {
        console.warn('⚠️ Email credentials not configured. Using test account.');
        return null; // Will be handled in createTestAccount
    }

    console.log('✅ Using Gmail SMTP with configured credentials');
    return nodemailer.createTransport(emailConfig);
};

// Create test account for development
const createTestTransporter = async () => {
    try {
        const testAccount = await nodemailer.createTestAccount();
        
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    } catch (error) {
        console.error('Failed to create test email account:', error);
        return null;
    }
};

// Send guest arrival notification email
const sendGuestArrivalNotification = async (guestDetails, creatorDetails) => {
    try {
        let transporter = createTransporter();
        
        // Use test account if no real email configured
        if (!transporter) {
            transporter = await createTestTransporter();
            if (!transporter) {
                throw new Error('Failed to create email transporter');
            }
        }

        // Format the arrival time
        const arrivalTime = guestDetails.estimated_arrival 
            ? new Date(`1970-01-01T${guestDetails.estimated_arrival}`).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })
            : 'Not specified';

        // Format the floors
        const floorsText = Array.isArray(guestDetails.floors) 
            ? guestDetails.floors.join(', ') 
            : guestDetails.floors || 'Not specified';

        // Create email content
        const subject = `🎉 Your Guest Has Arrived - ${guestDetails.name}`;
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
                    .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
                    .guest-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
                    .label { font-weight: bold; color: #374151; }
                    .value { color: #1f2937; margin-bottom: 10px; }
                    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                    .status { background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🎉 Guest Arrival Notification</h1>
                    <p>Your guest has checked in to the building</p>
                </div>
                <div class="content">
                    <p>Hello <strong>${creatorDetails.full_name || creatorDetails.username || 'Guest Manager'}</strong>,</p>
                    
                    <p>This is to notify you that your guest has arrived and checked in:</p>
                    
                    <div class="guest-info">
                        <div class="value">
                            <span class="label">Guest Name:</span> ${guestDetails.name}
                        </div>
                        <div class="value">
                            <span class="label">Organization:</span> ${guestDetails.organization || 'Not specified'}
                        </div>
                        <div class="value">
                            <span class="label">Visit Date:</span> ${new Date(guestDetails.visit_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </div>
                        <div class="value">
                            <span class="label">Estimated Arrival:</span> ${arrivalTime}
                        </div>
                        <div class="value">
                            <span class="label">Floor Access:</span> ${floorsText}
                        </div>
                        <div class="value">
                            <span class="label">Status:</span> <span class="status">✅ CHECKED IN</span>
                        </div>
                    </div>
                    
                    <p>The guest has successfully checked in and can now access the designated floors.</p>
                    
                    <p>Thank you for using the AXL Guest Management System!</p>
                </div>
                <div class="footer">
                    <p>This is an automated notification from the AXL Guest Management System.</p>
                    <p>Please do not reply to this email.</p>
                </div>
            </body>
            </html>
        `;

        const textContent = `
            Guest Arrival Notification
            
            Hello ${creatorDetails.full_name || creatorDetails.username || 'Guest Manager'},
            
            Your guest has arrived and checked in:
            
            Guest Name: ${guestDetails.name}
            Organization: ${guestDetails.organization || 'Not specified'}
            Visit Date: ${new Date(guestDetails.visit_date).toLocaleDateString()}
            Estimated Arrival: ${arrivalTime}
            Floor Access: ${floorsText}
            Status: CHECKED IN
            
            The guest has successfully checked in and can now access the designated floors.
            
            Thank you for using the AXL Guest Management System!
            
            ---
            This is an automated notification. Please do not reply to this email.
        `;

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@axl-guestlist.com',
            to: creatorDetails.email,
            subject: subject,
            text: textContent,
            html: htmlContent
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Guest arrival notification sent:', {
            messageId: info.messageId,
            to: creatorDetails.email,
            guest: guestDetails.name
        });

        // If using test account, log preview URL
        if (nodemailer.getTestMessageUrl(info)) {
            console.log('📧 Preview email: ' + nodemailer.getTestMessageUrl(info));
        }

        return {
            success: true,
            messageId: info.messageId,
            previewUrl: nodemailer.getTestMessageUrl(info) || null
        };

    } catch (error) {
        console.error('❌ Failed to send guest arrival notification:', error);
        throw error;
    }
};

module.exports = {
    sendGuestArrivalNotification
}; 