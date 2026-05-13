// js/reports.js

async function createReport(formData) {
    const _supabase = window.supabaseClient;
    
    try {
        // 1. Get current user
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error("Not logged in");

        // 2. Handle Image Upload (if exists)
        let imageUrl = null;
        if (formData.image) {
            const fileExt = formData.image.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await _supabase.storage
                .from('report-images')
                .upload(fileName, formData.image);

            if (uploadError) throw uploadError;

            const { data: urlData } = _supabase.storage
                .from('report-images')
                .getPublicUrl(fileName);
            
            imageUrl = urlData.publicUrl;
        }

        // 3. Insert Report into Database
        const { data, error } = await _supabase
            .from('reports')
            .insert({
                title: formData.title,
                description: formData.description,
                category: formData.category,
                severity: formData.severity,
                location: formData.location,
                image_before: imageUrl,
                status: 'Pending', // Default status
                reported_by: user.id // CRITICAL: Link to user
            })
            .select() // Return the new record
            .single();

        if (error) throw error;

        showToast('Report submitted successfully!', 'success');
        
        // Refresh the list immediately
        if (typeof loadUserReports === 'function') loadUserReports();
        
        return data;

    } catch (error) {
        console.error("Create Report Error:", error);
        showToast('Failed to submit report: ' + error.message, 'error');
        throw error;
    }
}