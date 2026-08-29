<a id="top"></a>
# Setup opencode di macOS - Detail Lengkap

> 🔺 **Prioritas dokumen ini:**
> 1. **🔁 Failover multi API key (Bagian 1) = prioritas** - konsep inti project ini. Banyak key otomatis berganti saat kuota habis, tanpa pindah model.
> 2. **🧩 MCP (Bagian 5) = utama** - tools tambahan untuk agent (browser, GitHub, database, media, dsb.).
> 3. **🪶 LSP (Bagian 6) = opsional** - pemeriksa bahasa. Tetap ada caranya.

Jika ini pertama kali membaca, mulai dari [README utama](../..) untuk paham konsepnya dengan bahasa sederhana.

## Daftar Isi

- [1. Failover multi API key (prioritas)](#1-failover-multi-api-key-prioritas)
- [2. Yang Perlu Disiapkan](#2-yang-perlu-disiapkan)
- [3. Install Tools di macOS](#3-install-tools-di-macos)
- [4. Mengatur API Key & GitHub Token (opsional)](#4-mengatur-api-key--github-token-opsional)
- [5. Membuat File Konfigurasi (MCP + failover)](#5-membuat-file-konfigurasi-mcp--failover)
- [6. LSP - Opsional (tetap ada caranya)](#6-lsp---opsional-tetap-ada-caranya)
- [7. Verifikasi](#7-verifikasi)
- [8. Troubleshooting macOS](#8-troubleshooting-macos)

---

## 1. Failover multi API key (prioritas)

**Ini bagian paling penting dari project ini.** Konsepnya: beberapa API key untuk layanan yang sama (misal beberapa akun **OpenCode Zen**, tiap akun dapat model gratis **Big Pickle** dengan kuota masing-masing) dipakai **bergantian otomatis**. Kalau kuota satu key habis, key berikutnya langsung dipakai - kamu tidak perlu pindah key manual.

**Masalah yang saya temui:** saat kuota satu key habis, opencode hanya mentok - tidak pindah sendiri.

**Konsep yang saya pilih:** arahkan opencode ke **proxy lokal** yang memegang daftar key (file `keys.env`) lalu meneruskan ke `https://opencode.ai/zen/v1`. Saat upstream membalas `429`/`402` kuota, proxy menandai key itu *pending* dan memakai key berikutnya - berlaku untuk TUI, `opencode run`, MCP, dan curl sekaligus.

**Alurnya:**

```
 request dari opencode
      → pilih key teratas yang TIDAK pending
      → teruskan ke https://opencode.ai/zen/v1
      → respons 429/402?   ── ya ──► tandai key PENDING (pakai Retry-After)
      → respons normal?        │        lalu coba key berikutnya
           └─► teruskan ke     │
               opencode        ▼
                 (SSE)    semua key pending? ── tidak ──► ulangi
                 ▲               │
                 │              ya ▼
                 └──────── balas 429 + pesan jelas ke opencode
```

**Penjelasan singkat:** satu key sehat → request diteruskan langsung (termasuk token streaming). Kuota key habis (`429`/`402`) → key itu menunggu dulu, proxy otomatis pakai key berikutnya. Semua key menunggu → proxy bilang ke opencode *"semua key sedang cooldown"*. Setelah jeda habis, key aktif lagi; state disimpan di `cooldowns.json` jadi awet walau komputer di-restart.

> ✅ **Status: sudah saya implementasikan.** Skrip `keys-pool-server.js` tersedia di [repo utama](../../keys-pool-server.js). Penjelasan konsep + perbandingan ada di [README utama](../../..#-1-failover-multi-api-key-prioritas).

> ⚠️ Bagian ini butuh **Node.js ≥ 20** dan **opencode** terinstall. Kalau belum ada, kerjakan **Bagian 2 & 3** dulu (sekitar 10 menit), lalu kembali ke sini.

**Cara pasang - ikuti urut dari Langkah 1 sampai Langkah 8:**

#### Langkah 1 - Siapkan folder

Buat folder tempat proxy tinggal (tidak masalah kalau sudah ada):

```bash
mkdir -p ~/opencode-failover
```

#### Langkah 2 - Salin skrip

Salin file `keys-pool-server.js` dari folder paling atas repo ini ke folder di Langkah 1. Boleh lewat Finder: copy file lalu paste ke folder `opencode-failover` di home.

#### Langkah 3 - Isi daftar key

Buat file `keys.env` di folder yang sama (folder `opencode-failover`). Isi **satu key per baris**, baris paling atas = prioritas:

```
sk-Romxxx....
sk-Romxxx....
```

Baris kosong dan baris yang diawali `#` diabaikan. Simpan. (Jangan pernah unggah `keys.env` ke mana pun.)

#### Langkah 4 - Cek dulu, tanpa menjalankan apa pun

```bash
cd ~/opencode-failover
node keys-pool-server.js --dry-run
```

Seharusnya muncul jumlah key yang terbaca dan perintah siap. Kalau muncul tulisan **"Tidak ada key valid"**, periksa kembali `keys.env` di Langkah 3.

#### Langkah 5 - Jalankan proxy

```bash
node keys-pool-server.js
```

Biarkan jendela Terminal ini tetap terbuka selama opencode dipakai. Seharusnya muncul:

```
keys-pool-server berjalan di http://127.0.0.1:8765
```

#### Langkah 6 - Cek kondisi proxy

Buka **jendela Terminal kedua**, lalu jalankan:

```bash
curl http://127.0.0.1:8765/status
```

Harus muncul daftar key dengan status `active`. Kalau ada key yang sedang menunggu, statusnya `cooldown` dengan hitungan mundur.

#### Langkah 7 - Arahkan opencode ke proxy

Buka file `opencode.json` (lokasinya di Bagian 5). Kalau belum ada, buat dengan isi minimal berikut:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "zen-proxy/big-pickle",
  "provider": {
    "zen-proxy": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://127.0.0.1:8765/v1",
        "apiKey": "sk-proxy-dummy"
      },
      "models": { "big-pickle": { "name": "Big Pickle (via key-pool proxy)" } }
    }
  }
}
```

Key asli **tidak pernah masuk file ini** - key dipegang `keys.env` oleh proxy.

#### Langkah 8 - Restart & verifikasi

1. Tutup opencode, lalu buka lagi.
2. Ajukan satu pertanyaan - kalau dijawab, berarti proxy sudah jalan.
3. Saat kuota key #1 habis, cek `/status` (Langkah 6): key #1 berubah jadi `cooldown`, dan permintaan berikutnya otomatis memakai key #2.

**Kalau ada masalah:**

| Masalah | Solusi |
|---|---|
| `zen-proxy` tidak jalan | Pastikan Langkah 5 masih berjalan, dan model memakai `zen-proxy/big-pickle` di Langkah 7 |
| Semua key `cooldown` | Tunggu hitungan mundur selesai, atau reset: `node keys-pool-server.js --reset-cooldowns` |

**Alternatif (tanpa membangun ini):** `@razroo/opencode-model-fallback` untuk pindah model, atau `oswap`/`opencode-go-multi-auth` sebagai proxy siap pakai - bandingkan di README.

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 2. Yang Perlu Disiapkan

Untuk failover + MCP, kebutuhan diprioritaskan: **pasang dulu yang wajib (Node.js & Git), sisanya opsional.** Persiapan bahasa pemrograman (LSP, Bagian 6) **TIDAK prioritas** - cukup pasang bahasa yang kamu tulis, sisanya boleh dilewati.

### 2.1 Prioritas utama - wajib dulu

Tool yang benar-benar dibutuhkan untuk memakai opencode dan proxy failover:

| Tool | Fungsinya | Cara cek |
|---|---|---|
| opencode (CLI) | Aplikasi utama AI coding agent | `opencode --version` |
| [Homebrew](https://brew.sh) | Pengelola paket macOS - dipakai untuk menginstall Node.js & Git | `brew --version` |
| [Node.js](https://nodejs.org) ≥ 20 | Wajib - menjalankan opencode, **proxy failover**, & MCP server berbasis JavaScript (filesystem, memory, playwright, dll.) | `node -v` |
| [Git](https://git-scm.com) | Wajib - version control, dibutuhkan hampir semua project & MCP git | `git --version` |

### 2.2 Opsional - pasang sesuai kebutuhan

Semua di bawah ini **boleh dilewati dulu**. Pasang hanya kalau butuh:

**uv - untuk MCP server berbasis Python (git, fetch, postgres):** hanya jika kamu ingin memakai MCP server tersebut.

| Tool | Fungsinya | Cara cek |
|---|---|---|
| [uv (Python)](https://docs.astral.sh/uv/) | Menjalankan MCP server berbasis Python (git, fetch, postgres) | `uv --version` |

**Bahasa pemrograman (LSP) - TIDAK prioritas:** lihat Bagian 6. Install hanya bahasa yang sering kamu tulis.

**MCP browser (Playwright):** hanya jika kamu ingin opencode bisa membuka / berinteraksi dengan browser.

**MCP media (gambar, video, musik):** hanya jika kamu ingin agent bisa *mengedit* atau *membuat* media. Butuh FFmpeg (wajib untuk semua MCP media); ImageMagick hanya jika memakai `artificer`.

| Tool | Fungsinya | Cara cek |
|---|---|---|
| [FFmpeg](https://ffmpeg.org) | Mesin processing video & audio (trim, gabung, resize, subtitle, dll.) | `ffmpeg -version` |
| [ImageMagick](https://imagemagick.org) | Mesin processing gambar (resize, composite, effects) - khusus `artificer` | `magick -version` |

> **Catatan:** Xcode Command Line Tools (berisi `clang`/`clangd` untuk C/C++) biasanya sudah ada atau muncul otomatis saat pertama menjalankan `xcode-select --install`.

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 3. Install Tools di macOS

Buka **Terminal**, lalu jalankan perintah sesuai kelompok. **Mulai dari prioritas utama (3.1) dulu - sisanya opsional.**

### 3.1 Prioritas utama - wajib dulu

```bash
# Homebrew (jalankan jika `brew --version` belum muncul)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js + Git (wajib)
brew install node git
```

> Selesai sampai sini, opencode sudah bisa dipakai dan proxy failover bisa jalan. Kelompok di bawah **opsional** - pasang hanya yang kamu butuh.

### 3.2 Opsional - uv (MCP server berbasis Python)

Hanya jika kamu ingin memakai MCP server seperti git, fetch, atau postgres:

```bash
brew install uv
```

### 3.3 Opsional - MCP browser (Playwright)

Hanya jika kamu ingin opencode bisa membuka browser:

```bash
npx playwright install chromium
```

### 3.4 Opsional - tools untuk MCP media (FFmpeg & ImageMagick)

Hanya jika kamu ingin agent bisa mengedit/membuat gambar, video, atau musik:

```bash
# FFmpeg (wajib untuk semua MCP media)
brew install ffmpeg

# ImageMagick (hanya jika memakai artificer untuk edit gambar)
brew install imagemagick
```

> Cek: `ffmpeg -version` dan `magick -version`. Setelah install, **tutup dan buka ulang Terminal** agar PATH terbaca.

> **Penting:** Setelah install selesai, **tutup dan buka ulang Terminal** agar PATH yang baru terbaca.

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 4. Mengatur API Key & GitHub Token (opsional)

Model gratis **Big Pickle (Opencode Zen)** tetap butuh API key - tapi gratis. Ambil key-nya satu per satu dari akun Zen kamu (beberapa akun = beberapa key untuk failover, ditaruh di `keys.env` Bagian 1).

### 4.1 Dapatkan API key Zen

Buka <https://opencode.ai/zen>, login, dan salin API key-nya. Kalau pakai failover (Bagian 1), kumpulkan beberapa key ke `keys.env`. Kalau tidak, daftarkan satu key lewat:

```bash
opencode auth login
```

Pilih **OpenCode Zen** di daftar provider, lalu tempel API key yang sudah kamu salin.

### 4.2 Opsional - login untuk provider lain

API key provider berbayar (Anthropic, OpenAI, Google, dsb.) baru dibutuhkan **hanya jika** kamu ingin menambah provider lain selain yang gratis.

```bash
opencode auth login
```

Ikuti petunjuk di layar untuk tiap provider yang kamu pakai. Token disimpan di **macOS Keychain** - aman, tidak terlihat di file apa pun.

Atau tambahkan baris berikut ke file `~/.zshrc`:

```bash
export ANTHROPIC_API_KEY="sk-ant-xxx"
export OPENAI_API_KEY="sk-xxx"
export GEMINI_API_KEY="AIza-xxx"
```

Lalu muat ulang pengaturannya:

```bash
source ~/.zshrc
```

> Ganti `sk-ant-xxx`, `sk-xxx`, `AIza-xxx` dengan token asli kamu.

### 4.3 Opsional - GitHub token (untuk MCP GitHub)

MCP GitHub dipakai opencode untuk membaca repo, melihat issue/PR, dll.

1. Buka <https://github.com/settings/tokens> → **Tokens (classic)** → **Generate new token (classic)**.
2. Centang minimal: `repo`, `read:user`, dan `read:org` (atau pakai **fine-grained token** dengan scope sesuai kebutuhan).
3. Salin tokennya, lalu tambahkan ke `~/.zshrc`:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="github_pat_xxx"
```

```bash
source ~/.zshrc
```

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 5. Membuat File Konfigurasi (MCP + failover)

Lokasi file konfigurasi global opencode di macOS:

```
~/.config/opencode/opencode.json
```

Jika folder `.config` belum ada, buat dulu. File ini adalah file yang sama dengan yang kamu buat di **Bagian 1 Langkah 7** - sekarang diisi lengkap dengan blok **MCP**.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",

  "model": "zen-proxy/big-pickle",
  "small_model": "zen-proxy/big-pickle",

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

  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp",
      "enabled": true
    },
    "github": {
      "type": "remote",
      "url": "https://api.githubcopilot.com/mcp/",
      "enabled": true,
      "oauth": false,
      "headers": {
        "Authorization": "Bearer {env:GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    },
    "filesystem": {
      "type": "local",
      "command": [
        "npx", "-y", "@modelcontextprotocol/server-filesystem",
        "~/projects", "~/Downloads"
      ],
      "enabled": true
    },
    "playwright": {
      "type": "local",
      "command": ["npx", "-y", "@playwright/mcp@latest"],
      "enabled": true
    },
    "git": {
      "type": "local",
      "command": ["uvx", "mcp-server-git"],
      "enabled": true
    },
    "fetch": {
      "type": "local",
      "command": ["uvx", "mcp-server-fetch"],
      "enabled": true
    },
    "memory": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-memory"],
      "enabled": true
    },
    "postgres": {
      "type": "local",
      "command": ["uvx", "postgres-mcp"],
      "environment": { "POSTGRES_CONNECTION_STRING": "{env:POSTGRES_DSN}" },
      "enabled": false
    },
    "sqlite": {
      "type": "local",
      "command": [
        "npx", "-y", "@modelcontextprotocol/server-sqlite",
        "~/data/app.db"
      ],
      "enabled": false
    },
    "video": {
      "type": "local",
      "command": ["uvx", "--from", "mcp-video", "mcp-video"],
      "enabled": false
    },
    "artificer": {
      "type": "local",
      "command": ["npx", "-y", "artificer-mcp"],
      "environment": { "GOOGLE_API_KEY": "{env:GEMINI_API_KEY}" },
      "enabled": false
    }
  }
}
```

> **Catatan `enabled`:** setiap MCP server punya flag `"enabled": true/false` - ganti nilainya untuk mengaktifkan/menonaktifkan server tertentu tanpa harus menghapusnya dari file. Contoh: `postgres` dan `sqlite` sengaja `false` karena butuh database; jika suatu saat mau dipakai, cukup ubah jadi `true`.

> **Catatan MCP media:** dua server di atas (`video` & `artificer`) **mati secara default** (`"enabled": false`) karena butuh tools & API key tambahan. Nyalakan hanya jika dibutuhkan (ubah jadi `true` lalu restart). Rinciannya di bawah.

### context7 - MCP paling gampang

Mau merasakan MCP bekerja tanpa ribet? Pakai **`context7`** - sudah `"enabled": true` di config di atas.

Kenapa paling gampang:

- **Tipe remote** - server-nya berjalan di cloud (`https://mcp.context7.com/mcp`), bukan proses lokal di komputermu
- **Tanpa install** - tidak perlu `npx`/`uv`/`pip`, tidak perlu tools tambahan, tidak butuh API key
- **Cukup tempel config + restart** - langsung aktif saat opencode pertama dijalankan

Perbandingan singkat dengan MCP lain di config:

| Server MCP | Type | Perlu install | Butuh tambahan |
|---|---|---|---|
| **context7** ⭐ | remote | tidak ada | tidak ada (gratis) |
| github | remote | tidak ada | GitHub token |
| filesystem, memory | local | npx (dibuat otomatis) | tidak ada |
| playwright | local | npx | `npx playwright install chromium` |
| video, artificer | local | paket Python/Node | FFmpeg, ImageMagick, API key Gemini |
| postgres, sqlite | local | paket | server database |

### Perbandingan MCP server media

Semua server di tabel ini bekerja di **agent apa pun** (Opencode, Claude, Cursor, dsb.) karena MCP adalah protokol standar. Tidak semua disarankan untuk dipasang - pilih sesuai kebutuhan.

| Server MCP | Kemampuan | Install | Catatan |
|---|---|---|---|
| **`mcp-video`** ⭐ rekomendasi | 91 tools: trim, merge, resize, crop, subtitle, transkripsi, normalisasi audio, color grading, repurposing shorts/reels | `uvx --from mcp-video mcp-video` | Free, via uv (sudah terinstall); butuh FFmpeg |
| **`artificer`** <br>⚠️ pre-release | Generate/edit gambar (Gemini/Imagen/Nano Banana), video (Veo), musik (Lyria 3); edit gambar ImageMagick (57 tools); post-processing FFmpeg | `npx -y artificer-mcp` | Butuh FFmpeg + ImageMagick + API key Gemini (`GEMINI_API_KEY`) |
| kinocut | 196 tools video "guardrailed" (cek kualitas sebelum publish) | `uvx` | Alternatif mcp-video |
| ffmpeg-mcp (dubnium0) | 40+ tools: video/audio plus streaming HLS/DASH/RTMP | Python | Butuh FFmpeg |
| ffmpeg-mcp-video-editor | 38 tools: deteksi/tracking wajah, render timeline | Python + uv | Butuh FFmpeg |
| mcpCut | Editor timeline sungguhan (MLT/FFmpeg), auto-caption, voiceover | Self-host (Python) / hosted | Multi-track editing |
| VEMCP (video_editing_mcp) | Pipeline FFmpeg satu-pass, transkripsi Whisper | Python | Butuh FFmpeg |
| m3cp | OpenAI multimodal: edit/inpaint gambar, STT, TTS, transformasi suara | Python | Butuh API key OpenAI |
| mcp-openai-images-audio | Edit gambar via `gpt-image-2` | Python | Butuh API key OpenAI |

> `mcpCut`, `m3cp`, dan `mcp-openai-images-audio` tidak dimasukkan ke config utama karena butuh hosting sendiri / API key berbayar.

> **Setelah menyimpan file ini, WAJIB quit & restart opencode** - konfigurasi hanya dibaca saat opencode dijalankan. Saat menyalakan server media, pastikan juga FFmpeg sudah terinstall (`ffmpeg -version`).

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 6. LSP - Opsional (tetap ada caranya)

**LSP (Language Server Protocol)** adalah "pemeriksa" bahasa program - seperti *spell checker* di Word, tapi untuk kode. Saat kamu membuka file, agent otomatis tahu kalau ada error/warning dan bisa diberi saran perbaikan.

Ini **opsional** - kalau kamu tidak menulis bahasa tertentu, tidak perlu pasang apa-apa. Banyak yang langsung jalan tanpa config, karena opencode memasang beberapa server **otomatis**. Cara di bawah untuk yang mau mengaktifkan LSP untuk bahasa tertentu.

### 6.1 Install tool LSP (opsional)

Install hanya bahasa yang sering kamu tulis:

```bash
# Paket LSP HTML/CSS/JSON, SQL, dan Python
npm install -g pyright vscode-langservers-extracted sql-language-server typescript-language-server

# Go - hanya jika kamu menulis Go (LSP: gopls)
brew install go

# Rust + rust-analyzer - hanya jika kamu menulis Rust
brew install rustup-init
rustup-init -y
rustup component add rust-analyzer

# JDK 21 - hanya jika kamu menulis Java (LSP: jdtls)
brew install --cask temurin
```

| Paket | Untuk bahasa |
|---|---|
| `vscode-langservers-extracted` | HTML, CSS, JSON |
| `sql-language-server` | SQL |
| `pyright` | Python |
| `typescript-language-server` | TypeScript / JavaScript (opsional, sering sudah ada) |

> **Penting:** Setelah install selesai, **tutup dan buka ulang Terminal** agar PATH yang baru terbaca.

> LSP Kotlin (`kotlin-ls`) dan YAML (`yaml-ls`) diinstall **otomatis** oleh opencode saat dibutuhkan - tidak perlu manual. C/C++ (`clangd`) ikut terinstall bersama Xcode Command Line Tools.

### 6.2 Tambahkan blok `lsp` di config

Tambahkan blok ini ke file `opencode.json` (file dari Bagian 5). Setiap entri menghubungkan satu bahasa dengan **tool pemeriksanya**:

```jsonc
"lsp": {
  "typescript": {
    "command": ["typescript-language-server", "--stdio"],
    "extensions": [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
    "disabled": false
  },
  "go": {
    "command": ["gopls"],
    "extensions": [".go"],
    "disabled": false
  },
  "python": {
    "command": ["pyright", "--stdio"],
    "extensions": [".py"],
    "disabled": false
  },
  "html": {
    "command": ["vscode-langservers-extracted", "--stdio"],
    "extensions": [".html"],
    "disabled": false
  },
  "css": {
    "command": ["vscode-langservers-extracted", "--stdio"],
    "extensions": [".css", ".scss", ".less"],
    "disabled": false
  },
  "json": {
    "command": ["vscode-langservers-extracted", "--stdio"],
    "extensions": [".json", ".jsonc"],
    "disabled": false
  },
  "sql": {
    "command": ["sql-language-server", "up", "--method", "stdio"],
    "extensions": [".sql"],
    "disabled": false
  }
}
```

| Entri di config | Bahasa | Tool yang dipakai | Perlu diinstall |
|---|---|---|---|
| `typescript` | TypeScript / JavaScript | `typescript-language-server` | Bagian 6.1 |
| `go` | Go | `gopls` | Bagian 6.1 |
| `python` | Python | `pyright` | Bagian 6.1 |
| `html` | HTML | `vscode-langservers-extracted` | Bagian 6.1 |
| `css` | CSS / SCSS / LESS | `vscode-langservers-extracted` | Bagian 6.1 |
| `json` | JSON / JSONC | `vscode-langservers-extracted` | Bagian 6.1 |
| `sql` | SQL | `sql-language-server` | Bagian 6.1 |

> **Catatan LSP:** berbeda dari MCP yang memakai `"enabled"`, entri LSP memakai **`"disabled"`** (nilai `false` = aktif, default; `true` = mati). Jadi jangan ubah jadi `"enabled"` di bagian LSP - opencode menolak field itu dan bisa bikin konfigurasi gagal start. `"disabled": false` di semua entri di atas sudah benar untuk "aktif".

> **Penting:** LSP baru bekerja kalau field `extensions` cocok dengan ekstensi file yang kamu buka - dan tool-nya sudah terinstall. Kalau satu bahasa tidak terpasang tool-nya, LSP untuk bahasa itu tetap "aktif" di config tapi tidak melakukan apa-apa sampai tool-nya ada.

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 7. Verifikasi

### 7.1 Cek failover

```bash
curl http://127.0.0.1:8765/status
```

Harus muncul daftar key + statusnya (`active` / `cooldown`). Kalau kosong, pastikan `node keys-pool-server.js` masih berjalan (Bagian 1 Langkah 5).

### 7.2 Cek MCP servers tersambung

```bash
opencode mcp
```

Harus muncul daftar server beserta statusnya (connected/failed).

### 7.3 Cek LSP berfungsi (opsional)

Buka project dengan file yang relevan:

| Bahasa | File tes | LSP aktif |
|---|---|---|
| Go | `main.go` | gopls |
| TypeScript | `index.ts` | typescript |
| Python | `main.py` | pyright |
| Rust | `main.rs` | rust |
| Java | `Main.java` | jdtls |
| C++ | `main.cpp` | clangd |
| SQL | `query.sql` | sql |
| HTML | `index.html` | html |

Agent opencode seharusnya bisa melihat error/warning dari file tersebut (fitur LSP).

### 7.4 Cek environment variable

```bash
echo $GITHUB_PERSONAL_ACCESS_TOKEN
echo $ANTHROPIC_API_KEY
```

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 8. Troubleshooting macOS

| Masalah | Solusi |
|---|---|
| `zen-proxy` tidak jalan | Pastikan `node keys-pool-server.js` sedang berjalan (`curl http://127.0.0.1:8765/status`), `keys.env` terisi, dan `"model"` memakai `zen-proxy/big-pickle`. Reset pending: `node keys-pool-server.js --reset-cooldowns` |
| Semua key `cooldown` | Tunggu hitungan mundur selesai, atau reset: `node keys-pool-server.js --reset-cooldowns` |
| `npx`/`uvx` tidak ditemukan | Pastikan Node.js & uv ada di PATH (`node -v`, `uv --version`). Jika belum, tambahkan PATH-nya di `~/.zshrc` lalu `source ~/.zshrc` |
| LSP `gopls`/`jdtls`/`rust` tidak aktif | LSP butuh `go`, `java`, `rust-analyzer`. Cek: `go version`, `java -version`, `rust-analyzer --version`. Restart Terminal setelah install supaya PATH terbaca |
| MCP server timeout | Tambah `"timeout": 30000` di entri server |
| GitHub MCP gagal | Pastikan `GITHUB_PERSONAL_ACCESS_TOKEN` terisi, token valid, dan `oauth` di config bernilai `false` |
| Playwright error | Jalankan `npx playwright install chromium` |
| MCP media (`video`/`artificer`) tidak aktif | Servenya `enabled: false` secara default - ubah jadi `true` lalu restart. Pastikan `ffmpeg -version` jalan; untuk `artificer` juga butuh `magick -version` dan `GEMINI_API_KEY` terisi |
| opencode tidak mau start / config error | Jalankan opencode dengan `OPENCODE_DISABLE_PROJECT_CONFIG=1`, perbaiki config, lalu restart |

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

Sudah beres? Kembali ke [README utama](../..) atau lihat [Setup Windows](../windows/SETUP.md).