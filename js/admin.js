/**
 * AyosPH - Admin Module
 * =======================
 * Handles admin dashboard functionality.
 */

let currentUser = null;
let currentReports = [];
let categoryChartInstance = null;
let monthlyChartInstance = null;

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication and admin role
    const isAuthenticated = await checkAuthState(true);
    if (!isAuthenticated) return;

    // Load current user
    currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Access denied. Admin privileges required.', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }

    // Initialize UI
    initAdminDashboard();
});

/**
 * Initialize admin dashboard UI
 */
async function initAdminDashboard() {
    updateUserProfileUI();
    await loadAdminStats();
    await loadAllReports();
    setupEventListeners();
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
    document.getElementById('userRole').textContent = 'Administrator';
}

/**
 * Load admin statistics
 */
async function loadAdminStats() {
    try {
        const stats = await getReportStats();

        document.getElementById('totalReports').textContent = stats.total;
        document.getElementById('pendingReports').textContent = stats.pending;
        document.getElementById('inProgressReports').textContent = stats.inProgress + stats.underReview;
        document.getElementById('fixedReports').textContent = stats.fixed;
        document.getElementById('emergencyReports').textContent = stats.emergency;

        // Load charts
        await loadCharts();
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

/**
 * Load all reports for admin
 */
async function loadAllReports(filters = {}) {
    const tableBody = document.getElementById('reportsTableBody');
    
    try {
        currentReports = await getAllReports(filters);
        
        if (currentReports.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 3rem;">
                        <i class="ph ph-file-text" style="font-size: 2rem; color: var(--gray-400);"></i>
                        <p style="color: var(--gray-500); margin-top: 1rem;">No reports found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = currentReports.map(report => createReportTableRow(report)).join('');
    } catch (error) {
        console.error('Error loading reports:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 3rem;">
                    <i class="ph ph-warning-circle" style="font-size: 2rem; color: var(--danger-500);"></i>
                    <p style="color: var(--danger-500); margin-top: 1rem;">Failed to load reports</p>
                </td>
            </tr>
        `;
    }
}

/**
 * Create report table row HTML
 * @param {Object} report - Report data
 * @returns {string} HTML string
 */
function createReportTableRow(report) {
    const statusClass = getStatusBadgeClass(report.status);
    const severityClass = getSeverityBadgeClass(report.severity);
    const reporterName = report.users?.full_name || 'Unknown';

    return `
        <tr>
            <td>
                <strong>${escapeHtml(truncateText(report.title, 40))}</strong>
            </td>
            <td><span class="badge badge-secondary">${report.category}</span></td>
            <td><span class="badge ${severityClass}">${report.severity}</span></td>
            <td>
                <select class="status-select" onchange="updateReportStatusInline('${report.id}', this.value)">
                    ${STATUSES.map(status => `
                        <option value="${status}" ${report.status === status ? 'selected' : ''}>${status}</option>
                    `).join('')}
                </select>
            </td>
            <td>${escapeHtml(reporterName)}</td>
            <td>${formatDate(report.created_at)}</td>
            <td>
                <div class="actions">
                    <button class="btn btn-sm btn-outline" onclick="openAdminReportDetail('${report.id}')">
                        <i class="ph ph-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Update report status inline
 * @param {string} reportId - Report ID
 * @param {string} newStatus - New status
 */
async function updateReportStatusInline(reportId, newStatus) {
    try {
        await updateReportStatus(reportId, newStatus);
        showToast(`Report status updated to ${newStatus}`, 'success');
        
        // Reload data
        await loadAdminStats();
        await loadAllReports();
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Failed to update status', 'error');
    }
}

/**
 * Load analytics charts
 */
async function loadCharts() {
    try {
        const reports = await getAllReports();
        
        // Category distribution
        const categoryData = {};
        CATEGORIES.forEach(cat => categoryData[cat] = 0);
        reports.forEach(r => {
            if (categoryData[r.category] !== undefined) {
                categoryData[r.category]++;
            }
        });

        // Monthly reports
        const monthlyData = {};
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[key] = 0;
        }
        
        reports.forEach(r => {
            const date = new Date(r.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyData[key] !== undefined) {
                monthlyData[key]++;
            }
        });

        renderCategoryChart(categoryData);
        renderMonthlyChart(monthlyData);
    } catch (error) {
        console.error('Error loading charts:', error);
    }
}

/**
 * Render category chart
 * @param {Object} data - Category data
 */
function renderCategoryChart(data) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
                    '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                }
            }
        }
    });
}

/**
 * Render monthly chart
 * @param {Object} data - Monthly data
 */
function renderMonthlyChart(data) {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;

    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
    }

    const labels = Object.keys(data).map(key => {
        const [year, month] = key.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
    });

    monthlyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Reports',
                data: Object.values(data),
                backgroundColor: '#3b82f6',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Mobile menu toggle
    document.getElementById('menuToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // Close modal on overlay click
    document.getElementById('reportDetailModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeReportDetailModal();
        }
    });

    document.getElementById('closeReportDetailModal')?.addEventListener('click', closeReportDetailModal);

    // Filter inputs
    document.getElementById('searchInput')?.addEventListener('input', debounce(handleFilterChange));
    document.getElementById('statusFilter')?.addEventListener('change', handleFilterChange);

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
 * Open admin report detail modal
 * @param {string} reportId - Report ID
 */
async function openAdminReportDetail(reportId) {
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

        content.innerHTML = renderAdminReportDetail(report);
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
 * Render admin report detail HTML
 * @param {Object} report - Report data
 * @returns {string} HTML string
 */
function renderAdminReportDetail(report) {
    const statusClass = getStatusBadgeClass(report.status);
    const severityClass = getSeverityBadgeClass(report.severity);

    return `
        <div class="report-detail">
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
                <span class="badge ${statusClass}">${report.status}</span>
                <span class="badge ${severityClass}">${report.severity}</span>
                <span class="badge badge-secondary">${report.category}</span>
            </div>

            <h3 style="margin-bottom: 1rem;">${escapeHtml(report.title)}</h3>

            ${report.image_before ? `
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-size: 0.875rem; color: var(--gray-500); margin-bottom: 0.5rem;">Issue Photo</h4>
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
                    <h4 style="font-size: 0.875rem; color: var(--gray-500); margin-bottom: 0.25rem;">Reported By</h4>
                    <p style="color: var(--gray-700);">${escapeHtml(report.users?.full_name || 'Unknown')}</p>
                </div>
                <div>
                    <h4 style="font-size: 0.875rem; color: var(--gray-500); margin-bottom: 0.25rem;">Date Reported</h4>
                    <p style="color: var(--gray-700);">${formatDate(report.created_at)}</p>
                </div>
                <div>
                    <h4 style="font-size: 0.875rem; color: var(--gray-500); margin-bottom: 0.25rem;">Barangay</h4>
                    <p style="color: var(--gray-700);">${escapeHtml(report.users?.barangay || 'N/A')}</p>
                </div>
            </div>

            <!-- Status Update Section -->
            <div class="proof-upload-section">
                <h4>Update Report Status</h4>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <select id="adminStatusSelect" class="form-select" style="flex: 1; min-width: 200px;">
                        ${STATUSES.map(status => `
                            <option value="${status}" ${report.status === status ? 'selected' : ''}>${status}</option>
                        `).join('')}
                    </select>
                    <button class="btn btn-primary" onclick="updateAdminReportStatus('${report.id}')">
                        Update Status
                    </button>
                </div>
            </div>

            ${report.status === 'Fixed' && report.image_after ? `
                <div style="margin-top: 1.5rem;">
                    <h4 style="font-size: 0.875rem; color: var(--gray-500); margin-bottom: 0.5rem;">Proof of Fix</h4>
                    <img src="${report.image_after}" alt="After photo" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: var(--radius-lg);">
                </div>
            ` : ''}

            ${report.remarks ? `
                <div style="margin-top: 1.5rem; padding: 1rem; background: var(--gray-50); border-radius: var(--radius-lg);">
                    <h4 style="font-size: 0.875rem; color: var(--gray-500); margin-bottom: 0.5rem;">Admin Remarks</h4>
                    <p style="color: var(--gray-700);">${escapeHtml(report.remarks)}</p>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Update report status from admin detail
 * @param {string} reportId - Report ID
 */
async function updateAdminReportStatus(reportId) {
    const statusSelect = document.getElementById('adminStatusSelect');
    const newStatus = statusSelect.value;

    try {
        await updateReportStatus(reportId, newStatus, `Status updated by admin to ${newStatus}`);
        showToast(`Report status updated to ${newStatus}`, 'success');
        
        // Reload data
        await loadAdminStats();
        await loadAllReports();
        
        // Refresh modal
        await openAdminReportDetail(reportId);
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Failed to update status', 'error');
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

    loadAllReports({
        search,
        status: status || undefined
    });
}

/**
 * Handle navigation
 * @param {string} view - View name
 */
function handleNavigation(view) {
    switch (view) {
        case 'all-reports':
            document.getElementById('pageTitle').textContent = 'All Reports';
            loadAllReports();
            break;
        case 'analytics':
            document.getElementById('pageTitle').textContent = 'Analytics';
            loadCharts();
            break;
        case 'users':
            document.getElementById('pageTitle').textContent = 'Users';
            // TODO: Implement users view
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
    subscribeToReports((payload) => {
        console.log('Realtime update:', payload);
        
        // Refresh stats and reports
        loadAdminStats();
        loadAllReports();
        
        // Show notification
        if (payload.eventType === 'INSERT') {
            showToast('New report submitted!', 'info');
        } else if (payload.eventType === 'UPDATE') {
            showToast('Report updated!', 'info');
        }
    });
}

// Export functions
window.openAdminReportDetail = openAdminReportDetail;
window.updateAdminReportStatus = updateAdminReportStatus;
window.updateReportStatusInline = updateReportStatusInline;
