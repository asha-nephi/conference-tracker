'use strict';

// Server-side best-effort sync to the shared cloud database. Uses Node's
// built-in fetch (Node 18+). Every call is designed to fail silently and
// never block or break a local check-in — the local JSONL file (lib/store.js)
// is always the source of truth for this laptop; this is only for combining
// totals across gates when internet happens to be reachable.

const SUPABASE_URL = 'https://fowcuksbvsmtqmmciclq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvd2N1a3NidnNtdHFtbWNpY2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzc5MzcsImV4cCI6MjEwMjYxMzkzN30.r1MoAOhkBCwuJFWaH6jnmBLvGBEceYy9FfsS0gMSaOc';
const TIMEOUT_MS = 4000;

function withTimeout(promise, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cleanup: () => clearTimeout(t) };
}

async function syncCheckinToCloud(record) {
  const { signal, cleanup } = withTimeout(null, TIMEOUT_MS);
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/checkins`, {
      method: 'POST',
      signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        id: record.id,
        zone: record.zone,
        session: record.session,
        method: record.method,
        entry_type: record.entry_type,
        adult_name: record.adult_name,
        phone: record.phone,
        address: record.address,
        invited_by: record.invited_by,
        boys_count: record.boys_count,
        girls_count: record.girls_count,
        total_count: record.total_count,
        source: 'local',
        created_at: record.created_at
      })
    });
  } catch (e) {
    // No internet / Supabase unreachable — fine, local JSONL already has it.
  } finally {
    cleanup();
  }
}

async function getCloudTotals(session) {
  const { signal, cleanup } = withTimeout(null, TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_checkin_totals`, {
      method: 'POST',
      signal,
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_session: session || null })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  } finally {
    cleanup();
  }
}

module.exports = { syncCheckinToCloud, getCloudTotals };
