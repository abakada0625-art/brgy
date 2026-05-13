/**
 * AyosPH - Report Management Module (FIXED)
 */

// CONFIGURATION: Update this if your FK name is different from the default
const REPORTED_BY_FK = 'reports_reported_by_fkey'; 
const ASSIGNED_TO_FK = 'reports_assigned_to_fkey';

async function loadReports(userId, isAdmin = false) {
    const container = document.getElementById(isAdmin ? 'admin-reports-list' : 'all-reports-container');
    const recentContainer = document.getElementById('recent-reports-container');
    
    if (!container) return;

    // Show loading state
    container.innerHTML = '<div style="text-align:center; padding:2rem;"><i class="ph ph-spinner ph-spin" style="font-size:2rem; color:var(--primary);"></i><p style="margin-top:0.5rem">Loading reports...</p></div>';

    try {
        // FIX: Explicitly specify the foreign key 'reported_by' for the join
        // Syntax: table!foreign_key_column(column_names)
        let query = window.supabaseClient
            .from('reports')
            .select(`
                *,
                users!reported_by(full_name, email)
            `)
            .order('created_at', { ascending: false });
        
        if (!isAdmin) {
            query = query.eq('reported_by', userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Supabase Error:", error);
            throw error;
        }

        container.innerHTML = '';
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:3rem; color:var(--secondary);">
                    <i class="ph ph-folder-open" style="font-size:3rem; margin-bottom:1rem; opacity:0.5;"></i>
                    <p>No reports found yet.</p>
                    ${!isAdmin ? '<button onclick="openReportModal()" class="btn btn-primary" style="margin-top:1rem;">Create First Report</button>' : ''}
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
        container.innerHTML = `
            <div style="text-align:center; padding:2rem; color:#ef4444; background:#fef2f2; border-radius:8px;">
                <i class="ph ph-warning-circle" style="font-size:2rem;"></i>
                <p style="margin-top:0.5rem; font-weight:600;">Error loading reports</p>
                <p style="font-size:0.85rem;">${error.message}</p>
            </div>`;
    }
}

function createReportCard(report, isAdmin, isCompact = false) {
    const imageUrl = report.image_before 
        ? `https://bjcarjugqrbwkrctcjrp.supabase.co/storage/v1/object/public/report-images/${report.image_before}`
        : 'https://via.placeholder.com/400x300?text=No+Image';

    const reporterName = report.users?.full_name || 'Anonymous Resident';

    if (isCompact) {
        return `
        <div style="background:white; padding:1rem; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:1rem; display:flex; gap:1rem; align-items:center; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            <img src="${imageUrl}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;" />
            <div style="flex:1;">
                <h4 style="font-weight:600; margin:0; color:var(--dark);">${report.title}</h4>
                <p style="font-size:0.85rem; color:var(--secondary); margin:0.25rem 0;">${report.category} • ${formatDate(report.created_at)}</p>
            </div>
            ${getStatusBadge(report.status)}
        </div>`;
    }

    const adminActions = isAdmin ? `
        <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid #e2e8f0; display:flex; flex-wrap:wrap; gap:0.75rem; align-items:center;">
            <label style="font-size:0.85rem; font-weight:600; color:var(--secondary);">Update Status:</label>
            <select id="status-${report.id}" class="form-select" style="padding:0.5rem 0.75rem; border-radius:6px; border:1px solid #cbd5e1; min-width:150px;">
                <option value="Pending" ${report.status === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Under Review" ${report.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                <option value="In Progress" ${report.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                <option value="Fixed" ${report.status === 'Fixed' ? 'selected' : ''}>Fixed</option>
                <option value="Rejected" ${report.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
            </select>
            <button onclick="updateReportStatus('${report.id}')" class="btn btn-primary" style="padding:0.5rem 1rem; font-size:0.85rem;">Save Change</button>
            
            ${report.status === 'Fixed' && report.image_after ? 
                `<a href="https://bjcarjugqrbwkrctcjrp.supabase.co/storage/v1/object/public/report-images/${report.image_after}" target="_blank" class="btn btn-outline" style="padding:0.5rem; font-size:0.85rem;"><i class="ph ph-image"></i> View Proof</a>` : 
                (report.status === 'Fixed' ? '<span style="font-size:0.85rem; color:orange;"><i class="ph ph-warning"></i> No proof uploaded</span>' : '')
            }
        </div>
    ` : '';

    return `
    <div class="report-card" style="background:white; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden; margin-bottom:1.5rem; box-shadow:0 2px 4px rgba(0,0,0,0.02); transition:all 0.2s;">
        <div style="display:flex; flex-wrap:wrap;">
            <div style="flex:0 0 200px; position:relative;">
                <img src="${imageUrl}" style="width:100%; height:100%; min-height:200px; object-fit:cover;" />
                <div style="position:absolute; top:0.5rem; left:0.5rem;">
                    ${getStatusBadge(report.severity)}
                </div>
            </div>
            <div style="flex:1; padding:1.5rem;">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:0.75rem;">
                    <div>
                        <h3 style="font-size:1.25rem; font-weight:700; margin:0; color:var(--dark);">${report.title}</h3>
                        <p style="font-size:0.85rem; color:var(--secondary); margin-top:0.25rem;"><i class="ph ph-tag"></i> ${report.category}</p>
                    </div>
                    ${getStatusBadge(report.status)}
                </div>
                
                <p style="color:var(--secondary); line-height:1.6; margin-bottom:1rem;">${report.description}</p>
                
                <div style="display:flex; flex-wrap:wrap; gap:1.5rem; font-size:0.85rem; color:var(--secondary); margin-bottom:1rem; padding:0.75rem; background:#f8fafc; border-radius:8px;">
                    <span><i class="ph ph-map-pin"></i> ${report.location}</span>
                    <span><i class="ph ph-calendar"></i> ${formatDate(report.created_at)}</span>
                    <span><i class="ph ph-user"></i> ${reporterName}</span>
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
    submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Submitting...';

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('Not logged in');

        const fileInput = document.getElementById('image-input');
        let imagePath = null;

        // 1. Upload Image
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await window.supabaseClient.storage
                .from(STORAGE_BUCKET)
                .upload(fileName, file, { upsert: false });
            
            if (uploadError) throw uploadError;
            imagePath = fileName;
        }

        // 2. Insert Report
        const { error } = await window.supabaseClient.from('reports').insert({
            title: form.title.value.trim(),
            category: form.category.value,
            severity: form.severity.value,
            description: form.description.value.trim(),
            location: form.location.value.trim(),
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
        const session = await getSession();
        if(session) loadReports(session.user.id, false);

    } catch (error) {
        console.error(error);
        showToast('Failed: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}

async function updateReportStatus(reportId) {
    const statusSelect = document.getElementById(`status-${reportId}`);
    const newStatus = statusSelect.value;
    
    if (newStatus === 'Fixed') {
        const hasProof = confirm("IMPORTANT: Have you uploaded the 'After' photo? \n\nClick OK if yes. Click Cancel to stop and upload proof first.");
        if (!hasProof) return;
    }

    try {
        const { error } = await window.supabaseClient
            .from('reports')
            .update({ 
                status: newStatus, 
                updated_at: new Date().toISOString(),
                fixed_at: newStatus === 'Fixed' ? new Date().toISOString() : null
            })
            .eq('id', reportId);

        if (error) throw error;
        
        showToast(`Status updated to ${newStatus}`, 'success');
        
        // Refresh Admin View
        const session = await getSession();
        if(session) loadReports(session.user.id, true);

    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

function updateStats(reports) {
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'Pending').length;
    const resolved = reports.filter(r => r.status === 'Fixed').length;
    const emergency = reports.filter(r => r.severity === 'Emergency' && r.status !== 'Fixed').length;
    
    const setStat = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.innerText = val;
    };

    setStat('stat-total', total);
    setStat('stat-pending', pending);
    setStat('stat-resolved', resolved);
    setStat('stat-emergency', emergency);
}

// Global Helpers
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
        const btn = document.querySelector('button[onclick="detectLocation()"]');
        if(btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>'; btn.disabled = true; }
        
        navigator.geolocation.getCurrentPosition(pos => {
            document.getElementById('location-input').value = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
            showToast('Location detected!', 'success');
            if(btn) { btn.innerHTML = '<i class="ph ph-crosshair"></i>'; btn.disabled = false; }
        }, () => {
            showToast('Could not detect location', 'error');
            if(btn) { btn.innerHTML = '<i class="ph ph-crosshair"></i>'; btn.disabled = false; }
        });
    } else {
        showToast('Geolocation not supported', 'error');
    }
};