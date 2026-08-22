import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Talks to the v2 schema by default — the original v1 system (checkins,
// get_checkin_totals, etc. in the public schema) is a completely separate,
// untouched deployment and this client never targets it.
export const supabase = createClient(url, anonKey, {
  db: { schema: 'v2' },
});
