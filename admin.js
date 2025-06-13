// Global state
let currentDate = new Date();
let selectedDate = null;
let guests = JSON.parse(localStorage.getItem('guestData')) || {};

// DOM elements
const calendarGrid = document.getElementById('calendarGrid');
const monthYearEl = document.getElementById('monthYear');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const guestModal = document.getElementById('guestModal');
const modalDateEl = document.getElementById('modalDate');
const modalTitleEl = document.getElementById('modalTitle');
const existingGuestsEl = document.getElementById('existingGuests');
const existingGuestsListEl = document.getElementById('existingGuestsList');
const guestForm = document.getElementById('guestForm');
const guestNameInput = document.getElementById('guestName');
const floorAccessInput = document.getElementById('floorAccess');
const cancelBtn = document.getElementById('cancelBtn');
const securityBtn = document.getElementById('securityBtn');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserEl = document.getElementById('currentUser');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    displayCurrentUser();
    initializeNavigation();
    renderCalendar();
    initializeModal();
});

// Authentication check
function checkAuthentication() {
    const authData = sessionStorage.getItem('adminAuth');
    if (!authData) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const auth = JSON.parse(authData);
        const loginTime = new Date(auth.loginTime);
        const now = new Date();
        const sessionDuration = (now - loginTime) / 1000 / 60; // minutes
        
        // Session expires after 4 hours (240 minutes)
        if (sessionDuration > 240) {
            sessionStorage.removeItem('adminAuth');
            alert('Your session has expired. Please log in again.');
            window.location.href = 'login.html';
            return;
        }
    } catch (e) {
        sessionStorage.removeItem('adminAuth');
        window.location.href = 'login.html';
        return;
    }
}

// Display current user information
function displayCurrentUser() {
    const authData = sessionStorage.getItem('adminAuth');
    if (authData) {
        try {
            const auth = JSON.parse(authData);
            currentUserEl.textContent = auth.username;
        } catch (e) {
            currentUserEl.textContent = 'Unknown';
        }
    }
}

// Navigation functionality
function initializeNavigation() {
    securityBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            logout();
        }
    });
}

// Logout functionality
function logout() {
    // Clear authentication data
    sessionStorage.removeItem('adminAuth');
    
    // Redirect to login page
    window.location.href = 'login.html';
}

// Calendar functionality
function renderCalendar() {
    updateMonthYear();
    renderCalendarGrid();
}

function updateMonthYear() {
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                   'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    
    const monthName = months[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    monthYearEl.textContent = `${monthName} ${year}`;
    
    // Add navigation event listeners
    prevMonthBtn.onclick = () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    };
    
    nextMonthBtn.onclick = () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    };
}

function renderCalendarGrid() {
    calendarGrid.innerHTML = '';
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Add previous month's trailing days
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const dayNum = daysInPrevMonth - i;
        const dayEl = createCalendarDay(dayNum, true);
        calendarGrid.appendChild(dayEl);
    }
    
    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = createCalendarDay(day, false);
        const dayDate = new Date(year, month, day);
        
        // Mark today
        if (isSameDay(dayDate, today)) {
            dayEl.classList.add('today');
        }
        
        // Mark days with guests
        const dateKey = formatDateKey(dayDate);
        if (guests[dateKey] && guests[dateKey].length > 0) {
            dayEl.classList.add('has-guests');
        }
        
        // Add click handler
        dayEl.addEventListener('click', () => openGuestModal(dayDate));
        
        calendarGrid.appendChild(dayEl);
    }
    
    // Add next month's leading days
    const totalCells = calendarGrid.children.length;
    const remainingCells = 42 - totalCells; // 6 rows × 7 days
    
    for (let day = 1; day <= remainingCells; day++) {
        const dayEl = createCalendarDay(day, true);
        calendarGrid.appendChild(dayEl);
    }
}

function createCalendarDay(dayNum, isOtherMonth) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.textContent = dayNum;
    
    if (isOtherMonth) {
        dayEl.classList.add('other-month');
    }
    
    return dayEl;
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// Modal functionality
function initializeModal() {
    cancelBtn.addEventListener('click', closeGuestModal);
    guestForm.addEventListener('submit', handleGuestSubmit);
    
    // Close modal when clicking outside
    guestModal.addEventListener('click', (e) => {
        if (e.target === guestModal) {
            closeGuestModal();
        }
    });
}

function openGuestModal(date) {
    selectedDate = date;
    const dateString = formatModalDate(date);
    modalDateEl.textContent = dateString;
    
    // Show existing guests for this date
    displayExistingGuests(date);
    
    // Reset form
    guestForm.reset();
    
    // Show modal
    guestModal.classList.add('active');
    guestNameInput.focus();
}

function closeGuestModal() {
    guestModal.classList.remove('active');
    selectedDate = null;
}

function formatModalDate(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${dayName}, ${monthName} ${day}, ${year}`;
}

function handleGuestSubmit(e) {
    e.preventDefault();
    
    if (!selectedDate) return;
    
    const guestName = guestNameInput.value.trim();
    const floorAccessText = floorAccessInput.value.trim();
    
    if (!guestName || !floorAccessText) {
        alert('Please fill in all fields.');
        return;
    }
    
    // Parse floor access (support comma-separated and ranges)
    const floors = parseFloorAccess(floorAccessText);
    if (floors.length === 0) {
        alert('Please enter valid floor numbers (e.g., "1,3,5" or "2-4,7").');
        return;
    }
    
    // Add guest to data
    const dateKey = formatDateKey(selectedDate);
    if (!guests[dateKey]) {
        guests[dateKey] = [];
    }
    
    guests[dateKey].push({
        name: guestName,
        floors: floors,
        timestamp: new Date().toISOString()
    });
    
    // Save to localStorage
    localStorage.setItem('guestData', JSON.stringify(guests));
    
    // Update the modal to show new guest
    displayExistingGuests(selectedDate);
    
    // Reset form but keep modal open
    guestForm.reset();
    
    // Update calendar
    renderCalendar();
}

// Display existing guests for a date
function displayExistingGuests(date) {
    const dateKey = formatDateKey(date);
    const dayGuests = guests[dateKey] || [];
    
    if (dayGuests.length === 0) {
        existingGuestsListEl.innerHTML = '<div class="no-guests">No guests scheduled for this date</div>';
    } else {
        const guestItems = dayGuests.map((guest, index) => {
            const floorsDisplay = Array.isArray(guest.floors) 
                ? guest.floors.join(', ') 
                : guest.floor || guest.floors; // Backward compatibility
            
            return `
                <div class="guest-item">
                    <div class="guest-info">
                        <div class="guest-name">${escapeHtml(guest.name)}</div>
                        <div class="guest-floors">Floors: ${floorsDisplay}</div>
                    </div>
                    <button class="delete-guest" onclick="deleteGuest('${dateKey}', ${index})">DELETE</button>
                </div>
            `;
        }).join('');
        
        existingGuestsListEl.innerHTML = guestItems;
    }
}

// Delete a guest
function deleteGuest(dateKey, guestIndex) {
    guests[dateKey].splice(guestIndex, 1);
    
    // Remove the date entry if no guests left
    if (guests[dateKey].length === 0) {
        delete guests[dateKey];
    }
    
    // Save to localStorage
    localStorage.setItem('guestData', JSON.stringify(guests));
    
    // Update display
    displayExistingGuests(selectedDate);
    renderCalendar();
}

// Parse floor access input
function parseFloorAccess(input) {
    const floors = new Set();
    const parts = input.split(',');
    
    for (let part of parts) {
        part = part.trim();
        
        // Handle ranges like "2-4"
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
            if (!isNaN(start) && !isNaN(end) && start <= end) {
                for (let i = start; i <= end; i++) {
                    floors.add(i);
                }
            }
        } 
        // Handle single numbers
        else {
            const num = parseInt(part);
            if (!isNaN(num) && num > 0) {
                floors.add(num);
            }
        }
    }
    
    return Array.from(floors).sort((a, b) => a - b);
}

// HTML escape function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility functions
function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
} 