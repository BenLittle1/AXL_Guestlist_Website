// Global state
let currentDate = new Date();
let selectedDate = null;
let guests = {}; // Will be loaded from Supabase

// Multi-day calendar state
let miniCalendarDate = new Date();
let additionalSelectedDates = new Set(); // Set of date strings (YYYY-MM-DD)
let isMultiDayCalendarOpen = false;

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

// Multi-day calendar DOM elements
const toggleMultiDayCalendarBtn = document.getElementById('toggleMultiDayCalendar');
const toggleIcon = document.getElementById('toggleIcon');
const selectedDatesDisplay = document.getElementById('selectedDatesDisplay');
const multiDayCalendar = document.getElementById('multiDayCalendar');
const miniCalendarGrid = document.getElementById('miniCalendarGrid');
const miniMonthYearEl = document.getElementById('miniMonthYear');
const miniPrevMonthBtn = document.getElementById('miniPrevMonth');
const miniNextMonthBtn = document.getElementById('miniNextMonth');
const clearDatesBtn = document.getElementById('clearDates');
const confirmDatesBtn = document.getElementById('confirmDates');

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    // Show calendar immediately with current date (no guest data yet)
    renderCalendar();
    
    // Run async operations in parallel for faster loading
    const authPromise = checkAuthentication();
    const userPromise = displayCurrentUser();
    const rolePromise = setupRoleBasedUI();
    const guestsPromise = loadGuestsData();
    
    // Initialize non-async components immediately
    initializeNavigation();
    initializePanel();
    initializeMultiDayCalendar();
    
    // Wait for all async operations to complete
    await Promise.all([authPromise, userPromise, rolePromise, guestsPromise]);
    
    // Re-render calendar with guest data
    renderCalendar();
});

// Authentication check
async function checkAuthentication() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Check if user has appropriate permissions and is approved
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
            // If no profile, user is likely unapproved
            isApproved = false;
        }
    } catch (profileError) {
        console.log('Could not fetch profile for auth check, using auth metadata:', profileError);
        // Fallback to auth metadata
        userRole = user.user_metadata?.access_level || 'user';
        isApproved = false; // Assume unapproved if we can't check
    }
    
    // Check if user is approved
    if (!isApproved) {
        window.location.href = 'pending-approval.html';
        return;
    }
    
    // Users now have guest management access, admins have full access
    if (userRole !== 'admin' && userRole !== 'user') {
        alert('Access denied. User account required.');
        window.location.href = 'pending-approval.html';
        return;
    }
}

// Setup role-based UI elements
async function setupRoleBasedUI() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;
    
    // Get user role - try profiles table first, then fallback to user_metadata
    let userRole = 'user';
    
    try {
        const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('access_level, approved')
            .eq('id', user.id)
            .single();
        
        if (profile) {
            userRole = profile.access_level || 'user';
        } else {
            // Fallback to auth metadata
            userRole = user.user_metadata?.access_level || 'user';
        }
    } catch (profileError) {
        console.log('Could not fetch profile for UI setup, using auth metadata:', profileError);
        // Fallback to auth metadata
        userRole = user.user_metadata?.access_level || 'user';
    }
    
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
        // Users: Hide USER MANAGEMENT button completely, no role info needed
        if (userManagementBtn) {
            userManagementBtn.style.display = 'none';
        }
        if (roleInfoEl) {
            roleInfoEl.style.display = 'none';
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
                pageTitleEl.textContent = 'GUEST DASHBOARD';
            } else {
                pageTitleEl.textContent = 'GUEST MANAGEMENT';
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
            
            // Get user role - try profiles table first, then fallback to user_metadata
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
                    userRole = user?.user_metadata?.access_level || 'user';
                    isApproved = false;
                }
            } catch (profileError) {
                console.log('Could not fetch profile for navigation check, using auth metadata:', profileError);
                // Fallback to auth metadata
                userRole = user?.user_metadata?.access_level || 'user';
                isApproved = false;
            }
            
            if (!isApproved) {
                window.location.href = 'pending-approval.html';
                return;
            }
            
            if (userRole === 'admin') {
                window.location.href = 'admin-users.html';
            } else {
                alert('Access denied. Admin privileges required for user management.');
            }
        });
    }
    
    logoutBtn.addEventListener('click', () => {
        showLogoutModal();
    });
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
    document.getElementById('logoutConfirmBtn').addEventListener('click', () => {
        hideLogoutModal();
        logout();
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
                .select(`
                    id, name, organization, estimated_arrival, checked_in, visit_date, floors, created_by, created_at, updated_at,
                    creator:profiles!created_by(full_name, username)
                `)
                .order('visit_date', { ascending: true });
        } catch (rlsError) {
            console.log('Regular client failed for loading, trying admin client:', rlsError.message);
            result = await window.supabaseAdminClient
                .from('guests')
                .select(`
                    id, name, organization, estimated_arrival, checked_in, visit_date, floors, created_by, created_at, updated_at,
                    creator:profiles!created_by(full_name, username)
                `)
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
            // Get creator information
            let guestOf = 'Unknown';
            if (guest.creator) {
                // Use full_name if available, otherwise fallback to username
                guestOf = guest.creator.full_name || guest.creator.username || 'Unknown';
            }
            
            guests[dateKey].push({
                id: guest.id, // Store Supabase ID for deletion
                name: guest.name,
                organization: guest.organization,
                estimatedArrival: guest.estimated_arrival,
                checkedIn: guest.checked_in,
                floors: guest.floors,
                guestOf: guestOf,
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
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Build calendar HTML as string for faster rendering
    let calendarHTML = '';
    
    // Add previous month's trailing days
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const dayNum = daysInPrevMonth - i;
        calendarHTML += `<div class="calendar-day other-month">${dayNum}</div>`;
    }
    
    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        const dateKey = formatDateKey(dayDate);
        
        let classes = 'calendar-day';
        
        // Mark today
        if (isSameDay(dayDate, today)) {
            classes += ' today';
        }
        
        // Mark days with guests
        if (guests[dateKey] && guests[dateKey].length > 0) {
            classes += ' has-guests';
        }
        
        calendarHTML += `<div class="${classes}" data-date="${dateKey}">${day}</div>`;
    }
    
    // Add next month's leading days
    const currentCells = startingDayOfWeek + daysInMonth;
    const remainingCells = 42 - currentCells; // 6 rows × 7 days
    
    for (let day = 1; day <= remainingCells; day++) {
        calendarHTML += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    // Set all HTML at once (much faster than appendChild)
    calendarGrid.innerHTML = calendarHTML;
    
    // Add click handlers only to current month days
    const currentMonthDays = calendarGrid.querySelectorAll('.calendar-day:not(.other-month)');
    currentMonthDays.forEach(dayEl => {
        const dateKey = dayEl.getAttribute('data-date');
        const date = new Date(dateKey + 'T00:00:00');
        dayEl.addEventListener('click', () => openGuestPanel(date));
    });
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

// Multi-day calendar functionality
function initializeMultiDayCalendar() {
    // Toggle multi-day calendar visibility
    toggleMultiDayCalendarBtn.addEventListener('click', toggleMultiDayCalendar);
    
    // Mini calendar navigation
    miniPrevMonthBtn.addEventListener('click', () => {
        miniCalendarDate.setMonth(miniCalendarDate.getMonth() - 1);
        renderMiniCalendar();
    });
    
    miniNextMonthBtn.addEventListener('click', () => {
        miniCalendarDate.setMonth(miniCalendarDate.getMonth() + 1);
        renderMiniCalendar();
    });
    
    // Action buttons
    clearDatesBtn.addEventListener('click', clearAllSelectedDates);
    confirmDatesBtn.addEventListener('click', confirmDateSelection);
    
    // Initialize mini calendar and display
    renderMiniCalendar();
    updateSelectedDatesDisplay();
}

function toggleMultiDayCalendar() {
    isMultiDayCalendarOpen = !isMultiDayCalendarOpen;
    
    if (isMultiDayCalendarOpen) {
        multiDayCalendar.classList.remove('hidden');
        toggleMultiDayCalendarBtn.classList.add('expanded');
        toggleIcon.textContent = '×';
        // Reset mini calendar to current month when opening
        miniCalendarDate = new Date(selectedDate || new Date());
        renderMiniCalendar();
    } else {
        multiDayCalendar.classList.add('hidden');
        toggleMultiDayCalendarBtn.classList.remove('expanded');
        toggleIcon.textContent = '+';
    }
}

function renderMiniCalendar() {
    updateMiniMonthYear();
    renderMiniCalendarGrid();
}

function updateMiniMonthYear() {
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                   'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    
    const monthName = months[miniCalendarDate.getMonth()];
    const year = miniCalendarDate.getFullYear();
    miniMonthYearEl.textContent = `${monthName} ${year}`;
}

function renderMiniCalendarGrid() {
    miniCalendarGrid.innerHTML = '';
    
    const year = miniCalendarDate.getFullYear();
    const month = miniCalendarDate.getMonth();
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
        const dayEl = createMiniCalendarDay(dayNum, true);
        miniCalendarGrid.appendChild(dayEl);
    }
    
    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = createMiniCalendarDay(day, false);
        const dayDate = new Date(year, month, day);
        const dateKey = formatDateKey(dayDate);
        
        // Mark the primary date (the date that was clicked to open the panel)
        if (selectedDate && isSameDay(dayDate, selectedDate)) {
            dayEl.classList.add('primary-date');
        }
        
        // Mark selected additional dates
        if (additionalSelectedDates.has(dateKey)) {
            dayEl.classList.add('selected');
        }
        
        // Disable past dates
        if (dayDate < today.setHours(0, 0, 0, 0)) {
            dayEl.classList.add('disabled');
        } else {
            // Add click handler for future dates
            dayEl.addEventListener('click', () => toggleDateSelection(dayDate, dayEl));
        }
        
        miniCalendarGrid.appendChild(dayEl);
    }
    
    // Add next month's leading days
    const totalCells = miniCalendarGrid.children.length;
    const remainingCells = 42 - totalCells; // 6 rows × 7 days
    
    for (let day = 1; day <= remainingCells; day++) {
        const dayEl = createMiniCalendarDay(day, true);
        miniCalendarGrid.appendChild(dayEl);
    }
}

function createMiniCalendarDay(dayNum, isOtherMonth) {
    const dayEl = document.createElement('div');
    dayEl.className = 'mini-calendar-day';
    dayEl.textContent = dayNum;
    
    if (isOtherMonth) {
        dayEl.classList.add('other-month');
    }
    
    return dayEl;
}

function toggleDateSelection(date, dayEl) {
    const dateKey = formatDateKey(date);
    
    // Don't allow selecting the primary date (it's already selected)
    if (selectedDate && isSameDay(date, selectedDate)) {
        return;
    }
    
    if (additionalSelectedDates.has(dateKey)) {
        additionalSelectedDates.delete(dateKey);
        dayEl.classList.remove('selected');
    } else {
        additionalSelectedDates.add(dateKey);
        dayEl.classList.add('selected');
    }
    
    updateSelectedDatesDisplay();
}

function updateSelectedDatesDisplay() {
    if (additionalSelectedDates.size === 0) {
        selectedDatesDisplay.innerHTML = '<em style="color: #64748b; font-size: 13px;">No additional dates selected</em>';
        return;
    }
    
    const dateArray = Array.from(additionalSelectedDates).sort();
    const tags = dateArray.map(dateStr => {
        const date = new Date(dateStr + 'T00:00:00');
        const formatted = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
        return `<span class="selected-date-tag">${formatted}</span>`;
    }).join('');
    
    selectedDatesDisplay.innerHTML = tags;
}

function clearAllSelectedDates() {
    additionalSelectedDates.clear();
    updateSelectedDatesDisplay();
    renderMiniCalendar();
}

function confirmDateSelection() {
    toggleMultiDayCalendar(); // Close the calendar
}

// Panel functionality
function initializePanel() {
    // Clear form when cancel button is clicked
    cancelBtn.addEventListener('click', () => {
        guestForm.reset();
        clearAllSelectedDates(); // Also clear selected dates
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
    
    // Reset form and clear additional dates
    guestForm.reset();
    clearAllSelectedDates();
    
    // Initialize mini calendar to the selected date's month
    miniCalendarDate = new Date(date);
    renderMiniCalendar();
    
    // Show panel with smooth animation
    guestPanel.classList.remove('hidden');
    
    // Smooth scroll to panel with better positioning
    setTimeout(() => {
        guestPanel.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
        });
        // Focus after scrolling animation completes
        setTimeout(() => {
            guestNameInput.focus();
        }, 300);
    }, 100);
}

function closeGuestPanel() {
    guestPanel.classList.add('hidden');
    selectedDate = null;
    guestForm.reset();
    clearAllSelectedDates(); // Clear additional selected dates
    // Close multi-day calendar if open
    if (isMultiDayCalendarOpen) {
        toggleMultiDayCalendar();
    }
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
        
        // Collect all dates to create guests for
        const datesToCreate = [selectedDate]; // Primary date
        additionalSelectedDates.forEach(dateStr => {
            const additionalDate = new Date(dateStr + 'T00:00:00');
            datesToCreate.push(additionalDate);
        });
        
        // Create guests for all selected dates
        const savedGuests = [];
        for (const date of datesToCreate) {
            const dateKey = formatDateKey(date);
            
            try {
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
                
                savedGuests.push({ date: dateKey, guest: savedGuest });
            } catch (error) {
                console.error(`Error saving guest for date ${dateKey}:`, error);
                // Continue with other dates even if one fails
            }
        }
        
        // Also save to localStorage as backup
        localStorage.setItem('guestData', JSON.stringify(guests));
        
        // Update the modal to show new guest for the primary date
        displayExistingGuests(selectedDate);
        
        // Reset form and clear additional dates
        guestForm.reset();
        clearAllSelectedDates();
        
        // Update calendar to show guest indicators
        renderCalendar();
        
        // Handle results silently for success, show errors only
        const totalDates = datesToCreate.length;
        const successCount = savedGuests.length;
        
        if (successCount === 0) {
            throw new Error('Failed to save guest for any selected dates');
        } else if (successCount < totalDates) {
            // Only show alert if some dates failed - this is important user feedback
            alert(`Guest "${guestName}" added for ${successCount} out of ${totalDates} dates. Some dates may have failed.`);
        }
        // For full success (including multi-day), proceed silently
        
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
            const arrivalTime = guest.estimatedArrival ? formatTimeWithoutSeconds(guest.estimatedArrival) : 'Not specified';
            
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

// Send guest arrival email notification
async function sendGuestArrivalNotification(guestId) {
    try {
        console.log('Sending guest arrival notification for:', guestId);
        
        // Get auth token
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session?.access_token) {
            throw new Error('No authentication token available');
        }
        
        // Call notification API
        const response = await fetch('http://localhost:5001/api/notifications/guest-arrival', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                guestId: guestId,
                authToken: session.access_token
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Guest arrival notification sent:', result.message);
            if (result.data?.previewUrl) {
                console.log('📧 Email preview:', result.data.previewUrl);
            }
        } else {
            console.warn('⚠️ Notification API returned error:', result.message);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Failed to send guest arrival notification:', error);
        throw error;
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
        
        // Send email notification if guest is being checked in (not checked out)
        if (checkedIn) {
            try {
                await sendGuestArrivalNotification(guestId);
            } catch (emailError) {
                console.warn('Email notification failed (but check-in was successful):', emailError);
                // Don't throw error - check-in was successful, email is just a nice-to-have
            }
        }
        
    } catch (error) {
        console.error('Error updating guest check-in status in Supabase:', error);
        throw error;
    }
}

// Delete a guest
async function deleteGuest(dateKey, guestIndex) {
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