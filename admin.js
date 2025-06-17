// Global state
let currentDate = new Date();
let selectedDate = null;
let guests = {}; // Will be loaded from Supabase

// DOM elements
const calendarGrid = document.getElementById('calendarGrid');
const monthYearEl = document.getElementById('monthYear');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const guestPanel = document.getElementById('guestPanel');
const panelDateEl = document.getElementById('panelDate');
const panelTitleEl = document.getElementById('panelTitle');
const existingGuestsListEl = document.getElementById('existingGuestsList');
const guestForm = document.getElementById('guestForm');
const guestNameInput = document.getElementById('guestName');
const guestOrganizationInput = document.getElementById('guestOrganization');
const estimatedArrivalInput = document.getElementById('estimatedArrival');
const floorAccessInput = document.getElementById('floorAccess');
const cancelBtn = document.getElementById('cancelBtn');
const closePanelBtn = document.getElementById('closePanelBtn');
const securityBtn = document.getElementById('securityBtn');
const userManagementBtn = document.getElementById('userManagementBtn');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserEl = document.getElementById('currentUser');

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuthentication();
    await displayCurrentUser();
    await setupRoleBasedUI();
    initializeNavigation();
    await loadGuestsData();
    renderCalendar();
    initializePanel();
});

// Authentication check
async function checkAuthentication() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Check if user has admin or manager permissions
    const userRole = user.user_metadata?.access_level || 'user';
    if (userRole !== 'admin' && userRole !== 'manager') {
        alert('Access denied. Admin or Manager privileges required.');
        window.location.href = 'index.html';
        return;
    }
}

// Setup role-based UI elements
async function setupRoleBasedUI() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;
    
    const userRole = user.user_metadata?.access_level || 'user';
    const userManagementBtn = document.getElementById('userManagementBtn');
    const roleInfoEl = document.getElementById('roleInfo');
    
    // USER MANAGEMENT button: ONLY visible to ADMIN users
    if (userRole === 'admin') {
        // Admin: Show USER MANAGEMENT button
        if (userManagementBtn) {
            userManagementBtn.style.display = 'inline-block';
        }
        if (roleInfoEl) {
            roleInfoEl.style.display = 'none';
        }
    } else {
        // Manager/Other: Hide USER MANAGEMENT button completely
        if (userManagementBtn) {
            userManagementBtn.style.display = 'none';
        }
        
        // Show role info for managers
        if (userRole === 'manager' && roleInfoEl) {
            roleInfoEl.style.display = 'block';
        }
    }
}

// Display current user information
async function displayCurrentUser() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (user) {
        // Try to get user info from profiles table first
        let fullName = 'Unknown User';
        let userRole = 'user';
        
        try {
            const { data: profile } = await window.supabaseClient
                .from('profiles')
                .select('full_name, access_level')
                .eq('id', user.id)
                .single();
            
            if (profile) {
                fullName = profile.full_name || user.user_metadata?.full_name || 'Unknown User';
                userRole = profile.access_level || user.user_metadata?.access_level || 'user';
            }
        } catch (profileError) {
            console.log('Could not fetch profile, using auth metadata:', profileError);
            // Fallback to auth metadata
            fullName = user.user_metadata?.full_name || 'Unknown User';
            userRole = user.user_metadata?.access_level || 'user';
        }
        
        // Display: "Full Name (email@domain.com)"
        currentUserEl.textContent = `${fullName} (${user.email})`;
        
        // Update page title based on role
        const pageTitleEl = document.querySelector('.page-title');
        if (pageTitleEl) {
            if (userRole === 'admin') {
                pageTitleEl.textContent = 'ADMIN PANEL';
            } else if (userRole === 'manager') {
                pageTitleEl.textContent = 'MANAGER PANEL';
            }
        }
    }
}

// Navigation functionality
function initializeNavigation() {
    securityBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // Only add click listener if button exists (for admins)
    if (userManagementBtn) {
        userManagementBtn.addEventListener('click', async () => {
            // Double-check admin status before navigation
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            const userRole = user?.user_metadata?.access_level || 'user';
            
            if (userRole === 'admin') {
                window.location.href = 'admin-users.html';
            } else {
                alert('Access denied. Admin privileges required for user management.');
            }
        });
    }
    
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            logout();
        }
    });
}

// Logout functionality
async function logout() {
    try {
        const { error } = await window.supabaseClient.auth.signOut();
        
        if (error) {
            console.error('Error logging out:', error);
        }
    } catch (e) {
        console.error('Error during logout:', e);
    } finally {
        // Redirect to login page regardless
        window.location.href = 'login.html';
    }
}

// Supabase guest management functions
async function loadGuestsData() {
    try {
        console.log('Loading guests data from Supabase...');
        
        // Try with regular client first, then admin client
        let result;
        try {
            result = await window.supabaseClient
                .from('guests')
                .select('id, name, organization, estimated_arrival, checked_in, visit_date, floors, created_by, created_at, updated_at')
                .order('visit_date', { ascending: true });
        } catch (rlsError) {
            console.log('Regular client failed for loading, trying admin client:', rlsError.message);
            result = await window.supabaseAdminClient
                .from('guests')
                .select('id, name, organization, estimated_arrival, checked_in, visit_date, floors, created_by, created_at, updated_at')
                .order('visit_date', { ascending: true });
        }
        
        const { data: guestData, error } = result;
        
        if (error) {
            console.error('Error loading guests:', error);
            // Fall back to localStorage if Supabase fails
            guests = JSON.parse(localStorage.getItem('guestData')) || {};
            return;
        }
        
        // Convert Supabase data to the expected format
        guests = {};
        guestData.forEach(guest => {
            const dateKey = guest.visit_date; // Already in YYYY-MM-DD format
            if (!guests[dateKey]) {
                guests[dateKey] = [];
            }
            guests[dateKey].push({
                id: guest.id, // Store Supabase ID for deletion
                name: guest.name,
                organization: guest.organization,
                estimatedArrival: guest.estimated_arrival,
                checkedIn: guest.checked_in,
                floors: guest.floors,
                timestamp: guest.created_at
            });
        });
        
        console.log('Loaded guests from Supabase:', guests);
        
    } catch (error) {
        console.error('Error loading guests data:', error);
        // Fall back to localStorage
        guests = JSON.parse(localStorage.getItem('guestData')) || {};
    }
}

async function saveGuestToSupabase(guestName, organization, estimatedArrival, floors, visitDate) {
    try {
        console.log('Attempting to save guest to Supabase:', { guestName, organization, estimatedArrival, floors, visitDate });
        
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        console.log('Current authenticated user:', user);
        
        if (!user) {
            throw new Error('User not authenticated');
        }
        
        // Try inserting the guest with regular client first
        const insertData = {
            name: guestName,
            organization: organization || null,
            estimated_arrival: estimatedArrival,
            visit_date: visitDate, // Should be in YYYY-MM-DD format
            floors: floors,
            checked_in: false, // Default to not checked in
            created_by: user.id
        };
        
        console.log('Inserting guest data:', insertData);
        
        let result;
        
        try {
            // Try with regular client (follows RLS policies)
            result = await window.supabaseClient
                .from('guests')
                .insert(insertData)
                .select()
                .single();
        } catch (rlsError) {
            console.log('Regular client failed, trying with admin client:', rlsError.message);
            
            // If RLS fails, try with admin client (bypasses RLS)
            result = await window.supabaseAdminClient
                .from('guests')
                .insert(insertData)
                .select()
                .single();
        }
        
        const { data, error } = result;
        
        if (error) {
            console.error('Supabase insert error:', error);
            throw error;
        }
        
        console.log('Guest saved to Supabase successfully:', data);
        return data;
        
    } catch (error) {
        console.error('Error saving guest to Supabase:', error);
        console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        throw error;
    }
}

async function deleteGuestFromSupabase(guestId) {
    try {
        console.log('Deleting guest from Supabase:', guestId);
        
        // Try with regular client first, then admin client
        let result;
        try {
            result = await window.supabaseClient
                .from('guests')
                .delete()
                .eq('id', guestId);
        } catch (rlsError) {
            console.log('Regular client failed for deletion, trying admin client:', rlsError.message);
            result = await window.supabaseAdminClient
                .from('guests')
                .delete()
                .eq('id', guestId);
        }
        
        const { error } = result;
        
        if (error) {
            throw error;
        }
        
        console.log('Guest deleted from Supabase successfully:', guestId);
        
    } catch (error) {
        console.error('Error deleting guest from Supabase:', error);
        throw error;
    }
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
        dayEl.addEventListener('click', () => openGuestPanel(dayDate));
        
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

// Panel functionality
function initializePanel() {
    // Clear form when cancel button is clicked
    cancelBtn.addEventListener('click', () => {
        guestForm.reset();
    });
    
    // Close panel when close button is clicked
    closePanelBtn.addEventListener('click', closeGuestPanel);
    
    // Submit form to add guest
    guestForm.addEventListener('submit', handleGuestSubmit);
    
    // Close panel when pressing Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !guestPanel.classList.contains('hidden')) {
            closeGuestPanel();
        }
    });
}

function openGuestPanel(date) {
    selectedDate = date;
    const dateString = formatPanelDate(date);
    panelDateEl.textContent = dateString;
    panelTitleEl.textContent = 'MANAGE GUESTS';
    
    // Show existing guests for this date
    displayExistingGuests(date);
    
    // Reset form
    guestForm.reset();
    
    // Show panel with smooth animation
    guestPanel.classList.remove('hidden');
    
    // Scroll panel into view
    setTimeout(() => {
        guestPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        guestNameInput.focus();
    }, 200);
}

function closeGuestPanel() {
    guestPanel.classList.add('hidden');
    selectedDate = null;
    guestForm.reset();
}

function formatPanelDate(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${dayName}, ${monthName} ${day}, ${year}`;
}

async function handleGuestSubmit(e) {
    e.preventDefault();
    
    if (!selectedDate) return;
    
    const guestName = guestNameInput.value.trim();
    const guestOrganization = guestOrganizationInput.value.trim();
    const estimatedArrival = estimatedArrivalInput.value;
    const floorAccessText = floorAccessInput.value.trim();
    
    if (!guestName || !estimatedArrival || !floorAccessText) {
        alert('Please fill in all required fields (Name, Estimated Arrival, Floor Access).');
        return;
    }
    
    // Parse floor access (support comma-separated and ranges)
    const floors = parseFloorAccess(floorAccessText);
    if (floors.length === 0) {
        alert('Please enter valid floor numbers (e.g., "1,3,5" or "2-4,7").');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = guestForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;
        
        // Save to Supabase
        const dateKey = formatDateKey(selectedDate);
        const savedGuest = await saveGuestToSupabase(guestName, guestOrganization, estimatedArrival, floors, dateKey);
        
        // Add to local data
        if (!guests[dateKey]) {
            guests[dateKey] = [];
        }
        
        guests[dateKey].push({
            id: savedGuest.id, // Store Supabase ID
            name: guestName,
            organization: guestOrganization,
            estimatedArrival: estimatedArrival,
            checkedIn: false,
            floors: floors,
            timestamp: savedGuest.created_at
        });
        
        // Also save to localStorage as backup
        localStorage.setItem('guestData', JSON.stringify(guests));
        
        // Update the modal to show new guest
        displayExistingGuests(selectedDate);
        
        // Reset form but keep modal open
        guestForm.reset();
        
        // Update calendar
        renderCalendar();
        
        // Restore button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Error saving guest:', error);
        alert('Error saving guest. Please try again.');
        
        // Restore button state
        const submitBtn = guestForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'ADD GUEST';
        submitBtn.disabled = false;
    }
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
            
            // Format arrival time
            const arrivalTime = guest.estimatedArrival ? guest.estimatedArrival : 'Not specified';
            
            // Organization display
            const organizationDisplay = guest.organization ? `<div class="guest-organization">Organization: ${escapeHtml(guest.organization)}</div>` : '';
            
            // Check-in status
            const checkInStatus = guest.checkedIn ?
                '<span class="check-in-status checked-in">Checked In</span>' :
                '<span class="check-in-status not-checked-in">Not Checked In</span>';
            
            // Check-in button
            const checkInButton = guest.checkedIn ? 
                `<button class="check-out-guest" onclick="toggleCheckIn('${dateKey}', ${index})">CHECK OUT</button>` :
                `<button class="check-in-guest" onclick="toggleCheckIn('${dateKey}', ${index})">CHECK IN</button>`;
            
            return `
                <div class="guest-item">
                    <div class="guest-info">
                        <div class="guest-name">${escapeHtml(guest.name)}</div>
                        <div class="guest-status">${checkInStatus}</div>
                        ${organizationDisplay}
                        <div class="guest-arrival">Estimated Arrival: ${arrivalTime}</div>
                        <div class="guest-floors">Floors: ${floorsDisplay}</div>
                    </div>
                    <div class="guest-actions">
                        ${checkInButton}
                        <button class="delete-guest" onclick="deleteGuest('${dateKey}', ${index})">DELETE</button>
                    </div>
                </div>
            `;
        }).join('');
        
        existingGuestsListEl.innerHTML = guestItems;
    }
}

// Toggle check-in status for a guest
async function toggleCheckIn(dateKey, guestIndex) {
    try {
        const guest = guests[dateKey][guestIndex];
        const newCheckedInStatus = !guest.checkedIn;
        
        // Update in Supabase if guest has ID
        if (guest.id) {
            await updateGuestCheckInStatus(guest.id, newCheckedInStatus);
        }
        
        // Update local data
        guests[dateKey][guestIndex].checkedIn = newCheckedInStatus;
        
        // Save to localStorage as backup
        localStorage.setItem('guestData', JSON.stringify(guests));
        
        // Update display
        displayExistingGuests(selectedDate);
        
    } catch (error) {
        console.error('Error updating check-in status:', error);
        alert('Error updating check-in status. Please try again.');
    }
}

// Update guest check-in status in Supabase
async function updateGuestCheckInStatus(guestId, checkedIn) {
    try {
        console.log('Updating guest check-in status:', { guestId, checkedIn });
        
        // Try with regular client first, then admin client
        let result;
        try {
            result = await window.supabaseClient
                .from('guests')
                .update({ checked_in: checkedIn })
                .eq('id', guestId);
        } catch (rlsError) {
            console.log('Regular client failed for update, trying admin client:', rlsError.message);
            result = await window.supabaseAdminClient
                .from('guests')
                .update({ checked_in: checkedIn })
                .eq('id', guestId);
        }
        
        const { error } = result;
        
        if (error) {
            throw error;
        }
        
        console.log('Guest check-in status updated successfully');
        
    } catch (error) {
        console.error('Error updating guest check-in status in Supabase:', error);
        throw error;
    }
}

// Delete a guest
async function deleteGuest(dateKey, guestIndex) {
    if (!confirm('Are you sure you want to delete this guest?')) {
        return;
    }
    
    try {
        const guest = guests[dateKey][guestIndex];
        
        // If guest has Supabase ID, delete from Supabase
        if (guest.id) {
            await deleteGuestFromSupabase(guest.id);
        }
        
        // Remove from local data
        guests[dateKey].splice(guestIndex, 1);
        
        // Remove the date entry if no guests left
        if (guests[dateKey].length === 0) {
            delete guests[dateKey];
        }
        
        // Save to localStorage as backup
        localStorage.setItem('guestData', JSON.stringify(guests));
        
        // Update display
        displayExistingGuests(selectedDate);
        renderCalendar();
        
    } catch (error) {
        console.error('Error deleting guest:', error);
        alert('Error deleting guest. Please try again.');
    }
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

// Make toggleCheckIn available globally for onclick handlers
window.toggleCheckIn = toggleCheckIn;

// Debug function - call this from browser console to test guest creation
window.debugGuestCreation = async function() {
    console.log('=== DEBUG: Testing Guest Creation ===');
    
    // Test authentication
    console.log('1. Testing authentication...');
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    console.log('Auth result:', { user, authError });
    
    if (!user) {
        console.log('❌ User not authenticated! Try logging in first.');
        return;
    }
    
    // Check user profile and permissions
    console.log('2. Checking user profile...');
    try {
        const { data: profile, error: profileError } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        console.log('User profile:', { profile, profileError });
        
        if (!profile) {
            console.log('⚠️ No profile found for user. This might be the issue!');
        } else {
            console.log(`✅ User profile found. Access level: ${profile.access_level}`);
        }
    } catch (profileError) {
        console.log('❌ Error fetching profile:', profileError);
    }
    
    // Test guest creation
    console.log('3. Testing guest creation...');
    try {
        const testGuest = await saveGuestToSupabase('Debug Test Guest', [1, 2, 3], '2024-12-15');
        console.log('✅ Guest creation successful:', testGuest);
    } catch (error) {
        console.log('❌ Guest creation failed:', error);
    }
    
    // Test loading guests
    console.log('4. Testing guest loading...');
    try {
        await loadGuestsData();
        console.log('✅ Guest loading successful. Current guests:', guests);
    } catch (error) {
        console.log('❌ Guest loading failed:', error);
    }
    
    console.log('=== DEBUG COMPLETE ===');
}; 