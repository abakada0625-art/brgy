/**
 * AyosPH - Notifications Module
 * ===============================
 * Handles notification management and display.
 */

/**
 * Get notifications for current user
 * @returns {Promise<Array>} List of notifications
 */
async function getNotifications() {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await _supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Updated notification
 */
async function markNotificationAsRead(notificationId) {
    try {
        const { data, error } = await _supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

/**
 * Mark all notifications as read
 * @returns {Promise<boolean>} Success status
 */
async function markAllNotificationsAsRead() {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await _supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
}

/**
 * Delete notification
 * @param {string} notificationId - Notification ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteNotification(notificationId) {
    try {
        const { error } = await _supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
    }
}

/**
 * Get unread notification count
 * @returns {Promise<number>} Count of unread notifications
 */
async function getUnreadNotificationCount() {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { count, error } = await _supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) throw error;

        return count || 0;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
}

/**
 * Subscribe to realtime notification updates
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
function subscribeToNotifications(callback) {
    const { data: { user } } = _supabase.auth.getUser();
    
    if (!user) return () => {};

    const channel = _supabase
        .channel('notifications')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            },
            callback
        )
        .subscribe();

    return () => {
        _supabase.removeChannel(channel);
    };
}

/**
 * Create a notification
 * @param {string} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @returns {Promise<Object>} Created notification
 */
async function createNotification(userId, title, message) {
    try {
        const { data, error } = await _supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                message
            })
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

// Export functions
window.getNotifications = getNotifications;
window.markNotificationAsRead = markNotificationAsRead;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.deleteNotification = deleteNotification;
window.getUnreadNotificationCount = getUnreadNotificationCount;
window.subscribeToNotifications = subscribeToNotifications;
window.createNotification = createNotification;
