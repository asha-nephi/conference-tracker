// Public config — safe to expose. The anon key can only INSERT check-ins
// (enforced by Postgres row-level security) and call two narrow RPC
// functions: one returns aggregate counts only, the other requires the
// dashboard PIN (checked server-side in Postgres) before returning any
// name/phone/address/investigator details.
const SUPABASE_URL = "https://fowcuksbvsmtqmmciclq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvd2N1a3NidnNtdHFtbWNpY2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzc5MzcsImV4cCI6MjEwMjYxMzkzN30.r1MoAOhkBCwuJFWaH6jnmBLvGBEceYy9FfsS0gMSaOc";

async function supabaseInsertCheckin(record) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/checkins`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(record)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase insert failed (${res.status}): ${text}`);
  }
}

async function supabaseGetTotals(zone, session) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_checkin_totals`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_zone: zone || null, p_session: session || null })
  });
  if (!res.ok) throw new Error(`Supabase totals failed (${res.status})`);
  return res.json();
}

async function supabaseGetFullCheckins(pin, zone, session) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_full_checkins`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_pin: pin, p_zone: zone || null, p_session: session || null })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text.includes('invalid pin') ? 'Wrong PIN' : `Supabase request failed (${res.status})`);
  }
  return res.json();
}
