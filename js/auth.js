/**
 * AyosPH - Authentication Module
 * ================================
 * Handles user authentication, registration, and session management.
 */

// IMPORTANT: Ensure supabase.js is loaded BEFORE this file in HTML
// We access the client via window.supabaseClient which is set in supabase.js

/**
 * Get Supabase Client safely
 */
function getSupabase() {
    if (!window.supabaseClient) {
        console.error('❌ Supabase client not found! Ensure js/supabase.js is loaded first.');
        throw new Error('Supabase client not initialized');
    }
    return window.supabaseClient;
}

/**
 * Handle user login
 */
async function handleLogin(email, password, remember = false) {
    const _supabase = getSupabase();
    
    try {
        const { data, error } = await _supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Get user profile
        const { data: userProfile, error: profileError } = await _supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows returned
            throw profileError;
        }

        if (!userProfile) {
            // Create user profile if it doesn't exist
            await createUserProfile(data.user);
            // Fetch again after creation
            const { data: newUserProfile } = await _supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single();
            userProfile = newUserProfile;
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
        showToast(error.message || 'Login failed', 'error');
        throw error;
    }
}

/**
 * Handle user registration
 */
async function handleRegister(fullName, email, barangay, contactNumber, password) {
    const _supabase = getSupabase();

    try {
        const { data, error: authError } = await _supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    barangay: barangay,
                    contact_number: contactNumber
                }
            }
        });

        if (authError) throw authError;

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
        showToast(error.message || 'Registration failed', 'error');
        throw error;
    }
}

/**
 * Create user profile in database
 */
async function createUserProfile(user) {
    const _supabase = getSupabase();

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
    const _supabase = getSupabase();

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
 */
async function checkAuthState(requireAuth = false, redirectIfAuth = false) {
    const _supabase = getSupabase();

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
 */
async function getSession() {
    const _supabase = getSupabase();
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        return session;
    } catch (error) {
        console.error('Error getting session:', error);
        return null;
    }
}

/**
 * Get current user
 */
async function getCurrentUser() {
    const _supabase = getSupabase();
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        return user;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

/**
 * Check if user is logged in
 */
async function isLoggedIn() {
    const session = await getSession();
    return !!session;
}

/**
 * Update user profile
 */
async function updateUserProfile(updates) {
    const _supabase = getSupabase();
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
 */
async function resetPassword(email) {
    const _supabase = getSupabase();
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
 */
function onAuthStateChange(callback) {
    const _supabase = getSupabase();
    _supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// Export functions to window
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
window.getSupabase = getSupabase;