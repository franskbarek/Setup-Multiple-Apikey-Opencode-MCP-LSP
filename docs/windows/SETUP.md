<a id="top"></a>
# Setup opencode di Windows - Detail Lengkap

Panduan langkah demi langkah untuk Windows. Mulai dari install tool, konfigurasi LSP & MCP, kelola API key, sampai verifikasi.

Jika ini pertama kali membaca, mulai dari [README utama](../..) untuk paham konsepnya dengan bahasa sederhana.

> 💡 **Disarankan memakai Git Bash** untuk semua langkah di panduan ini (bukan CMD/PowerShell). Git Bash sudah otomatis ikut terinstall bersama [Git for Windows](https://git-scm.com), dan syntax perintahnya sama dengan di macOS - jadi kamu cukup hafal satu cara.
>
> Cara membuka Git Bash: klik kanan di folder mana pun → **Git Bash Here**, atau cari "Git Bash" di Start Menu.
>
> **Kapan wajib Git Bash?** Saat mengatur API Key lewat environment variable (Bagian 3 & 4). Perintah `winget`, `npm`, `npx`, dan `opencode` tetap bisa dijalankan dari terminal mana pun.

## Daftar Isi

- [1. Yang Perlu Disiapkan](#1-yang-perlu-disiapkan)
- [2. Install Tools di Windows](#2-install-tools-di-windows)
- [3. Mengatur API Key (Provider AI)](#3-mengatur-api-key-provider-ai)
- [4. Mengatur GitHub Token (untuk MCP GitHub)](#4-mengatur-github-token-untuk-mcp-github)
- [5. Membuat File Konfigurasi](#5-membuat-file-konfigurasi)
- [6. Verifikasi](#6-verifikasi)
- [7. Troubleshooting Windows](#7-troubleshooting-windows)

---

## 1. Yang Perlu Disiapkan

Kebutuhan diprioritaskan: **pasang dulu yang wajib (Node.js & Git), sisanya opsional.** Persiapan bahasa pemrograman (LSP) **TIDAK prioritas** - cukup pasang bahasa yang kamu tulis, sisanya boleh dilewati.

### 1.1 Prioritas utama - wajib dulu

Tool yang benar-benar dibutuhkan untuk memakai opencode:

| Tool | Fungsinya | Cara cek |
|---|---|---|
| opencode (CLI) | Aplikasi utama AI coding agent | `opencode --version` |
| [Node.js](https://nodejs.org) ≥ 20 | Wajib - menjalankan opencode & MCP server berbasis JavaScript (filesystem, memory, playwright, dll.) | `node -v` |
| [Git](https://git-scm.com) | Wajib - version control, dibutuhkan hampir semua project & MCP git (sekaligus menyediakan **Git Bash**) | `git --version` |

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
| Java | JDK 21+ ([Temurin](https://adoptium.net)) | `jdtls` |
| C/C++ | Tidak perlu manual - `clangd` diinstall otomatis oleh opencode | `clangd` |
| Kotlin | Tidak perlu manual - `kotlin-ls` diinstall otomatis oleh opencode | `kotlin-ls` |

**Paket LSP tambahan:** hanya jika kamu menulis HTML/CSS/JSON, SQL, atau Python.

| Paket (npm) | Untuk bahasa |
|---|---|
| `vscode-langservers-extracted` | HTML, CSS, JSON |
| `sql-language-server` | SQL |
| `pyright` | Python |

**MCP browser (Playwright):** hanya jika kamu ingin opencode bisa membuka / berinteraksi dengan browser.

> **Di komputer ini:** Node.js dan Git sudah ada. uv, Go, Rust, dan Java **belum** - pasang hanya jika dibutuhkan, lewat [Bagian 2](#2-install-tools-di-windows).

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 2. Install Tools di Windows

Buka **Git Bash** (disarankan, lihat catatan di atas), lalu jalankan perintah sesuai kelompok. **Mulai dari prioritas utama (2.1) dulu - sisanya opsional.**

### 2.1 Prioritas utama - wajib dulu

```powershell
# Node.js (wajib - jalankan jika `node -v` belum muncul)
winget install --id OpenJS.NodeJS.LTS -e

# Git (wajib - jalankan jika `git --version` belum muncul; sekaligus menginstall Git Bash)
winget install --id Git.Git -e
```

> Selesai sampai sini, opencode sudah bisa dipakai. Kelompok di bawah **opsional** - pasang hanya yang kamu butuh.

### 2.2 Opsional - uv (MCP server berbasis Python)

Hanya jika kamu ingin memakai MCP server seperti git, fetch, atau postgres:

```powershell
winget install --id astral-sh.uv -e
```

### 2.3 Opsional - hanya jika kamu menulis bahasa berikut

```powershell
# Go - hanya jika kamu menulis Go (LSP: gopls)
winget install --id GoLang.Go -e

# Rust + rust-analyzer - hanya jika kamu menulis Rust
winget install --id Rustlang.Rustup -e
rustup component add rust-analyzer

# JDK 21 - hanya jika kamu menulis Java (LSP: jdtls)
winget install --id EclipseAdoptium.Temurin.21.JDK -e
```

> **Penting:** Setelah install selesai, **tutup dan buka ulang Git Bash** (atau restart terminal opencode) agar PATH yang baru terbaca.

### 2.4 Opsional - paket LSP HTML/CSS/JSON, SQL, dan Python

Hanya jika kamu menulis bahasa tersebut:

```powershell
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

```powershell
npx playwright install chromium
```

> LSP C/C++ (`clangd`), Kotlin (`kotlin-ls`), dan YAML (`yaml-ls`) diinstall **otomatis** oleh opencode saat dibutuhkan - tidak perlu manual.

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 3. Mengatur API Key (Provider AI)

**Langsung bisa dipakai tanpa API key** - secara bawaan opencode memakai model gratis **Big Pickle (Opencode Zen)**. Tidak perlu set token apa pun untuk mulai mencoba.

API key baru dibutuhkan **hanya jika** kamu ingin menambah provider berbayar (Anthropic, OpenAI, Google, dsb.). Section ini opsional - lewati jika cukup pakai model gratis.

### 3.1 Opsional - login lewat perintah

```bash
opencode auth login
```

Ikuti petunjuk di layar untuk tiap provider yang kamu pakai. Token disimpan di **Windows Credential Manager** - aman, tidak terlihat di file apa pun.

### 3.2 Atau lewat environment variable (cara Git Bash)

Set token sebagai environment variable dengan syntax **Git Bash** (sama seperti di macOS):

```bash
# Set untuk sesi ini saja (sekali jalan, hilang setelah Git Bash ditutup)
export ANTHROPIC_API_KEY="sk-ant-xxx"

# Set permanen untuk selamanya - tambahkan baris berikut ke ~/.bashrc
echo 'export ANTHROPIC_API_KEY="sk-ant-xxx"' >> ~/.bashrc
echo 'export OPENAI_API_KEY="sk-xxx"' >> ~/.bashrc
echo 'export GEMINI_API_KEY="AIza-xxx"' >> ~/.bashrc
```

> Setelah menambah ke `~/.bashrc`, jalankan `source ~/.bashrc` (atau buka ulang Git Bash) agar langsung aktif. Ganti `sk-ant-xxx`, `sk-xxx`, `AIza-xxx` dengan token asli kamu.

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 4. Mengatur GitHub Token (untuk MCP GitHub)

MCP GitHub dipakai opencode untuk membaca repo, melihat issue/PR, dll.

1. Buka <https://github.com/settings/tokens> → **Tokens (classic)** → **Generate new token (classic)**.
2. Centang minimal: `repo`, `read:user`, dan `read:org` (atau pakai **fine-grained token** dengan scope sesuai kebutuhan).
3. Salin tokennya, lalu set sebagai environment variable (cara Git Bash):

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="github_pat_xxx"
echo 'export GITHUB_PERSONAL_ACCESS_TOKEN="github_pat_xxx"' >> ~/.bashrc
```

> Jalankan `source ~/.bashrc` setelahnya agar langsung aktif.

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 5. Membuat File Konfigurasi

Lokasi file konfigurasi global opencode di Windows:

```
C:\Users\<NamaUser>\.config\opencode\opencode.json
```

Jika folder/`.config` belum ada, buat dulu. Lalu isi file tersebut dengan:

> **Catatan `enabled`:** setiap MCP server punya flag `"enabled": true/false` - ganti nilainya untuk mengaktifkan/menonaktifkan server tertentu tanpa harus menghapusnya dari file. Contoh: `postgres` dan `sqlite` sengaja `false` karena butuh database; jika suatu saat mau dipakai, cukup ubah jadi `true`.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",

  "model": "opencode/big-pickle",
  "small_model": "opencode/big-pickle",

  "enabled_providers": ["anthropic", "openai", "google"],

  "provider": {
    "anthropic": { "options": { "apiKey": "{env:ANTHROPIC_API_KEY}" } },
    "openai": { "options": { "apiKey": "{env:OPENAI_API_KEY}" } },
    "google": { "options": { "apiKey": "{env:GEMINI_API_KEY}" } }
  },

  "lsp": {
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

```powershell
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

### 6.3 Cek environment variable (Git Bash)

```bash
echo $GITHUB_PERSONAL_ACCESS_TOKEN
echo $ANTHROPIC_API_KEY
```

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

## 7. Troubleshooting Windows

| Masalah | Solusi |
|---|---|
| `npx`/`uvx` tidak ditemukan | Pastikan Node.js & uv ada di PATH (`node -v`, `uv --version`). Jika tetap gagal, ganti command MCP menjadi: `["cmd", "/c", "npx", ...]` |
| LSP `gopls`/`jdtls`/`rust` tidak aktif | LSP butuh `go`, `java`, `rust-analyzer`. Cek: `go version`, `java -version`, `rust-analyzer --version`. Restart terminal setelah install supaya PATH terbaca |
| MCP server timeout | Tambah `"timeout": 30000` di entri server |
| GitHub MCP gagal | Pastikan `GITHUB_PERSONAL_ACCESS_TOKEN` terisi (cek `echo $GITHUB_PERSONAL_ACCESS_TOKEN` di Git Bash), token valid, dan `oauth` di config bernilai `false` |
| API key di Git Bash tidak terbaca opencode | Pastikan opencode dijalankan **dari Git Bash yang sama** setelah `source ~/.bashrc` |
| Playwright error | Jalankan `npx playwright install chromium` |
| opencode tidak mau start / config error | Jalankan opencode dengan `OPENCODE_DISABLE_PROJECT_CONFIG=1`, perbaiki config, lalu restart |
| Browser Playwright tidak muncul jendelanya | Ini normal saat mode headless. Tambahkan argumen pada command menjadi `["npx", "-y", "@playwright/mcp@latest", "--headless"]` |

<p align="right"><a href="#top">⬆ Kembali ke atas</a></p>

---

Sudah beres? Kembali ke [README utama](../..) atau lihat [Setup macOS](../mac/SETUP.md).