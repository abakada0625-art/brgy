/**
 * AyosPH - Dashboard UI Logic
 * ============================
 * Handles sidebar navigation, mobile menu, and user info display.
 */

document.addEventListener('DOMContentLoaded', async () => {
    await initDashboard();
});

async function initDashboard() {
    const _supabase = getSupabase();
    
    // 1. Check Auth
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Load User Info
    const { data: userProfile } = await _supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (userProfile) {
        document.getElementById('userName').textContent = userProfile.full_name;
        document.getElementById('userRole').textContent = userProfile.role;
        document.getElementById('userAvatar').textContent = userProfile.full_name.charAt(0).toUpperCase();
    }

    // 3. Setup Navigation
    setupNavigation();
    
    // 4. Setup Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    
    // 5. Mobile Menu
    document.querySelector('.mobile-menu-btn')?.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('mobile-open');
    });
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    const sections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('pageTitle');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all
            navItems.forEach(n => n.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Add active to clicked
            item.classList.add('active');
            
            const targetId = item.getAttribute('data-section');
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                targetSection.classList.add('active');
                pageTitle.textContent = item.querySelector('span').textContent;
                
                // If switching to reports tab, ensure data is loaded
                if (targetId === 'reports' && typeof loadReports === 'function') {
                    // Optional: Force reload if needed
                }
            }

            // Close mobile menu if open
            document.querySelector('.sidebar').classList.remove('mobile-open');
        });
    });

    // Handle "View All" links
    document.querySelectorAll('.view-all').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            const navItem = document.querySelector(`.nav-item[data-section="${target}"]`);
            if (navItem) navItem.click();
        });
    });
}