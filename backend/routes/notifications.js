const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { sendGuestArrivalNotification } = require('../config/email');

// @route   POST /api/notifications/guest-arrival
// @desc    Send email notification when a guest arrives
// @access  Protected (requires authentication)
router.post('/guest-arrival', async (req, res) => {
    console.log('🔥 API REQUEST RECEIVED: /api/notifications/guest-arrival');
    console.log('Request body:', req.body);
    
    try {
        const { guestId, authToken } = req.body;

        // Validate inputs
        if (!guestId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Guest ID is required' 
            });
        }

        if (!authToken) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication token is required' 
            });
        }

        // Verify auth token with Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
        
        if (authError || !user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid authentication token' 
            });
        }

        // Fetch guest details with creator information
        const { data: guestData, error: guestError } = await supabase
            .from('guests')
            .select(`
                id,
                name,
                organization,
                estimated_arrival,
                visit_date,
                floors,
                checked_in,
                created_by,
                creator:profiles!created_by(
                    id,
                    email,
                    full_name,
                    username
                )
            `)
            .eq('id', guestId)
            .single();

        if (guestError) {
            console.error('Error fetching guest data:', guestError);
            return res.status(404).json({ 
                success: false, 
                message: 'Guest not found' 
            });
        }

        if (!guestData) {
            return res.status(404).json({ 
                success: false, 
                message: 'Guest not found' 
            });
        }

        // Check if guest is actually checked in
        if (!guestData.checked_in) {
            return res.status(400).json({ 
                success: false, 
                message: 'Guest is not checked in' 
            });
        }

        // Ensure we have creator information
        if (!guestData.creator || !guestData.creator.email) {
            console.error('No creator email found for guest:', guestId);
            return res.status(400).json({ 
                success: false, 
                message: 'No email address found for guest creator' 
            });
        }

        // Prepare guest details for email
        const guestDetails = {
            name: guestData.name,
            organization: guestData.organization,
            estimated_arrival: guestData.estimated_arrival,
            visit_date: guestData.visit_date,
            floors: guestData.floors
        };

        // Prepare creator details for email
        const creatorDetails = {
            email: guestData.creator.email,
            full_name: guestData.creator.full_name,
            username: guestData.creator.username
        };

        // Send email notification
        console.log('📧 ABOUT TO CALL sendGuestArrivalNotification...');
        try {
            const emailResult = await sendGuestArrivalNotification(guestDetails, creatorDetails);
            
            console.log('✅ Guest arrival notification sent successfully:', {
                guestId: guestId,
                guestName: guestDetails.name,
                creatorEmail: creatorDetails.email,
                messageId: emailResult.messageId
            });

            return res.status(200).json({
                success: true,
                message: 'Guest arrival notification sent successfully',
                data: {
                    guestName: guestDetails.name,
                    creatorEmail: creatorDetails.email,
                    messageId: emailResult.messageId,
                    previewUrl: emailResult.previewUrl // For development/testing
                }
            });

        } catch (emailError) {
            console.error('❌ Failed to send email notification:', emailError);
            
            // Return success for the check-in operation, but note email failure
            return res.status(200).json({
                success: true,
                message: 'Guest checked in successfully, but email notification failed',
                emailError: emailError.message,
                data: {
                    guestName: guestDetails.name,
                    creatorEmail: creatorDetails.email
                }
            });
        }

    } catch (error) {
        console.error('Error in guest arrival notification:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error.message 
        });
    }
});

// @route   POST /api/notifications/test-email
// @desc    Test email configuration (development only)
// @access  Protected
router.post('/test-email', async (req, res) => {
    try {
        const { testEmail, authToken } = req.body;

        if (!authToken) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication token is required' 
            });
        }

        // Verify auth token
        const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
        
        if (authError || !user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid authentication token' 
            });
        }

        // Create test guest and creator data
        const testGuestDetails = {
            name: 'Test Guest',
            organization: 'Test Organization',
            estimated_arrival: '14:30:00',
            visit_date: new Date().toISOString().split('T')[0],
            floors: ['1', '2']
        };

        const testCreatorDetails = {
            email: testEmail || user.email,
            full_name: 'Test User',
            username: 'testuser'
        };

        // Send test email
        const emailResult = await sendGuestArrivalNotification(testGuestDetails, testCreatorDetails);

        return res.status(200).json({
            success: true,
            message: 'Test email sent successfully',
            data: {
                messageId: emailResult.messageId,
                previewUrl: emailResult.previewUrl,
                sentTo: testCreatorDetails.email
            }
        });

    } catch (error) {
        console.error('Error sending test email:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to send test email',
            error: error.message 
        });
    }
});

module.exports = router; 