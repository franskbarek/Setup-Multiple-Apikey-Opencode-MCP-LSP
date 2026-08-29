<a id="top"></a>
# Setup opencode di macOS - Detail Lengkap

Panduan langkah demi langkah untuk macOS. Mulai dari install tool, konfigurasi LSP & MCP, kelola API key, sampai verifikasi.

Jika ini pertama kali membaca, mulai dari [README utama](../..) untuk paham konsepnya dengan bahasa sederhana.

## Daftar Isi

- [1. Yang Perlu Disiapkan](#1-yang-perlu-disiapkan)
- [2. Install Tools di macOS](#2-install-tools-di-macos)
- [3. Mengatur API Key (Provider AI)](#3-mengatur-api-key-provider-ai)
- [4. Mengatur GitHub Token (untuk MCP GitHub)](#4-mengatur-github-token-untuk-mcp-github)
- [5. Membuat File Konfigurasi](#5-membuat-file-konfigurasi)
- [6. Verifikasi](#6-verifikasi)
- [7. Troubleshooting macOS](#7-troubleshooting-macos)

---

## 1. Yang Perlu Disiapkan

Kebutuhan diprioritaskan: **pasang dulu yang wajib (Node.js & Git), sisanya opsional.** Persiapan bahasa pemrograman (LSP) **TIDAK prioritas** - cukup pasang bahasa yang kamu tulis, sisanya boleh dilewati.

### 1.1 Prioritas utama - wajib dulu

Tool yang benar-benar dibutuhkan untuk memakai opencode:

| Tool | Fungsinya | Cara cek |
|---|---|---|
| opencode (CLI) | Aplikasi utama AI coding agent | `opencode --version` |
| [Homebrew](https://brew.sh) | Pengelola paket macOS - dipakai untuk menginstall Node.js & Git | `brew --version` |
| [Node.js](https://nodejs.org) ≥ 20 | Wajib - menjalankan opencode & MCP server berbasis JavaScript (filesystem, memory, playwright, dll.) | `node -v` |
| [Git](https://git-scm.com) | Wajib - version control, dibutuhkan hampir semua project & MCP git | `git --version` |

### 1.2 Opsional - pasang sesuai kebutuhan

Semua di bawah ini **boleh dilewati dulu**. Pasang hanya kalau butuh:

**uv - untuk MCP server berbasis Python (git, fetch, postgres):** hanya jika kamu ingin memakai MCP server tersebut.

| Tool | Fungsinya | Cara cek |
|---|---|---|
| [uv (Python)](https://docs.astral.sh/uv/) | Menjalankan MCP server berbasis Python (git, fetch, postgres) | `uv --version` |

**Bahasa pemrograman (LSP) - TIDAK prioritas:** install hanya bahasa yang sering kamu tulis. Jika kamu tidak menulis bahasa tertentu, tool-nya TIDAK perlu dipasang.

| Bahasa | Tool yang diinstall | Untuk LSP |
|---|---|---|
| Go | [Go](https://go.dev) | `gopls` |
| Rust | [rustup](https://rustup.rs) | `rust-analyzer` |
| Java | JDK 21+ (Temurin) | `jdtls` |
| C/C++ | Tidak perlu manual - `clangd` dari Xcode CLI Tools | `clangd` |
| Kotlin | Tidak perlu manual - `kotlin-ls` diinstall otomatis oleh opencode | `kotlin-ls` |

**Paket LSP tambahan:** hanya jika kamu menulis HTML/CSS/JSON, SQL, atau Python.

| Paket (npm) | Untuk bahasa |
|---|---|
| `vscode-langservers-extracted` | HTML, CSS, JSON |
| `sql-language-server` | SQL |
| `pyright` | Python |

**MCP browser (Playwright):** hanya jika kamu ingin opencode bisa membuka / berinteraksi dengan browser.

**MCP media (gambar, video, musik):** hanya jika kamu ingin agent bisa *mengedit* atau *membuat* media. Butuh FFmpeg (wajib untuk semua MCP media); ImageMagick hanya jika memakai `artificer`.

| Tool | Fungsinya | Cara cek |
|---|---|---|
| [FFmpeg](https://ffmpeg.org) | Mesin processing video & audio (trim, gabung, resize, subtitle, dll.) | `ffmpeg -version` |
| [ImageMagick](https://imagemagick.org) | Mesin processing gambar (resize, composite, effects) - khusus `artificer` | `magick -version` |

> **Catatan:** Xcode Command Line Tools (berisi `clang`/`clangd` untuk C/C++) biasanya sudah ada atau muncul otomatis saat pertama menjalankan `xcode-select --install`.

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 2. Install Tools di macOS

Buka **Terminal**, lalu jalankan perintah sesuai kelompok. **Mulai dari prioritas utama (2.1) dulu - sisanya opsional.**

### 2.1 Prioritas utama - wajib dulu

```bash
# Homebrew (jalankan jika `brew --version` belum muncul)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js + Git (wajib)
brew install node git
```

> Selesai sampai sini, opencode sudah bisa dipakai. Kelompok di bawah **opsional** - pasang hanya yang kamu butuh.

### 2.2 Opsional - uv (MCP server berbasis Python)

Hanya jika kamu ingin memakai MCP server seperti git, fetch, atau postgres:

```bash
brew install uv
```

### 2.3 Opsional - hanya jika kamu menulis bahasa berikut

```bash
# Go - hanya jika kamu menulis Go (LSP: gopls)
brew install go

# Rust + rust-analyzer - hanya jika kamu menulis Rust
brew install rustup-init
rustup-init -y
rustup component add rust-analyzer

# JDK 21 - hanya jika kamu menulis Java (LSP: jdtls)
brew install --cask temurin
```

> **Penting:** Setelah install selesai, **tutup dan buka ulang Terminal** agar PATH yang baru terbaca.

### 2.4 Opsional - paket LSP HTML/CSS/JSON, SQL, dan Python

Hanya jika kamu menulis bahasa tersebut:

```bash
npm install -g pyright vscode-langservers-extracted sql-language-server typescript-language-server
```

| Paket | Untuk bahasa |
|---|---|
| `vscode-langservers-extracted` | HTML, CSS, JSON |
| `sql-language-server` | SQL |
| `pyright` | Python |
| `typescript-language-server` | TypeScript / JavaScript (opsional, sering sudah ada) |

### 2.5 Opsional - MCP browser (Playwright)

Hanya jika kamu ingin opencode bisa membuka browser:

```bash
npx playwright install chromium
```

### 2.6 Opsional - tools untuk MCP media (FFmpeg & ImageMagick)

Hanya jika kamu ingin agent bisa mengedit/membuat gambar, video, atau musik:

```bash
# FFmpeg (wajib untuk semua MCP media)
brew install ffmpeg

# ImageMagick (hanya jika memakai artificer untuk edit gambar)
brew install imagemagick
```

> Cek: `ffmpeg -version` dan `magick -version`. Setelah install, **tutup dan buka ulang Terminal** agar PATH terbaca.

> LSP Kotlin (`kotlin-ls`) dan YAML (`yaml-ls`) diinstall **otomatis** oleh opencode saat dibutuhkan - tidak perlu manual.

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 3. Mengatur API Key (Provider AI)

Model gratis **Big Pickle (Opencode Zen)** tetap butuh API key - tapi gratis. Login ke provider **OpenCode Zen**, lalu daftarkan key-nya ke opencode.

### 3.1 Login OpenCode Zen (gratis) - untuk mulai memakai

Buka <https://opencode.ai/zen>, login, dan salin API key-nya. Lalu daftarkan ke opencode:

```bash
opencode auth login
```

Pilih **OpenCode Zen** di daftar provider, lalu tempel API key yang sudah kamu salin.

API key provider berbayar (Anthropic, OpenAI, Google, dsb.) baru dibutuhkan **hanya jika** kamu ingin menambah provider lain selain yang gratis. Section berikut opsional.

### 3.2 Opsional - login lewat perintah untuk provider lain

```bash
opencode auth login
```

Ikuti petunjuk di layar untuk tiap provider yang kamu pakai. Token disimpan di **macOS Keychain** - aman, tidak terlihat di file apa pun.

### 3.3 Atau lewat environment variable

Tambahkan baris berikut ke file `~/.zshrc`:

```bash
export OPENCODE_API_KEY="oc_zen_xxx"
export ANTHROPIC_API_KEY="sk-ant-xxx"
export OPENAI_API_KEY="sk-xxx"
export GEMINI_API_KEY="AIza-xxx"
```

Lalu muat ulang pengaturannya:

```bash
source ~/.zshrc
```

> Ganti `oc_zen_xxx`, `sk-ant-xxx`, `sk-xxx`, `AIza-xxx` dengan token asli kamu. `OPENCODE_API_KEY` dipakai untuk model gratis Big Pickle (Opencode Zen) di config Bagian 5.

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 4. Mengatur GitHub Token (untuk MCP GitHub)

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

## 5. Membuat File Konfigurasi

Lokasi file konfigurasi global opencode di macOS:

```
~/.config/opencode/opencode.json
```

Jika folder `.config` belum ada, buat dulu. Lalu isi file tersebut dengan:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",

  "model": "opencode/big-pickle",
  "small_model": "opencode/big-pickle",

  "enabled_providers": ["opencode", "anthropic", "openai", "google"],

  "provider": {
    "opencode": { "options": { "apiKey": "{env:OPENCODE_API_KEY}" } },
    "anthropic": { "options": { "apiKey": "{env:ANTHROPIC_API_KEY}" } },
    "openai": { "options": { "apiKey": "{env:OPENAI_API_KEY}" } },
    "google": { "options": { "apiKey": "{env:GEMINI_API_KEY}" } }
  },

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

> **Catatan LSP:** berbeda dari MCP yang memakai `"enabled"`, entri LSP memakai **`"disabled"`** (nilai `false` = aktif, default; `true` = mati). Jadi jangan ubah jadi `"enabled"` di bagian LSP - opencode menolak field itu dan bisa bikin konfigurasi gagal start. `"disabled": false` di semua entri di atas sudah benar untuk "aktif".

### LSP - "pemeriksa" bahasa program

Setiap entri di bagian `"lsp"` menghubungkan satu bahasa dengan **tool pemeriksanya** (server LSP). Kerja agent: saat kamu membuka file dengan ekstensi yang cocok, tool itu mengecek file-nya dan memberi tahu agent kalau ada error/warning, plus saran perbaikan.

| Entri di config | Bahasa | Tool yang dipakai | Perlu diinstall |
|---|---|---|---|
| `typescript` | TypeScript / JavaScript | `typescript-language-server` | [Bagian 2.4](#24-opsional---paket-lsp-htmlcssjson-sql-dan-python) |
| `go` | Go | `gopls` | [Bagian 2.3](#23-opsional---hanya-jika-kamu-menulis-bahasa-berikut) |
| `python` | Python | `pyright` | [Bagian 2.4](#24-opsional---paket-lsp-htmlcssjson-sql-dan-python) |
| `html` | HTML | `vscode-langservers-extracted` | [Bagian 2.4](#24-opsional---paket-lsp-htmlcssjson-sql-dan-python) |
| `css` | CSS / SCSS / LESS | `vscode-langservers-extracted` | [Bagian 2.4](#24-opsional---paket-lsp-htmlcssjson-sql-dan-python) |
| `json` | JSON / JSONC | `vscode-langservers-extracted` | [Bagian 2.4](#24-opsional---paket-lsp-htmlcssjson-sql-dan-python) |
| `sql` | SQL | `sql-language-server` | [Bagian 2.4](#24-opsional---paket-lsp-htmlcssjson-sql-dan-python) |

**Yang TIDAK perlu di config** (diinstall **otomatis** oleh opencode): `clangd` (C/C++, dari Xcode CLI Tools), `kotlin-ls` (Kotlin), `yaml-ls` (YAML).

> **Penting:** LSP baru bekerja kalau field `extensions` cocok dengan ekstensi file yang kamu buka - dan tool-nya sudah terinstall. Kalau satu bahasa tidak terpasang tool-nya, LSP untuk bahasa itu tetap "aktif" di config tapi tidak melakukan apa-apa sampai tool-nya ada.

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

### 🔁 Failover multi API key Zen (opsional)

**Masalah yang saya temui:** saya punya beberapa API key OpenCode Zen (model gratis **Big Pickle** punya kuota sendiri per akun). Saat kuota satu key habis, opencode hanya mentok - tidak pindah sendiri.

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

> ✅ **Status: sudah saya implementasikan.** Skrip `keys-pool-server.js` tersedia di [repo utama](../../keys-pool-server.js) - salin ke folder `opencode-failover`, isi `keys.env`, lalu jalankan. Setup ini **menggantikan** cara lama (`run-with-failover.sh`). Penjelasan lengkap + perbandingan ada di bagian "🔁 Failover multi API key (OpenCode Zen)" di [README utama](../../..#failover-multi-api-key-opencode-zen).

**Isi `keys-pool-server.js`** (Node, tanpa dependency, berjalan dari folder `opencode-failover`):

| Aspek | Isi / perilaku |
|---|---|
| Alamat | `127.0.0.1:8765` saja - tidak terbuka ke jaringan |
| Key | baca `keys.env` di folder sama (satu per baris, atas = prioritas) |
| State | `cooldowns.json` - pending bertahan antar restart |
| Deteksi | respons HTTP **asli** dari upstream: `429`/`402` kuota → pending key itu (pakai `Retry-After`), coba key berikutnya; 4xx non-kuota → diteruskan apa adanya |
| Semua key pending | balas `429` + pesan jelas ke opencode |
| Endpoint | `/health` dan `/status` |
| Streaming | SSE `chat/completions` diteruskan byte-by-byte |
| Opsi CLI | `--port`, `--keys-file`, `--dry-run`, `--reset-cooldowns` |

**Konfigurasi opencode yang saya siapkan** (tambah satu provider saja, bukan satu per key):

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

lalu ubah `"model"` menjadi `"zen-proxy/big-pickle"`. Key asli **tidak pernah masuk config** - proxy menyuntikkan key dari `keys.env`.

**Cara memasang & memakai (langkah nyata):**

1. Salin `keys-pool-server.js` dari [repo utama](../../keys-pool-server.js) ke folder `opencode-failover`.
2. Isi `keys.env` - satu key per baris, baris atas = prioritas (baris diawali `#` diabaikan).
3. Cek dulu: `node keys-pool-server.js --dry-run`
4. Jalankan proxy di jendela Terminal terpisah:

```bash
cd opencode-failover
node keys-pool-server.js
curl http://127.0.0.1:8765/status   # cek keadaan tiap key & cooldown
```

5. Di `opencode.json`, pastikan provider `zen-proxy` aktif (snippet di atas) dan `"model"` = `"zen-proxy/big-pickle"`.
6. Restart opencode, lalu mulai seperti biasa.

**Alternatif tanpa bikin sendiri:** `@razroo/opencode-model-fallback` (rotasi model) atau `opencode-go-multi-auth`/`oswap` (proxy siap pakai) - bandingkan di README.

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 6. Verifikasi

### 6.1 Cek MCP servers tersambung

```bash
opencode mcp
```

Harus muncul daftar server beserta statusnya (connected/failed).

### 6.2 Cek LSP berfungsi

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

### 6.3 Cek environment variable

```bash
echo $OPENCODE_API_KEY
echo $GITHUB_PERSONAL_ACCESS_TOKEN
echo $ANTHROPIC_API_KEY
```

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 7. Troubleshooting macOS

| Masalah | Solusi |
|---|---|
| `npx`/`uvx` tidak ditemukan | Pastikan Node.js & uv ada di PATH (`node -v`, `uv --version`). Jika belum, tambahkan PATH-nya di `~/.zshrc` lalu `source ~/.zshrc` |
| LSP `gopls`/`jdtls`/`rust` tidak aktif | LSP butuh `go`, `java`, `rust-analyzer`. Cek: `go version`, `java -version`, `rust-analyzer --version`. Restart Terminal setelah install supaya PATH terbaca |
| MCP server timeout | Tambah `"timeout": 30000` di entri server |
| GitHub MCP gagal | Pastikan `GITHUB_PERSONAL_ACCESS_TOKEN` terisi, token valid, dan `oauth` di config bernilai `false` |
| Playwright error | Jalankan `npx playwright install chromium` |
| MCP media (`video`/`artificer`) tidak aktif | Servenya `enabled: false` secara default - ubah jadi `true` lalu restart. Pastikan `ffmpeg -version` jalan; untuk `artificer` juga butuh `magick -version` dan `GEMINI_API_KEY` terisi |
| Failover `zen-proxy` tidak jalan | Pastikan `node keys-pool-server.js` sedang berjalan (`curl http://127.0.0.1:8765/status`), `keys.env` terisi, dan `"model"` memakai `zen-proxy/big-pickle`. Reset pending: `node keys-pool-server.js --reset-cooldowns` |
| opencode tidak mau start / config error | Jalankan opencode dengan `OPENCODE_DISABLE_PROJECT_CONFIG=1`, perbaiki config, lalu restart |

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

Sudah beres? Kembali ke [README utama](../..) atau lihat [Setup Windows](../windows/SETUP.md).