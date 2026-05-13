/**
 * AyosPH - Report Handling Module
 */

async function loadReports(userId) {
    const { data, error } = await window.supabaseClient
        .from('reports')
        .select('*')
        .eq('reported_by', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading reports:', error);
        return;
    }

    renderReports(data);
    updateStats(data);
}

function renderReports(reports) {
    const container = document.getElementById('all-reports-container');
    const recentContainer = document.getElementById('recent-reports-container');
    
    if (reports.length === 0) {
        const emptyState = `<div style="text-align:center; padding: 3rem; color: var(--secondary);"><i class="ph ph-folder-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i><p>No reports found. Submit your first report!</p></div>`;
        if(container) container.innerHTML = emptyState;
        if(recentContainer) recentContainer.innerHTML = emptyState;
        return;
    }

    const html = reports.map(report => createReportCard(report)).join('');
    
    if (container) container.innerHTML = html;
    if (recentContainer) {
        // Show only top 3 for overview
        recentContainer.innerHTML = reports.slice(0, 3).map(createReportCard).join('');
    }
}

function createReportCard(report) {
    const statusClass = `badge-${report.status.toLowerCase().replace(' ', '-')}`;
    const date = new Date(report.created_at).toLocaleDateString();
    
    return `
    <div class="report-card">
        <img src="${report.image_before}" alt="Issue" class="report-img" onerror="this.src='https://via.placeholder.com/100?text=No+Image'">
        <div class="report-info">
            <div class="report-header">
                <h4 style="font-weight: 600; font-size: 1.1rem;">${report.title}</h4>
                <span class="badge ${statusClass}">${report.status}</span>
            </div>
            <p style="color: var(--secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">${report.category} • ${report.severity}</p>
            <p style="font-size: 0.9rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${report.description}</p>
            <div style="margin-top: 0.75rem; font-size: 0.8rem; color: #94a3b8;">
                <i class="ph ph-clock"></i> ${date} • <i class="ph ph-map-pin"></i> ${report.location}
            </div>
        </div>
    </div>
    `;
}

function updateStats(reports) {
    document.getElementById('stat-total').innerText = reports.length;
    document.getElementById('stat-pending').innerText = reports.filter(r => ['Pending', 'Under Review'].includes(r.status)).length;
    document.getElementById('stat-resolved').innerText = reports.filter(r => r.status === 'Fixed').length;
}

async function handleReportSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.innerText = 'Submitting...';

    try {
        const session = await getSession();
        const file = form.image.files[0];
        let imagePath = '';

        // Upload Image
        if (file) {
            const fileName = `report_${Date.now()}_${file.name}`;
            const { error: uploadError, data } = await window.supabaseClient.storage.from('report-images').upload(fileName, file);
            if (uploadError) throw uploadError;
            imagePath = data.path;
        }

        // Insert Report
        const { error } = await window.supabaseClient.from('reports').insert({
            title: form.title.value,
            category: form.category.value,
            severity: form.severity.value,
            description: form.description.value,
            location: form.location.value,
            image_before: imagePath,
            reported_by: session.user.id,
            status: 'Pending'
        });

        if (error) throw error;

        showToast('Report submitted successfully!', 'success');
        closeReportModal();
        form.reset();
        document.getElementById('image-preview').style.display = 'none';
        
        // Reload reports
        loadReports(session.user.id);

    } catch (error) {
        console.error(error);
        showToast('Failed to submit report: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Submit Report';
    }
}