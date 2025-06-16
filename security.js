// Global state
let currentDate = new Date();
let guests = JSON.parse(localStorage.getItem('guestData')) || {};

// DOM elements
const currentDateEl = document.getElementById('currentDate');
const guestListEl = document.getElementById('guestList');
const prevDayBtn = document.getElementById('prevDay');
const nextDayBtn = document.getElementById('nextDay');
const adminBtn = document.getElementById('adminBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('Initializing dashboard...');
        
        // Ensure we always start with today's date
        currentDate = new Date();
        // Reset time to midnight to avoid any time-based issues
        currentDate.setHours(0, 0, 0, 0);
        console.log('Current date set to:', currentDate);
        
        // Check if DOM elements exist
        if (!currentDateEl) {
            console.error('currentDateEl not found!');
            return;
        }
        
        initializeDateNavigation();
        initializeNavigation();
        checkAuthenticationStatus();
        
        // Load guests from Supabase to ensure current state
        await loadGuestsFromSupabase();
        
        updateDashboard();
        initializeRealTimeSync();
        
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
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
    adminBtn.addEventListener('click', async () => {
        // Check if already authenticated with Supabase
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (user) {
            // Check user role - allow admin and manager to access admin panel
            const userRole = user.user_metadata?.access_level || 'user';
            if (userRole === 'admin' || userRole === 'manager') {
                window.location.href = 'admin.html';
            } else {
                alert('Access denied. This user account only has access to the security dashboard.');
            }
            return;
        }
        
        // Redirect to login page
        window.location.href = 'login.html';
    });

    logoutBtn.addEventListener('click', async () => {
        await handleLogout();
    });
}

// Check authentication status and show/hide logout button
async function checkAuthenticationStatus() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (user) {
            // User is logged in, show logout button
            logoutBtn.style.display = 'inline-block';
        } else {
            // User is not logged in, hide logout button
            logoutBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking authentication status:', error);
        logoutBtn.style.display = 'none';
    }
}

// Handle logout functionality
async function handleLogout() {
    try {
        // Show confirmation dialog
        const confirmLogout = confirm('Are you sure you want to logout?');
        if (!confirmLogout) {
            return;
        }

        // Sign out from Supabase
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) {
            console.error('Error logging out:', error);
            alert('Error logging out. Please try again.');
            return;
        }

        // Hide logout button
        logoutBtn.style.display = 'none';
        
        // Show success message
        alert('Successfully logged out!');
        
        // Optional: Refresh the page to reset any user-specific data
        window.location.reload();
        
    } catch (error) {
        console.error('Error during logout:', error);
        alert('Error logging out. Please try again.');
    }
}



// Load guests data from Supabase
async function loadGuestsFromSupabase() {
    try {
        console.log('Loading guests from Supabase...');
        
        // Get guests from Supabase for the next 30 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 1); // Include yesterday
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); // Next 30 days
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // Try with regular client first, then admin client if needed
        let result;
        try {
            result = await window.supabaseClient
                .from('guests')
                .select('id, name, organization, estimated_arrival, checked_in, visit_date, floors, created_by, created_at, updated_at')
                .gte('visit_date', startDateStr)
                .lte('visit_date', endDateStr)
                .order('visit_date', { ascending: true });
        } catch (rlsError) {
            console.log('Regular client failed for loading guests, trying admin client:', rlsError.message);
            
            if (window.supabaseAdminClient) {
                result = await window.supabaseAdminClient
                    .from('guests')
                    .select('id, name, organization, estimated_arrival, checked_in, visit_date, floors, created_by, created_at, updated_at')
                    .gte('visit_date', startDateStr)
                    .lte('visit_date', endDateStr)
                    .order('visit_date', { ascending: true });
            } else {
                throw rlsError;
            }
        }
        
        if (result.error) {
            console.error('Error loading guests from Supabase:', result.error);
            return;
        }
        
        // Convert Supabase data to local format and organize by date
        const supabaseGuests = {};
        result.data.forEach(guest => {
            const dateKey = guest.visit_date;
            if (!supabaseGuests[dateKey]) {
                supabaseGuests[dateKey] = [];
            }
            
            supabaseGuests[dateKey].push({
                id: guest.id,
                name: guest.name,
                organization: guest.organization,
                estimatedArrival: guest.estimated_arrival,
                checkedIn: guest.checked_in,
                floors: guest.floors,
                timestamp: guest.created_at
            });
        });
        
        // Merge with local data (prioritize Supabase data)
        guests = { ...guests, ...supabaseGuests };
        
        // Update localStorage with merged data
        localStorage.setItem('guestData', JSON.stringify(guests));
        
        console.log('Loaded guests from Supabase successfully:', guests);
        
    } catch (error) {
        console.error('Error loading guests from Supabase:', error);
        // Continue with localStorage data if Supabase fails
    }
}

// Dashboard functionality
function updateDashboard() {
    // Update current date display
    const dateString = formatDateHeader(currentDate);
    currentDateEl.textContent = dateString;
    
    // Check if this is today and apply highlight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(currentDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    const isToday = selectedDate.getTime() === today.getTime();
    const dateNavigation = document.querySelector('.date-navigation');
    
    // Apply today highlight
    if (isToday) {
        dateNavigation?.classList.add('today-highlight');
    } else {
        dateNavigation?.classList.remove('today-highlight');
    }
    
    // Update guest list for selected date
    const dateKey = formatDateKey(currentDate);
    const dayGuests = guests[dateKey] || [];
    
    renderGuestList(dayGuests);
}

// Function to jump to today's date
function goToToday() {
    currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    updateDashboard();
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
            <th>CHECKED-IN?</th>
            <th>GUEST NAME</th>
            <th>ORGANIZATION</th>
            <th>ESTIMATED ARRIVAL</th>
            <th>FLOOR ACCESS</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Table body
    const tbody = document.createElement('tbody');
    guestList.forEach((guest, index) => {
        const row = document.createElement('tr');
        
        // Handle both old single floor format and new multi-floor format
        const floorsDisplay = Array.isArray(guest.floors) 
            ? guest.floors.join(', ') 
            : guest.floor || guest.floors;
        
        // Organization display
        const organizationDisplay = guest.organization || 'N/A';
        
        // Arrival time display
        const arrivalTime = guest.estimatedArrival || 'Not specified';
        
        // Check-in checkbox with unique ID
        const dateKey = formatDateKey(currentDate);
        const checkboxId = `checkin-${dateKey}-${index}`;
        const isChecked = guest.checkedIn ? 'checked' : '';
        
        row.innerHTML = `
            <td><input type="checkbox" id="${checkboxId}" class="checkin-checkbox" ${isChecked} onchange="handleCheckInChange('${dateKey}', ${index}, this.checked)"></td>
            <td>${escapeHtml(guest.name)}</td>
            <td>${escapeHtml(organizationDisplay)}</td>
            <td>${arrivalTime}</td>
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

// Handle check-in status change
async function handleCheckInChange(dateKey, guestIndex, isChecked) {
    try {
        console.log('Updating check-in status:', { dateKey, guestIndex, isChecked });
        
        // Update local data immediately for responsive UI
        if (!guests[dateKey] || !guests[dateKey][guestIndex]) {
            console.error('Guest not found in local data');
            return;
        }
        
        const guest = guests[dateKey][guestIndex];
        const previousStatus = guest.checkedIn;
        guest.checkedIn = isChecked;
        
        // Update localStorage as backup
        localStorage.setItem('guestData', JSON.stringify(guests));
        
        // Update backend if guest has ID (from Supabase)
        if (guest.id) {
            try {
                await updateGuestCheckInStatus(guest.id, isChecked);
                console.log('Successfully updated guest check-in status in database');
            } catch (error) {
                console.error('Failed to update database:', error);
                
                // Revert local change if database update failed
                guest.checkedIn = previousStatus;
                localStorage.setItem('guestData', JSON.stringify(guests));
                
                // Revert checkbox state
                const checkbox = document.getElementById(`checkin-${dateKey}-${guestIndex}`);
                if (checkbox) {
                    checkbox.checked = previousStatus;
                }
                
                alert('Failed to update check-in status. Please try again.');
                return;
            }
        } else {
            console.warn('Guest has no ID - local-only guest, not synced to database');
        }
        
        // Refresh display to show any updated indicators
        updateDashboard();
        
    } catch (error) {
        console.error('Error updating check-in status:', error);
        alert('Error updating check-in status. Please try again.');
    }
}

// Update guest check-in status in Supabase
async function updateGuestCheckInStatus(guestId, checkedIn) {
    try {
        console.log('Updating guest check-in status in Supabase:', { guestId, checkedIn });
        
        // Try with regular client first, then admin client if needed
        let result;
        try {
            result = await window.supabaseClient
                .from('guests')
                .update({ checked_in: checkedIn })
                .eq('id', guestId);
        } catch (rlsError) {
            console.log('Regular client failed for update, trying admin client:', rlsError.message);
            
            // If admin client is available, use it as fallback
            if (window.supabaseAdminClient) {
                result = await window.supabaseAdminClient
                    .from('guests')
                    .update({ checked_in: checkedIn })
                    .eq('id', guestId);
            } else {
                throw rlsError;
            }
        }
        
        if (result.error) {
            throw result.error;
        }
        
        console.log('Guest check-in status updated successfully');
        return result;
        
    } catch (error) {
        console.error('Error updating guest check-in status in Supabase:', error);
        throw error;
    }
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