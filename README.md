<a id="top"></a>
# Setup Multiple Apikey Opencode: MCP, LSP

Panduan menyiapkan **Opencode Agent** - AI agent yang bisa permudah berbagai pekerjaan harianmu - di Windows atau macOS.

Dokumen ini ditulis dengan bahasa yang cukup sederhana. cukup ikuti langkahnya.

---

## 📌 Isi dokumen ini

- [Setup Multiple Apikey Opencode: MCP, LSP](#setup-multiple-apikey-opencode-mcp-lsp)
  - [📌 Isi dokumen ini](#-isi-dokumen-ini)
  - [Apa yang harus kamu siapkan?](#apa-yang-harus-kamu-siapkan)
  - [Kasus umum penggunaan](#kasus-umum-penggunaan)
  - [MCP untuk media (opsional)](#mcp-untuk-media-opsional)
  - [🔁 Failover multi API key (OpenCode Zen)](#failover-multi-api-key-opencode-zen)
  - [Pilih sistem operasi kamu](#pilih-sistem-operasi-kamu)
    - [🪟 Windows](#-windows)
    - [🍎 macOS](#-macos)
  - [Ringkasan langkah](#ringkasan-langkah)
  - [Gambaran singkat istilah](#gambaran-singkat-istilah)

---

## Apa yang harus kamu siapkan?

Kamu menyiapkan **Opencode Agent CLI** agar bisa bekerja maksimal di komputermu dengan 3 hal:

| Hal | Apa itu (versi sederhana) | Gimana rasanya di Opencode Agent |
|---|---|---|
| **Model gratis** | **Big Pickle (Opencode Zen)** - model resmi opencode, gratis (tetap butuh API key Zen) | langsung bisa dipakai setelah login OpenCode Zen |
| **LSP** | "Pemeriksa" bahasa program - seperti *spell checker* di Word, tapi untuk kode | agent otomatis tahu kalau ada error/warning di file yang kamu buka |
| **MCP** | "Tools tambahan" - memberi agent kemampuan baru (buka browser, akses GitHub, query database) | agent bisa menjalankan perintah dan mengakses data eksternal |
| **API Key** | "Kartu akses" untuk layanan AI (Claude, OpenAI, Gemini, dsb) - hanya opsional | agent bisa memakai beberapa provider AI sekaligus |

Tidak perlu paham semua sekarang - ikuti panduan per sistem operasi, dan semuanya akan terpasang.

> 💡 **Mau coba MCP sesederhana mungkin?** Gunakan **`context7`** (cari dokumentasi library) - server-nya berjalan di **cloud**, jadi **tidak perlu install apa pun** dan tidak butuh API key sendiri. Cukup tempel konfigurasinya di `opencode.json` lalu **restart** - langsung aktif.

---

## Kasus umum penggunaan

Opencode Agent bukan hanya untuk menulis kode. Berkat **MCP** (tools tambahan), agent bisa melakukan banyak pekerjaan harian. Beberapa kasus yang umum:

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

#### Kerja di agent apa pun

MCP itu **protokol standar** - tools MCP bisa dipakai di agent mana pun (Opencode, Claude, Cursor, dsb.) selama agentnya mendukung MCP. Jadi tools yang kamu pasang sekarang tetap bisa dipakai kalau nanti pindah agent.

#### 🎬 MCP untuk media (opsional)

Design foto, edit video, dan produksi musik di tabel atas **butuh MCP media tambahan** - server ini mati secara default (`"enabled": false`), nyalakan kalau dibutuhkan:

| Server MCP | Kemampuan | Butuh |
|---|---|---|
| **`mcp-video`** | Edit video & audio: potong, gabung, resize, subtitle, transkripsi, normalisasi suara | FFmpeg terinstall |
| **`artificer`** | Generate/Edit gambar (Gemini/Imagen), video (Veo), musik (Lyria 3), edit gambar (ImageMagick) | FFmpeg + ImageMagick + API key Gemini |

> Untuk detail cara install & tabel perbandingan lengkapnya, lihat **"Bagian 5"** di panduan sistem operasi kamu.

---

## 🔁 Failover multi API key (OpenCode Zen)

Punya **lebih dari satu API key** untuk layanan yang sama? Contohnya beberapa akun **OpenCode Zen** - setiap akun dapat model gratis **Big Pickle** dengan kuota sendiri. Kalau kuota satu key habis, opencode biasa hanya akan terus mencoba dan mentok di error. Bagian ini menjelaskan konsep yang disiapkan agar key **pindah otomatis** tanpa mengubah model.

### Kenapa bukan plugin fallback?

Plugin seperti `@razroo/opencode-model-fallback` juara untuk **pindah model** di tengah sesi (misal Big Pickle → Claude). Tapi untuk kasus **banyak key pada provider yang sama**, plugin kalah karena:

- key model `opencode/*` terbaca dari `auth.json`, **bukan** dari environment variable - plugin/wrapper tidak bisa sekadar mengganti key
- supaya key bisa dibedakan, tiap key harus dibuatkan "custom provider" sendiri di config
- deteksinya lewat error SDK, bukan status HTTP asli dari server

Untuk kasusmu, solusi yang tepat bukan plugin, melainkan **key-pool proxy** di bawah.

### Konsep: key-pool proxy lokal

```
opencode (TUI / opencode run / MCP / curl)
        │  baseURL → http://127.0.0.1:8765/v1
        ▼
   [ keys-pool-server ]       ← skrip Node lokal (rencana)
        │  •  baca file keys.env (satu key per baris, atas = prioritas)
        │  •  pilih key yang tidak sedang pending, teruskan ke upstream
        │  •  lihat respons asli: 429/402 kuota → pending key itu,
        │     coba key berikutnya; 4xx non-kuota → diteruskan apa adanya
        │  •  semua key pending → balas 429 + pesan jelas ke opencode
        ▼
   https://opencode.ai/zen/v1
```

> ⚠️ **Status: konsep + spesifikasi.** Skrip `keys-pool-server.js` **belum dibuat** - ini rencana yang siap diimplementasikan (lihat Roadmap di bawah).

### Perbandingan pendekatan

| Pendekatan | Rotasi di tengah sesi TUI | Rotasi key (bukan model) | Deteksi error | Persisten antar restart | Berlaku untuk command lain |
|---|---|---|---|---|---|
| Wrapper `run-with-failover.sh` (saat ini) | ❌ per-eksekusi | ✅ baca daftar key | ⚠️ tebak lewat teks | ❌ | ✅ curl, MCP, npm |
| Plugin `@razroo/opencode-model-fallback` | ✅ | ⚠️ butuh custom provider per key | ⚠️ lewat SDK | ❌ | ❌ hanya model opencode |
| **Key-pool proxy** (rencana) | ✅ | ✅ di level HTTP | ✅ status 429/402 asli | ✅ file `cooldowns.json` | ✅ semua |
| Tool existing (`oswap`, `opencode-go-multi-auth`) | ✅ | ✅ | ✅ | ✅ | ✅ |

### Spesifikasi desain `keys-pool-server.js` (rencana)

- **Tempat**: folder `opencode-failover` (di samping `run-with-failover.sh`), Node.js tanpa dependency
- **Port**: `127.0.0.1:8765`, hanya bind ke localhost (tidak terbuka ke jaringan)
- **Masukan**: `keys.env` - satu key per baris, baris atas = prioritas
- **State**: `cooldowns.json` - durasi pending bertahan walau komputer di-restart
- **Rotasi**: respons `429` / `402` dengan body kuota → pending key itu (pakai `Retry-After` jika ada), lanjut ke key berikutnya; 4xx non-kuota diteruskan apa adanya
- **Kapasitas habis semua**: balas `429` ke opencode dengan pesan yang mudah dibaca
- **Endpoint**: `/health` (proxy hidup?) dan `/status` (keadaan tiap key)
- **Streaming**: SSE `chat/completions` diteruskan byte-by-byte agar token tetap muncul langsung
- **Opsi CLI**: `--port`, `--keys-file`, `--dry-run`, `--reset-cooldowns`

### Konfigurasi opencode

Tambah **satu** custom provider (bukan satu per key):

```json
"providers": {
  "zen-proxy": {
    "npm": "@ai-sdk/openai-compatible",
    "options": {
      "baseURL": "http://127.0.0.1:8765/v1",
      "apiKey": "sk-proxy-dummy"
    },
    "models": { "big-pickle": { "name": "Big Pickle (via key-pool proxy)" } }
  }
}
```

lalu ganti `"model"` menjadi `"zen-proxy/big-pickle"`. Key asli tidak pernah masuk config - proxy yang menyuntikkan key dari `keys.env`.

### Kapan pakai yang mana

| Kebutuhan kamu | Pilih |
|---|---|
| Sering `opencode run` sekali jalan / command lain (curl, MCP, npm) | Wrapper `run-with-failover.sh` |
| Mau rotasi otomatis di TUI dengan beberapa key Zen | **Key-pool proxy** ini |
| Mau pindah ke model lain saat limit (misal Big Pickle → Claude) | Plugin `@razroo/opencode-model-fallback` |
| Tidak mau bikin/bedah sendiri | Tool existing (`oswap`, `opencode-go-multi-auth`) |

### Roadmap implementasi (fase berikutnya)

1. Tulis `keys-pool-server.js` (Node, tanpa dependency)
2. Uji: `node keys-pool-server.js --dry-run` lalu `curl http://127.0.0.1:8765/status`
3. Isi `keys.env` dengan beberapa key Zen
4. Pasang custom provider `zen-proxy` di `opencode.json` (snippet di atas)
5. Verifikasi: cek `/status`, jalankan opencode, lalu geser kuota salah satu key untuk melihat perpindahan

---

## Pilih sistem operasi kamu

Pilih salah satu di bawah ini. Detail langkahnya **sudah dipisah** agar tidak membingungkan.

### 🪟 Windows

📄 → **[Buka panduan lengkap Setup Windows](docs/windows/SETUP.md)**

Berisi: install tools, set API key, set token GitHub, buat file konfigurasi, verifikasi, dan perbaikan jika ada masalah.

### 🍎 macOS

📄 → **[Buka panduan lengkap Setup macOS](docs/mac/SETUP.md)**

Berisi: install tools, set API key, set token GitHub, buat file konfigurasi, verifikasi, dan perbaikan jika ada masalah.

> Perlu diingat: **isi konfigurasi kedua sistem sama.** Yang berbeda hanya cara install tools-nya dan cara mengatur environment variable-nya. Jadi sekali paham, dua-duanya bisa.

---

## Ringkasan langkah

Baik Windows maupun Mac, alurnya sama:

1. **Install tools** - seperti memasang perkakas yang dibutuhkan (Node.js, Git, dll.).
2. **Login OpenCode Zen** - daftarkan API key model gratis **Big Pickle (Opencode Zen)**.
3. **Set API key lain** - *opsional*, hanya jika ingin menambah provider berbayar.
4. **Set GitHub token** - *opsional*, hanya jika ingin akses GitHub dari agent.
5. **Salin file konfigurasi** - satu file `opencode.json` yang mengaktifkan semua fitur.
6. **Restart opencode** - agar konfigurasi terbaca.
7. **Verifikasi** - cek semua sudah menyala.

Total waktu: sekitar **15–30 menit** per komputer.

---

## Gambaran singkat istilah

Penasaran apa maksud kata-kata yang sering muncul? Ini versi ramah-nya:

- **LSP (Language Server Protocol)** - kesepakatan cara editor dan "si pemeriksa bahasa" saling bicara. Hasilnya: deteksi error, saran perbaikan, go-to-definition. Bedanya di Opencode Agent: info itu dipakai si *agent* (AI) untuk membantu memperbaiki kode.
- **MCP (Model Context Protocol)** - kesepakatan cara AI memakai tools eksternal (browser, GitHub, database) tanpa perlu dibangun khusus satu-satu. Analogi: satu jenis "colokan universal" untuk banyak perangkat.
- **AI Agent** - program yang memakai AI untuk bekerja sendiri menyelesaikan tugas, menggunakan tool seperti membuka file, menjalankan perintah, sampai mengedit kode. Contoh sehari-hari: menulis kode, mencari info dari file, membuka website, meringkas dokumen, dan mengelola file.
- **API Key** - kata sandi khusus agar aplikasi boleh memakai layanan AI tertentu (contoh: Claude dari Anthropic, ChatGPT dari OpenAI, Gemini dari Google).
- **Environment variable** - "kotak catatan" sistem operasi tempat menyimpan pengaturan (di Windows: System Properties; di macOS: file `~/.zshrc`).
- **opencode.json** - file pengaturan utama Opencode Agent. Satu file ini mengatur semua: model, LSP, dan MCP.

Jika ada langkah yang terasa tersangkut, lihat bagian **"Troubleshooting"** di dokumen masing-masing sistem operasi.

---

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>