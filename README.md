<a id="top"></a>
# Failover Multi API Key + MCP untuk Opencode (LSP opsional)

Project ini berfokus pada **dua hal utama** dan satu hal opsional:

| Prioritas | Bagian | Wajib? |
|---|---|---|
| 🔁 1 | **Failover multi API Key** - konsep inti project ini. Saat kuota satu apikey habis, otomatis berganti ke apikey berikutnya tanpa pindah model. | **Paling wajib** |
| 🧩 2 | **MCP** - tools tambahan untuk agent (browser, GitHub, database, media, dsb.). | Utama |
| 🕵️‍♂️ 3 | **LSP** - pemeriksa bahasa. Caranya tetap saya tunjukkan, tapi tidak wajib. | Opsional |

Dokumen ini ditulis dengan bahasa sederhana. Cukup ikuti langkahnya.

---

## 📌 Isi dokumen ini

- [1. Failover multi API Key (prioritas)](#-1-failover-multi-api-key-prioritas)
- [2. MCP (tools tambahan)](#-2-mcp-tools-tambahan)
- [3. LSP (opsional - tetap ada caranya)](#-3-lsp-opsional---tetap-ada-caranya)
- [4. Yang harus disiapkan (dasar)](#-4-yang-harus-disiapkan-dasar)
- [Pilih sistem operasi kamu](#pilih-sistem-operasi-kamu)
- [Ringkasan langkah](#ringkasan-langkah)
- [Gambaran singkat istilah](#gambaran-singkat-istilah)

---

## 🔁 1. Failover multi API key (prioritas)

Di setup ini saya memakai **lebih dari satu API key untuk layanan yang sama** - contohnya beberapa akun **OpenCode Zen**, dan tiap akun dapat model gratis **Big Pickle** dengan kuota masing-masing. Masalahnya: kalau kuota satu apikey habis, opencode hanya mencoba terus dan mentok di error. Supaya kamu (dan tim saya) tidak perlu pindah key secara manual, saya sudah implementasikan konsep berikut: **apikey berpindah otomatis tanpa mengubah model** - dan sudah berjalan di setup ini.

### Kenapa saya tidak sekadar pakai plugin fallback?

Banyak sumber yang menyarankan agar menggunakan plugin fallback (salah satu contoh `@razroo/opencode-model-fallback`) yang pindah ke model lain saat limit. Plugin itu memang juara kalau tujuannya **pindah model** di tengah sesi (misal Big Pickle → Claude). Tapi untuk kasus **banyak apikey pada provider yang sama**, saya pribadi menilai plugin seperti ini kurang sesuai:

- apikey model `opencode/*` terbaca dari `auth.json`, **bukan** dari environment variable - jadi plugin/wrapper tidak bisa sekadar mengganti apikey
- supaya key bisa dibedakan, tiap key harus dibuatkan "custom provider" sendiri di config
- deteksinya lewat error SDK, bukan status HTTP asli dari server

Keputusan saya: untuk kasus seperti ini yang tepat bukan plugin, melainkan **key-pool proxy**.

### Konsep yang saya pilih: key-pool proxy lokal

Satu proxy kecil yang saya jalankan di komputer, ditempatkan di antara opencode dan server Zen. opencode hanya berkomunikasi ke proxy, proxy yang memegang daftar apikey dan memilih key mana yang dipakai setiap request.

```
opencode (TUI / opencode run / MCP / curl)
        │  baseURL → http://127.0.0.1:8765/v1
        ▼
   [ keys-pool-server ]       ← skrip Node lokal (sudah jalan)
        ▼
   https://opencode.ai/zen/v1
```

#### Cara kerja (flowchart)

```
                request dari opencode masuk
                           │
                           ▼
            pilih key teratas yang TIDAK pending
                           │
                           ▼
        teruskan request ke https://opencode.ai/zen/v1
              ┌───────────┴───────────┐
              ▼                       ▼
      respons 429/402 kuota?     respons lain?
              │                       │
             ya                       └────► 2xx / SSE stream (normal)
              ▼                              atau 4xx non-kuota
     tandai key = PENDING                    → teruskan apa adanya
     (durasi pakai Retry-After)                ke opencode, selesai
              │
              ▼
  masih ada key aktif lain? ── ya ──► kembali ke "pilih key"
              │                          (key berikutnya)
              ▼          tidak
   semua key pending? ── tidak ──► kembali ke "pilih key"
              │                        (ada key yang pulih)
              ▼          ya
   balas 429 + pesan mudah dibaca ke opencode
```

#### Penjelasan flowchart

1. **Request masuk** - opencode mengirim permintaan ke proxy (misal kita mulai dari apikey #1, apikey paling atas di `keys.env`).
2. **Terus** - proxy meneruskan request itu ke `https://opencode.ai/zen/v1` memakai apikey #1.
3. **Respons normal** - kalau apikey #1 sehat, jawaban (termasuk SSE yang mengalir token demi token) diteruskan langsung ke opencode. Selesai.
4. **Kuota habis / apikey invalid** - kalau upstream membalas `429`/`402` (kuota apikey #1 habis), proxy menandai apikey #1 sebagai *pending* selama durasi tertentu (pakai `Retry-After` kalau dikirim server). Kalau yang keluar `401`/`403` (key #1 invalid), key #1 justru ditandai *mati* selama 24 jam - karena menunggu 30 detik tidak akan menyembuhkannya.
5. **Ganti apikey** - karena apikey #1 pending, proxy otomatis mencoba apikey berikutnya di daftar (apikey #2, #3, dst.).
6. **Semua pending** - kalau semua apikey sedang pending, proxy balas `429` + pesan yang mudah dibaca ke opencode, misal *"Semua key Zen sedang dalam cooldown, coba lagi ~2 menit lagi."*
7. **Pulih otomatis** - setelah durasi pending habis, apikey kembali aktif dan dipakai lagi. Karena state disimpan di `cooldowns.json`, cooldown ini **tetap berlaku walau komputer di-restart**.

Karena logika ini ada di level HTTP, satu konsep ini langsung berlaku untuk **TUI, `opencode run`, MCP, dan curl** sekaligus - tanpa menyentuh model yang dipakai.

> ✅ **Status: sudah saya implementasikan.** Skrip `keys-pool-server.js` sudah jadi dan ada di repo ini - ikuti Bagian 1 di panduan sistem operasi kamu untuk langkahnya.

### Perbandingan pendekatan

Supaya keputusan di atas jelas, ini catatan perbandingan diatas:

| Pendekatan | Rotasi di tengah sesi TUI | Rotasi key (bukan model) | Deteksi error | Persisten antar restart | Berlaku untuk command lain |
|---|---|---|---|---|---|
| Plugin `@razroo/opencode-model-fallback` | ✅ | ⚠️ butuh custom provider per key | ⚠️ lewat SDK | ❌ | ❌ hanya model opencode |
| **Key-pool proxy** (pilihan saya) | ✅ | ✅ di level HTTP | ✅ status 429/402 asli | ✅ file `cooldowns.json` | ✅ semua |
| Tool existing (`oswap`, `opencode-go-multi-auth`) | ✅ | ✅ | ✅ | ✅ | ✅ |

### `keys-pool-server.js` (yang sudah saya buat)

- **Tempat**: repo ini (`keys-pool-server.js`); dijalankan dari folder `opencode-failover` di samping `keys.env`, Node.js tanpa dependency
- **Port**: `127.0.0.1:8765`, hanya bind ke localhost (tidak terbuka ke jaringan)
- **Masukan**: `keys.env` - satu key per baris, baris atas = prioritas
- **State**: `cooldowns.json` - durasi pending bertahan walau komputer di-restart
- **Rotasi**: respons `429` / `402` dengan body kuota → pending key itu (pakai `Retry-After` jika ada, durasinya bisa berupa detik atau tanggal), lanjut ke key berikutnya
- **Key mati**: respons `401` / `403` → key itu ditandai *mati* selama 24 jam dan dilewati, karena key invalid tidak akan "sembuh" dengan menunggu sebentar
- **Kapasitas habis semua**: balas `429` ke opencode dengan pesan yang mudah dibaca
- **Endpoint**: `/health` (proxy hidup?) dan `/status` (keadaan tiap key: `active`/`cooldown`/`dead`)
- **Streaming**: SSE `chat/completions` diteruskan byte-by-byte agar token tetap muncul langsung
- **Opsi CLI**: `--port` (0 = port bebas dari OS), `--host`, `--keys-file`, `--upstream`, `--state-file`, `--dry-run`, `--reset-cooldowns`
- **Tes otomatis**: `npm test` (pakai `node:test`, tanpa dependency - butuh Node 18+)

### Cara kerja isi file `keys-pool-server.js` (step by step)

File ini satu-satunya yang "menjalankan" konsep failover. Alur yang dikerjakan kodenya dari atas ke bawah:

**1. Persiapan (baris 20-37).** Hanya memakai core modul Node.js (`http`, `https`, `fs`, `path`) - tidak ada dependency yang perlu diinstall. Lalu menetapkan konstanta: port `8765`, host `127.0.0.1`, upstream `https://opencode.ai/zen/v1`, lokasi file state `cooldowns.json`, dan durasi cooldown bawaan (30 detik untuk 429, 10 menit untuk 402) plus `DEAD_KEY_MS` (24 jam untuk key yang balas 401/403).

**2. Baca argumen CLI (baris 62-93).** Memproses `--port` (0 = port bebas dari OS), `--host`, `--keys-file`, `--upstream`, `--state-file`, `--dry-run`, `--reset-cooldowns`. `--help` menampilkan bantuan lewat fungsi `usage()`.

**3. Muat daftar key (baris 95-105).** Membaca `keys.env`. Tiap baris di-trim; baris kosong dan yang diawali `#` dilewati; duplikat dibuang. Urutan baris = prioritas. Kalau tidak ada key sama sekali, skrip berhenti dengan pesan "Tidak ada key valid".

**4. Muat state cooldown (baris 109-116).** Kalau file state (default `cooldowns.json`, bisa diganti lewat `--state-file`) sudah ada dari run sebelumnya, dibaca - jadi key yang sedang menunggu atau mati tetap menunggu walau server di-restart.

**5. Mode khusus (baris 359-385).** `--dry-run` → tampilkan jumlah key, urutan prioritas, cooldown aktif, dan key mati, lalu keluar tanpa menjalankan server. `--reset-cooldowns` → kosongkan file state (cooldown + key mati), semua key kembali aktif.

**6. Jalankan server (baris 387-436).** Mendengarkan request di `127.0.0.1:8765`.
- `/health` → jawab `{ "ok": true }`.
- `/status` → daftar tiap key: status `active`/`cooldown`/`dead`, sisa detik cooldown, jumlah request, berapa kali kena kuota, dan berapa kali ditandai mati.
- request model (misal `POST /v1/chat/completions`) → dilempar ke fungsi `forwarded()`.

**7. Inti rotasi - fungsi `forwarded()` (baris 264-327):**
- (a) Kalau sudah mencoba lebih dari jumlah key → semua tidak tersedia → balas `429` dengan pesan ramah (baris 266-274).
- (b) `pickKey()` memilih key urutan teratas yang **tidak** pending dan **tidak** mati (baris 153-161).
- (c) Bangun request ke upstream: path `/v1/...` diubah jadi `/zen/v1/...` (baris 206-209), header `authorization: Bearer <key>` disuntikkan (baris 280).
- (d) Kirim ke upstream (`--upstream`, default `https://opencode.ai/zen/v1`).
- (e) Respons masuk:
  - **429/402** → `markCooldown()` mencatat key itu pending (durasi dari header `Retry-After` - boleh detik atau tanggal lewat `parseRetryAfter()` di baris 220; kalau tidak ada: 30 detik untuk 429, 10 menit untuk 402), lalu `forwarded()` dipanggil ulang **dengan key berikutnya** (baris 296-301). opencode tidak sadar apa pun.
  - **401/403** → `markDead()` menandai key itu *mati* 24 jam lalu lanjut key berikutnya (baris 303-307) - mencegah key invalid dipakai berulang-ulang.
  - **selain itu** → jumlah request dicatat, status + header diteruskan (header `transfer-encoding`/`content-length`/`connection` dibuang biar streaming bersih), dan body (termasuk SSE token) dikirim ke opencode (baris 310-312).
- (f) Gagal terhubung ke upstream → balas `502` dengan pesan (baris 317-322).

**8. Menjaga state tetap tersimpan (baris 118-145, 424-425).** Setiap ada perubahan cooldown, file state disimpan setelah jeda 500 ms (biar tidak boros disk). Saat server dimatikan (Ctrl+C / SIGTERM), state dipaksa disimpan dulu supaya tidak hilang.

### Menjalankan proxy otomatis (tanpa start manual)

Proxy tidak punya tombol UI - supaya failover tetap jalan, pastikan `keys-pool-server.js` ikut hidup otomatis saat komputer nyala. Pilih salah satu:

**Opsi A: Task Scheduler Windows (tanpa menginstall apa pun).**
- Buka `Task Scheduler` → *Create Basic Task*.
- Nama: `keys-pool` → Trigger: *When the computer starts* → Action: *Start a program*.
- Program: `node` (jika tidak ketemu, pakai path lengkap hasil `where node`) → Arguments: `"C:\...\keys-pool-server.js"` → Start in: folder skripnya.
- Centang *Run with highest privileges* tidak perlu; cukup pastikan task aktif.

**Opsi B: pm2 (semua OS, paling simpel).** [`pm2`](https://pm2.keymetrics.io) mengurus start ulang, log, dan auto-start saat reboot:
- Install sekali: `npm install -g pm2`
- Jalankan: `pm2 start keys-pool-server.js --name keys-pool`
- Simpan daftar proses: `pm2 save`
- Aktifkan auto-start saat reboot: `pm2 startup` jalankan perintah persis yang dicetak (sekali saja)
- Cek: `pm2 status` / `pm2 logs keys-pool`

**Opsi C: launchd macOS (tanpa menginstall apa pun).** Simpan file `com.franskbarek.keys-pool.plist` di `~/Library/LaunchAgents/`:
- Ganti `{NAMA_USER}`, `{FOLDER_SKRIP}`, dan `{PENGGANTI_NODE}` (path `node` hasil `which node`) sesuai milikmu.
- Setelah itu jalankan `launchctl load ~/Library/LaunchAgents/com.franskbarek.keys-pool.plist`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.franskbarek.keys-pool</string>
    <key>ProgramArguments</key>
    <array>
      <string>{PENGGANTI_NODE}</string>
      <string>{FOLDER_SKRIP}/keys-pool-server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>{FOLDER_SKRIP}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/keys-pool.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/keys-pool.log</string>
  </dict>
</plist>
```

### Konfigurasi opencode

Cukup tambah **satu** custom provider (bukan satu per key):

```jsonc
{
  "provider": {
    "zen-proxy": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://127.0.0.1:8765/v1",
        "apiKey": "sk-proxy-dummy"
      },
      "models": { "big-pickle": { "name": "Big Pickle (via key-pool proxy)" } }
    }
  },
  "model": "zen-proxy/big-pickle"
}
```

Lalu pakai `"model": "zen-proxy/big-pickle"` sebagai model bawaan. Key asli **tidak pernah masuk config** - proxy yang menyuntikkan key dari `keys.env`.

### Kapan memakai yang mana?

| Kebutuhan kamu | Pilih |
|---|---|
| Beberapa API key untuk layanan yang sama (TUI, `opencode run`, MCP, curl) | **Key-pool proxy** - ini setup yang saya pakai sekarang |
| Mau pindah ke model lain saat limit (misal Big Pickle → Claude) | Plugin `@razroo/opencode-model-fallback` |
| Ingin proxy siap pakai dari komunitas | `oswap`, `opencode-go-multi-auth` |

### Setup langkah demi langkah

Urut dari **Langkah 1** sampai **Langkah 8** - detail perintah persis untuk Windows/macOS ada di **Bagian 1** panduan sistem operasi kamu:

1. **Siapkan folder** `opencode-failover`.
2. **Salin skrip** `keys-pool-server.js` dari repo ini ke folder itu.
3. **Isi `keys.env`** - satu key per baris, baris paling atas = prioritas.
4. **Cek dulu** (tanpa menjalankan apa pun): `node keys-pool-server.js --dry-run`
5. **Jalankan proxy**: `node keys-pool-server.js` - biarkan terminal tetap terbuka.
6. **Cek kondisi**: `curl http://127.0.0.1:8765/status`
7. **Arahkan opencode**: tambah provider `zen-proxy` dan pakai `"model": "zen-proxy/big-pickle"`.
8. **Restart opencode**, lalu coba satu pertanyaan.

> `keys.env` dan `cooldowns.json` sengaja tidak di-commit (sudah ada di `.gitignore`).

**Cara memastikan failover bekerja:** saat kuota key #1 habis, periksa `/status` - key #1 berubah jadi `cooldown` (ada hitungan mundur) dan permintaan berikutnya otomatis memakai key #2.

---

## 🧩 2. MCP (tools tambahan)

Bagian utama kedua dari project ini. **MCP (Model Context Protocol)** memberi agent "tools tambahan" - seperti aplikasi baru yang bisa dipanggil. Dengan MCP, agent bisa akses file atau folder di lokal komputer, buka browser, akses GitHub, query database, mengedit media, dan banyak lagi.

### Kasus umum penggunaan

Berkat MCP, agent bisa melakukan banyak hal:

| Kasus | Contoh yang bisa kamu minta |
|---|---|
| 🧑‍💻 **Menulis & memperbaiki kode** | "Tambahkan halaman login, perbaiki bug di file `app.py`, lalu jalankan test-nya." |
| 🔍 **Melihat isi data** | "Cari di semua file project mana yang memakai fungsi `getUser`, lalu rangkum." |
| 🌐 **Membuka dan membaca website** | "Buka website ini, ambil isi artikelnya, dan ubah jadi poin-poin." |
| 📄 **Mengelola file & folder** | "Pindahkan semua gambar dari folder A ke folder B, lalu rename jadi format tanggal." |
| 🗄️ **Bertanya ke database** | "Hitung berapa pelanggan baru bulan ini dari database pelanggan." |
| 🐙 **Bekerja dengan GitHub** | "Lihat daftar issue di repo ini, atau buat ringkasan pull request terakhir." |
| 🌍 **Menerjemahkan / meringkas** | "Ringkas dokumen ini dalam 3 kalimat, lalu terjemahkan ke bahasa Inggris." |
| 🧠 **Mengingat hal penting** | "Catat keputusan design hari ini supaya diingat untuk sesi berikutnya." |
| 🎨 **Design & edit foto** | "Tolong buat desain thumbnail untuk video saya, dan bantu edit foto dengan tools yang tersedia." |
| 🎬 **Edit video** | "Potong bagian intro video ini, tambahkan caption, lalu ekspor klipnya dalam format yang bisa dipakai." |
| 🎵 **Edit musik / produksi musik** | "Tolong bantu atur level suara, potong bagian lagu ini, dan kasih saran mixing yang sederhana." |
| 🛠️ **Membantu pekerjaan biasa** | "Jalankan perintah ini di terminal, lalu jelaskan hasilnya padaku dengan bahasa sederhana." |

> Intinya: agent bisa membantu apa pun yang umumnya kamu kerjakan sendiri di komputer - selama itu bisa dijelaskan lewat kata-kata dan tools-nya terpasang.

### Kerja di agent apa pun

MCP itu **protokol standar** - tools MCP bisa dipakai di agent mana pun (Opencode, Claude, Cursor, dsb.) selama agentnya mendukung MCP. Jadi tools yang kamu pasang sekarang tetap bisa dipakai kalau nanti pindah agent.

### Yang ada di config project ini

Semua server MCP ini sudah masuk di config (Bagian 5 panduan sistem operasi kamu):

| Server MCP | Tipe | Status default | Butuh |
|---|---|---|---|
| **`context7`** ⭐ | remote | aktif | tidak ada (gratis) |
| `github` | remote | aktif | GitHub token |
| `filesystem`, `memory` | local | aktif | tidak ada |
| `playwright` | local | aktif | `npx playwright install chromium` |
| `git`, `fetch` | local | aktif | `uv` |
| `postgres`, `sqlite` | local | mati | server database |
| `video`, `artificer` | local | mati | FFmpeg, ImageMagick, API key Gemini |

`context7` paling gampang dicoba - server-nya berjalan di **cloud**, jadi **tidak perlu install apa pun** dan tidak butuh API key. Cukup tempel konfigurasinya di `opencode.json` lalu restart.

### 🎬 MCP untuk media (opsional)

Design foto, edit video, dan produksi musik di tabel atas **butuh MCP media tambahan** - server ini mati secara default (`"enabled": false`), nyalakan kalau dibutuhkan:

| Server MCP | Kemampuan | Butuh |
|---|---|---|
| **`mcp-video`** | Edit video & audio: potong, gabung, resize, subtitle, transkripsi, normalisasi suara | FFmpeg terinstall |
| **`artificer`** | Generate/Edit gambar (Gemini/Imagen), video (Veo), musik (Lyria 3), edit gambar (ImageMagick) | FFmpeg + ImageMagick + API key Gemini |

Perbandingan lengkap semua server media ada di **Bagian 5** panduan sistem operasi kamu.

---

## 🕵️‍♂️ 3. LSP (opsional - tetap ada caranya)

**LSP (Language Server Protocol)** adalah "pemeriksa" bahasa program - seperti *spell checker* di Word, tapi untuk kode. Saat kamu membuka file, agent otomatis tahu kalau ada error/warning.

Ini **opsional**: kalau kamu tidak menulis bahasa tertentu, tidak perlu pasang apa-apa. Tapi kalau mau, caranya lengkap di **Bagian 6** panduan sistem operasi kamu. Ringkasnya:

| Bahasa | Tool LSP | Perlu install |
|---|---|---|
| TypeScript / JavaScript | `typescript-language-server` | `npm install -g typescript-language-server` |
| Go | `gopls` | install Go |
| Python | `pyright` | `npm install -g pyright` |
| HTML, CSS, JSON | `vscode-langservers-extracted` | `npm install -g vscode-langservers-extracted` |
| SQL | `sql-language-server` | `npm install -g sql-language-server` |
| C/C++, Kotlin, YAML | `clangd`, `kotlin-ls`, `yaml-ls` | diinstall otomatis oleh opencode |

---

## 🧰 4. Yang harus disiapkan

Basic yang perlu kamu kenal dulu:

| Hal | Apa itu (versi sederhana) | Gimana rasanya di Opencode Agent |
|---|---|---|
| **Model** | **Big Pickle (Opencode Zen)** - model resmi opencode, gratis (tetap butuh API key Zen) | langsung bisa dipakai setelah ada key Zen |
| **MCP** | "Tools tambahan" - memberi agent kemampuan baru (buka browser, akses GitHub, query database) | agent bisa menjalankan perintah dan mengakses data eksternal |
| **LSP** | "Pemeriksa" bahasa program - seperti *spell checker* di Word, tapi untuk kode | agent otomatis tahu kalau ada error/warning di file yang kamu buka |
| **API Key** | "Kartu akses" untuk layanan AI (Claude, OpenAI, Gemini, dsb.) | agent bisa memakai beberapa provider AI sekaligus |

Untuk failover, kamu butuh **Node.js ≥ 20** dan **opencode (CLI)**. Tidak perlu paham semua sekarang - ikuti panduan per sistem operasi di bawah.

### Memahami isi file config `opencode.json`

Satu-satunya file yang benar-benar perlu kamu pahami. Contoh isinya (lengkap) ada di **Bagian 5** panduan sistem operasi kamu:

| Field | Apa artinya |
|---|---|
| `"$schema"` | Alamat skema JSON. Fungsinya biar editor bisa kasih saran & peringatan saat kamu menulis file. Opsional. |
| `"model"` | Model bawaan yang dipakai opencode. Formatnya `providerId/modelId` - jadi `zen-proxy/big-pickle` = provider `zen-proxy`, model `big-pickle`. |
| `"small_model"` | Model ringan untuk tugas kecil (membuat judul / ringkasan singkat). Kalau tidak diisi, opencode memakai `"model"`. Di setup ini disamakan dengan `"model"` agar semua tetap lewat proxy. |
| `"provider"` | Tempat mendefinisikan **custom provider**. Tiap key di dalamnya = satu provider (di sini `zen-proxy`). |
| `"provider"."zen-proxy"."npm"` | "Driver" SDK yang dipakai opencode untuk bicara ke provider ini. `@ai-sdk/openai-compatible` = driver untuk API bergaya OpenAI - dan proxy kita memang berbicara protokol itu. |
| `"provider"."zen-proxy"."options"."baseURL"` | Alamat tujuan. Di sini bukan server asli, melainkan **proxy lokal kita** (`http://127.0.0.1:8765/v1`). |
| `"provider"."zen-proxy"."options"."apiKey"` | Key untuk provider ini. Diisi **dummy** (`sk-proxy-dummy`) karena key asli disuntikkan proxy dari `keys.env` - key asli tidak pernah ada di file ini. |
| `"provider"."zen-proxy"."models"` | Daftar model yang tersedia lewat provider ini. |
| `...models"."big-pickle"` | ID model (bagian setelah `/` di `zen-proxy/big-pickle`). |
| `...models"."big-pickle"."name"` | Label tampilan model di UI opencode (jadi tampil "Big Pickle (via key-pool proxy)"). **Opsional** - tanpa ini opencode tetap jalan, hanya menampilkan ID mentah. |
| `"mcp"` | Daftar server MCP. Tiap key = satu server. |
| `"mcp"."<server>"."type"` | `"remote"` = server jalan di cloud (pakai `url`); `"local"` = proses di komputermu sendiri (pakai `command`). |
| `"mcp"."<server>"."url"` | Alamat server remote (dipakai kalau `type: remote`). |
| `"mcp"."<server>"."command"` | Perintah untuk menjalankan server lokal (dipakai kalau `type: local`). |
| `"mcp"."<server>"."enabled"` | Hidup/mati server MCP. `true` = aktif, `false` = mati tanpa harus menghapus entri dari file. |
| `"mcp"."<server>"."environment"` | Variabel lingkungan tambahan yang diberikan ke proses server lokal (contoh `postgres`). |
| `"lsp"` | Daftar server LSP (opsional, Bagian 6). Tiap key menghubungkan ekstensi file → tool pemeriksa. |
| `"lsp"."<bahasa>"."command"` | Perintah tool LSP (contoh `gopls`). |
| `"lsp"."<bahasa>"."extensions"` | Ekstensi file yang memicu tool tersebut. |
| `"lsp"."<bahasa>"."disabled"` | Berbeda dengan MCP: LSP memakai `"disabled"`, bukan `"enabled"`. `false` = aktif, `true` = mati. |

> Secara umum, opencode bisa membaca **lebih dari satu file config** (global, per project, dsb.) dan hasilnya **digabung** - bukan digantikan. komponen yang sama di file berprioritas lebih tinggi yang menang. Setup ini cukup memakai file global `~/.config/opencode/opencode.json` saja.

---

## Pilih sistem operasi kamu

Pilih salah satu di bawah ini. Detail langkahnya **sudah dipisah** agar tidak membingungkan.

### Windows

📄 → **[Buka panduan lengkap Setup Windows](docs/windows/SETUP.md)**

Berisi: **Bagian 1 = Failover multi API key (prioritas)**, lalu MCP (Bagian 5), LSP opsional (Bagian 6), verifikasi, dan perbaikan jika ada masalah.

### macOS

📄 → **[Buka panduan lengkap Setup macOS](docs/mac/SETUP.md)**

Berisi: **Bagian 1 = Failover multi API key (prioritas)**, lalu MCP (Bagian 5), LSP opsional (Bagian 6), verifikasi, dan perbaikan jika ada masalah.

> Perlu diingat: **isi konfigurasi kedua sistem sama.** Yang berbeda hanya cara install tools-nya dan cara mengatur environment variable-nya. Jadi sekali paham, dua-duanya bisa.

---

## Ringkasan langkah

Baik Windows maupun Mac, alurnya sama:

1. **Install tools** - seperti memasang perkakas yang dibutuhkan (Node.js, Git, dll.).
2. **Pasang failover multi API key** (prioritas) - folder `opencode-failover`, isi `keys.env`, jalankan proxy, arahkan opencode ke `zen-proxy`.
3. **Tempel config MCP** - satu file `opencode.json` berisi MCP (dan provider `zen-proxy`).
4. **LSP (opsional)** - pasang bahasa yang kamu tulis saja.
5. **Restart opencode** - agar konfigurasi terbaca.
6. **Verifikasi** - cek failover, MCP, dan (opsional) LSP sudah menyala.

Total waktu: sekitar **15-30 menit** per komputer.

---

## Gambaran singkat istilah

Penasaran apa maksud istilah-istilah yang sering muncul? Ini versi ramah-nya:

- **LSP (Language Server Protocol)** - kesepakatan cara editor dan "si pemeriksa bahasa" saling bicara. Hasilnya: deteksi error, saran perbaikan, go-to-definition. Bedanya di Opencode Agent: info itu dipakai si *agent* (AI) untuk membantu memperbaiki kode.
- **MCP (Model Context Protocol)** - kesepakatan cara AI memakai tools eksternal (browser, GitHub, database) tanpa perlu dibangun khusus satu-satu. Analogi: satu jenis "colokan universal" untuk banyak perangkat.
- **AI Agent** - program yang memakai AI untuk bekerja sendiri menyelesaikan tugas, menggunakan tool seperti membuka file, menjalankan perintah, sampai mengedit kode. Contoh sehari-hari: menulis kode, mencari info dari file, membuka website, meringkas dokumen, dan mengelola file.
- **API Key** - kata sandi khusus agar aplikasi boleh memakai layanan AI tertentu (contoh: Claude dari Anthropic, ChatGPT dari OpenAI, Gemini dari Google).
- **Environment variable** - "wadah catatan" sistem operasi tempat menyimpan pengaturan (di Windows: System Properties; di macOS: file `~/.zshrc`).
- **opencode.json** - file pengaturan utama Opencode Agent. Satu file ini mengatur semua: model, MCP, dan LSP (opsional).

Jika ada langkah yang terasa tersangkut, lihat bagian **"Troubleshooting"** di dokumen masing-masing sistem operasi.

---

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>