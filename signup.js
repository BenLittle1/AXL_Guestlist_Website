// Building access code (in production, this should be handled server-side)
const BUILDING_ACCESS_CODE = 'AXL-SECURE-2024';

// DOM elements
const signupForm = document.getElementById('signupForm');
const fullNameInput = document.getElementById('fullName');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const accessLevelInput = document.getElementById('accessLevel');
const accessCodeInput = document.getElementById('accessCode');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const loginBtn = document.getElementById('loginBtn');
const backBtn = document.getElementById('backBtn');

// Initialize the signup page
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
    signupForm.addEventListener('submit', handleSignup);
    
    // Clear messages when user starts typing
    const inputs = [fullNameInput, usernameInput, emailInput, passwordInput, confirmPasswordInput, accessCodeInput];
    inputs.forEach(input => {
        input.addEventListener('input', clearMessages);
    });
    
    accessLevelInput.addEventListener('change', clearMessages);
    
    // Real-time validation
    usernameInput.addEventListener('blur', validateUsername);
    passwordInput.addEventListener('input', validatePassword);
    confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    
    // Focus on first field
    fullNameInput.focus();
}

// Navigation initialization
function initializeNavigation() {
    loginBtn.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
    
    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

// Handle signup form submission
async function handleSignup(e) {
    e.preventDefault();
    
    // Clear previous messages
    clearMessages();
    
    // Get form data
    const formData = {
        fullName: fullNameInput.value.trim(),
        username: usernameInput.value.trim().toLowerCase(),
        email: emailInput.value.trim().toLowerCase(),
        password: passwordInput.value,
        confirmPassword: confirmPasswordInput.value,
        accessLevel: accessLevelInput.value,
        accessCode: accessCodeInput.value
    };
    
    // Validate form
    const validation = validateForm(formData);
    if (!validation.isValid) {
        showError(validation.message);
        return;
    }
    
    // Simulate loading state
    const submitBtn = signupForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'CREATING ACCOUNT...';
    submitBtn.disabled = true;
    
    // Add slight delay to simulate processing
    setTimeout(() => {
        try {
            // Create the account
            const success = createAccount(formData);
            
            if (success) {
                showSuccess('Account created successfully! You can now sign in.');
                
                // Clear form
                signupForm.reset();
                
                // Redirect to login after 2 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showError('Failed to create account. Please try again.');
            }
        } catch (error) {
            showError(error.message);
        }
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }, 1000);
}

// Validate form data
function validateForm(data) {
    // Check required fields
    if (!data.fullName || !data.username || !data.email || !data.password || 
        !data.confirmPassword || !data.accessLevel || !data.accessCode) {
        return { isValid: false, message: 'Please fill in all required fields.' };
    }
    
    // Validate username
    if (data.username.length < 3) {
        return { isValid: false, message: 'Username must be at least 3 characters long.' };
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
        return { isValid: false, message: 'Username can only contain letters, numbers, and underscores.' };
    }
    
    // Check if username already exists
    if (isUsernameExists(data.username)) {
        return { isValid: false, message: 'Username already exists. Please choose a different one.' };
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        return { isValid: false, message: 'Please enter a valid email address.' };
    }
    
    // Check if email already exists
    if (isEmailExists(data.email)) {
        return { isValid: false, message: 'Email address already exists. Please use a different one.' };
    }
    
    // Validate password
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.isValid) {
        return { isValid: false, message: passwordValidation.message };
    }
    
    // Check password match
    if (data.password !== data.confirmPassword) {
        return { isValid: false, message: 'Passwords do not match.' };
    }
    
    // Validate building access code
    if (data.accessCode !== BUILDING_ACCESS_CODE) {
        return { isValid: false, message: 'Invalid building access code. Contact building management.' };
    }
    
    return { isValid: true };
}

// Validate password strength
function validatePasswordStrength(password) {
    if (password.length < 8) {
        return { isValid: false, message: 'Password must be at least 8 characters long.' };
    }
    
    if (!/[a-z]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one lowercase letter.' };
    }
    
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one uppercase letter.' };
    }
    
    if (!/[0-9]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one number.' };
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one special character.' };
    }
    
    return { isValid: true };
}

// Check if username exists
function isUsernameExists(username) {
    const accounts = getStoredAccounts();
    return accounts.some(account => account.username === username);
}

// Check if email exists
function isEmailExists(email) {
    const accounts = getStoredAccounts();
    return accounts.some(account => account.email === email);
}

// Create new account
function createAccount(data) {
    try {
        const accounts = getStoredAccounts();
        
        const newAccount = {
            id: generateUserId(),
            fullName: data.fullName,
            username: data.username,
            email: data.email,
            password: hashPassword(data.password), // Simple hash for demo
            accessLevel: data.accessLevel,
            createdAt: new Date().toISOString(),
            isActive: true
        };
        
        accounts.push(newAccount);
        localStorage.setItem('userAccounts', JSON.stringify(accounts));
        
        return true;
    } catch (error) {
        console.error('Error creating account:', error);
        return false;
    }
}

// Get stored accounts
function getStoredAccounts() {
    try {
        return JSON.parse(localStorage.getItem('userAccounts')) || [];
    } catch (error) {
        return [];
    }
}

// Simple password hashing (in production, use proper hashing)
function hashPassword(password) {
    // This is a simple hash for demonstration - use proper hashing in production
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
}

// Generate unique user ID
function generateUserId() {
    return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Real-time validation functions
function validateUsername() {
    const username = usernameInput.value.trim().toLowerCase();
    if (username.length >= 3 && isUsernameExists(username)) {
        usernameInput.style.borderColor = '#dc2626';
        showError('Username already exists.');
    } else {
        usernameInput.style.borderColor = '';
        clearMessages();
    }
}

function validatePassword() {
    const password = passwordInput.value;
    const validation = validatePasswordStrength(password);
    
    if (password.length > 0 && !validation.isValid) {
        passwordInput.style.borderColor = '#dc2626';
    } else {
        passwordInput.style.borderColor = '';
    }
}

function validatePasswordMatch() {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (confirmPassword.length > 0 && password !== confirmPassword) {
        confirmPasswordInput.style.borderColor = '#dc2626';
    } else {
        confirmPasswordInput.style.borderColor = '';
    }
}

// Check if user is authenticated (shared function)
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

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    
    // Shake animation
    const loginCard = document.querySelector('.login-card');
    loginCard.classList.add('shake');
    setTimeout(() => {
        loginCard.classList.remove('shake');
    }, 500);
}

// Show success message
function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
}

// Clear messages
function clearMessages() {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
    successMessage.textContent = '';
    successMessage.style.display = 'none';
    
    // Reset field colors
    [fullNameInput, usernameInput, emailInput, passwordInput, confirmPasswordInput, accessCodeInput].forEach(input => {
        input.style.borderColor = '';
    });
}

// Handle keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // ESC key to go back
    if (e.key === 'Escape') {
        window.location.href = 'index.html';
    }
}); 