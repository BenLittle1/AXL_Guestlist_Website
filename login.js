// DOM elements
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const backBtn = document.getElementById('backBtn');
const signupBtn = document.getElementById('signupBtn');

// Initialize the login page
document.addEventListener('DOMContentLoaded', function() {
    // Check if already authenticated
    checkAuthStatus();
    
    initializeForm();
    initializeNavigation();
});

// Check authentication status
async function checkAuthStatus() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (user) {
        window.location.href = 'index.html';
        return;
    }
}

// Form initialization
function initializeForm() {
    loginForm.addEventListener('submit', handleLogin);
    
    // Clear error message when user starts typing
    usernameInput.addEventListener('input', clearErrorMessage);
    passwordInput.addEventListener('input', clearErrorMessage);
    
    // Focus on username field
    usernameInput.focus();
}

// Navigation initialization
function initializeNavigation() {
    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    signupBtn.addEventListener('click', () => {
        window.location.href = 'signup.html';
    });
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const emailOrUsername = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    
    // Clear previous error
    clearErrorMessage();
    
    // Validate inputs
    if (!emailOrUsername || !password) {
        showError('Please enter both email/username and password.');
        return;
    }
    
    // Simulate loading state
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'AUTHENTICATING...';
    submitBtn.disabled = true;
    
    try {
        let authResult;
        
        // If input looks like an email, try email login first
        if (emailOrUsername.includes('@')) {
            authResult = await window.supabaseClient.auth.signInWithPassword({
                email: emailOrUsername,
                password: password
            });
        } else {
            // For username login, we need to find the user by username first
            // Since Supabase doesn't support username login natively,
            // we'll try a simple email-based approach for now
            throw new Error('Username login not fully implemented. Please use your email address.');
        }

        if (authResult.error) {
            throw new Error('Invalid email or password.');
        }

        // Check user role and approval status
        const user = authResult.data.user;
        
        // Check approval status from profiles table
        let userRole = 'user';
        let isApproved = false;
        
        try {
            const { data: profile } = await window.supabaseClient
                .from('profiles')
                .select('access_level, approved')
                .eq('id', user.id)
                .single();
            
            if (profile) {
                userRole = profile.access_level || 'user';
                isApproved = profile.approved || false;
            } else {
                // Fallback to auth metadata
                userRole = user.user_metadata?.access_level || 'user';
                isApproved = false;
            }
        } catch (error) {
            console.log('Could not fetch profile, using auth metadata:', error);
            userRole = user.user_metadata?.access_level || 'user';
            isApproved = false;
        }
        
        // Check if user is approved
        if (!isApproved) {
            window.location.href = 'pending-approval.html';
            return;
        }
        
        // Redirect approved users to security dashboard
        window.location.href = 'index.html';

    } catch (err) {
        // Show error
        showError(err.message);
        
        // Reset form
        passwordInput.value = '';
        passwordInput.focus();
        
        // Add shake animation to form
        const loginCard = document.querySelector('.login-card');
        loginCard.classList.add('shake');
        setTimeout(() => {
            loginCard.classList.remove('shake');
        }, 500);
    } finally {
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Clear error message
function clearErrorMessage() {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
}

// Handle keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // ESC key to go back
    if (e.key === 'Escape') {
        window.location.href = 'index.html';
    }
});

// Prevent form submission on Enter if form is invalid
loginForm.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleLogin(e);
    }
}); 