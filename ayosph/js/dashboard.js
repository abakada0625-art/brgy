/**
 * AyosPH - Dashboard Module
 * ===========================
 * Handles dashboard UI interactions and initialization.
 */

let currentUser = null;
let currentReports = [];
let realtimeUnsubscribe = null;

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const isAuthenticated = await checkAuthState(true);
    if (!isAuthenticated) return;

    // Load current user
    currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize UI
    initDashboard();
});

/**
 * Initialize dashboard UI
 */
async function initDashboard() {
    // Update user info in sidebar
    updateUserProfileUI();

    // Load reports and stats
    await loadDashboardStats();
    await loadReports();

    // Setup event listeners
    setupEventListeners();

    // Subscribe to realtime updates
    subscribeToRealtimeUpdates();
}

/**
 * Update user profile UI
 */
function updateUserProfileUI() {
    if (!currentUser) return;

    const initials = currentUser.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userRole').textContent = currentUser.role || 'Resident';
}

/**
 * Load dashboard statistics
 */
async function loadDashboardStats() {
    try {
        const stats = await getReportStats();

        document.getElementById('totalReports').textContent = stats.total;
        document.getElementById('pendingReports').textContent = stats.pending;
        document.getElementById('inProgressReports').textContent = stats.inProgress + stats.underReview;
        document.getElementById('fixedReports').textContent = stats.fixed;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

/**
 * Load reports list
 */
async function loadReports(filters = {}) {
    const reportList = document.getElementById('reportList');
    
    try {
        currentReports = await getUserReports(filters);
        
        if (currentReports.length === 0) {
            reportList.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-file-text empty-state-icon"></i>
                    <h3 class="empty-state-title">No reports yet</h3>
                    <p class="empty-state-text">Create your first report to track community issues.</p>
                    <button class="btn btn-primary" onclick="openNewReportModal()">
                        <i class="ph ph-plus"></i>
                        Create Report
                    </button>
                </div>
            `;
            return;
        }

        reportList.innerHTML = currentReports.map(report => createReportCard(report)).join('');

        // Add click handlers
        document.querySelectorAll('.report-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.btn')) {
                    const reportId = item.dataset.reportId;
                    openReportDetail(reportId);
                }
            });
        });
    } catch (error) {
        console.error('Error loading reports:', error);
        reportList.innerHTML = `
            <div class="empty-state">
                <i class="ph ph-warning-circle empty-state-icon" style="color: var(--danger-500);"></i>
                <h3 class="empty-state-title">Failed to load reports</h3>
                <p class="empty-state-text">Please try again later.</p>
            </div>
        `;
    }
}

/**
 * Create report card HTML
 * @param {Object} report - Report data
 * @returns {string} HTML string
 */
function createReportCard(report) {
    const statusClass = getStatusBadgeClass(report.status);
    const severityClass = getSeverityBadgeClass(report.severity);
    const imageUrl = report.image_before || null;

    return `
        <div class="report-item" data-report-id="${report.id}">
            ${imageUrl 
                ? `<img src="${imageUrl}" alt="${escapeHtml(report.title)}" class="report-image" onerror="this.style.display='none'">`
                : `<div class="report-placeholder"><i class="ph ph-image"></i></div>`
            }
            <div class="report-info">
                <h4 class="report-title">${escapeHtml(report.title)}</h4>
                <div class="report-meta">
                    <span class="report-location">
                        <i class="ph ph-map-pin"></i>
                        ${escapeHtml(truncateText(report.location, 30))}
                    </span>
                    <span>•</span>
                    <span>${formatRelativeTime(report.created_at)}</span>
                </div>
                <div class="report-badges">
                    <span class="badge ${statusClass}">${report.status}</span>
                    <span class="badge ${severityClass}">${report.severity}</span>
                    <span class="badge badge-secondary">${report.category}</span>
                </div>
            </div>
            <div class="report-actions">
                <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); openReportDetail('${report.id}')">
                    View Details
                </button>
            </div>
        </div>
    `;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Mobile menu toggle
    document.getElementById('menuToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // New report button
    document.getElementById('newReportBtn')?.addEventListener('click', openNewReportModal);
    document.getElementById('closeNewReportModal')?.addEventListener('click', closeNewReportModal);
    document.getElementById('cancelNewReport')?.addEventListener('click', closeNewReportModal);

    // Close modal on overlay click
    document.getElementById('newReportModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeNewReportModal();
        }
    });

    document.getElementById('reportDetailModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeReportDetailModal();
        }
    });

    document.getElementById('closeReportDetailModal')?.addEventListener('click', closeReportDetailModal);

    // Image upload
    const imageUpload = document.getElementById('imageUpload');
    const imageInput = document.getElementById('imageInput');

    imageUpload?.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput?.addEventListener('change', handleImageSelect);

    // GPS button
    document.getElementById('gpsBtn')?.addEventListener('click', getCurrentLocation);

    // Submit report
    document.getElementById('submitReport')?.addEventListener('click', handleSubmitReport);

    // Filter inputs
    document.getElementById('searchInput')?.addEventListener('input', debounce(handleFilterChange));
    document.getElementById('statusFilter')?.addEventListener('change', handleFilterChange);
    document.getElementById('categoryFilter')?.addEventListener('change', handleFilterChange);

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.menu-item[data-view]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            handleNavigation(view);
        });
    });
}

/**
 * Handle image selection
 */
async function handleImageSelect(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('imagePreview');
    const placeholder = document.getElementById('uploadPlaceholder');
    const upload = document.getElementById('imageUpload');

    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast('Image size must be less than 5MB', 'error');
        return;
    }

    try {
        // Compress image
        const compressedFile = await compressImage(file);
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
            upload.classList.add('has-image');
        };
        reader.readAsDataURL(compressedFile);

        // Store compressed file for submission
        window.selectedImage = compressedFile;
    } catch (error) {
        console.error('Error processing image:', error);
        showToast('Failed to process image', 'error');
    }
}

/**
 * Get current GPS location
 */
function getCurrentLocation() {
    const locationInput = document.getElementById('reportLocation');

    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', 'error');
        return;
    }

    showToast('Getting your location...', 'info');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            locationInput.value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            showToast('Location detected!', 'success');
        },
        (error) => {
            console.error('Geolocation error:', error);
            showToast('Unable to get your location. Please enter manually.', 'warning');
        },
        { timeout: 10000 }
    );
}

/**
 * Handle report submission
 */
async function handleSubmitReport() {
    const form = document.getElementById('newReportForm');
    const title = document.getElementById('reportTitle').value.trim();
    const description = document.getElementById('reportDescription').value.trim();
    const category = document.getElementById('reportCategory').value;
    const severity = document.getElementById('reportSeverity').value;
    const location = document.getElementById('reportLocation').value.trim();

    // Validate
    if (!title || !description || !category || !severity || !location) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitReport');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        await createReport({
            title,
            description,
            category,
            severity,
            location,
            image: window.selectedImage
        });

        showToast('Report submitted successfully!', 'success');
        closeNewReportModal();
        
        // Reset form
        form.reset();
        resetImageUpload();
        window.selectedImage = null;

        // Reload reports
        await loadReports();
        await loadDashboardStats();
    } catch (error) {
        console.error('Error submitting report:', error);
        showToast(error.message || 'Failed to submit report', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Report';
    }
}

/**
 * Reset image upload UI
 */
function resetImageUpload() {
    const preview = document.getElementById('imagePreview');
    const placeholder = document.getElementById('uploadPlaceholder');
    const upload = document.getElementById('imageUpload');
    const input = document.getElementById('imageInput');

    preview.src = '';
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
    upload.classList.remove('has-image');
    input.value = '';
}

/**
 * Open new report modal
 */
function openNewReportModal() {
    document.getElementById('newReportModal').classList.add('active');
    document.getElementById('pageTitle').textContent = 'New Report';
}

/**
 * Close new report modal
 */
function closeNewReportModal() {
    document.getElementById('newReportModal').classList.remove('active');
    document.getElementById('pageTitle').textContent = 'Dashboard';
}

/**
 * Open report detail modal
 * @param {string} reportId - Report ID
 */
async function openReportDetail(reportId) {
    const modal = document.getElementById('reportDetailModal');
    const content = document.getElementById('reportDetailContent');

    content.innerHTML = `
        <div class="empty-state">
            <i class="ph ph-spinner empty-state-icon" style="animation: spin 1s linear infinite;"></i>
            <p class="empty-state-text">Loading report details...</p>
        </div>
    `;

    modal.classList.add('active');

    try {
        const report = await getReportById(reportId);
        if (!report) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-warning-circle empty-state-icon"></i>
                    <h3 class="empty-state-title">Report not found</h3>
                </div>
            `;
            return;
        }

        content.innerHTML = renderReportDetail(report);
    } catch (error) {
        console.error('Error loading report detail:', error);
        content.innerHTML = `
            <div class="empty-state">
                <i class="ph ph-warning-circle empty-state-icon" style="color: var(--danger-500);"></i>
                <h3 class="empty-state-title">Failed to load report</h3>
            </div>
        `;
    }
}

/**
 * Render report detail HTML
 * @param {Object} report - Report data
 * @returns {string} HTML string
 */
function renderReportDetail(report) {
    const statusClass = getStatusBadgeClass(report.status);
    const severityClass = getSeverityBadgeClass(report.severity);

    return `
        <div class="report-detail">
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                <span class="badge ${statusClass}">${report.status}</span>
                <span class="badge ${severityClass}">${report.severity}</span>
                <span class="badge badge-secondary">${report.category}</span>
            </div>

            <h3 style="margin-bottom: 1rem;">${escapeHtml(report.title)}</h3>

            ${report.image_before ? `
                <div style="margin-bottom: 1.5rem;">
                    <img src="${report.image_before}" alt="Issue photo" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: var(--radius-lg);">
                </div>
            ` : ''}

            <div style="margin-bottom: 1.5rem;">
                <h4 style="font-size: 0.875rem; color: var(--gray-500); margin-bottom: 0.5rem;">Description</h4>
                <p style="color: var(--gray-700); line-height: 1.7;">${escapeHtml(report.description)}</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                    <h4 style="font-size: 0.875rem; color: var(--gray-500); margin-bottom: 0.25rem;">Location</h4>
                    <p style="color: var(--gray-700);"><i class="ph ph-map-pin"></i> ${escapeHtml(report.location)}</p>
                </div>
                <div>
                    <h4 style="font-size: 0.875rem; color: var(--gray-500); margin-bottom: 0.25rem;">Reported</h4>
                    <p style="color: var(--gray-700);">${formatDate(report.created_at)}</p>
                </div>
            </div>

            ${report.remarks ? `
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--gray-50); border-radius: var(--radius-lg);">
                    <h4 style="font-size: 0.875rem; color: var(--gray-500); margin-bottom: 0.5rem;">Admin Remarks</h4>
                    <p style="color: var(--gray-700);">${escapeHtml(report.remarks)}</p>
                </div>
            ` : ''}

            ${report.image_after ? `
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-size: 0.875rem; color: var(--gray-500); margin-bottom: 0.5rem;">Proof of Fix</h4>
                    <img src="${report.image_after}" alt="After photo" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: var(--radius-lg);">
                </div>
            ` : ''}

            <!-- Comments Section -->
            <div class="comments-section">
                <h4 style="margin-bottom: 1rem;">Comments</h4>
                <div id="commentsList">
                    ${report.comments && report.comments.length > 0 
                        ? report.comments.map(comment => `
                            <div class="comment">
                                <div class="comment-avatar">${comment.users?.full_name?.charAt(0).toUpperCase() || 'U'}</div>
                                <div class="comment-content">
                                    <div class="comment-header">
                                        <span class="comment-author">${escapeHtml(comment.users?.full_name || 'Unknown')}</span>
                                        <span class="comment-date">${formatRelativeTime(comment.created_at)}</span>
                                    </div>
                                    <p class="comment-text">${escapeHtml(comment.message)}</p>
                                </div>
                            </div>
                        `).join('')
                        : '<p style="color: var(--gray-500); text-align: center; padding: 1rem;">No comments yet</p>'
                    }
                </div>
                <div class="comment-form">
                    <input type="text" class="comment-input" id="commentInput" placeholder="Add a comment...">
                    <button class="btn btn-primary" onclick="submitComment('${report.id}')">
                        <i class="ph ph-paper-plane-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Submit comment
 * @param {string} reportId - Report ID
 */
async function submitComment(reportId) {
    const input = document.getElementById('commentInput');
    const message = input.value.trim();

    if (!message) return;

    try {
        await addComment(reportId, message);
        input.value = '';
        
        // Reload report detail
        await openReportDetail(reportId);
        showToast('Comment added!', 'success');
    } catch (error) {
        console.error('Error adding comment:', error);
        showToast('Failed to add comment', 'error');
    }
}

/**
 * Close report detail modal
 */
function closeReportDetailModal() {
    document.getElementById('reportDetailModal').classList.remove('active');
}

/**
 * Handle filter change
 */
function handleFilterChange() {
    const search = document.getElementById('searchInput')?.value;
    const status = document.getElementById('statusFilter')?.value;
    const category = document.getElementById('categoryFilter')?.value;

    loadReports({
        search,
        status: status || undefined,
        category: category || undefined
    });
}

/**
 * Handle navigation
 * @param {string} view - View name
 */
function handleNavigation(view) {
    switch (view) {
        case 'my-reports':
            document.getElementById('pageTitle').textContent = 'My Reports';
            loadReports();
            break;
        case 'new-report':
            openNewReportModal();
            break;
        case 'notifications':
            document.getElementById('pageTitle').textContent = 'Notifications';
            // TODO: Implement notifications view
            break;
    }

    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });
}

/**
 * Subscribe to realtime updates
 */
function subscribeToRealtimeUpdates() {
    realtimeUnsubscribe = subscribeToReports((payload) => {
        console.log('Realtime update:', payload);
        
        // Refresh stats and reports
        loadDashboardStats();
        loadReports();
        
        // Show notification
        if (payload.eventType === 'INSERT') {
            showToast('New report submitted!', 'info');
        } else if (payload.eventType === 'UPDATE') {
            showToast('Report updated!', 'info');
        }
    });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (realtimeUnsubscribe) {
        realtimeUnsubscribe();
    }
});

// Export functions
window.openNewReportModal = openNewReportModal;
window.openReportDetail = openReportDetail;
window.submitComment = submitComment;
