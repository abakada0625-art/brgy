/**
 * AyosPH - Reports Module
 * =========================
 * Handles report creation, fetching, updating, and management.
 */

// Report categories
const CATEGORIES = [
    'Roads',
    'Garbage',
    'Drainage',
    'Flooding',
    'Street Lights',
    'Public Safety',
    'Infrastructure',
    'Others'
];

// Report statuses
const STATUSES = [
    'Pending',
    'Under Review',
    'In Progress',
    'Fixed',
    'Rejected'
];

// Severity levels
const SEVERITIES = [
    'Low',
    'Medium',
    'High',
    'Emergency'
];

/**
 * Create a new report
 * @param {Object} reportData - Report data
 * @returns {Promise<Object>} Created report
 */
async function createReport(reportData) {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        let imageUrl = null;

        // Upload image if provided
        if (reportData.image) {
            imageUrl = await uploadImage(reportData.image, user.id);
        }

        // Create report in database
        const { data, error } = await _supabase
            .from('reports')
            .insert({
                title: reportData.title,
                description: reportData.description,
                category: reportData.category,
                severity: reportData.severity,
                location: reportData.location,
                image_before: imageUrl,
                reported_by: user.id,
                status: 'Pending'
            })
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error creating report:', error);
        throw error;
    }
}

/**
 * Upload image to Supabase Storage
 * @param {File|Blob} file - Image file
 * @param {string} userId - User ID for folder organization
 * @returns {Promise<string>} Image URL
 */
async function uploadImage(file, userId) {
    try {
        const fileName = `${userId}/${Date.now()}_${file.name || 'image.jpg'}`;
        
        const { data, error } = await _supabase.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = _supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

/**
 * Get reports for current user
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} List of reports
 */
async function getUserReports(filters = {}) {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        let query = _supabase
            .from('reports')
            .select(`
                *,
                users!reports_reported_by_fkey (
                    full_name,
                    email
                )
            `)
            .eq('reported_by', user.id)
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.category) {
            query = query.eq('category', filters.category);
        }
        if (filters.search) {
            query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error fetching reports:', error);
        return [];
    }
}

/**
 * Get all reports (for admin)
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} List of reports
 */
async function getAllReports(filters = {}) {
    try {
        let query = _supabase
            .from('reports')
            .select(`
                *,
                users!reports_reported_by_fkey (
                    full_name,
                    email,
                    barangay
                )
            `)
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.category) {
            query = query.eq('category', filters.category);
        }
        if (filters.severity) {
            query = query.eq('severity', filters.severity);
        }
        if (filters.search) {
            query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error fetching all reports:', error);
        return [];
    }
}

/**
 * Get single report by ID
 * @param {string} reportId - Report ID
 * @returns {Promise<Object|null>} Report data
 */
async function getReportById(reportId) {
    try {
        const { data, error } = await _supabase
            .from('reports')
            .select(`
                *,
                users!reports_reported_by_fkey (
                    full_name,
                    email
                )
            `)
            .eq('id', reportId)
            .single();

        if (error) throw error;

        // Get comments
        const { data: comments } = await _supabase
            .from('comments')
            .select(`
                *,
                users (
                    full_name,
                    role
                )
            `)
            .eq('report_id', reportId)
            .order('created_at', { ascending: true });

        data.comments = comments || [];

        return data;
    } catch (error) {
        console.error('Error fetching report:', error);
        return null;
    }
}

/**
 * Update report status
 * @param {string} reportId - Report ID
 * @param {string} status - New status
 * @param {string} remarks - Optional remarks
 * @returns {Promise<Object>} Updated report
 */
async function updateReportStatus(reportId, status, remarks = null) {
    try {
        const updates = {
            status,
            remarks,
            updated_at: new Date().toISOString()
        };

        if (status === 'Fixed') {
            updates.fixed_at = new Date().toISOString();
        }

        const { data, error } = await _supabase
            .from('reports')
            .update(updates)
            .eq('id', reportId)
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error updating report status:', error);
        throw error;
    }
}

/**
 * Update report with proof of fix
 * @param {string} reportId - Report ID
 * @param {File} imageAfter - After photo
 * @param {string} remarks - Remarks
 * @returns {Promise<Object>} Updated report
 */
async function submitProofOfFix(reportId, imageAfter, remarks) {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Upload after image
        const imageUrl = await uploadImage(imageAfter, user.id);

        // Update report
        const { data, error } = await _supabase
            .from('reports')
            .update({
                image_after: imageUrl,
                remarks,
                status: 'Fixed',
                fixed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', reportId)
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error submitting proof of fix:', error);
        throw error;
    }
}

/**
 * Add comment to report
 * @param {string} reportId - Report ID
 * @param {string} message - Comment message
 * @returns {Promise<Object>} Created comment
 */
async function addComment(reportId, message) {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await _supabase
            .from('comments')
            .insert({
                report_id: reportId,
                user_id: user.id,
                message
            })
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
    }
}

/**
 * Delete report
 * @param {string} reportId - Report ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteReport(reportId) {
    try {
        const { error } = await _supabase
            .from('reports')
            .delete()
            .eq('id', reportId);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error deleting report:', error);
        throw error;
    }
}

/**
 * Get report statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getReportStats() {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Check if admin
        const { data: userProfile } = await _supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        let reports;
        if (userProfile?.role === 'admin') {
            reports = await getAllReports();
        } else {
            reports = await getUserReports();
        }

        const stats = {
            total: reports.length,
            pending: reports.filter(r => r.status === 'Pending').length,
            underReview: reports.filter(r => r.status === 'Under Review').length,
            inProgress: reports.filter(r => r.status === 'In Progress').length,
            fixed: reports.filter(r => r.status === 'Fixed').length,
            rejected: reports.filter(r => r.status === 'Rejected').length,
            emergency: reports.filter(r => r.severity === 'Emergency').length
        };

        return stats;
    } catch (error) {
        console.error('Error getting stats:', error);
        return {
            total: 0,
            pending: 0,
            underReview: 0,
            inProgress: 0,
            fixed: 0,
            rejected: 0,
            emergency: 0
        };
    }
}

/**
 * Subscribe to realtime report updates
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
function subscribeToReports(callback) {
    const channel = _supabase
        .channel('reports')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'reports'
            },
            callback
        )
        .subscribe();

    return () => {
        _supabase.removeChannel(channel);
    };
}

// Export functions
window.createReport = createReport;
window.uploadImage = uploadImage;
window.getUserReports = getUserReports;
window.getAllReports = getAllReports;
window.getReportById = getReportById;
window.updateReportStatus = updateReportStatus;
window.submitProofOfFix = submitProofOfFix;
window.addComment = addComment;
window.deleteReport = deleteReport;
window.getReportStats = getReportStats;
window.subscribeToReports = subscribeToReports;
window.CATEGORIES = CATEGORIES;
window.STATUSES = STATUSES;
window.SEVERITIES = SEVERITIES;
