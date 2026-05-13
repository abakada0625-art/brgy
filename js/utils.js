function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="ph ${type === 'success' ? 'ph-check-circle text-success' : 'ph-warning-circle text-danger'}" style="font-size: 1.25rem;"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const div = document.createElement('div');
    div.id = 'toast-container';
    document.body.appendChild(div);
    return div;
}