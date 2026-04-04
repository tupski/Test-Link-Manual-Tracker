/**
 * backend/models/supabase.js
 * Koneksi ke Supabase menggunakan service role key (full access, bypass RLS).
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  // Jangan exit — lempar error saat digunakan agar Vercel tidak crash saat boot
  console.error('[Supabase] ❌ SUPABASE_URL atau SUPABASE_SERVICE_KEY tidak diset!');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

module.exports = supabase;
