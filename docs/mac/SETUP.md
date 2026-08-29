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

> **Catatan `enabled`:** setiap MCP server punya flag `"enabled": true/false` - ganti nilainya untuk mengaktifkan/menonaktifkan server tertentu tanpa harus menghapusnya dari file. Contoh: `postgres` dan `sqlite` sengaja `false` karena butuh database; jika suatu saat mau dipakai, cukup ubah jadi `true`.

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
      "extensions": [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]
    },
    "go": {
      "command": ["gopls"],
      "extensions": [".go"]
    },
    "python": {
      "command": ["pyright", "--stdio"],
      "extensions": [".py"]
    },
    "html": {
      "command": ["vscode-langservers-extracted", "--stdio"],
      "extensions": [".html"]
    },
    "css": {
      "command": ["vscode-langservers-extracted", "--stdio"],
      "extensions": [".css", ".scss", ".less"]
    },
    "json": {
      "command": ["vscode-langservers-extracted", "--stdio"],
      "extensions": [".json", ".jsonc"]
    },
    "sql": {
      "command": ["sql-language-server", "up", "--method", "stdio"],
      "extensions": [".sql"]
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
    }
  }
}
```

> **Setelah menyimpan file ini, WAJIB quit & restart opencode** - konfigurasi hanya dibaca saat opencode dijalankan.

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
| opencode tidak mau start / config error | Jalankan opencode dengan `OPENCODE_DISABLE_PROJECT_CONFIG=1`, perbaiki config, lalu restart |

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

Sudah beres? Kembali ke [README utama](../..) atau lihat [Setup Windows](../windows/SETUP.md).