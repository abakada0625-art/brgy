/**
 * AyosPH - Authentication Module (Fixed)
 */

function getSupabase() {
    if (!window.supabaseClient) {
        throw new Error('Supabase client not initialized');
    }
    return window.supabaseClient;
}

async function handleLogin(email, password) {
    const _supabase = getSupabase();
    try {
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        showToast('Welcome back!', 'success');
        
        // Small delay to ensure session is fully established
        setTimeout(() => {
            if (data.user) {
                // Check role directly from DB
                _supabase.from('users').select('role').eq('id', data.user.id).single().then(({ data: profile }) => {
                    if (profile?.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }).catch(() => {
                    // Default to dashboard if profile fetch fails momentarily
                    window.location.href = 'dashboard.html';
                });
            }
        }, 500);

    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message || 'Login failed', 'error');
    }
}

async function handleRegister(fullName, email, barangay, contactNumber, password) {
    const _supabase = getSupabase();
    try {
        // 1. Create Auth User
        const { data, error: authError } = await _supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });

        if (authError) throw authError;
        if (!data.user) throw new Error('No user created');

        // 2. Create Profile in 'users' table
        // We wait a tiny bit to ensure Auth is fully synced
        const { error: profileError } = await _supabase.from('users').insert({
            id: data.user.id,
            full_name: fullName,
            email: email,
            barangay: barangay,
            contact_number: contactNumber,
            role: 'resident'
        });

        if (profileError) {
            console.error('Profile error:', profileError);
            // If policy fails, it usually means RLS is blocking. 
            // But with our new SQL, this should work.
            throw new Error('Account created but profile setup failed. Please contact admin.');
        }

        showToast('Account created! Please check email to verify.', 'success');
        setTimeout(() => window.location.href = 'login.html', 2000);

    } catch (error) {
        console.error('Registration error:', error);
        // Handle specific case where user exists but profile doesn't
        if (error.message.includes('duplicate key')) {
            showToast('Email already registered.', 'error');
        } else {
            showToast(error.message || 'Registration failed', 'error');
        }
    }
}

async function handleLogout() {
    const _supabase = getSupabase();
    try {
        await _supabase.auth.signOut();
        showToast('Logged out successfully', 'success');
        setTimeout(() => window.location.href = 'index.html', 1000);
    } catch (error) {
        showToast('Logout failed', 'error');
    }
}

async function getSession() {
    const _supabase = getSupabase();
    const { data: { session } } = await _supabase.auth.getSession();
    return session;
}

async function getCurrentUser() {
    const _supabase = getSupabase();
    const { data: { user } } = await _supabase.auth.getUser();
    return user;
}

// Expose to window
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.getSession = getSession;
window.getCurrentUser = getCurrentUser;