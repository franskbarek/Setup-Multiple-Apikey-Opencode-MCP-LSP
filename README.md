<a id="top"></a>
# Failover Multi API key + MCP untuk Opencode (LSP opsional)

Project ini berfokus pada **dua hal utama** dan satu hal opsional:

| Prioritas | Bagian | Wajib? |
|---|---|---|
| 🔁 1 | **Failover multi API key** - konsep inti project ini. Saat kuota satu key habis, otomatis berganti ke key berikutnya tanpa pindah model. | **Paling wajib** |
| 🧩 2 | **MCP** - tools tambahan untuk agent (browser, GitHub, database, media, dsb.). | Utama |
| 🪶 3 | **LSP** - pemeriksa bahasa. Caranya tetap saya tunjukkan, tapi tidak wajib. | Opsional |

Dokumen ini ditulis dengan bahasa sederhana. Cukup ikuti langkahnya.

---

## 📌 Isi dokumen ini

- [🔁 1. Failover multi API key (PRIORITAS)](#-1-failover-multi-api-key-prioritas)
- [🧩 2. MCP (tools tambahan - utama)](#-2-mcp-tools-tambahan---utama)
- [🪶 3. LSP (opsional - tetap ada caranya)](#-3-lsp-opsional---tetap-ada-caranya)
- [🧰 4. Yang harus disiapkan (dasar)](#-4-yang-harus-disiapkan-dasar)
- [Pilih sistem operasi kamu](#pilih-sistem-operasi-kamu)
- [Ringkasan langkah](#ringkasan-langkah)
- [Gambaran singkat istilah](#gambaran-singkat-istilah)

---

## 🔁 1. Failover multi API key (PRIORITAS)

Di setup ini saya memakai **lebih dari satu API key untuk layanan yang sama** - contohnya beberapa akun **OpenCode Zen**, dan tiap akun dapat model gratis **Big Pickle** dengan kuota masing-masing. Masalahnya: kalau kuota satu key habis, opencode hanya mencoba terus dan mentok di error. Supaya kamu (dan tim saya) tidak perlu pindah key secara manual, saya sudah implementasikan konsep berikut: **key berpindah otomatis tanpa mengubah model** - dan sudah berjalan di setup ini.

### Kenapa saya tidak sekadar pakai plugin fallback?

Beberapa teman sempat menyarankan plugin fallback (contoh `@razroo/opencode-model-fallback`) yang pindah ke model lain saat limit. Plugin itu memang juara kalau tujuannya **pindah model** di tengah sesi (misal Big Pickle → Claude). Tapi untuk kasus **banyak key pada provider yang sama**, saya menilai plugin kurang pas:

- key model `opencode/*` terbaca dari `auth.json`, **bukan** dari environment variable - jadi plugin/wrapper tidak bisa sekadar mengganti key
- supaya key bisa dibedakan, tiap key harus dibuatkan "custom provider" sendiri di config
- deteksinya lewat error SDK, bukan status HTTP asli dari server

Keputusan saya: untuk kasus seperti ini yang tepat bukan plugin, melainkan **key-pool proxy** di bawah.

### Konsep yang saya pilih: key-pool proxy lokal

Satu proxy kecil yang saya jalankan di komputer, duduk di antara opencode dan server Zen. opencode hanya bicara ke proxy; proxy yang memegang daftar key dan memilih key mana yang dipakai setiap request.

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
                           │
               ┌───────────┴───────────┐
               ▼                       ▼
       respons 429/402 kuota?      respons lain?
               │                       │
              ya                       │
               │                       ├─────► 4xx non-kuota
               ▼                       │       → teruskan apa adanya
      tandai key = PENDING             │
      (durasi pakai Retry-After)       │
               │                       │
               ▼                       │
   masih ada key lain yang aktif?      │
       ┌──────┴──────┐                 │
       ▼             ▼                 │
      ya           tidak               │
       │             │                 │
       ▼             │                 │
   kembali ke        │                 │
   pilih key         │                 │
   berikutnya        │                 │
       └──────┬──────┘                 │
              ▼                        ▼
   semua key pending?           respons OK / SSE stream
      ┌──────┴──────┐           diteruskan ke opencode
      ▼             ▼
     ya           tidak
      │             │
      ▼             └────────────► ulangi pemilihan key
   balas 429 + pesan
   mudah dibaca ke opencode
```

#### Penjelasan langkah demi langkah

1. **Request masuk** - opencode mengirim permintaan ke proxy (misal kita mulai dari key #1, key paling atas di `keys.env`).
2. **Teruskan** - proxy meneruskan request itu ke `https://opencode.ai/zen/v1` memakai key #1.
3. **Respons normal** - kalau key #1 sehat, jawaban (termasuk SSE yang mengalir token demi token) diteruskan langsung ke opencode. Selesai.
4. **Kuota habis** - kalau upstream membalas `429`/`402` (kuota key #1 habis), proxy menandai key #1 sebagai *pending* selama durasi tertentu (pakai `Retry-After` kalau dikirim server).
5. **Ganti key** - karena key #1 pending, proxy otomatis mencoba key berikutnya di daftar (key #2, #3, dst.).
6. **Semua pending** - kalau semua key sedang pending, proxy balas `429` + pesan yang mudah dibaca ke opencode, misal *"Semua key Zen sedang dalam cooldown, coba lagi ~2 menit lagi."*
7. **Pulih otomatis** - setelah durasi pending habis, key kembali aktif dan dipakai lagi. Karena state disimpan di `cooldowns.json`, cooldown ini **tetap berlaku walau komputer di-restart**.

Karena logika ini ada di level HTTP, satu konsep ini langsung berlaku untuk **TUI, `opencode run`, MCP, dan curl** sekaligus - tanpa menyentuh model yang dipakai.

> ✅ **Status: sudah saya implementasikan.** Skrip `keys-pool-server.js` sudah jadi dan ada di repo ini - ikuti Bagian 1 di panduan sistem operasi kamu untuk langkah nyatanya.

### Perbandingan pendekatan (yang saya pertimbangkan)

Supaya keputusan di atas jelas, ini catatan perbandingan saya:

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
- **Rotasi**: respons `429` / `402` dengan body kuota → pending key itu (pakai `Retry-After` jika ada), lanjut ke key berikutnya; 4xx non-kuota diteruskan apa adanya
- **Kapasitas habis semua**: balas `429` ke opencode dengan pesan yang mudah dibaca
- **Endpoint**: `/health` (proxy hidup?) dan `/status` (keadaan tiap key)
- **Streaming**: SSE `chat/completions` diteruskan byte-by-byte agar token tetap muncul langsung
- **Opsi CLI**: `--port`, `--keys-file`, `--dry-run`, `--reset-cooldowns`

### Konfigurasi opencode (yang saya siapkan)

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

### Kapan memakai yang mana (panduan buat tim)

| Kebutuhan kamu | Pilih |
|---|---|
| Beberapa API key untuk layanan yang sama (TUI, `opencode run`, MCP, curl) | **Key-pool proxy** - ini setup yang saya pakai sekarang |
| Mau pindah ke model lain saat limit (misal Big Pickle → Claude) | Plugin `@razroo/opencode-model-fallback` |
| Ingin proxy siap pakai dari komunitas | `oswap`, `opencode-go-multi-auth` |

### Setup langkah demi langkah (sudah berjalan)

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

## 🧩 2. MCP (tools tambahan - utama)

Bagian utama kedua dari project ini. **MCP (Model Context Protocol)** memberi agent "tools tambahan" - seperti aplikasi baru yang bisa dipanggil. Dengan MCP, agent bisa buka browser, akses GitHub, query database, mengedit media, dan banyak lagi.

### Kasus umum penggunaan

Berkat MCP, agent bisa melakukan banyak pekerjaan harian:

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

## 🪶 3. LSP (opsional - tetap ada caranya)

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

## 🧰 4. Yang harus disiapkan (dasar)

Dasar-dasar yang perlu kamu kenal dulu:

| Hal | Apa itu (versi sederhana) | Gimana rasanya di Opencode Agent |
|---|---|---|
| **Model gratis** | **Big Pickle (Opencode Zen)** - model resmi opencode, gratis (tetap butuh API key Zen) | langsung bisa dipakai setelah ada key Zen |
| **MCP** | "Tools tambahan" - memberi agent kemampuan baru (buka browser, akses GitHub, query database) | agent bisa menjalankan perintah dan mengakses data eksternal |
| **LSP** | "Pemeriksa" bahasa program - seperti *spell checker* di Word, tapi untuk kode | agent otomatis tahu kalau ada error/warning di file yang kamu buka |
| **API Key** | "Kartu akses" untuk layanan AI (Claude, OpenAI, Gemini, dsb.) | agent bisa memakai beberapa provider AI sekaligus |

Untuk failover, kamu butuh **Node.js ≥ 20** dan **opencode (CLI)**. Tidak perlu paham semua sekarang - ikuti panduan per sistem operasi di bawah.

---

## Pilih sistem operasi kamu

Pilih salah satu di bawah ini. Detail langkahnya **sudah dipisah** agar tidak membingungkan.

### 🪟 Windows

📄 → **[Buka panduan lengkap Setup Windows](docs/windows/SETUP.md)**

Berisi: **Bagian 1 = Failover multi API key (prioritas)**, lalu MCP (Bagian 5), LSP opsional (Bagian 6), verifikasi, dan perbaikan jika ada masalah.

### 🍎 macOS

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

Penasaran apa maksud kata-kata yang sering muncul? Ini versi ramah-nya:

- **LSP (Language Server Protocol)** - kesepakatan cara editor dan "si pemeriksa bahasa" saling bicara. Hasilnya: deteksi error, saran perbaikan, go-to-definition. Bedanya di Opencode Agent: info itu dipakai si *agent* (AI) untuk membantu memperbaiki kode.
- **MCP (Model Context Protocol)** - kesepakatan cara AI memakai tools eksternal (browser, GitHub, database) tanpa perlu dibangun khusus satu-satu. Analogi: satu jenis "colokan universal" untuk banyak perangkat.
- **AI Agent** - program yang memakai AI untuk bekerja sendiri menyelesaikan tugas, menggunakan tool seperti membuka file, menjalankan perintah, sampai mengedit kode. Contoh sehari-hari: menulis kode, mencari info dari file, membuka website, meringkas dokumen, dan mengelola file.
- **API Key** - kata sandi khusus agar aplikasi boleh memakai layanan AI tertentu (contoh: Claude dari Anthropic, ChatGPT dari OpenAI, Gemini dari Google).
- **Environment variable** - "kotak catatan" sistem operasi tempat menyimpan pengaturan (di Windows: System Properties; di macOS: file `~/.zshrc`).
- **opencode.json** - file pengaturan utama Opencode Agent. Satu file ini mengatur semua: model, MCP, dan (opsional) LSP.

Jika ada langkah yang terasa tersangkut, lihat bagian **"Troubleshooting"** di dokumen masing-masing sistem operasi.

---

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>