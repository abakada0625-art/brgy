/**
 * AyosPH - Utility Functions
 * ===========================
 * Common utility functions used throughout the application.
 */

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, warning, info)
 * @param {number} duration - How long to show the toast (ms)
 */
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ph-info-circle';
    if (type === 'success') icon = 'ph-check-circle';
    if (type === 'error') icon = 'ph-warning-circle';
    if (type === 'warning') icon = 'ph-warning';

    toast.innerHTML = `
        <i class="ph ${icon}"></i>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    const d = new Date(date);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return d.toLocaleDateString('en-PH', options);
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
function formatRelativeTime(date) {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return formatDate(date);
}

/**
 * Get status badge class
 * @param {string} status - Report status
 * @returns {string} Badge class
 */
function getStatusBadgeClass(status) {
    switch (status) {
        case 'Fixed':
            return 'badge-success';
        case 'In Progress':
        case 'Under Review':
            return 'badge-info';
        case 'Pending':
            return 'badge-warning';
        case 'Rejected':
            return 'badge-danger';
        default:
            return 'badge-secondary';
    }
}

/**
 * Get severity badge class
 * @param {string} severity - Report severity
 * @returns {string} Badge class
 */
function getSeverityBadgeClass(severity) {
    switch (severity) {
        case 'Emergency':
            return 'badge-danger';
        case 'High':
            return 'badge-warning';
        case 'Medium':
            return 'badge-info';
        case 'Low':
            return 'badge-secondary';
        default:
            return 'badge-secondary';
    }
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Check if user is logged in
 * @returns {Promise<boolean>} Whether user is authenticated
 */
async function isLoggedIn() {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        return !!session;
    } catch (error) {
        console.error('Error checking auth state:', error);
        return false;
    }
}

/**
 * Get current user
 * @returns {Promise<Object|null>} Current user object or null
 */
async function getCurrentUser() {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return null;
        
        // Get user profile from database
        const { data: userProfile } = await _supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
        
        return userProfile;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number (Philippines format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Whether phone number is valid
 */
function isValidPhone(phone) {
    const phoneRegex = /^(\+?63|0)?9\d{9}$/;
    return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Load script dynamically
 * @param {string} src - Script source URL
 * @returns {Promise} Promise that resolves when script is loaded
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Format file size to human-readable string
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Compress image before upload
 * @param {File} file - Image file to compress
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @param {number} quality - Quality (0-1)
 * @returns {Promise<Blob>} Compressed image blob
 */
function compressImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Image compression failed'));
                        }
                    },
                    file.type || 'image/jpeg',
                    quality
                );
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}
