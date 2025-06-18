const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nlzmdcogftvfweirlnzv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sem1kY29nZnR2ZndlaXJsbnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzkzMDUsImV4cCI6MjA2NTY1NTMwNX0.AtHbd2JOLdANBD9Zlxy6bkUC4MWRC4x-xnHabk_6iTY';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase; 