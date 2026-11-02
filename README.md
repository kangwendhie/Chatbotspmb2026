# 🎓 Chatbot SPMB

Aplikasi **Sistem Penerimaan Murid Baru (SPMB)** berbasis **Google Apps Script + Google Sheets + AI Gemini/OpenAI** untuk membantu calon siswa, orang tua, dan panitia memperoleh informasi, melakukan pendaftaran, mengecek status, mendapatkan rekomendasi jurusan, serta memantau statistik melalui dashboard admin.

> Versi saat ini: **v2.2**

---

## ✨ Fitur Utama

### 🤖 Chatbot AI Hybrid
Chatbot menggunakan dua sumber jawaban:

- **Database resmi Google Sheets** untuk informasi SPMB seperti jurusan, jadwal, syarat, biaya, alur pendaftaran, kontak, dan status.
- **AI Gemini/OpenAI** untuk pertanyaan bebas yang tidak ditemukan pada database.

Pendekatan ini membuat informasi resmi tetap konsisten sekaligus menghemat penggunaan API AI.

### 📝 Formulir Pendaftaran Calon Siswa
Data yang dapat dicatat:

- Nama lengkap
- NISN
- Asal sekolah
- Tempat lahir
- Tanggal lahir
- Jenis kelamin
- WhatsApp siswa
- WhatsApp orang tua/wali
- Email
- Alamat
- Pilihan jurusan pertama
- Pilihan jurusan kedua
- Persetujuan penggunaan data

Nomor pendaftaran dibuat otomatis, misalnya:

```text
SPMB-2027-000001
```

### 🔎 Cek Status Pendaftaran

Calon siswa mengecek status menggunakan:

```text
Nomor Pendaftaran
+
Nomor WhatsApp
```

Status yang tersedia:

```text
BARU
TERVERIFIKASI
DITERIMA
CADANGAN
PERBAIKAN_BERKAS
DITOLAK
DAFTAR_ULANG
```

Admin juga dapat menambahkan catatan untuk calon siswa.

### 🧭 Rekomendasi Jurusan

Program keahlian awal:

1. Akuntansi dan Keuangan Lembaga
2. Manajemen Perkantoran
3. Rekayasa Perangkat Lunak
4. Farmasi
5. Teknik Otomotif

Rekomendasi jurusan memakai pencocokan minat dengan kata kunci yang dapat diubah melalui sheet `Jurusan`.

### 📊 Dashboard Administrator

Dashboard menyediakan:

- Total pendaftar
- Pendaftar hari ini
- Jumlah siswa diterima
- Jumlah daftar ulang
- Statistik status
- Distribusi peminat jurusan
- Statistik pertanyaan chatbot
- Statistik provider chatbot
- Pencarian calon siswa
- Perubahan status pendaftaran
- Catatan admin
- Pengaturan SPMB
- Pengaturan AI
- Penggantian password admin

---

## 🏗️ Arsitektur Sistem

```text
Calon Siswa / Orang Tua
          │
          ▼
     Web App SPMB
          │
          ├───────────────┐
          │               │
          ▼               ▼
   Google Sheets       AI Provider
   Database Resmi      Gemini/OpenAI
          │               │
          └───────┬───────┘
                  ▼
             Chatbot SPMB
```

Pertanyaan resmi seperti jadwal, biaya, syarat, jurusan, dan alur pendaftaran dijawab dari Google Sheets. Pertanyaan bebas dapat diteruskan ke Gemini atau OpenAI.

---

## 🛠️ Teknologi

| Komponen | Teknologi |
|---|---|
| Backend | Google Apps Script |
| Frontend | HTML5, CSS3, JavaScript |
| Database | Google Sheets |
| AI | Google Gemini API / OpenAI API |
| Hosting | Google Apps Script Web App |
| Autentikasi Admin | Session + password hash |
| Penyimpanan API Key | Script Properties |

---

## 📁 Struktur Project

```text
SPMB-Chatbot/
├── Code.gs
├── Index.html
├── appsscript.json
└── README.md
```

### `Code.gs`
Backend aplikasi untuk database, pendaftaran, chatbot, AI, autentikasi admin, dashboard, statistik, dan konfigurasi.

### `Index.html`
Frontend aplikasi untuk chatbot, formulir pendaftaran, cek status, rekomendasi jurusan, informasi SPMB, dan dashboard admin.

### `appsscript.json`
Manifest Google Apps Script.

---

# 🚀 Instalasi

## 1. Buat Google Spreadsheet

Buat Spreadsheet baru melalui Google Drive.

Contoh nama:

```text
Database SPMB SMK
```

## 2. Buka Google Apps Script

Dari Spreadsheet:

```text
Extensions
→ Apps Script
```

## 3. Pasang `Code.gs`

Hapus kode bawaan dan salin seluruh isi file `Code.gs`.

## 4. Buat `Index.html`

Klik:

```text
+
→ HTML
```

Beri nama:

```text
Index
```

Kemudian salin seluruh isi `Index.html`.

## 5. Jalankan Setup Database

Pilih fungsi:

```javascript
setupDatabase()
```

Klik **Run** dan berikan izin Google yang diminta.

---

## 🗄️ Database Otomatis

`setupDatabase()` membuat sheet:

```text
Pengaturan
Jurusan
FAQ
Pendaftar
ChatLog
RekomendasiLog
Admin
```

---

## 🔐 Login Administrator

Username awal:

```text
admin
```

Password dibuat secara acak saat `setupDatabase()` pertama kali dijalankan.

Lihat melalui:

```text
Apps Script
→ Execution log
```

Contoh:

```text
=== SETUP SPMB SELESAI ===

Username admin:
admin

Password sementara:
BPK!xxxxxxxxxxxx9a
```

> Segera ganti password setelah login pertama.

---

# ⚙️ Konfigurasi SPMB

Login ke:

```text
Admin
→ Pengaturan
```

Lengkapi:

```text
Nama Sekolah
Tahun Pelajaran
Tanggal Pembukaan
Tanggal Penutupan
Alamat Sekolah
Nomor Telepon
WhatsApp
Website
URL Logo
```

Atur pula:

```text
Status Pendaftaran
Bebas Uang Gedung
Gratis Seragam
```

---

# 🤖 Konfigurasi Gemini AI

Masuk ke:

```text
Admin
→ AI
```

Pilih provider:

```text
Gemini
```

Masukkan model Gemini yang tersedia pada akun Anda, misalnya:

```text
gemini-3.8-flash
```

Masukkan API key, centang:

```text
Aktifkan AI untuk pertanyaan bebas
```

lalu klik:

```text
Simpan Konfigurasi AI
```

API key disimpan di **Script Properties**, bukan di frontend.

## Mendapatkan Gemini API Key

Buat API key melalui Google AI Studio:

```text
https://aistudio.google.com/apikey
```

Jangan menaruh API key di `Index.html`.

---

# 🧠 Konfigurasi OpenAI

Jika ingin menggunakan OpenAI:

```text
Admin
→ AI
→ Provider: OpenAI
```

Masukkan API key dan model OpenAI yang tersedia pada akun API Anda.

API key OpenAI dapat dibuat melalui:

```text
https://platform.openai.com/api-keys
```

---

# 🧪 Tes Koneksi Gemini

Versi v2.2 menyediakan:

```text
Admin
→ AI
→ Tes Koneksi Gemini
```

Jika berhasil, aplikasi menampilkan pesan koneksi berhasil.

---

# ⚠️ Troubleshooting

## Gemini HTTP 503

Pesan:

```text
Gemini HTTP 503:
This model is currently experiencing high demand.
```

Artinya layanan Gemini sedang menerima beban tinggi.

Solusi:

1. Coba kembali beberapa saat kemudian.
2. Gunakan model Gemini lain yang tersedia.
3. Simpan konfigurasi AI kembali.
4. Jalankan **Tes Koneksi Gemini**.

## Gemini HTTP 401

Biasanya API key tidak valid. Masukkan kembali API key lalu simpan konfigurasi.

## Gemini HTTP 403

Kemungkinan:

- API belum aktif
- project tidak memiliki izin
- API key dibatasi
- akun tidak memiliki akses model

## Gemini HTTP 429

Artinya kuota atau rate limit tercapai.

## Chatbot Berhenti pada `Sedang memproses...`

Pastikan menggunakan minimal versi:

```text
v2.2
```

Versi v2.2 memperbaiki parser respons Gemini menggunakan:

```text
candidates[0].content.parts[].text
```

## Error `Cannot read properties of undefined`

Gunakan `Index.html` versi 2.1 atau lebih baru.

Versi tersebut menggunakan akses field form yang lebih aman:

```javascript
form.elements['provider']
form.elements['model']
form.elements['apiKey']
form.elements['enabled']
```

---

# 🚀 Deploy Web App

Klik:

```text
Deploy
→ New deployment
```

Pilih:

```text
Web app
```

Konfigurasi:

```text
Execute as:
Me
```

Atur akses sesuai kebijakan Google Workspace sekolah, lalu klik **Deploy**.

Salin URL Web App.

---

# 🔄 Update Aplikasi

Setelah mengubah kode:

```text
Deploy
→ Manage deployments
→ Edit
→ New version
→ Deploy
```

Kemudian refresh browser:

```text
Ctrl + F5
```

---

# 📊 Struktur Google Sheets

## Sheet `Pengaturan`

Berisi konfigurasi seperti:

```text
SCHOOL_NAME
ACADEMIC_YEAR
REG_OPEN
REG_CLOSE
REGISTRATION_OPEN
ADDRESS
PHONE
WHATSAPP
WEBSITE
LOGO_URL
BUILDING_FEE_FREE
UNIFORM_FREE
AI_ENABLED
AI_PROVIDER
AI_MODEL_GEMINI
AI_MODEL_OPENAI
```

## Sheet `Jurusan`

Kolom:

```text
Kode
Nama
Deskripsi
Aktif
Keywords
Urutan
```

## Sheet `FAQ`

Kolom:

```text
Keyword
Pertanyaan
Jawaban
Aktif
Urutan
```

## Sheet `Pendaftar`

Menyimpan data calon siswa.

## Sheet `ChatLog`

Mencatat:

```text
Timestamp
SessionId
Pertanyaan
Intent
Provider
Jawaban
Latency
```

Provider dapat berupa:

```text
database
gemini
openai
fallback
```

---

# 🔒 Keamanan

Aplikasi menerapkan:

- API key tidak disimpan di frontend
- API key disimpan di Script Properties
- Password admin disimpan dalam bentuk hash
- Password awal dibuat secara acak
- Pengecekan status memakai nomor pendaftaran + WhatsApp
- Nama siswa disamarkan pada halaman cek status
- Rate limiting chatbot
- Validasi input server-side
- Honeypot pada formulir pendaftaran

Rekomendasi:

- gunakan akun Google sekolah;
- batasi akses editor Spreadsheet;
- lakukan backup database secara berkala;
- jangan membagikan API key;
- jangan membagikan sheet `Admin`;
- gunakan password administrator yang kuat;
- kumpulkan hanya data yang dibutuhkan untuk proses SPMB.

---

# 📱 Tampilan

Aplikasi responsif untuk:

- Desktop
- Laptop
- Tablet
- Smartphone

Menu utama:

```text
Chatbot
Daftar
Cek Status
Rekomendasi
Informasi
Admin
```

---

# 🗺️ Roadmap

- [ ] Upload KK
- [ ] Upload Akta Kelahiran
- [ ] Upload Ijazah / SKL
- [ ] Upload pas foto
- [ ] Penyimpanan berkas ke Google Drive
- [ ] Verifikasi dokumen per berkas
- [ ] Cetak bukti pendaftaran PDF
- [ ] QR Code nomor pendaftaran
- [ ] Kartu peserta
- [ ] Notifikasi WhatsApp otomatis
- [ ] Multi-user admin
- [ ] Role admin / verifikator / panitia
- [ ] Kuota per jurusan
- [ ] Grafik dashboard lebih lengkap
- [ ] Export Excel / PDF
- [ ] Integrasi website sekolah
- [ ] Automatic Gemini model fallback
- [ ] Retry otomatis jika Gemini HTTP 503
- [ ] Backup database otomatis

---

# 🏫 Informasi Sekolah

**SMK Bhakti Persada Kendal**

Sistem dikembangkan untuk mendukung:

```text
Sistem Penerimaan Murid Baru
Tahun Pelajaran 2027/2028
```

Alamat, nomor telepon, WhatsApp, website, jadwal, dan informasi pendaftaran dapat diatur melalui Dashboard Administrator.

---

# 🤝 Kontribusi

Clone repository:

```bash
git clone <URL_REPOSITORY>
```

Buat branch:

```bash
git checkout -b feature/nama-fitur
```

Commit:

```bash
git add .
git commit -m "Menambahkan fitur baru"
```

Push:

```bash
git push origin feature/nama-fitur
```

Lalu buat Pull Request melalui GitHub.

---

# 📄 Lisensi

Project ini dapat digunakan dan dikembangkan untuk kebutuhan internal **SMK Bhakti Persada Kendal**.

Jika project akan dipublikasikan secara umum, tambahkan file lisensi sesuai kebijakan sekolah atau pemilik repository.

---

## ⭐ Update Repository

Contoh update project:

```bash
git add .
git commit -m "Update Chatbot SPMB v2.2"
git push origin main
```

---

**Chatbot SPMB SMK Bhakti Persada Kendal**

`Google Apps Script • Google Sheets • Gemini AI • OpenAI • HTML5 • JavaScript`
