// Building access code removed - permissions now controlled by admin

// DOM elements
const signupForm = document.getElementById('signupForm');
const fullNameInput = document.getElementById('fullName');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
// const accessLevelInput = document.getElementById('accessLevel'); // Removed - admins assign roles
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const loginBtn = document.getElementById('loginBtn');
const backBtn = document.getElementById('backBtn');

// Initialize the signup page
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
    signupForm.addEventListener('submit', handleSignup);
    
    // Clear messages when user starts typing
    const inputs = [fullNameInput, usernameInput, emailInput, passwordInput, confirmPasswordInput];
    inputs.forEach(input => {
        input.addEventListener('input', clearMessages);
    });
    
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
        accessLevel: 'user' // Default all new users to 'user' role (admin assigns manager/admin later)
    };
    
    // Frontend validation
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
    
    try {
        // Create user with Supabase Auth
        const { data, error } = await window.supabaseClient.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: formData.fullName,
                    username: formData.username,
                    access_level: formData.accessLevel
                }
            }
        });

        if (error) {
            throw new Error(error.message);
        }

        showSuccess('Account created successfully! Please check your email to verify your account. Note: Your account will require admin approval before you can access the system.');
        
        // Clear form
        signupForm.reset();
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);

    } catch (err) {
        showError(err.message);
    } finally {
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Validate form data
function validateForm(data) {
    // Check required fields
    if (!data.fullName || !data.username || !data.email || !data.password || 
        !data.confirmPassword) {
        return { isValid: false, message: 'Please fill in all required fields.' };
    }
    
    // Validate username
    if (data.username.length < 3) {
        return { isValid: false, message: 'Username must be at least 3 characters long.' };
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
        return { isValid: false, message: 'Username can only contain letters, numbers, and underscores.' };
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        return { isValid: false, message: 'Please enter a valid email address.' };
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

// Real-time validation functions
async function validateUsername() {
    const username = usernameInput.value.trim().toLowerCase();
    if (username.length >= 3) {
        try {
            const { data: usernameExists, error } = await window.supabaseClient
                .rpc('check_username_exists', { 
                    username_to_check: username 
                });
            
            if (error) {
                // If function doesn't exist, skip validation
                console.log('Username validation function not available:', error.message);
                usernameInput.style.borderColor = '';
                clearMessages();
                return;
            }
            
            if (usernameExists) {
                usernameInput.style.borderColor = '#dc2626';
                showError('Username already exists.');
            } else {
                usernameInput.style.borderColor = '';
                clearMessages();
            }
        } catch (e) {
            // If the function doesn't exist, we'll skip this check
            console.log('Username validation error:', e);
            usernameInput.style.borderColor = '';
            clearMessages();
        }
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
    [fullNameInput, usernameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
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