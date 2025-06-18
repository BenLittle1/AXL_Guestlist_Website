const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// @route   POST /api/auth/signup
// @desc    Register a user with Supabase Auth
// @access  Public
router.post('/signup', async (req, res) => {
    const { fullName, username, email, password, accessLevel, accessCode } = req.body;
    
    // Validate building access code
    const BUILDING_ACCESS_CODE = 'AXL-SECURE-2024';
    if (accessCode !== BUILDING_ACCESS_CODE) {
        return res.status(401).json({ msg: 'Invalid building access code.' });
    }

    try {
        // Create user with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    username: username,
                    access_level: accessLevel
                }
            }
        });

        if (error) {
            return res.status(400).json({ msg: error.message });
        }

        res.status(200).json({ 
            msg: 'User created successfully',
            user: data.user 
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user with Supabase Auth
// @access  Public
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // First, we need to get the email from username since Supabase uses email for login
        // We'll query the users table to find the email by username
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('email')
            .eq('username', username)
            .single();

        let email = username; // Default to assuming username is email

        if (userData && !userError) {
            email = userData.email;
        } else if (username.includes('@')) {
            // If username looks like an email, use it directly
            email = username;
        } else {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Sign in with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        res.status(200).json({ 
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: data.user
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Public
router.post('/logout', async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            return res.status(400).json({ msg: error.message });
        }

        res.status(200).json({ msg: 'Logged out successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router; 