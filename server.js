'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createStore, todaySession } = require('./lib/store');
const { syncCheckinToCloud } = require('./lib/supabase-sync');

const ZONE = (process.env.ZONE || process.argv[2] || 'front').toLowerCase();
const PORT = parseInt(process.env.PORT || process.argv[3] || '3000', 10);
const DATA_DIR = path.join(__dirname, 'data');

const store = createStore(DATA_DIR, ZONE);

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.ico': 'image/x-icon'
};

function getLanIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function serveStatic(req, res, urlPath) {
  let target = urlPath === '/' ? '/index.html' : urlPath;
  if (!path.extname(target)) target += '.html';
  let filePath = path.join(PUBLIC_DIR, target);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = '';
    req.on('data', (c) => {
      chunks += c;
      if (chunks.length > 1e6) req.destroy();
    });
    req.on('end', () => resolve(chunks));
    req.on('error', reject);
  });
}

function toCsv(records) {
  const headers = ['id', 'zone', 'session', 'method', 'entry_type', 'adult_name', 'boys_count', 'girls_count', 'total_count', 'created_at'];
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.join(',')];
  for (const r of records) lines.push(headers.map((h) => esc(r[h])).join(','));
  return lines.join('\n');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  try {
    if (p === '/api/checkin' && req.method === 'POST') {
      const raw = await readBody(req);
      let input;
      try { input = JSON.parse(raw); } catch (e) { return sendJson(res, 400, { error: 'invalid json' }); }
      let record;
      try {
        record = store.recordCheckin(input);
      } catch (err) {
        return sendJson(res, err.statusCode || 400, { error: err.message });
      }
      syncCheckinToCloud(record); // fire-and-forget; local write above already succeeded
      return sendJson(res, 201, record);
    }

    if (p === '/api/totals' && req.method === 'GET') {
      const session = url.searchParams.get('session') || todaySession();
      return sendJson(res, 200, store.getTotals(session));
    }

    if (p === '/api/meta' && req.method === 'GET') {
      return sendJson(res, 200, { zone: ZONE, port: PORT, lan_ips: getLanIPs(), today: todaySession(), sessions: store.listSessions() });
    }

    if (p === '/api/archive' && req.method === 'POST') {
      const raw = await readBody(req);
      let input = {};
      try { input = JSON.parse(raw || '{}'); } catch (e) { /* ignore */ }
      const session = input.session || todaySession();
      const archived = store.archiveSession(session);
      return sendJson(res, 200, { archived });
    }

    if (p === '/export' && req.method === 'GET') {
      const session = url.searchParams.get('session') || todaySession();
      const format = url.searchParams.get('format') || 'json';
      const records = store.getRecords(session);
      const filename = `checkins-${ZONE}-${session}.${format === 'csv' ? 'csv' : 'json'}`;
      if (format === 'csv') {
        const body = toCsv(records);
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` });
        return res.end(body);
      }
      const body = JSON.stringify({ zone: ZONE, session, exported_at: new Date().toISOString(), records }, null, 2);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` });
      return res.end(body);
    }

    // static files (station.html, checkin.html, dashboard.html, display-qr.html, merge.html, vendor/*)
    if (req.method === 'GET') return serveStatic(req, res, p);

    res.writeHead(405);
    res.end('Method not allowed');
  } catch (err) {
    sendJson(res, 500, { error: 'server error', detail: String(err && err.message || err) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLanIPs();
  console.log('='.repeat(60));
  console.log(`Conference Tracker - zone "${ZONE}" - session ${todaySession()}`);
  console.log(`Local:   http://localhost:${PORT}/station`);
  for (const ip of ips) console.log(`Network: http://${ip}:${PORT}/station   (use this on the 2nd laptop)`);
  console.log(`QR page: http://${ips[0] || 'localhost'}:${PORT}/display-qr`);
  console.log('='.repeat(60));
});
