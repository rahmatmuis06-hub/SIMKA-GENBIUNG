# Panduan Deployment & Konfigurasi SIMKA GenBI UNG

Repositori ini berisi kode sumber untuk **Sistem Informasi Monitoring Keaktifan Anggota (SIMKA) GenBI UNG** yang dibangun di atas Google Sheets dan Google Apps Script (GAS) dengan antarmuka web premium (Stripi-Inspired).

---

## 📂 Struktur Berkas Proyek
*   `Code.gs`: Logika backend server (GAS), penguncian konkuren (`LockService`), verifikasi login, pencatatan operator, dan pencadangan Google Drive.
*   `Index.html`: Layout utama antarmuka pengguna (HTML), navigasi tab, modal dialog.
*   `CSS.html`: Lembar gaya (CSS) premium dengan visual modern, tema gelap, efek glassmorphism, dan variabel CSS HSL.
*   `JS.html`: Logika sisi klien (JavaScript), modul WhatsApp parser, fuzzy matching, rendering chart SVG dinamis, dan pemanggilan API.

---

## 🛠️ Langkah-Langkah Deployment untuk Operator

### 1. Persiapan Google Spreadsheet
1.  Buka [Google Sheets](https://sheets.google.com) dan buat sebuah Spreadsheet baru.
2.  Beri nama file sesuai kebutuhan Anda (contoh: `Database SIMKA GenBI UNG`).
3.  Biarkan spreadsheet kosong. Struktur sheet akan dibuat otomatis oleh sistem.

### 2. Memasang Kode di Google Apps Script
1.  Di menu atas Spreadsheet, klik **Ekstensi** > **Apps Script**.
2.  Hapus semua kode default `myFunction()` di editor berkas `Code.gs`.
3.  Buka berkas [Code.gs](file:///c:/laragon/www/Genbi-sistem/Code.gs) dari proyek ini, salin seluruh kodenya, lalu tempelkan ke editor `Code.gs` di Google Apps Script.
4.  Klik ikon **+** (Tambahkan file) di sidebar kiri editor Apps Script, pilih **HTML**, beri nama berkas `Index` (tanpa ekstensi `.html`). Salin seluruh kode dari [Index.html](file:///c:/laragon/www/Genbi-sistem/Index.html) dan tempel ke berkas baru tersebut.
5.  Ulangi langkah di atas untuk membuat berkas HTML baru bernama `CSS` (salin dari [CSS.html](file:///c:/laragon/www/Genbi-sistem/CSS.html)) dan berkas bernama `JS` (salin dari [JS.html](file:///c:/laragon/www/Genbi-sistem/JS.html)).
6.  Klik ikon **Simpan** (Floppy Disk) di bagian atas editor untuk menyimpan semua berkas.

### 3. Menginisialisasi Database
1.  Di bagian atas editor Apps Script, pada menu dropdown fungsi, pilih **`initializeSpreadsheet`**.
2.  Klik tombol **Run** (Jalankan) di samping dropdown fungsi.
3.  Google akan meminta persetujuan izin akses (Otorisasi). Klik **Tinjau Izin**, pilih akun Google Anda, klik **Lanjutan** (Advanced) di bagian bawah, pilih **Buka Database SIMKA (tidak aman)**, lalu klik **Izinkan** (Allow).
4.  Setelah selesai dijalankan, periksa Spreadsheet Anda. Tiga lembar kerja berikut akan terbuat secara otomatis lengkap dengan baris data default operator untuk pengujian:
    *   `Anggota` (dilengkapi data login default)
    *   `Kegiatan_Log`
    *   `Penilaian_Log`

---

## 🔑 Data Akun Login Default (Pengujian)

Saat database diinisialisasi pertama kali, sistem membuat data pengurus berikut di sheet `Anggota` yang dapat digunakan untuk login ke web app:

| ID Anggota | Nama Operator | Jabatan | Divisi | PIN Default | Hak Akses Evaluasi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Ketua Komisariat | Ketua | BPH | `1234` | Menilai Sekretaris, Bendahara, Kadiv |
| **2** | Sekretaris Komisariat | Sekretaris | BPH | `5678` | Akses input, pendaftaran, WA parser |
| **3** | Bendahara Komisariat | Bendahara | BPH | `9999` | Akses input, pendaftaran, WA parser |
| **4** | Kadiv Pendidikan | Kadiv | Pendidikan | `1111` | Menilai Anggota Divisi Pendidikan saja |

> [!TIP]
> Anda dapat menambahkan pengurus baru atau mengubah PIN keamanan ini langsung pada tabel spreadsheet di sheet **`Anggota`** (Kolom J - `pin`).

---

## 🌐 Menerapkan sebagai Aplikasi Web (Deploy Web App)

1.  Di pojok kanan atas editor Google Apps Script, klik **Terapkan** (Deploy) > **Penerapan baru** (New deployment).
2.  Klik ikon gerigi di sebelah "Pilih jenis", pilih **Aplikasi Web** (Web app).
3.  Isi konfigurasi berikut:
    *   **Deskripsi**: `SIMKA GenBI UNG v1.0`
    *   **Jalankan sebagai**: **Saya** (your-email@gmail.com)
    *   **Siapa yang memiliki akses**: **Siapa saja** (Anyone)
4.  Klik **Terapkan**.
5.  Salin **URL Aplikasi Web** yang diberikan. URL ini adalah alamat situs SIMKA GenBI UNG yang akan dibuka oleh tim sekretariat di browser.

---

## 💾 Mengonfigurasi Cadangan Otomatis (Auto-Backup)

Fungsi `backupDatabaseOtomatis()` akan menduplikasi file spreadsheet database Anda secara berkala ke folder khusus di Google Drive untuk mengamankan data.

### Langkah Setup Trigger Mingguan:
1.  Di sidebar kiri editor Google Apps Script, klik ikon jam/weker (**Pemicu** / Triggers).
2.  Klik tombol **Tambahkan Pemicu** (Add Trigger) di pojok kanan bawah.
3.  Pilih konfigurasi pemicu berikut:
    *   *Pilih fungsi yang ingin dijalankan*: **`backupDatabaseOtomatis`**
    *   *Pilih penerapan yang akan dijalankan*: **Head**
    *   *Pilih sumber acara*: **Berbasis waktu** (Time-driven)
    *   *Pilih jenis pemicu berbasis waktu*: **Pemicu minggu** (Week timer)
    *   *Pilih hari dalam seminggu*: **Setiap Minggu** (Every Sunday - atau hari pilihan Anda)
    *   *Pilih waktu*: **02.00 s.d. 03.00** (Waktu malam hari direkomendasikan)
4.  Klik **Simpan**.
5.  Sistem secara otomatis akan membuat folder bernama **`SIMKA_Backup`** di Google Drive Anda saat backup pertama kali dijalankan, lalu menyimpan file salinan berstempel waktu di sana. Anda juga dapat memicu backup secara manual melalui tombol di halaman **Sistem & Audit** di web app.
