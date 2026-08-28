<a id="top"></a>
# Setup Multiple Apikey Opencode: MCP, LSP

Panduan menyiapkan **Opencode Agent** - AI agent yang bisa permudah berbagai pekerjaan harianmu - di Windows atau macOS.

Dokumen ini ditulis dengan bahasa yang cukup sederhana. cukup ikuti langkahnya.

---

## 📌 Isi dokumen ini

- [Apa yang harus kamu siapkan?](#apa-yang-harus-kamu-siapkan)
- [Kasus umum penggunaan](#kasus-umum-penggunaan)
- [Pilih sistem operasi kamu](#pilih-sistem-operasi-kamu)
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
| **API Key** | "Kartu akses" untuk layanan AI berbayar (Claude, OpenAI, Gemini, dsb) - hanya opsional | agent bisa memakai beberapa provider AI sekaligus |

Tidak perlu paham semua sekarang - ikuti panduan per sistem operasi, dan semuanya akan terpasang.

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
| 🛠️ **Membantu pekerjaan biasa** | "Jalankan perintah ini di terminal, lalu jelaskan hasilnya padaku dengan bahasa sederhana." |

> Intinya: agent bisa membantu apa pun yang umumnya kamu kerjakan sendiri di komputer - selama itu bisa dijelaskan lewat kata-kata.

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