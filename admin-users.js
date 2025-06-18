// DOM elements - using querySelector to access elements immediately
let currentUserEl, usersContainer, backBtn, logoutBtn, refreshBtn;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Get DOM elements
    currentUserEl = document.getElementById('currentUser');
    usersContainer = document.getElementById('usersContainer');
    backBtn = document.getElementById('backBtn');
    logoutBtn = document.getElementById('logoutBtn');
    refreshBtn = document.getElementById('refreshBtn');
    
    // Initialize non-async components immediately
    initializeNavigation();
    
    // Run async operations in parallel for faster loading
    const authPromise = checkAuth();
    const userPromise = displayCurrentUser();
    const usersPromise = loadUsers();
    
    // Wait for all async operations to complete
    await Promise.all([authPromise, userPromise, usersPromise]);
});

// Render empty table structure immediately for better perceived performance
function renderEmptyTableStructure() {
    // Check if table already exists in HTML
    if (usersContainer && !usersContainer.querySelector('.users-table')) {
        usersContainer.innerHTML = `
            <table class="users-table">
                <thead>
                    <tr>
                        <th>NAME</th>
                        <th>EMAIL</th>
                        <th>ROLE</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="5" class="loading">Loading users...</td>
                    </tr>
                </tbody>
            </table>
        `;
    }
}

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
            .select('access_level, approved')
            .eq('id', user.id)
            .single();

        if (!profile || profile.access_level !== 'admin' || !profile.approved) {
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
        // Don't replace the entire container if we already have table structure
        const existingTable = usersContainer.querySelector('.users-table');
        if (!existingTable) {
            renderEmptyTableStructure();
        }

        const { data: users, error } = await window.supabaseClient
            .from('profiles')
            .select('id, email, full_name, username, access_level, approved, created_at')
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
    // Check if table already exists to avoid double animation
    let existingTable = usersContainer.querySelector('.users-table');
    
    if (!users || users.length === 0) {
        if (existingTable) {
            // Just update tbody content to avoid re-animation
            const tbody = existingTable.querySelector('tbody');
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="no-users">No users have been registered yet.</td>
                </tr>
            `;
        } else {
            // Create new table if none exists
            usersContainer.innerHTML = `
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>NAME</th>
                            <th>EMAIL</th>
                            <th>ROLE</th>
                            <th>STATUS</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="5" class="no-users">No users have been registered yet.</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }
        return;
    }

    // Generate rows as a single string for better performance
    const rows = users.map(user => 
        `<tr>
            <td>${escapeHtml(user.full_name || 'N/A')}</td>
            <td>${escapeHtml(user.email || 'N/A')}</td>
            <td>
                <select class="role-select" data-user-id="${user.id}" data-current-role="${user.access_level || 'user'}">
                    <option value="user" ${(user.access_level || 'user') === 'user' ? 'selected' : ''}>User</option>
                    <option value="admin" ${user.access_level === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </td>
            <td>
                <select class="approval-select" data-user-id="${user.id}" data-current-approval="${user.approved || false}">
                    <option value="true" ${user.approved ? 'selected' : ''}>Approved</option>
                    <option value="false" ${!user.approved ? 'selected' : ''}>Pending</option>
                </select>
            </td>
            <td>
                <button class="btn btn-sm btn-primary update-btn" data-user-id="${user.id}">
                    Update
                </button>
            </td>
        </tr>`
    ).join('');

    if (existingTable) {
        // Update only the tbody to avoid re-triggering table animation
        const tbody = existingTable.querySelector('tbody');
        tbody.innerHTML = rows;
    } else {
        // Create new table if none exists
        const table = `
            <table class="users-table">
                <thead>
                    <tr>
                        <th>NAME</th>
                        <th>EMAIL</th>
                        <th>ROLE</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
        usersContainer.innerHTML = table;
    }
    
    attachEventListeners();
}

// Attach event listeners to update buttons
function attachEventListeners() {
    const updateButtons = document.querySelectorAll('.update-btn');
    updateButtons.forEach(button => {
        button.addEventListener('click', handleRoleUpdate);
    });
}

// Handle role and approval update
async function handleRoleUpdate(e) {
    const userId = e.target.dataset.userId;
    const roleSelect = document.querySelector(`select.role-select[data-user-id="${userId}"]`);
    const approvalSelect = document.querySelector(`select.approval-select[data-user-id="${userId}"]`);
    
    const newRole = roleSelect.value;
    const currentRole = roleSelect.dataset.currentRole;
    const newApproval = approvalSelect.value === 'true';
    const currentApproval = approvalSelect.dataset.currentApproval === 'true';

    if (newRole === currentRole && newApproval === currentApproval) {
        return; // No changes to save - silently return
    }

    const changes = [];
    if (newRole !== currentRole) {
        changes.push(`role to ${newRole}`);
    }
    if (newApproval !== currentApproval) {
        changes.push(`status to ${newApproval ? 'approved' : 'pending'}`);
    }

    if (!confirm(`Are you sure you want to change this user's ${changes.join(' and ')}?`)) {
        // Reset selects to original values
        roleSelect.value = currentRole;
        approvalSelect.value = currentApproval.toString();
        return;
    }

    try {
        // Show loading state
        e.target.textContent = 'Updating...';
        e.target.disabled = true;

        // Try using the stored function first, fallback to direct updates
        let updateError;
        try {
            const { error } = await window.supabaseClient.rpc('update_user_role_and_approval', {
                target_user_id: userId,
                new_role: newRole !== currentRole ? newRole : null,
                new_approved: newApproval !== currentApproval ? newApproval : null
            });
            updateError = error;
        } catch (rpcError) {
            console.log('RPC function not available, using fallback method:', rpcError.message);
            updateError = { message: 'function_not_found' };
        }

        // If function doesn't exist, use direct table updates
        if (updateError && updateError.message.includes('Could not find the function')) {
            console.log('Using fallback: direct table updates');
            
            // Update profiles table
            const updateData = {};
            if (newRole !== currentRole) {
                updateData.access_level = newRole;
            }
            if (newApproval !== currentApproval) {
                updateData.approved = newApproval;
            }
            
            const { error: profileError } = await window.supabaseClient
                .from('profiles')
                .update(updateData)
                .eq('id', userId);

            if (profileError) {
                throw profileError;
            }

            // Also update auth.users metadata if role changed (using admin client)
            if (newRole !== currentRole && window.supabaseAdminClient) {
                try {
                    const { error: authError } = await window.supabaseAdminClient.auth.admin.updateUserById(
                        userId,
                        { 
                            user_metadata: { access_level: newRole }
                        }
                    );
                    if (authError) {
                        console.warn('Could not update auth metadata:', authError.message);
                    }
                } catch (authUpdateError) {
                    console.warn('Auth metadata update failed:', authUpdateError.message);
                }
            }
        } else if (updateError) {
            throw updateError;
        }

        // Update the UI data attributes
        roleSelect.dataset.currentRole = newRole;
        approvalSelect.dataset.currentApproval = newApproval.toString();

        console.log(`✅ Updated user ${userId}: ${changes.join(' and ')}`);
        alert('User updated successfully!');

    } catch (error) {
        console.error('Error updating user:', error);
        alert(`Failed to update user: ${error.message}`);
        
        // Reset selects to original values
        roleSelect.value = currentRole;
        approvalSelect.value = currentApproval.toString();
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