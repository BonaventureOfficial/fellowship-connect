import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : undefined) ||
  'https://zwngnydeplxqbvndfzke.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' ? process.env?.SUPABASE_PUBLISHABLE_KEY : undefined) ||
  'sb_publishable_ih7WfMeHSYlXudBGuDMOfQ_zmvYuMrL';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
