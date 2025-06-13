// Secure credentials (in production, this should be handled server-side)
const ADMIN_CREDENTIALS = [
    { username: 'admin', password: 'AXL2024!Security' },
    { username: 'security', password: 'BuildingAccess2024!' },
    { username: 'manager', password: 'AXLManager!2024' }
];

// DOM elements
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const backBtn = document.getElementById('backBtn');

// Initialize the login page
document.addEventListener('DOMContentLoaded', function() {
    // Check if already authenticated
    if (isAuthenticated()) {
        window.location.href = 'admin.html';
        return;
    }
    
    initializeForm();
    initializeNavigation();
});

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
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    // Clear previous error
    clearErrorMessage();
    
    // Validate inputs
    if (!username || !password) {
        showError('Please enter both username and password.');
        return;
    }
    
    // Simulate loading state
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'AUTHENTICATING...';
    submitBtn.disabled = true;
    
    // Add slight delay to simulate authentication process
    setTimeout(() => {
        const isValid = validateCredentials(username, password);
        
        if (isValid) {
            // Set authentication
            setAuthentication(username);
            
            // Redirect to admin panel
            window.location.href = 'admin.html';
        } else {
            // Show error
            showError('Invalid username or password. Please try again.');
            
            // Reset form
            passwordInput.value = '';
            passwordInput.focus();
            
            // Add shake animation to form
            const loginCard = document.querySelector('.login-card');
            loginCard.classList.add('shake');
            setTimeout(() => {
                loginCard.classList.remove('shake');
            }, 500);
        }
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }, 800);
}

// Validate user credentials
function validateCredentials(username, password) {
    return ADMIN_CREDENTIALS.some(credential => 
        credential.username === username && credential.password === password
    );
}

// Set authentication in session
function setAuthentication(username) {
    const authData = {
        username: username,
        loginTime: new Date().toISOString(),
        sessionId: generateSessionId()
    };
    
    sessionStorage.setItem('adminAuth', JSON.stringify(authData));
    localStorage.setItem('lastLoginUser', username);
}

// Check if user is authenticated
function isAuthenticated() {
    const authData = sessionStorage.getItem('adminAuth');
    if (!authData) return false;
    
    try {
        const auth = JSON.parse(authData);
        const loginTime = new Date(auth.loginTime);
        const now = new Date();
        const sessionDuration = (now - loginTime) / 1000 / 60; // minutes
        
        // Session expires after 4 hours (240 minutes)
        if (sessionDuration > 240) {
            sessionStorage.removeItem('adminAuth');
            return false;
        }
        
        return true;
    } catch (e) {
        sessionStorage.removeItem('adminAuth');
        return false;
    }
}

// Generate a simple session ID
function generateSessionId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
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