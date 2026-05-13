// Toast Notification System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.5rem;">
            <i class="ph ${type === 'success' ? 'ph-check-circle' : type === 'error' ? 'ph-warning-circle' : 'ph-info'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Inline styles for toast since we want it standalone
    Object.assign(toast.style, {
        position: 'fixed', bottom: '20px', right: '20px',
        background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
        color: 'white', padding: '1rem 1.5rem', borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: '9999',
        animation: 'slideUp 0.3s ease-out', fontWeight: '500'
    });

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Format Date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

// Status Badge Helper
function getStatusBadge(status) {
    const colors = {
        'Pending': '#f59e0b', 'Under Review': '#3b82f6',
        'In Progress': '#8b5cf6', 'Fixed': '#10b981', 'Rejected': '#ef4444'
    };
    return `<span style="background:${colors[status] || '#64748b'}20; color:${colors[status] || '#64748b'}; padding:0.25rem 0.75rem; border-radius:20px; font-size:0.75rem; font-weight:600;">${status}</span>`;
}