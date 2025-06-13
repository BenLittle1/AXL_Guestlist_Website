// Global state
let currentDate = new Date();
let guests = JSON.parse(localStorage.getItem('guestData')) || {};

// DOM elements
const currentDateEl = document.getElementById('currentDate');
const guestListEl = document.getElementById('guestList');
const prevDayBtn = document.getElementById('prevDay');
const nextDayBtn = document.getElementById('nextDay');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeDateNavigation();
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