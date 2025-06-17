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
        
        // Show dashboard immediately with today's date (no guest data yet)
        const loadingSpinner = document.getElementById('loadingSpinner');
        const dashboardContent = document.getElementById('dashboardContent');
        
        // Show dashboard content immediately to improve perceived loading time
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
        if (dashboardContent) {
            dashboardContent.style.display = 'block';
        }
        
        // Set current date and render UI immediately
        currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
        // Check if DOM elements exist
        if (!currentDateEl) {
            console.error('currentDateEl not found!');
            return;
        }
        
        // Initialize UI components immediately (non-async)
        initializeDateNavigation();
        initializeNavigation();
        updateDashboard(); // Show empty dashboard immediately
        initializeRealTimeSync();
        
        // Run authentication and data loading in parallel
        const authPromise = checkQuickAuth();
        const guestsPromise = loadGuestsFromSupabase();
        const statusPromise = checkAuthenticationStatus();
        
        // Wait for auth check first (fastest operation)
        const user = await authPromise;
        if (!user) {
            console.log('User not authenticated, redirecting to login...');
            window.location.href = 'login.html';
            return;
        }
        
        // Wait for remaining operations
        await Promise.all([guestsPromise, statusPromise]);
        
        // Update dashboard with loaded data
        updateDashboard();
        
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        // On error, redirect to login page
        window.location.href = 'login.html';
    }
});

// Quick authentication check (faster than full profile lookup)
async function checkQuickAuth() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        return user;
    } catch (error) {
        console.error('Quick auth check failed:', error);
        return null;
    }
}

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
            // Check user role and approval status
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
            } catch (profileError) {
                console.log('Could not fetch profile, using auth metadata:', profileError);
                // Fallback to auth metadata
                userRole = user.user_metadata?.access_level || 'user';
                isApproved = false;
            }
            
            // Check if user is approved
            if (!isApproved) {
                window.location.href = 'pending-approval.html';
                return;
            }
            
            // Allow approved admin and user to access guest dashboard (guest management)
            if (userRole === 'admin' || userRole === 'user') {
                window.location.href = 'admin.html';
            } else {
                alert('Access denied. Please contact your administrator.');
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

// Check authentication status and show/hide buttons based on user role
async function checkAuthenticationStatus() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (user) {
            // User is logged in, show logout button
            logoutBtn.style.display = 'inline-block';
            
            // Check user role and approval status to determine admin button visibility
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
            } catch (profileError) {
                console.log('Could not fetch profile for button visibility, using auth metadata:', profileError);
                // Fallback to auth metadata
                userRole = user.user_metadata?.access_level || 'user';
                isApproved = false;
            }
            
            // Show admin button only for approved admin and user accounts
            if (isApproved && (userRole === 'admin' || userRole === 'user')) {
                adminBtn.style.display = 'inline-block';
            } else {
                // Hide admin button for unapproved users
                adminBtn.style.display = 'none';
            }
        } else {
            // User is not logged in, hide logout button and show admin button (for login access)
            logoutBtn.style.display = 'none';
            adminBtn.style.display = 'inline-block';
        }
    } catch (error) {
        console.error('Error checking authentication status:', error);
        logoutBtn.style.display = 'none';
        adminBtn.style.display = 'inline-block';
    }
}

// Custom Logout Modal Functions
function showLogoutModal() {
    const modal = document.getElementById('logoutModal');
    modal.classList.add('show');
    
    // Set up event listeners for modal buttons
    const confirmBtn = document.getElementById('logoutConfirmBtn');
    const cancelBtn = document.getElementById('logoutCancelBtn');
    
    // Remove any existing listeners to prevent duplicates
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    
    // Add fresh event listeners
    document.getElementById('logoutConfirmBtn').addEventListener('click', async () => {
        hideLogoutModal();
        await performLogout();
    });
    
    document.getElementById('logoutCancelBtn').addEventListener('click', hideLogoutModal);
    
    // Close modal on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideLogoutModal();
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', handleEscapeKey);
}

function hideLogoutModal() {
    const modal = document.getElementById('logoutModal');
    modal.classList.remove('show');
    document.removeEventListener('keydown', handleEscapeKey);
}

function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        hideLogoutModal();
    }
}

// Handle logout functionality
async function handleLogout() {
    showLogoutModal();
}

async function performLogout() {
    try {
        // Sign out from Supabase
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) {
            console.error('Error logging out:', error);
            alert('Error logging out. Please try again.');
            return;
        }

        // Hide logout button
        logoutBtn.style.display = 'none';
        
        // Redirect to login page instead of showing alert and reloading
        window.location.href = 'login.html';
        
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
                .select(`
                    id, name, organization, estimated_arrival, checked_in, visit_date, floors, created_by, created_at, updated_at,
                    creator:profiles!created_by(full_name, username)
                `)
                .gte('visit_date', startDateStr)
                .lte('visit_date', endDateStr)
                .order('visit_date', { ascending: true });
        } catch (rlsError) {
            console.log('Regular client failed for loading guests, trying admin client:', rlsError.message);
            
            if (window.supabaseAdminClient) {
                result = await window.supabaseAdminClient
                    .from('guests')
                    .select(`
                        id, name, organization, estimated_arrival, checked_in, visit_date, floors, created_by, created_at, updated_at,
                        creator:profiles!created_by(full_name, username)
                    `)
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
            
            // Get creator information
            let guestOf = 'Unknown';
            if (guest.creator) {
                // Use full_name if available, otherwise fallback to username
                guestOf = guest.creator.full_name || guest.creator.username || 'Unknown';
            }
            
            supabaseGuests[dateKey].push({
                id: guest.id,
                name: guest.name,
                organization: guest.organization,
                estimatedArrival: guest.estimated_arrival,
                checkedIn: guest.checked_in,
                floors: guest.floors,
                guestOf: guestOf,
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
    
    const dateKey = formatDateKey(currentDate);
    
    // Build table HTML as string for faster rendering
    let tableHTML = `
        <table class="guest-table">
            <thead>
                <tr>
                    <th>ARRIVED</th>
                    <th>GUEST NAME</th>
                    <th>ORGANIZATION</th>
                    <th>ESTIMATED ARRIVAL</th>
                    <th>GUEST OF</th>
                    <th>FLOOR ACCESS</th>
                </tr>
            </thead>
            <tbody>`;
    
    // Build all rows as HTML string
    guestList.forEach((guest, index) => {
        // Handle both old single floor format and new multi-floor format
        const floorsDisplay = Array.isArray(guest.floors) 
            ? guest.floors.join(', ') 
            : guest.floor || guest.floors;
        
        // Organization display
        const organizationDisplay = guest.organization || 'N/A';
        
        // Arrival time display
        const arrivalTime = guest.estimatedArrival ? formatTimeWithoutSeconds(guest.estimatedArrival) : 'Not specified';
        
        // Guest of display
        const guestOfDisplay = guest.guestOf || 'Unknown';
        
        // Check-in checkbox with unique ID
        const checkboxId = `checkin-${dateKey}-${index}`;
        const isChecked = guest.checkedIn ? 'checked' : '';
        
        tableHTML += `
            <tr>
                <td><input type="checkbox" id="${checkboxId}" class="checkin-checkbox" ${isChecked} data-date-key="${dateKey}" data-guest-index="${index}"></td>
                <td>${escapeHtml(guest.name)}</td>
                <td>${escapeHtml(organizationDisplay)}</td>
                <td>${arrivalTime}</td>
                <td>${escapeHtml(guestOfDisplay)}</td>
                <td>${floorsDisplay}</td>
            </tr>`;
    });
    
    tableHTML += `</tbody></table>`;
    
    // Set all HTML at once (much faster than appendChild)
    guestListEl.innerHTML = tableHTML;
    
    // Add event listeners only to checkboxes
    const checkboxes = guestListEl.querySelectorAll('.checkin-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const dateKey = this.getAttribute('data-date-key');
            const guestIndex = parseInt(this.getAttribute('data-guest-index'));
            handleCheckInChange(dateKey, guestIndex, this.checked);
        });
    });
}

// Utility functions
function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTimeWithoutSeconds(timeString) {
    if (!timeString) return timeString;
    
    // If the time string includes seconds (HH:MM:SS), remove them
    if (timeString.includes(':')) {
        const parts = timeString.split(':');
        if (parts.length >= 2) {
            return `${parts[0]}:${parts[1]}`;
        }
    }
    
    return timeString;
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