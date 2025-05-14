import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://ygruxkqxogcnlgtsrbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncnV4a3F4b2djbmxndHNyYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDk4MzMsImV4cCI6MjA2MjYyNTgzM30.WtH5W_nIjRi_gs_aGMWl5ehB2TndRVZqDXPqAWb3axw';
export const supabase = createClient(supabaseUrl, supabaseKey);
