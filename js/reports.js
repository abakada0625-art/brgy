/**
 * AyosPH - Reports Module
 * Handles creating, fetching, and updating reports
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

// Initialize state
let currentReports = [];
let currentUser = null;
let isAdmin = false;

/**
 * Initialize Reports Module
 */
async function initReports() {
    try {
        const session = await window.getSession();
        if (!session) {
            console.warn('No session found');
            return;
        }

        currentUser = session.user;
        
        // Check if user is admin
        const { data: userProfile } = await window.supabaseClient
            .from('users')
            .select('role')
            .eq('id', currentUser.id)
            .single();
        
        isAdmin = userProfile?.role === 'admin';
        console.log('User Role:', isAdmin ? 'Admin' : 'Resident');

        // Load reports
        await loadReports();
        
        // Setup Realtime subscription
        setupRealtimeSubscription();

    } catch (error) {
        console.error('Error initializing reports:', error);
        showToast('Failed to load reports', 'error');
    }
}

/**
 * Load Reports from Supabase
 */
async function loadReports() {
    const tableBody = document.getElementById('reportsTableBody');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    
    if (loadingState) loadingState.style.display = 'block';
    if (tableBody) tableBody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'none';

    try {
        let query = window.supabaseClient
            .from('reports')
            .select(`
                *,
                reporter:users!reported_by(full_name, email)
            `)
            .order('created_at', { ascending: false });

        // If resident, only show their own reports
        if (!isAdmin) {
            query = query.eq('reported_by', currentUser.id);
        }

        const { data, error } = await query;

        if (error) throw error;

        currentReports = data || [];
        renderReports(currentReports);

    } catch (error) {
        console.error('Error loading reports:', error);
        showToast('Failed to fetch reports: ' + error.message, 'error');
        if (emptyState) {
            emptyState.innerHTML = `<div class="error-message">Error loading reports: ${error.message}</div>`;
            emptyState.style.display = 'block';
        }
    } finally {
        if (loadingState) loadingState.style.display = 'none';
    }
}

/**
 * Render Reports to Table
 */
function renderReports(reports) {
    const tableBody = document.getElementById('reportsTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (!reports || reports.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    reports.forEach(report => {
        const row = document.createElement('tr');
        
        // Determine status badge color
        const statusColors = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Under Review': 'bg-blue-100 text-blue-800',
            'In Progress': 'bg-purple-100 text-purple-800',
            'Fixed': 'bg-green-100 text-green-800',
            'Rejected': 'bg-red-100 text-red-800'
        };
        
        const statusClass = statusColors[report.status] || 'bg-gray-100 text-gray-800';
        const date = new Date(report.created_at).toLocaleDateString();
        const reporterName = report.reporter?.full_name || 'Anonymous';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    ${report.image_before ? 
                        `<img class="h-10 w-10 rounded-lg object-cover" src="${report.image_before}" alt="">` : 
                        `<div class="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400">#</div>`
                    }
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${report.title}</div>
                        <div class="text-sm text-gray-500">${report.category}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                    ${report.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${report.severity}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${report.location || 'No location'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${reporterName}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${date}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="viewReportDetails('${report.id}')" class="text-indigo-600 hover:text-indigo-900 mr-3">View</button>
                ${isAdmin ? `<button onclick="openEditModal('${report.id}')" class="text-blue-600 hover:text-blue-900">Manage</button>` : ''}
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Create New Report
 */
async function createReport(formData) {
    const submitBtn = document.getElementById('submitReportBtn');
    const originalText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerText = 'Submitting...';

    try {
        let imageUrl = null;

        // Handle Image Upload
        if (formData.image && formData.image.size > 0) {
            if (!ALLOWED_TYPES.includes(formData.image.type)) {
                throw new Error('Invalid file type. Please upload JPG or PNG.');
            }
            if (formData.image.size > MAX_FILE_SIZE) {
                throw new Error('File too large. Max 5MB.');
            }

            const fileExt = formData.image.name.split('.').pop();
            const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await window.supabaseClient.storage
                .from('report-images')
                .upload(fileName, formData.image);

            if (uploadError) throw uploadError;

            const { data: urlData } = window.supabaseClient.storage
                .from('report-images')
                .getPublicUrl(fileName);
            
            imageUrl = urlData.publicUrl;
        }

        // Insert Report
        const { error: insertError } = await window.supabaseClient
            .from('reports')
            .insert({
                title: formData.title,
                description: formData.description,
                category: formData.category,
                severity: formData.severity,
                location: formData.location,
                image_before: imageUrl,
                reported_by: currentUser.id,
                status: 'Pending',
                remarks: ''
            });

        if (insertError) throw insertError;

        showToast('Report submitted successfully!', 'success');
        closeModal('createReportModal');
        await loadReports(); // Refresh list

    } catch (error) {
        console.error('Error creating report:', error);
        showToast(error.message || 'Failed to submit report', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}

/**
 * Update Report Status (Admin Only)
 */
async function updateReportStatus(reportId, newStatus, remarks = '', imageAfter = null) {
    try {
        let updateData = {
            status: newStatus,
            remarks: remarks,
            updated_at: new Date().toISOString()
        };

        if (newStatus === 'Fixed' && imageAfter) {
            updateData.image_after = imageAfter;
            updateData.fixed_at = new Date().toISOString();
        } else if (newStatus === 'Fixed' && !imageAfter) {
            throw new Error('Proof of fix (image) is required to mark as Fixed.');
        }

        const { error } = await window.supabaseClient
            .from('reports')
            .update(updateData)
            .eq('id', reportId);

        if (error) throw error;

        showToast(`Report marked as ${newStatus}`, 'success');
        await loadReports();
        
        // Close modal if open
        const modal = document.getElementById('editReportModal');
        if (modal) modal.classList.add('hidden');

    } catch (error) {
        console.error('Error updating report:', error);
        showToast(error.message || 'Failed to update report', 'error');
    }
}

/**
 * Setup Realtime Subscription
 */
function setupRealtimeSubscription() {
    window.supabaseClient
        .channel('reports_channel')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'reports' }, 
            () => {
                console.log('Realtime change detected, reloading...');
                loadReports();
            }
        )
        .subscribe();
}

// Global helpers for HTML onclick events
window.viewReportDetails = async (id) => {
    const report = currentReports.find(r => r.id === id);
    if (!report) return;
    
    alert(`Details:\nTitle: ${report.title}\nDescription: ${report.description}\nRemarks: ${report.remarks || 'None'}`);
    // TODO: Implement proper modal for details
};

window.openEditModal = async (id) => {
    const report = currentReports.find(r => r.id === id);
    if (!report || !isAdmin) return;
    
    // Simple prompt for demo, replace with proper modal in UI
    const newStatus = prompt(`Update Status (Pending, Under Review, In Progress, Fixed, Rejected):`, report.status);
    if (newStatus && newStatus !== report.status) {
        let remarks = '';
        let imageAfter = null;
        
        if (newStatus === 'Fixed') {
            remarks = prompt('Enter resolution remarks:');
            // In real UI, this would be a file input
            const imageUrl = prompt('Enter URL of After Photo (or leave empty to skip):');
            if (imageUrl) imageAfter = imageUrl;
        } else {
            remarks = prompt('Enter remarks (optional):') || '';
        }

        await updateReportStatus(id, newStatus, remarks, imageAfter);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', initReports);