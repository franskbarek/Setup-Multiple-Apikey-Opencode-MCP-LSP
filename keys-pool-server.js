#!/usr/bin/env node
/**
 * keys-pool-server.js
 * Proxy key-pool untuk OpenCode Zen - rotasi otomatis beberapa API key.
 *
 * Cara pakai:
 *   node keys-pool-server.js                # jalankan proxy di 127.0.0.1:8765
 *   node keys-pool-server.js --dry-run      # cek konfigurasi lalu keluar
 *   node keys-pool-server.js --reset-cooldowns   # hapus state cooldown
 *   node keys-pool-server.js --port 9000
 *   node keys-pool-server.js --keys-file .\keys.env
 *   node keys-pool-server.js --upstream https://opencode.ai/zen/v1
 *   node keys-pool-server.js --state-file .\cooldowns.json
 *
 * Tanpa dependency - hanya modul inti Node.js (http, https, fs, path).
 * Mengalirkan request opencode ke https://opencode.ai/zen/v1
 * dan memilih key berikutnya saat upstream membalas 429/402.
 * Key yang membalas 401/403 ditandai "mati" dan dihindari selama 24 jam.
 */

'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const DEFAULT_PORT = 8765;
const DEFAULT_HOST = '127.0.0.1';
const UPSTREAM_DEFAULT = 'https://opencode.ai/zen/v1';
const DEFAULT_STATE_FILE = path.join(SCRIPT_DIR, 'cooldowns.json');

// Durasi cooldown bawaan (dipakai kalau server tidak mengirim Retry-After).
const DEFAULT_COOLDOWN_429_MS = 30 * 1000;   // 30 detik untuk rate limit
const DEFAULT_COOLDOWN_402_MS = 10 * 60 * 1000; // 10 menit untuk kuota habis
// Key yang membalas 401/403 kemungkinan besar invalid/sudah di-revoke -> hindari 24 jam.
const DEAD_KEY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Argumen CLI
// ---------------------------------------------------------------------------

function usage() {
  console.log(`keys-pool-server.js - proxy rotasi multi API key OpenCode Zen

Pilihan:
  --port <n>            port proxy (default ${DEFAULT_PORT}); 0 = port bebas dari OS
  --host <addr>         alamat yang di-bind (default ${DEFAULT_HOST})
  --keys-file <path>    file daftar key (default keys.env di folder skrip ini)
  --upstream <url>      URL upstream (default ${UPSTREAM_DEFAULT})
  --state-file <path>   file state cooldown (default cooldowns.json di folder skrip ini)
  --dry-run             cek konfigurasi lalu keluar (tidak menjalankan server)
  --reset-cooldowns     hapus file state cooldown lalu keluar
  --help                tampilkan bantuan ini

File yang dibaca skrip ini:
  keys.env        satu API key per baris; baris diawali # diabaikan; baris atas = prioritas
  cooldowns.json  state cooldown (dibuat otomatis, jangan di-commit ke git)`);
}

function parseArgv(argv) {
  const a = { port: DEFAULT_PORT, host: DEFAULT_HOST, keysFile: null, upstream: null, stateFile: null, dryRun: false, reset: false };
  for (let i = 0; i < argv.length; i++) {
    const cur = argv[i];
    if (cur === '--port') a.port = parseInt(argv[++i], 10);
    else if (cur.startsWith('--port=')) a.port = parseInt(cur.split('=')[1], 10);
    else if (cur === '--host') a.host = argv[++i] || DEFAULT_HOST;
    else if (cur.startsWith('--host=')) a.host = cur.split('=')[1] || DEFAULT_HOST;
    else if (cur === '--keys-file') a.keysFile = argv[++i];
    else if (cur.startsWith('--keys-file=')) a.keysFile = cur.split('=')[1];
    else if (cur === '--upstream') a.upstream = argv[++i];
    else if (cur.startsWith('--upstream=')) a.upstream = cur.split('=')[1];
    else if (cur === '--state-file') a.stateFile = argv[++i];
    else if (cur.startsWith('--state-file=')) a.stateFile = cur.split('=')[1];
    else if (cur === '--dry-run') a.dryRun = true;
    else if (cur === '--reset-cooldowns') a.reset = true;
    else if (cur === '--help' || cur === '-h') { usage(); process.exit(0); }
  }
  if (!Number.isFinite(a.port) || a.port < 0) abort('--port harus angka >= 0');
  if (a.upstream) a.upstream = a.upstream.replace(/\/+$/, '');
  return a;
}

function abort(msg) {
  console.error('ERROR: ' + msg);
  console.error('Jalankan "node keys-pool-server.js --help" untuk bantuan.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Keys + state cooldown
// ---------------------------------------------------------------------------

function loadKeys(file) {
  if (!fs.existsSync(file)) abort('File key tidak ditemukan: ' + file);
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const seen = new Set();
  const keys = lines.filter((k) => (seen.has(k) ? false : (seen.add(k), true)));
  if (keys.length === 0) abort('Tidak ada key valid di ' + file + ' (baris kosong / diawali # dilewati).');
  return keys;
}

let stateFile = DEFAULT_STATE_FILE;
let state = {};
let stateWriteTimer = null;

function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    return s && typeof s === 'object' ? s : {};
  } catch {
    return {};
  }
}

function saveState() {
  if (stateWriteTimer) clearTimeout(stateWriteTimer);
  stateWriteTimer = setTimeout(() => {
    try {
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    } catch (e) {
      console.error('INFO: gagal menyimpan ' + stateFile + ' (' + e.message + ')');
    }
  }, 500);
}

function flushStateNow() {
  if (stateWriteTimer) clearTimeout(stateWriteTimer);
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('INFO: gagal menyimpan ' + stateFile + ' (' + e.message + ')');
  }
}

function labelOf(key) {
  return key.slice(0, 8) + '...';
}

function nowMs() {
  return Date.now();
}

// Key yang pernah membalas 401/403 dan masih dalam masa "mati".
function isDead(key) {
  const s = state[key];
  return !!(s && s.dead && s.deadUntil > nowMs());
}

// Key pertama (urutan = prioritas) yang TIDAK sedang cooldown dan TIDAK mati.
function pickKey(keys) {
  const t = nowMs();
  for (const k of keys) {
    if (isDead(k)) continue;
    const s = state[k];
    if (!s || !(s.until > t)) return k;
  }
  return null;
}

function earliestUntil(keys) {
  let min = Infinity;
  for (const k of keys) {
    const s = state[k];
    if (!s) continue;
    const u = s.dead ? s.deadUntil : s.until;
    if (u && u < min) min = u;
  }
  return min === Infinity ? nowMs() : min;
}

function markCooldown(key, durationMs, statusCode) {
  const s = state[key] || { until: 0, requests: 0, quota: 0 };
  s.until = nowMs() + durationMs;
  s.quota = (s.quota || 0) + 1;
  state[key] = s;
  saveState();
  console.log('cooldown key ' + labelOf(key) + ' selama ' + Math.round(durationMs / 1000) + 's (status ' + statusCode + ')');
}

function markDead(key, statusCode) {
  const s = state[key] || { until: 0, requests: 0, quota: 0 };
  s.dead = true;
  s.deadUntil = nowMs() + DEAD_KEY_MS;
  s.deadCount = (s.deadCount || 0) + 1;
  state[key] = s;
  saveState();
  console.log('key ' + labelOf(key) + ' ditandai mati selama ' + Math.round(DEAD_KEY_MS / 3600000) + ' jam (status ' + statusCode + ')');
}

function countRequest(key) {
  const s = state[key] || { until: 0, requests: 0, quota: 0, deadCount: 0 };
  s.requests = (s.requests || 0) + 1;
  state[key] = s;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

let upstreamBase = UPSTREAM_DEFAULT;

// Path proxy /v1/... dipetakan ke upstream /zen/v1/...
function mapUpstreamPath(incomingUrl) {
  const p = incomingUrl.startsWith('/v1') ? '/zen' + incomingUrl : incomingUrl;
  return p;
}

function isQuotaStatus(code) {
  return code === 429 || code === 402;
}

function isDeadStatus(code) {
  return code === 401 || code === 403;
}

// Retry-After boleh berupa detik atau tanggal (RFC 7231). Mengembalikan durasi ms atau null.
function parseRetryAfter(ra) {
  if (!ra) return null;
  const secs = parseInt(ra, 10);
  if (!isNaN(secs) && secs >= 0) return secs * 1000;
  const t = Date.parse(ra);
  if (!isNaN(t)) {
    const d = t - nowMs();
    return d > 0 ? d : null;
  }
  return null;
}

function cooldownDurationMs(pres) {
  const ra = parseRetryAfter(pres.headers['retry-after']);
  if (ra !== null) return ra;
  return pres.statusCode === 402 ? DEFAULT_COOLDOWN_402_MS : DEFAULT_COOLDOWN_429_MS;
}

function passHeaders(headers) {
  const h = Object.assign({}, headers);
  ['transfer-encoding', 'content-length', 'connection', 'keep-alive', 'proxy-connection', 'upgrade'].forEach((n) => delete h[n]);
  return h;
}

function drain(res) {
  res.resume();
}

function failAllCooldown(res, keys) {
  const secs = Math.max(0, Math.ceil((earliestUntil(keys) - nowMs()) / 1000));
  if (!res.headersSent) {
    res.writeHead(429, {
      'content-type': 'application/json',
      'retry-after': String(secs),
    });
  }
  res.end(JSON.stringify({
    error: {
      message: 'Semua key Zen sedang tidak tersedia (cooldown / key mati). Ada key kembali aktif dalam sekitar ' + secs + ' detik. Cek `curl http://' + DEFAULT_HOST + ':' + DEFAULT_PORT + '/status`.',
      type: 'key_pool_exhausted',
    },
  }));
}

function forwarded(req, res, bodyBuf, keys, upstream, attempts) {
  if (attempts > keys.length) {
    // Semua key sudah dicoba (cooldown / mati) dalam satu request.
    failAllCooldown(res, keys);
    return;
  }

  const key = pickKey(keys);
  if (!key) {
    failAllCooldown(res, keys);
    return;
  }

  const upstreamUrl = new URL(mapUpstreamPath(req.url) || '/', upstream);
  const headers = Object.assign({}, req.headers);
  headers.host = upstreamUrl.host;
  headers.authorization = 'Bearer ' + key;
  headers['content-length'] = bodyBuf.length;
  ['proxy-connection', 'connection', 'transfer-encoding'].forEach((n) => delete headers[n]);

  const requester = upstreamUrl.protocol === 'http:' ? http.request : https.request;
  const preq = requester(
    {
      method: req.method,
      hostname: upstreamUrl.hostname,
      port: upstreamUrl.port || (upstreamUrl.protocol === 'http:' ? 80 : 443),
      protocol: upstreamUrl.protocol,
      path: upstreamUrl.pathname + upstreamUrl.search,
      headers,
    },
    (pres) => {
      const code = pres.statusCode;
      if (isQuotaStatus(code)) {
        // Kuota / rate limit -> tandai key, lalu coba key berikutnya.
        markCooldown(key, cooldownDurationMs(pres), code);
        drain(pres);
        forwarded(req, res, bodyBuf, keys, upstream, attempts + 1);
        return;
      }
      if (isDeadStatus(code)) {
        // Key tampaknya invalid -> tandai mati, lalu coba key berikutnya.
        markDead(key, code);
        drain(pres);
        forwarded(req, res, bodyBuf, keys, upstream, attempts + 1);
        return;
      }
      countRequest(key);
      if (!res.headersSent) res.writeHead(code, passHeaders(pres.headers));
      pres.pipe(res);
    }
  );

  preq.on('error', (err) => {
    console.error('upstream error: ' + err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Proxy gagal terhubung ke upstream: ' + err.message, type: 'proxy_upstream_error' } }));
    } else {
      res.destroy();
    }
  });

  preq.end(bodyBuf);
}

function statusPayload(keys) {
  const t = nowMs();
  const rows = keys.map((k) => {
    const s = state[k];
    const dead = isDead(k);
    const pending = !!(s && s.until > t);
    return {
      key: labelOf(k),
      status: dead ? 'dead' : (pending ? 'cooldown' : 'active'),
      cooldownSecondsLeft: dead
        ? Math.max(0, Math.ceil((s.deadUntil - t) / 1000))
        : (pending ? Math.max(0, Math.ceil((s.until - t) / 1000)) : 0),
      requests: s ? s.requests : 0,
      quotaHits: s ? s.quota : 0,
      deadCount: s ? (s.deadCount || 0) : 0,
    };
  });
  return {
    ok: true,
    upstream: upstreamBase,
    totalKeys: keys.length,
    activeKeys: rows.filter((r) => r.status === 'active').length,
    keys: rows,
  };
}

// ---------------------------------------------------------------------------
// Mode CLI
// ---------------------------------------------------------------------------

function runDryRun(keys, keysFileUsed) {
  console.log('--- dry-run ---');
  console.log('File key        : ' + keysFileUsed);
  console.log('Jumlah key      : ' + keys.length);
  console.log('Prioritas key   :');
  keys.forEach((k, i) => console.log('  ' + (i + 1) + '. ' + labelOf(k)));
  const t = nowMs();
  const inCooldown = keys.filter((k) => state[k] && state[k].until > t);
  console.log('Cooldown aktif  : ' + (inCooldown.length ? inCooldown.map((k) => labelOf(k)).join(', ') : 'tidak ada'));
  const deadKeys = keys.filter((k) => isDead(k));
  console.log('Key mati        : ' + (deadKeys.length ? deadKeys.map((k) => labelOf(k)).join(', ') : 'tidak ada'));
  console.log('Upstream        : ' + upstreamBase);
  console.log('State file      : ' + stateFile);
  console.log('OK - konfigurasi valid. Jalankan tanpa --dry-run untuk memulai proxy.');
  process.exit(0);
}

function runReset() {
  state = {};
  if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  console.log('State direset (cooldown + key mati). Semua key kembali aktif.');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

function createServer(keys, upstream, args) {
  upstreamBase = upstream;
  stateFile = args.stateFile || DEFAULT_STATE_FILE;
  state = loadState();

  const server = http.createServer((req, res) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      chunks.push(c);
      size += c.length;
    });
    req.on('end', () => {
      const body = Buffer.concat(chunks, size);

      if (req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, uptimeSeconds: Math.round(process.uptime()) }));
        return;
      }
      if (req.url === '/status') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(statusPayload(keys), null, 2));
        return;
      }

      forwarded(req, res, body, keys, upstreamBase, 0);
    });
    req.on('error', (err) => {
      console.error('request error: ' + err.message);
      if (!res.headersSent) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { message: err.message, type: 'invalid_request' } }));
      }
    });
  });

  process.on('SIGINT', () => { flushStateNow(); process.exit(0); });
  process.on('SIGTERM', () => { flushStateNow(); process.exit(0); });

  server.listen(args.port, args.host, () => {
    const port = server.address().port;
    console.log('keys-pool-server berjalan di http://' + args.host + ':' + port);
    console.log('Key terdaftar  : ' + keys.length + ' (prioritas = urutan di ' + args.keysFile + ')');
    console.log('Upstream       : ' + upstream);
    console.log('Cek status     : curl http://' + args.host + ':' + port + '/status');
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgv(process.argv.slice(2));
  const keysFileUsed = args.keysFile || path.join(SCRIPT_DIR, 'keys.env');
  const upstream = args.upstream || UPSTREAM_DEFAULT;
  const keys = loadKeys(keysFileUsed);
  stateFile = args.stateFile || DEFAULT_STATE_FILE;
  state = loadState();
  upstreamBase = upstream;

  if (args.reset) runReset();
  if (args.dryRun) runDryRun(keys, keysFileUsed);

  createServer(keys, upstream, args);
}

main();