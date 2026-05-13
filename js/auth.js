/**
 * AyosPH - Authentication Module
 * ================================
 * Handles user authentication, registration, and session management.
 */

// Load Supabase client script if not already loaded
if (typeof supabase === 'undefined') {
    document.write('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
}

/**
 * Handle user login
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {boolean} remember - Whether to remember the user
 */
async function handleLogin(email, password, remember = false) {
    try {
        const { data, error } = await _supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Get user profile
        const { data: userProfile } = await _supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (!userProfile) {
            // Create user profile if it doesn't exist
            await createUserProfile(data.user);
        }

        showToast('Welcome back!', 'success');
        
        // Redirect based on role
        setTimeout(() => {
            if (userProfile?.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * Handle user registration
 * @param {string} fullName - User's full name
 * @param {string} email - User's email
 * @param {string} barangay - User's barangay
 * @param {string} contactNumber - User's contact number
 * @param {string} password - User's password
 */
async function handleRegister(fullName, email, barangay, contactNumber, password) {
    try {
        const { data, error } = await _supabase.auth.signUp({
            email,
            password
        });

        if (error) throw error;

        // Create user profile in database
        const { error: profileError } = await _supabase
            .from('users')
            .insert({
                id: data.user.id,
                full_name: fullName,
                email: email,
                barangay: barangay,
                contact_number: contactNumber,
                role: 'resident' // Default role
            });

        if (profileError) throw profileError;

        showToast('Account created successfully! Please check your email to verify.', 'success');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);

    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

/**
 * Create user profile in database
 * @param {Object} user - Supabase auth user
 */
async function createUserProfile(user) {
    try {
        const { error } = await _supabase
            .from('users')
            .insert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email.split('@')[0],
                barangay: user.user_metadata?.barangay || 'Unknown',
                contact_number: user.user_metadata?.contact_number || '',
                role: 'resident'
            });

        if (error) throw error;
    } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
    }
}

/**
 * Handle user logout
 */
async function handleLogout() {
    try {
        const { error } = await _supabase.auth.signOut();
        if (error) throw error;

        showToast('Logged out successfully', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);

    } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to logout', 'error');
    }
}

/**
 * Check authentication state and redirect if needed
 * @param {boolean} requireAuth - Whether authentication is required
 * @param {boolean} redirectIfAuth - Whether to redirect if already authenticated
 */
async function checkAuthState(requireAuth = false, redirectIfAuth = false) {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        const currentPage = window.location.pathname.split('/').pop();
        const authPages = ['login.html', 'register.html', ''];

        if (!session) {
            if (requireAuth && !authPages.includes(currentPage)) {
                window.location.href = 'login.html';
                return false;
            }
            return false;
        }

        // Get user profile
        const { data: userProfile } = await _supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (redirectIfAuth && authPages.includes(currentPage)) {
            if (userProfile?.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
            return true;
        }

        return true;
    } catch (error) {
        console.error('Error checking auth state:', error);
        return false;
    }
}

/**
 * Get current session
 * @returns {Promise<Object|null>} Current session or null
 */
async function getSession() {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        return session;
    } catch (error) {
        console.error('Error getting session:', error);
        return null;
    }
}

/**
 * Update user profile
 * @param {Object} updates - Fields to update
 */
async function updateUserProfile(updates) {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await _supabase
            .from('users')
            .update(updates)
            .eq('id', user.id);

        if (error) throw error;

        showToast('Profile updated successfully', 'success');
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
}

/**
 * Reset password
 * @param {string} email - User's email
 */
async function resetPassword(email) {
    try {
        const { error } = await _supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/login.html`
        });

        if (error) throw error;

        showToast('Password reset email sent!', 'success');
    } catch (error) {
        console.error('Password reset error:', error);
        throw error;
    }
}

/**
 * Listen for auth state changes
 * @param {Function} callback - Callback function
 */
function onAuthStateChange(callback) {
    _supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// Export functions
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.checkAuthState = checkAuthState;
window.getSession = getSession;
window.updateUserProfile = updateUserProfile;
window.resetPassword = resetPassword;
window.onAuthStateChange = onAuthStateChange;
window.getCurrentUser = getCurrentUser;
window.isLoggedIn = isLoggedIn;
