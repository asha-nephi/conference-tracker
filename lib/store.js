'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VALID_METHODS = new Set(['form', 'qr_self', 'fingerprint']);
const VALID_ENTRY_TYPES = new Set(['individual', 'family', 'guest']);
const WARDS = ['Dopemu Ward', 'Ifako Ward', 'Ikeja Ward', 'Maryland Ward', 'Opebi Ward', 'Oshodi Ward', 'Shogunle Ward'];
const VALID_WARDS = new Set(WARDS);

function todaySession() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function createStore(dataDir, zone) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const bySession = new Map(); // session -> array of records
  const fileFor = (session) => path.join(dataDir, `checkins-${zone}-${session}.jsonl`);

  function loadSession(session) {
    if (bySession.has(session)) return bySession.get(session);
    const records = [];
    const file = fileFor(session);
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try { records.push(JSON.parse(trimmed)); } catch (e) { /* skip corrupt line */ }
      }
    }
    bySession.set(session, records);
    return records;
  }

  function recordCheckin(input) {
    const session = (input.session && String(input.session)) || todaySession();
    const method = VALID_METHODS.has(input.method) ? input.method : 'form';
    const entryType = VALID_ENTRY_TYPES.has(input.entry_type) ? input.entry_type : 'individual';
    const partySize = Math.max(1, parseInt(input.party_size, 10) || 1);
    const adultName = input.adult_name ? String(input.adult_name).trim().slice(0, 200) : null;
    const phone = input.phone ? String(input.phone).trim().slice(0, 60) : null;
    const address = input.address ? String(input.address).trim().slice(0, 300) : null;
    const invitedBy = input.invited_by ? String(input.invited_by).trim().slice(0, 200) : null;
    const ward = input.ward && VALID_WARDS.has(String(input.ward).trim()) ? String(input.ward).trim() : null;

    const needsIdentity = entryType === 'family' || entryType === 'guest';
    if (needsIdentity && !adultName) {
      const err = new Error(entryType === 'guest' ? "Guest's name is required" : "Adult's name is required");
      err.statusCode = 400;
      throw err;
    }
    // Guests aren't in the church's membership records, so their contact
    // info is the whole point of capturing them — require it. Members are
    // already on file, so a family check-in only needs a name.
    if (entryType === 'guest' && !phone && !address) {
      const err = new Error('Enter a phone number or address (at least one)');
      err.statusCode = 400;
      throw err;
    }

    const record = {
      id: crypto.randomUUID(),
      zone,
      session,
      method,
      entry_type: entryType,
      adult_name: needsIdentity ? adultName : (adultName || null),
      phone: needsIdentity ? phone : null,
      address: needsIdentity ? address : null,
      invited_by: entryType === 'guest' ? invitedBy : null,
      ward: entryType !== 'guest' ? ward : null,
      party_size: entryType === 'family' ? partySize : 1,
      boys_count: 0,
      girls_count: 0,
      total_count: entryType === 'family' ? partySize : 1,
      created_at: new Date().toISOString()
    };

    const records = loadSession(session);
    records.push(record);
    fs.appendFileSync(fileFor(session), JSON.stringify(record) + '\n');
    return record;
  }

  function getTotals(session) {
    const records = loadSession(session || todaySession());
    const totals = {
      session: session || todaySession(),
      zone,
      total_people: 0,
      total_checkins: records.length,
      individuals: 0,
      families: 0,
      guests: 0,
      by_method: { form: 0, qr_self: 0, fingerprint: 0 },
      by_ward: {}
    };
    for (const r of records) {
      totals.total_people += r.total_count;
      if (r.entry_type === 'family') totals.families += 1;
      else if (r.entry_type === 'guest') totals.guests += 1;
      else totals.individuals += 1;
      if (totals.by_method[r.method] !== undefined) totals.by_method[r.method] += 1;
      if (r.ward) totals.by_ward[r.ward] = (totals.by_ward[r.ward] || 0) + r.total_count;
    }
    return totals;
  }

  function getRecords(session) {
    return loadSession(session || todaySession()).slice();
  }

  function listSessions() {
    if (!fs.existsSync(dataDir)) return [];
    const prefix = `checkins-${zone}-`;
    return fs.readdirSync(dataDir)
      .filter((f) => f.startsWith(prefix) && f.endsWith('.jsonl'))
      .map((f) => f.slice(prefix.length, -('.jsonl'.length)))
      .sort();
  }

  function archiveSession(session) {
    const file = fileFor(session);
    if (!fs.existsSync(file)) return null;
    const archived = path.join(dataDir, `archived-${zone}-${session}-${Date.now()}.jsonl`);
    fs.renameSync(file, archived);
    bySession.delete(session);
    return archived;
  }

  return { recordCheckin, getTotals, getRecords, listSessions, archiveSession, todaySession };
}

module.exports = { createStore, todaySession, WARDS };
