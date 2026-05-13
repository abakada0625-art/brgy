/**
 * AyosPH - Reports Module
 * ========================
 * Handles CRUD operations for community reports.
 */

let currentUser = null;
let selectedFile = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await initReports();
});

async function initReports() {
    const _supabase = getSupabase();
    
    // Get Current User
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = user;

    // Load initial data
    await loadReports();
    setupEventListeners();
    setupRealtime();
}

/**
 * Fetch reports for the current user
 */
async function loadReports(filter = 'all', search = '') {
    const _supabase = getSupabase();
    const listContainer = document.getElementById('allReportsList');
    const recentContainer = document.getElementById('recentReportsList');
    
    if (!listContainer) return;

    // Show loading
    listContainer.innerHTML = '<div class="loading-state">Loading reports...</div>';

    try {
        let query = _supabase
            .from('reports')
            .select('*')
            .eq('reported_by', currentUser.id)
            .order('created_at', { ascending: false });

        // Apply Filters
        if (filter !== 'all') {
            query = query.eq('status', filter);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Filter by search text manually if needed (Supabase text search requires setup)
        let reports = data;
        if (search) {
            const lowerSearch = search.toLowerCase();
            reports = data.filter(r => 
                r.title.toLowerCase().includes(lowerSearch) || 
                r.description.toLowerCase().includes(lowerSearch)
            );
        }

        // Render All Reports
        if (reports.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-file-text"></i>
                    <h3>No reports found</h3>
                    <p>Submit your first community report today!</p>
                </div>`;
        } else {
            listContainer.innerHTML = reports.map(report => createReportCard(report)).join('');
            
            // Update Recent (Top 3)
            if (recentContainer) {
                recentContainer.innerHTML = reports.slice(0, 3).map(report => createReportCard(report, true)).join('');
            }
            
            updateStats(reports);
        }

    } catch (error) {
        console.error('Error loading reports:', error);
        listContainer.innerHTML = `<div class="error-state">Failed to load reports: ${error.message}</div>`;
    }
}

/**
 * Create HTML for a report card
 */
function createReportCard(report, isCompact = false) {
    const statusClass = getStatusClass(report.status);
    const date = new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    const imageHtml = report.image_before 
        ? `<img src="${report.image_before}" alt="Issue" class="report-img">` 
        : `<div class="no-image"><i class="ph ph-image"></i></div>`;

    return `
        <div class="report-card ${isCompact ? 'compact' : ''}">
            <div class="report-image">
                ${imageHtml}
                <span class="status-badge ${statusClass}">${report.status}</span>
            </div>
            <div class="report-content">
                <div class="report-header">
                    <h4>${report.title}</h4>
                    <span class="category-tag">${report.category}</span>
                </div>
                <p class="report-desc">${isCompact && report.description.length > 60 ? report.description.substring(0, 60) + '...' : report.description}</p>
                <div class="report-meta">
                    <span><i class="ph ph-map-pin"></i> ${report.location}</span>
                    <span><i class="ph ph-clock"></i> ${date}</span>
                </div>
                ${report.remarks ? `<div class="admin-reply"><strong>Admin:</strong> ${report.remarks}</div>` : ''}
            </div>
        </div>
    `;
}

/**
 * Update Statistics Cards
 */
function updateStats(reports) {
    document.getElementById('totalReports').textContent = reports.length;
    document.getElementById('pendingReports').textContent = reports.filter(r => r.status === 'Pending').length;
    document.getElementById('fixedReports').textContent = reports.filter(r => r.status === 'Fixed').length;
    document.getElementById('emergencyReports').textContent = reports.filter(r => r.severity === 'Emergency').length;
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
    // Create Report Button
    const createBtn = document.getElementById('createReportBtn');
    const modal = document.getElementById('reportModal');
    const closeBtns = document.querySelectorAll('.close-modal');

    if (createBtn) {
        createBtn.addEventListener('click', () => {
            modal.classList.add('active');
        });
    }

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.classList.remove('active');
            resetForm();
        });
    });

    // File Upload
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('reportImage');
    const preview = document.getElementById('imagePreview');

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) handleFileSelect(e.target.files[0]);
        });

        // Drag and Drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
        });
    }

    // GPS Button
    const gpsBtn = document.getElementById('gpsBtn');
    const locationInput = document.getElementById('reportLocation');
    if (gpsBtn && locationInput) {
        gpsBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                showToast('Geolocation not supported', 'error');
                return;
            }
            gpsBtn.innerHTML = '<i class="ph ph-spinner spinning"></i> Locating...';
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    locationInput.value = `${position.coords.latitude}, ${position.coords.longitude}`;
                    gpsBtn.innerHTML = '<i class="ph ph-check"></i> Located';
                    showToast('Location detected!', 'success');
                },
                () => {
                    showToast('Could not get location', 'error');
                    gpsBtn.innerHTML = '<i class="ph ph-crosshair"></i> Retry';
                }
            );
        });
    }

    // Form Submit
    const form = document.getElementById('reportForm');
    if (form) {
        form.addEventListener('submit', handleReportSubmit);
    }

    // Filters
    const filterSelect = document.getElementById('filterStatus');
    const searchInput = document.getElementById('searchInput');
    
    if (filterSelect) filterSelect.addEventListener('change', (e) => loadReports(e.target.value, searchInput?.value || ''));
    if (searchInput) searchInput.addEventListener('input', (e) => loadReports(filterSelect?.value || 'all', e.target.value));
}

/**
 * Handle File Selection & Preview
 */
function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('Image size must be less than 5MB', 'error');
        return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `<img src="${e.target.result}" style="max-height: 200px; border-radius: 8px;">`;
    };
    reader.readAsDataURL(file);
}

/**
 * Submit New Report
 */
async function handleReportSubmit(e) {
    e.preventDefault();
    const _supabase = getSupabase();
    const submitBtn = document.getElementById('submitReportBtn');
    const originalText = submitBtn.innerHTML;

    try {
        // Disable button
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph ph-spinner spinning"></i> Uploading...';

        let imageUrl = null;

        // Upload Image if exists
        if (selectedFile) {
            const fileName = `${currentUser.id}/${Date.now()}_${selectedFile.name}`;
            const { error: uploadError } = await _supabase.storage
                .from('report-images')
                .upload(fileName, selectedFile);

            if (uploadError) throw uploadError;

            const { data: urlData } = _supabase.storage
                .from('report-images')
                .getPublicUrl(fileName);
            
            imageUrl = urlData.publicUrl;
        }

        // Insert Report
        const { error: insertError } = await _supabase
            .from('reports')
            .insert({
                title: document.getElementById('reportTitle').value,
                description: document.getElementById('reportDescription').value,
                category: document.getElementById('reportCategory').value,
                severity: document.getElementById('reportSeverity').value,
                location: document.getElementById('reportLocation').value,
                image_before: imageUrl,
                status: 'Pending',
                reported_by: currentUser.id
            });

        if (insertError) throw insertError;

        showToast('Report submitted successfully!', 'success');
        
        // Close modal and reset
        document.getElementById('reportModal').classList.remove('active');
        resetForm();
        
        // Reload data
        await loadReports();

    } catch (error) {
        console.error('Submit error:', error);
        showToast('Failed to submit report: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Reset Form
 */
function resetForm() {
    document.getElementById('reportForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    selectedFile = null;
}

/**
 * Setup Realtime Subscription
 */
function setupRealtime() {
    const _supabase = getSupabase();
    
    _supabase.channel('reports')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'reports' }, 
            (payload) => {
                console.log('Realtime update:', payload);
                // Only refresh if the change belongs to current user or is a global update we care about
                if (payload.new?.reported_by === currentUser.id) {
                    loadReports();
                    showToast('Report updated!', 'info');
                }
            }
        )
        .subscribe();
}

/**
 * Helper: Get Status Class
 */
function getStatusClass(status) {
    switch(status) {
        case 'Pending': return 'status-pending';
        case 'Under Review': return 'status-review';
        case 'In Progress': return 'status-progress';
        case 'Fixed': return 'status-fixed';
        case 'Rejected': return 'status-rejected';
        default: return '';
    }
}

// Expose functions globally if needed
window.loadReports = loadReports;