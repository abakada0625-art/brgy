/**
 * AyosPH - Supabase Configuration
 */

// Supabase configuration
// FIXED: Removed trailing space in URL
const SUPABASE_URL = 'https://bjcarjugqrbwkrctcjrp.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY2FyanVncXJid2tyY3RjanJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDU3MTcsImV4cCI6MjA5NDIyMTcxN30.GrEgVIvI4k0N8mA6FEsft6aSn59FuOKZDbue0c6OpbI';

// Initialize Supabase client
// Check if supabase object exists first
if (typeof supabase === 'undefined') {
    console.error('❌ Supabase library not loaded! Check if the script tag is added to HTML.');
} else {
    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Export for use in other modules
    window.supabaseClient = _supabase;
    console.log('✅ Supabase connected successfully');
}

// Storage bucket name for images
const STORAGE_BUCKET = 'report-images';

// Helper function to check if Supabase is configured
function isSupabaseConfigured() {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
}

// Validate configuration on load
if (!isSupabaseConfigured()) {
    console.warn('⚠️ Supabase is not configured. Please update credentials.');
}