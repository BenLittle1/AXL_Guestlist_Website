// Global state
let currentDate = new Date();
let guests = JSON.parse(localStorage.getItem('guestData')) || {};

// DOM elements
const currentDateEl = document.getElementById('currentDate');
const guestListEl = document.getElementById('guestList');
const prevDayBtn = document.getElementById('prevDay');
const nextDayBtn = document.getElementById('nextDay');
const adminBtn = document.getElementById('adminBtn');
const passwordModal = document.getElementById('passwordModal');
const passwordForm = document.getElementById('passwordForm');
const adminPasswordInput = document.getElementById('adminPassword');
const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeDateNavigation();
    initializeNavigation();
    initializePasswordModal();
    updateDashboard();
    initializeRealTimeSync();
});

// Date navigation functionality
function initializeDateNavigation() {
    prevDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        updateDashboard();
    });
    
    nextDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        updateDashboard();
    });
}

// Navigation functionality
function initializeNavigation() {
    adminBtn.addEventListener('click', () => {
        // Check if already authenticated
        const authData = sessionStorage.getItem('adminAuth');
        if (authData) {
            try {
                const auth = JSON.parse(authData);
                const loginTime = new Date(auth.loginTime);
                const now = new Date();
                const sessionDuration = (now - loginTime) / 1000 / 60; // minutes
                
                // Session expires after 4 hours (240 minutes)
                if (sessionDuration <= 240) {
                    // Still authenticated, go directly to admin
                    window.location.href = 'admin.html';
                    return;
                }
            } catch (e) {
                // Invalid auth data, continue to login
            }
        }
        
        // Redirect to login page
        window.location.href = 'login.html';
    });
}

// Password modal functionality
function initializePasswordModal() {
    // Form submission
    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = adminPasswordInput.value;
        
        if (password === 'AXL') {
            sessionStorage.setItem('adminAuth', 'true');
            closePasswordModal();
            window.location.href = 'admin.html';
        } else {
            showPasswordError();
        }
    });
    
    // Cancel button
    cancelPasswordBtn.addEventListener('click', () => {
        closePasswordModal();
    });
    
    // Close modal when clicking outside
    passwordModal.addEventListener('click', (e) => {
        if (e.target === passwordModal) {
            closePasswordModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && passwordModal.classList.contains('active')) {
            closePasswordModal();
        }
    });
}

function openPasswordModal() {
    passwordModal.classList.add('active');
    adminPasswordInput.value = '';
    adminPasswordInput.focus();
    clearPasswordError();
}

function closePasswordModal() {
    passwordModal.classList.remove('active');
    adminPasswordInput.value = '';
    clearPasswordError();
}

function showPasswordError() {
    adminPasswordInput.style.borderColor = '#dc2626';
    adminPasswordInput.style.boxShadow = '0 0 0 4px rgba(220, 38, 38, 0.15)';
    adminPasswordInput.placeholder = 'Incorrect password. Try again.';
    adminPasswordInput.value = '';
    
    // Shake animation
    adminPasswordInput.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
        adminPasswordInput.style.animation = '';
    }, 500);
}

function clearPasswordError() {
    adminPasswordInput.style.borderColor = '';
    adminPasswordInput.style.boxShadow = '';
    adminPasswordInput.placeholder = 'Enter password';
}

// Dashboard functionality
function updateDashboard() {
    // Update current date display
    const dateString = formatDateHeader(currentDate);
    currentDateEl.textContent = dateString;
    
    // Update guest list for selected date
    const dateKey = formatDateKey(currentDate);
    const dayGuests = guests[dateKey] || [];
    
    renderGuestList(dayGuests);
}

function formatDateHeader(date) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                   'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${dayName}, ${monthName} ${day}, ${year}`;
}

function renderGuestList(guestList) {
    if (guestList.length === 0) {
        guestListEl.innerHTML = '<div class="no-guests">No guests scheduled for this date.</div>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'guest-table';
    
    // Table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>GUEST NAME</th>
            <th>FLOOR ACCESS</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Table body
    const tbody = document.createElement('tbody');
    guestList.forEach(guest => {
        const row = document.createElement('tr');
        
        // Handle both old single floor format and new multi-floor format
        const floorsDisplay = Array.isArray(guest.floors) 
            ? guest.floors.join(', ') 
            : guest.floor || guest.floors;
        
        row.innerHTML = `
            <td>${escapeHtml(guest.name)}</td>
            <td>${floorsDisplay}</td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    guestListEl.innerHTML = '';
    guestListEl.appendChild(table);
}

// Utility functions
function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Real-time synchronization
function initializeRealTimeSync() {
    // Listen for localStorage changes from other tabs/windows
    window.addEventListener('storage', function(e) {
        if (e.key === 'guestData') {
            // Refresh guest data
            guests = JSON.parse(e.newValue) || {};
            updateDashboard();
        }
    });
    
    // Also check for updates periodically (for same-tab updates)
    setInterval(function() {
        const latestGuests = JSON.parse(localStorage.getItem('guestData')) || {};
        if (JSON.stringify(latestGuests) !== JSON.stringify(guests)) {
            guests = latestGuests;
            updateDashboard();
        }
    }, 1000); // Check every second
} 