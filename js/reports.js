/**
 * AyosPH - Report Management Module
 */

async function loadReports(userId, isAdmin = false) {
    const container = document.getElementById(isAdmin ? 'admin-reports-list' : 'all-reports-container');
    const recentContainer = document.getElementById('recent-reports-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; padding:2rem;"><i class="ph ph-spinner ph-spin" style="font-size:2rem; color:var(--primary);"></i></div>';

    try {
        let query = window.supabaseClient.from('reports').select('*, users(full_name)').order('created_at', { ascending: false });
        
        if (!isAdmin) {
            query = query.eq('reported_by', userId);
        }

        const { data, error } = await query;

        if (error) throw error;

        container.innerHTML = '';
        
        if (data.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:3rem; color:var(--secondary);">
                <i class="ph ph-folder-open" style="font-size:3rem; margin-bottom:1rem; opacity:0.5;"></i>
                <p>No reports found.</p>
            </div>`;
            if(recentContainer) recentContainer.innerHTML = container.innerHTML;
            updateStats([]);
            return;
        }

        // Render Full List
        data.forEach(report => {
            const card = createReportCard(report, isAdmin);
            container.insertAdjacentHTML('beforeend', card);
        });

        // Render Recent (Overview)
        if (recentContainer) {
            recentContainer.innerHTML = '';
            data.slice(0, 3).forEach(report => {
                recentContainer.insertAdjacentHTML('beforeend', createReportCard(report, false, true));
            });
        }

        updateStats(data);

    } catch (error) {
        console.error('Error loading reports:', error);
        container.innerHTML = `<p style="color:red; text-align:center;">Error loading reports: ${error.message}</p>`;
    }
}

function createReportCard(report, isAdmin, isCompact = false) {
    const imageUrl = report.image_before 
        ? `https://bjcarjugqrbwkrctcjrp.supabase.co/storage/v1/object/public/report-images/${report.image_before}`
        : 'https://via.placeholder.com/400x300?text=No+Image';

    if (isCompact) {
        return `
        <div style="background:white; padding:1rem; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:1rem; display:flex; gap:1rem; align-items:center;">
            <img src="${imageUrl}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;" />
            <div style="flex:1;">
                <h4 style="font-weight:600; margin:0;">${report.title}</h4>
                <p style="font-size:0.85rem; color:var(--secondary); margin:0.25rem 0;">${formatDate(report.created_at)}</p>
            </div>
            ${getStatusBadge(report.status)}
        </div>`;
    }

    const adminActions = isAdmin ? `
        <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid #e2e8f0; display:flex; gap:0.5rem;">
            <select id="status-${report.id}" class="form-select" style="padding:0.5rem; font-size:0.85rem;">
                <option value="Pending" ${report.status === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Under Review" ${report.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                <option value="In Progress" ${report.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                <option value="Fixed" ${report.status === 'Fixed' ? 'selected' : ''}>Fixed</option>
                <option value="Rejected" ${report.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
            </select>
            <button onclick="updateReportStatus('${report.id}')" class="btn btn-primary" style="padding:0.5rem 1rem; font-size:0.85rem;">Update</button>
            ${report.status === 'Fixed' && report.image_after ? 
                `<a href="https://bjcarjugqrbwkrctcjrp.supabase.co/storage/v1/object/public/report-images/${report.image_after}" target="_blank" class="btn btn-outline" style="padding:0.5rem;">Proof</a>` : ''}
        </div>
    ` : '';

    return `
    <div class="report-card" style="background:white; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden; margin-bottom:1rem; transition:transform 0.2s;">
        <div style="display:flex; flex-wrap:wrap;">
            <img src="${imageUrl}" style="width:100%; max-width:200px; height:200px; object-fit:cover;" />
            <div style="flex:1; padding:1.25rem;">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:0.5rem;">
                    <h3 style="font-size:1.1rem; font-weight:700; margin:0;">${report.title}</h3>
                    ${getStatusBadge(report.status)}
                </div>
                <p style="color:var(--secondary); font-size:0.9rem; margin-bottom:0.75rem;">${report.description}</p>
                <div style="display:flex; gap:1rem; font-size:0.85rem; color:var(--secondary); margin-bottom:0.75rem;">
                    <span><i class="ph ph-tag"></i> ${report.category}</span>
                    <span><i class="ph ph-map-pin"></i> ${report.location}</span>
                    <span><i class="ph ph-calendar"></i> ${formatDate(report.created_at)}</span>
                </div>
                <div style="font-size:0.85rem;">
                    <strong>Reported by:</strong> ${report.users?.full_name || 'Anonymous'}
                </div>
                ${adminActions}
            </div>
        </div>
    </div>`;
}

async function handleReportSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    
    submitBtn.disabled = true;
    submitBtn.innerText = 'Submitting...';

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('Not logged in');

        const fileInput = document.getElementById('image-input');
        let imagePath = null;

        // Upload Image
        if (fileInput.files[0]) {
            const file = fileInput.files[0];
            const fileName = `${user.id}_${Date.now()}_${file.name}`;
            const { error: uploadError } = await window.supabaseClient.storage
                .from(STORAGE_BUCKET)
                .upload(fileName, file);
            
            if (uploadError) throw uploadError;
            imagePath = fileName;
        }

        // Insert Report
        const { error } = await window.supabaseClient.from('reports').insert({
            title: form.title.value,
            category: form.category.value,
            severity: form.severity.value,
            description: form.description.value,
            location: form.location.value,
            image_before: imagePath,
            reported_by: user.id,
            status: 'Pending'
        });

        if (error) throw error;

        showToast('Report submitted successfully!', 'success');
        closeReportModal();
        form.reset();
        document.getElementById('image-preview').style.display = 'none';
        
        // Refresh Data
        loadReports(user.id, false);

    } catch (error) {
        console.error(error);
        showToast('Failed to submit report: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}

async function updateReportStatus(reportId) {
    const statusSelect = document.getElementById(`status-${reportId}`);
    const newStatus = statusSelect.value;
    
    // Admin Proof of Fix Logic
    if (newStatus === 'Fixed') {
        const hasProof = confirm("Did you upload the 'After' photo? If not, click Cancel to upload it first.");
        if (!hasProof) {
            // In a full version, open a modal here to upload proof. 
            // For now, we proceed but warn.
        }
    }

    try {
        const { error } = await window.supabaseClient
            .from('reports')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', reportId);

        if (error) throw error;
        showToast('Status updated!', 'success');
        
        // Refresh Admin View
        const session = await getSession();
        loadReports(session.user.id, true);

    } catch (error) {
        showToast('Error updating status', 'error');
    }
}

function updateStats(reports) {
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'Pending').length;
    const resolved = reports.filter(r => r.status === 'Fixed').length;
    
    if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total;
    if(document.getElementById('stat-pending')) document.getElementById('stat-pending').innerText = pending;
    if(document.getElementById('stat-resolved')) document.getElementById('stat-resolved').innerText = resolved;
}

// Modal Helpers
window.openReportModal = () => document.getElementById('report-modal').classList.add('active');
window.closeReportModal = () => {
    document.getElementById('report-modal').classList.remove('active');
    document.getElementById('report-form').reset();
    document.getElementById('image-preview').style.display = 'none';
};
window.previewImage = (input) => {
    const preview = document.getElementById('image-preview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => { preview.src = e.target.result; preview.style.display = 'block'; };
        reader.readAsDataURL(input.files[0]);
    }
};
window.detectLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            document.getElementById('location-input').value = `${pos.coords.latitude}, ${pos.coords.longitude}`;
            showToast('Location detected!', 'success');
        }, () => showToast('Could not detect location', 'error'));
    }
};