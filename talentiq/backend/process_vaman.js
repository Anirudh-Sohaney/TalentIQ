const { createClient } = require('@supabase/supabase-js');
const pdf = require('pdf-parse');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''; // I don't have it locally!
// Wait, I can use the ai-proxy!
