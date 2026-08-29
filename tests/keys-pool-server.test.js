const { test, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'keys-pool-server.js');
const KEY1 = 'key-0001-aaaaaaaaaaaaaaaa';
const KEY2 = 'key-0002-bbbbbbbbbbbbbbb';

const cleanup = [];
after(() => Promise.all(cleanup.map((f) => f())));

function killProc(proc) {
  return new Promise((r) => {
    if (proc.exitCode !== null) return r();
    proc.once('exit', () => r());
    proc.kill();
  });
}

function closeServer(server) {
  return new Promise((r) => {
    if (!server.listening) return r();
    server.close(() => r());
  });
}

function makeTempDir(keysLines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'keys-pool-test-'));
  const keysFile = path.join(dir, 'keys.env');
  const stateFile = path.join(dir, 'cooldowns.json');
  fs.writeFileSync(keysFile, keysLines.join('\n') + '\n');
  return { dir, keysFile, stateFile };
}

function startMock(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const url = 'http://127.0.0.1:' + server.address().port;
      cleanup.push(() => closeServer(server));
      resolve({
        url,
        close: () => closeServer(server),
      });
    });
    server.on('error', reject);
  });
}

function spawnPool({ keysFile, stateFile, upstream }) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [
      SCRIPT,
      '--keys-file', keysFile,
      '--state-file', stateFile,
      '--upstream', upstream,
      '--port', '0',
    ]);
    let out = '';
    let err = '';
    let settled = false;
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('timeout menunggu proxy: ' + err + out));
    }, 10000);
    proc.stdout.on('data', (d) => {
      out += d;
      const m = out.match(/berjalan di http:\/\/127\.0\.0\.1:(\d+)/);
      if (m && !settled) {
        settled = true;
        clearTimeout(timer);
        const base = 'http://127.0.0.1:' + m[1];
        const stop = () => killProc(proc);
        cleanup.push(stop);
        resolve({ base, stop });
      }
    });
    proc.stderr.on('data', (d) => { err += d; });
    proc.on('error', reject);
  });
}

function runCli(extra) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [SCRIPT, ...extra]);
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => { out += d; });
    proc.stderr.on('data', (d) => { err += d; });
    proc.on('error', reject);
    proc.on('exit', (code) => resolve({ code, out, err }));
  });
}

function sendJson(baseUrl, method, route) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from('{}');
    const req = http.request(baseUrl + route, {
      method,
      headers: {
        'content-type': 'application/json',
        'content-length': body.length,
        authorization: 'Bearer sk-opencode',
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'),
      }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

async function getStatus(baseUrl) {
  const r = await sendJson(baseUrl, 'GET', '/status');
  assert.strictEqual(r.status, 200);
  return r.body;
}

test('dry-run menampilkan daftar key, prioritas, dan konfigurasi', async () => {
  const t = makeTempDir([KEY1, '# komentar', '', KEY2]);
  const r = await runCli(['--keys-file', t.keysFile, '--state-file', t.stateFile, '--dry-run']);
  assert.strictEqual(r.code, 0, r.out + r.err);
  assert.match(r.out, /Jumlah key      : 2/);
  assert.match(r.out, /1\. key-0001/);
  assert.match(r.out, /2\. key-0002/);
  assert.match(r.out, /OK - konfigurasi valid/);
});

test('key yang membalas 429 masuk cooldown, lalu key berikutnya dipakai', async () => {
  const t = makeTempDir([KEY1, KEY2]);
  const mock = await startMock((req, res) => {
    const auth = req.headers.authorization || '';
    if (auth.includes(KEY1)) {
      res.writeHead(429, { 'retry-after': '60', 'content-type': 'application/json' });
      res.end('{"error":"quota"}');
    } else {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
    }
  });
  const pool = await spawnPool({ keysFile: t.keysFile, stateFile: t.stateFile, upstream: mock.url });

  const r = await sendJson(pool.base, 'POST', '/v1/chat/completions');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.ok, true);

  const s = await getStatus(pool.base);
  assert.strictEqual(s.totalKeys, 2);
  const k1 = s.keys.find((x) => x.key.startsWith('key-0001'));
  const k2 = s.keys.find((x) => x.key.startsWith('key-0002'));
  assert.strictEqual(k1.status, 'cooldown');
  assert.ok(k1.cooldownSecondsLeft >= 55 && k1.cooldownSecondsLeft <= 60);
  assert.strictEqual(k1.quotaHits, 1);
  assert.strictEqual(k2.status, 'active');
  assert.strictEqual(k2.requests, 1);

  await pool.stop();
  await mock.close();
});

test('key 401/403 ditandai mati dan dilewati di request berikutnya', async () => {
  const t = makeTempDir([KEY1, KEY2]);
  const mock = await startMock((req, res) => {
    const auth = req.headers.authorization || '';
    if (auth.includes(KEY1)) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end('{"error":"invalid"}');
    } else {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
    }
  });
  const pool = await spawnPool({ keysFile: t.keysFile, stateFile: t.stateFile, upstream: mock.url });

  const r1 = await sendJson(pool.base, 'POST', '/v1/chat/completions');
  assert.strictEqual(r1.status, 200);
  const s1 = await getStatus(pool.base);
  assert.strictEqual(s1.keys.find((x) => x.key.startsWith('key-0001')).status, 'dead');
  assert.strictEqual(s1.keys.find((x) => x.key.startsWith('key-0001')).deadCount, 1);

  const r2 = await sendJson(pool.base, 'POST', '/v1/chat/completions');
  assert.strictEqual(r2.status, 200);
  const s2 = await getStatus(pool.base);
  assert.strictEqual(s2.keys.find((x) => x.key.startsWith('key-0001')).deadCount, 1);
  assert.strictEqual(s2.keys.find((x) => x.key.startsWith('key-0002')).requests, 2);

  await pool.stop();
  await mock.close();
});

test('Retry-After berformat tanggal ikut dipakai untuk durasi cooldown', async () => {
  const t = makeTempDir([KEY1, KEY2]);
  const mock = await startMock((req, res) => {
    const auth = req.headers.authorization || '';
    if (auth.includes(KEY1)) {
      const later = new Date(Date.now() + 90000).toUTCString();
      res.writeHead(429, { 'retry-after': later, 'content-type': 'application/json' });
      res.end('{"error":"quota"}');
    } else {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
    }
  });
  const pool = await spawnPool({ keysFile: t.keysFile, stateFile: t.stateFile, upstream: mock.url });

  const r = await sendJson(pool.base, 'POST', '/v1/chat/completions');
  assert.strictEqual(r.status, 200);

  const s = await getStatus(pool.base);
  const k1 = s.keys.find((x) => x.key.startsWith('key-0001'));
  assert.strictEqual(k1.status, 'cooldown');
  assert.ok(k1.cooldownSecondsLeft >= 85 && k1.cooldownSecondsLeft <= 90);

  await pool.stop();
  await mock.close();
});

test('semua key cooldown -> proxy membalas 429 dengan pesan jelas', async () => {
  const t = makeTempDir([KEY1, KEY2]);
  const mock = await startMock((req, res) => {
    res.writeHead(429, { 'retry-after': '30', 'content-type': 'application/json' });
    res.end('{"error":"quota"}');
  });
  const pool = await spawnPool({ keysFile: t.keysFile, stateFile: t.stateFile, upstream: mock.url });

  const r = await sendJson(pool.base, 'POST', '/v1/chat/completions');
  assert.strictEqual(r.status, 429);
  assert.strictEqual(r.body.error.type, 'key_pool_exhausted');
  assert.ok(parseInt(r.headers['retry-after'], 10) >= 28);

  await pool.stop();
  await mock.close();
});

test('--reset-cooldowns menghapus state sehingga semua key aktif lagi', async () => {
  const t = makeTempDir([KEY1, KEY2]);
  const mock = await startMock((req, res) => {
    res.writeHead(429, { 'retry-after': '60', 'content-type': 'application/json' });
    res.end('{"error":"quota"}');
  });
  const pool = await spawnPool({ keysFile: t.keysFile, stateFile: t.stateFile, upstream: mock.url });

  await sendJson(pool.base, 'POST', '/v1/chat/completions');
  const before = await getStatus(pool.base);
  assert.ok(before.keys.every((x) => x.status === 'cooldown'));
  await pool.stop();
  await mock.close();

  const reset = await runCli(['--keys-file', t.keysFile, '--state-file', t.stateFile, '--reset-cooldowns']);
  assert.strictEqual(reset.code, 0);
  assert.strictEqual(fs.existsSync(t.stateFile), false);

  const dry = await runCli(['--keys-file', t.keysFile, '--state-file', t.stateFile, '--dry-run']);
  assert.match(dry.out, /Cooldown aktif  : tidak ada/);
  assert.match(dry.out, /Key mati        : tidak ada/);
});