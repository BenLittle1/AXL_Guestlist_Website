// DOM elements
const currentUserEl = document.getElementById('currentUser');
const usersContainer = document.getElementById('usersContainer');
const backBtn = document.getElementById('backBtn');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();
    await displayCurrentUser();
    initializeNavigation();
    await loadUsers();
});

// Check authentication and admin privileges
async function checkAuth() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        
        if (!user) {
            alert('Please log in to access this page.');
            window.location.href = 'login.html';
            return;
        }

        // Check if user has admin privileges
        const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('access_level')
            .eq('id', user.id)
            .single();

        if (!profile || profile.access_level !== 'admin') {
            alert('Admin privileges required to access user management.');
            window.location.href = 'admin.html';
            return;
        }

        console.log('✅ Admin access verified');
    } catch (error) {
        console.error('Auth check failed:', error);
        alert('Authentication error. Please try logging in again.');
        window.location.href = 'login.html';
    }
}

// Display current user info
async function displayCurrentUser() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        const displayName = profile?.full_name || 'Admin User';
        currentUserEl.textContent = `${displayName} (${user.email})`;
    } catch (error) {
        console.error('Error displaying user:', error);
        currentUserEl.textContent = 'Admin User';
    }
}

// Navigation setup
function initializeNavigation() {
    backBtn.addEventListener('click', () => {
        window.location.href = 'admin.html';
    });

    logoutBtn.addEventListener('click', () => {
        showLogoutModal();
    });

    refreshBtn.addEventListener('click', loadUsers);
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
        await window.supabaseClient.auth.signOut();
        window.location.href = 'login.html';
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

// Load users from database
async function loadUsers() {
    try {
        console.log('Loading users...');
        usersContainer.innerHTML = '<div class="loading">Loading users...</div>';

        const { data: users, error } = await window.supabaseClient
            .from('profiles')
            .select('id, email, full_name, username, access_level, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        console.log(`Loaded ${users?.length || 0} users`);
        displayUsers(users || []);

    } catch (error) {
        console.error('Error loading users:', error);
        usersContainer.innerHTML = `
            <div class="error-message">
                <h3>Error Loading Users</h3>
                <p>Failed to load users: ${error.message}</p>
                <button class="btn btn-secondary" onclick="loadUsers()">Try Again</button>
            </div>
        `;
    }
}

// Display users in table
function displayUsers(users) {
    if (!users || users.length === 0) {
        usersContainer.innerHTML = `
            <div class="no-users">
                <h3>No Users Found</h3>
                <p>No users have been registered yet.</p>
            </div>
        `;
        return;
    }

    const table = `
        <table class="users-table">
            <thead>
                <tr>
                    <th>NAME</th>
                    <th>EMAIL</th>
                    <th>ROLE</th>
                    <th>ACTIONS</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${escapeHtml(user.full_name || 'N/A')}</td>
                        <td>${escapeHtml(user.email || 'N/A')}</td>
                        <td>
                            <select class="role-select" data-user-id="${user.id}" data-current-role="${user.access_level || 'user'}">
                                <option value="user" ${(user.access_level || 'user') === 'user' ? 'selected' : ''}>User</option>
                                <option value="manager" ${user.access_level === 'manager' ? 'selected' : ''}>Manager</option>
                                <option value="admin" ${user.access_level === 'admin' ? 'selected' : ''}>Admin</option>
                            </select>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary update-btn" data-user-id="${user.id}">
                                Update
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    usersContainer.innerHTML = table;
    attachEventListeners();
}

// Attach event listeners to update buttons
function attachEventListeners() {
    const updateButtons = document.querySelectorAll('.update-btn');
    updateButtons.forEach(button => {
        button.addEventListener('click', handleRoleUpdate);
    });
}

// Handle role update
async function handleRoleUpdate(e) {
    const userId = e.target.dataset.userId;
    const select = document.querySelector(`select[data-user-id="${userId}"]`);
    const newRole = select.value;
    const currentRole = select.dataset.currentRole;

    if (newRole === currentRole) {
        return; // No changes to save - silently return
    }

    try {
        // Show loading state
        e.target.textContent = 'Updating...';
        e.target.disabled = true;

        // Update the role immediately
        const { error } = await window.supabaseClient
            .from('profiles')
            .update({ access_level: newRole })
            .eq('id', userId);

        if (error) {
            throw error;
        }

        // Update the UI
        select.dataset.currentRole = newRole;

        console.log(`✅ Updated user ${userId} role to ${newRole}`);

    } catch (error) {
        console.error('Error updating role:', error);
        alert(`Failed to update role: ${error.message}`);
        select.value = currentRole; // Reset selection
    } finally {
        e.target.textContent = 'Update';
        e.target.disabled = false;
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (!text) return 'N/A';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
} 