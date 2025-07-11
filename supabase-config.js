// Supabase configuration for frontend
const SUPABASE_URL = 'https://nlzmdcogftvfweirlnzv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sem1kY29nZnR2ZndlaXJsbnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzkzMDUsImV4cCI6MjA2NTY1NTMwNX0.AtHbd2JOLdANBD9Zlxy6bkUC4MWRC4x-xnHabk_6iTY';
// TEMPORARILY using service role for admin operations
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sem1kY29nZnR2ZndlaXJsbnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDA3OTMwNSwiZXhwIjoyMDY1NjU1MzA1fQ.ZHj5eGPaYn3aql9jdkYXzSp4eX5P0KtrxkHOT6n_oXo';

// Import Supabase from CDN
const { createClient } = supabase;

// Create clients only if they don't already exist (prevent multiple instances)
if (!window.supabaseClient) {
    // Create both clients - one for auth/normal operations, one for admin operations
    window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Created Supabase client');
}

if (!window.supabaseAdminClient) {
    window.supabaseAdminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log('Created Supabase admin client');
} 