/**
 * AyosPH - Supabase Configuration
 * =================================
 * This file initializes the Supabase client with your project credentials.
 * 
 * IMPORTANT: Replace the placeholder values with your actual Supabase credentials.
 * You can find these in your Supabase dashboard under Settings > API.
 */

// Supabase configuration
const SUPABASE_URL = 'https://bjcarjugqrbwkrctcjrp.supabase.co'; // Replace with your Supabase project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY2FyanVncXJid2tyY3RjanJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDU3MTcsImV4cCI6MjA5NDIyMTcxN30.GrEgVIvI4k0N8mA6FEsft6aSn59FuOKZDbue0c6OpbI'; // Replace with your anon/public key

// Initialize Supabase client
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other modules
window.supabaseClient = _supabase;

// Storage bucket name for images
const STORAGE_BUCKET = 'report-images';

// Helper function to check if Supabase is configured
function isSupabaseConfigured() {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
}

// Validate configuration on load
if (!isSupabaseConfigured()) {
    console.warn('⚠️  Supabase is not configured. Please update the credentials in js/supabase.js');
}
