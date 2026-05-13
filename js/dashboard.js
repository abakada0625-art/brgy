/**
 * AyosPH - Admin Dashboard Logic
 */

let currentUser = null;
let allReports = [];
let currentReportId = null;
let categoryChartInstance = null;
let monthlyChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    const session = await getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const { data: profile } = await window.supabaseClient
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        window.location.href = 'dashboard.html';
        return;
    }

    currentUser = profile;
    initUI();
    loadDashboardData();
    setupNavigation();
    setupRealtime();
});

function initUI() {
    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userAvatar').textContent = currentUser.full_name.charAt(0).toUpperCase();
    
    document.getElementById('mobileMenuBtn').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // Filters
    document.getElementById('adminSearch').addEventListener('input', filterReports);
    document.getElementById('adminStatusFilter').addEventListener('change', filterReports);
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    const pageTitle = document.getElementById('pageTitle');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(s => { s.classList.add('hidden'); s.classList.remove('active'); });
            document.getElementById(target).classList.remove('hidden');
            document.getElementById(target).classList.add('active');
            pageTitle.textContent = item.textContent.trim();
            document.getElementById('sidebar').classList.remove('active');

            if(target === 'reports') loadAllReports();
        });
    });
}

async function loadDashboardData() {
    const { data, error } = await window.supabaseClient
        .from('reports')
        .select('*');

    if (error) return console.error(error);

    allReports = data;
    updateStats(data);
    renderCharts(data);
}

function updateStats(reports) {
    document.getElementById('adminStatTotal').textContent = reports.length;
    document.getElementById('adminStatPending').textContent = reports.filter(r => ['Pending', 'Under Review'].includes(r.status)).length;
    document.getElementById('adminStatFixed').textContent = reports.filter(r => r.status === 'Fixed').length;
    document.getElementById('adminStatEmergency').textContent = reports.filter(r => r.severity === 'Emergency' && r.status !== 'Fixed').length;
}

function renderCharts(reports) {
    // Category Data
    const categories = {};
    reports.forEach(r => { categories[r.category] = (categories[r.category] || 0) + 1; });
    
    const ctxCat = document.getElementById('categoryChart').getContext('2d');
    if(categoryChartInstance) categoryChartInstance.destroy();
    
    categoryChartInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#64748b', '#8b5cf6'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // Monthly Data (Simplified)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = new Array(12).fill(0);
    
    reports.forEach(r => {
        const month = new Date(r.created_at).getMonth();
        monthlyData[month]++;
    });

    const ctxMon = document.getElementById('monthlyChart').getContext('2d');
    if(monthlyChartInstance) monthlyChartInstance.destroy();

    monthlyChartInstance = new Chart(ctxMon, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Reports',
                data: monthlyData,
                backgroundColor: '#4f46e5',
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

async function loadAllReports() {
    // Re-fetch to ensure latest
    const { data } = await window.supabaseClient.from('reports').select('*').order('created_at', { ascending: false });
    if(data) {
        allReports = data;
        filterReports();
    }
}

function filterReports() {
    const search = document.getElementById('adminSearch').value.toLowerCase();
    const status = document.getElementById('adminStatusFilter').value;

    const filtered = allReports.filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(search) || r.location.toLowerCase().includes(search);
        const matchesStatus = status === 'all' || r.status === status;
        return matchesSearch && matchesStatus;
    });

    renderTable(filtered);
}

function renderTable(reports) {
    const tbody = document.getElementById('adminReportsTable');
    if(reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;">No reports found</td></tr>';
        return;
    }

    tbody.innerHTML = reports.map(r => `
        <tr>
            <td>#${r.id.substring(0,8)}</td>
            <td><strong>${r.title}</strong><br><small class="text-muted">${r.location}</small></td>
            <td>${r.category}</td>
            <td><span class="badge badge-${r.status.toLowerCase().replace(' ', '-')}">${r.status}</span></td>
            <td><span class="badge ${r.severity === 'Emergency' ? 'badge-emergency' : ''}">${r.severity}</span></td>
            <td>${new Date(r.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openReportDetail('${r.id}')">Manage</button>
            </td>
        </tr>
    `).join('');
}

// Modal Logic
window.openReportDetail = async (id) => {
    currentReportId = id;
    const report = allReports.find(r => r.id === id);
    if(!report) return;

    document.getElementById('detailTitle').textContent = report.title;
    document.getElementById('detailCategory').textContent = report.category;
    document.getElementById('detailSeverity').textContent = report.severity;
    document.getElementById('detailStatus').textContent = report.status;
    document.getElementById('detailLocation').textContent = report.location;
    document.getElementById('detailDesc').textContent = report.description;
    
    // Fetch User Name
    const { data: user } = await window.supabaseClient.from('users').select('full_name').eq('id', report.reported_by).single();
    document.getElementById('detailUser').textContent = user ? user.full_name : 'Unknown';

    // Images
    const baseUrl = 'https://bjcarjugqrbwkrctcjrp.supabase.co/storage/v1/object/public/report-images/';
    document.getElementById('detailImgBefore').src = report.image_before ? `${baseUrl}${report.image_before}` : 'https://via.placeholder.com/400?text=No+Image';
    
    const afterContainer = document.getElementById('detailImgAfterContainer');
    if(report.image_after) {
        document.getElementById('detailImgAfter').src = `${baseUrl}${report.image_after}`;
        afterContainer.classList.remove('hidden');
    } else {
        afterContainer.classList.add('hidden');
    }

    // Reset Form
    document.getElementById('updateStatus').value = report.status;
    document.getElementById('updateRemarks').value = report.remarks || '';
    document.getElementById('proofUploadGroup').style.display = 'none';
    document.getElementById('proofImage').value = '';

    // Show proof upload if selecting "Fixed"
    document.getElementById('updateStatus').onchange = (e) => {
        if(e.target.value === 'Fixed' && !report.image_after) {
            document.getElementById('proofUploadGroup').style.display = 'block';
        } else {
            document.getElementById('proofUploadGroup').style.display = 'none';
        }
    };

    document.getElementById('reportDetailModal').classList.add('active');
};

window.closeReportDetailModal = () => {
    document.getElementById('reportDetailModal').classList.remove('active');
    currentReportId = null;
};

window.submitAdminUpdate = async () => {
    const status = document.getElementById('updateStatus').value;
    const remarks = document.getElementById('updateRemarks').value;
    const proofFile = document.getElementById('proofImage').files[0];

    if(status === 'Fixed' && !allReports.find(r => r.id === currentReportId).image_after && !proofFile) {
        showToast('Please upload proof of fix image', 'warning');
        return;
    }

    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Updating...';

    try {
        let imagePath = null;
        if(proofFile) {
            const fileExt = proofFile.name.split('.').pop();
            const fileName = `fixed_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const { error: uploadError } = await window.supabaseClient.storage.from('report-images').upload(fileName, proofFile);
            if(uploadError) throw uploadError;
            imagePath = fileName;
        }

        const updateData = {
            status,
            remarks,
            updated_at: new Date().toISOString(),
            assigned_to: currentUser.id
        };

        if(imagePath) updateData.image_after = imagePath;
        if(status === 'Fixed') updateData.fixed_at = new Date().toISOString();

        const { error } = await window.supabaseClient.from('reports').update(updateData).eq('id', currentReportId);
        if(error) throw error;

        showToast('Report updated successfully', 'success');
        closeReportDetailModal();
        loadDashboardData();
        if(document.getElementById('reports').classList.contains('active') === false) {
             // If on dashboard, just refresh stats, else refresh table
             loadAllReports(); 
        } else {
            loadAllReports();
        }

    } catch (error) {
        console.error(error);
        showToast('Update failed: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Update Report';
    }
};

function setupRealtime() {
    window.supabaseClient.channel('public:reports')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
            loadDashboardData();
            if(!document.getElementById('dashboard').classList.contains('hidden')) {
                // Refresh table if visible
            }
        })
        .subscribe();
}