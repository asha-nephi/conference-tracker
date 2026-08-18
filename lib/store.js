'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VALID_METHODS = new Set(['form', 'qr_self', 'fingerprint']);
const VALID_ENTRY_TYPES = new Set(['individual', 'family', 'guest']);

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
    const boys = Math.max(0, parseInt(input.boys_count, 10) || 0);
    const girls = Math.max(0, parseInt(input.girls_count, 10) || 0);
    const adultName = input.adult_name ? String(input.adult_name).trim().slice(0, 200) : null;
    const phone = input.phone ? String(input.phone).trim().slice(0, 60) : null;
    const address = input.address ? String(input.address).trim().slice(0, 300) : null;
    const invitedBy = input.invited_by ? String(input.invited_by).trim().slice(0, 200) : null;

    const needsIdentity = entryType === 'family' || entryType === 'guest';
    if (needsIdentity) {
      if (!adultName) {
        const err = new Error(entryType === 'guest' ? "Guest's name is required" : "Adult's name is required");
        err.statusCode = 400;
        throw err;
      }
      if (!phone && !address) {
        const err = new Error('Enter a phone number or address (at least one)');
        err.statusCode = 400;
        throw err;
      }
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
      boys_count: entryType === 'family' ? boys : 0,
      girls_count: entryType === 'family' ? girls : 0,
      total_count: entryType === 'family' ? (1 + boys + girls) : 1,
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
      boys: 0,
      girls: 0,
      by_method: { form: 0, qr_self: 0, fingerprint: 0 }
    };
    for (const r of records) {
      totals.total_people += r.total_count;
      if (r.entry_type === 'family') totals.families += 1;
      else if (r.entry_type === 'guest') totals.guests += 1;
      else totals.individuals += 1;
      totals.boys += r.boys_count;
      totals.girls += r.girls_count;
      if (totals.by_method[r.method] !== undefined) totals.by_method[r.method] += 1;
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

module.exports = { createStore, todaySession };
