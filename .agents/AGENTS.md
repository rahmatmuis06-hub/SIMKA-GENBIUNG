# AGENT INSTRUCTIONS & ARCHITECTURE SPECIFICATION

## Project: SIMKA GenBI UNG (Google Apps Script Deployment Guide)

Dokumen ini adalah instruksi pengembangan bagi Agen AI untuk merakit, mengonfigurasi, dan melakukan penyelarasan teknis antara Google Sheets dan Google Apps Script (GAS) Web App dengan optimasi manajemen multi-sekretaris.

---

### 1. PERSYARATAN DATABASE (GOOGLE SHEETS)

Buat sebuah Google Spreadsheet baru dengan 3 lembar kerja (sheet) yang dinamakan tepat seperti berikut:

#### Sheet 1: `Anggota`
Lembar kerja ini menyimpan data master identitas, peran jabatan, dan frekuensi keaktifan anggota taktis.
*   **Kolom A (ID)**: `id` (Numerik unik)
*   **Kolom B (Nama)**: `nama` (Nama Lengkap)
*   **Kolom C (NIM)**: `nim` (Nomor Induk Mahasiswa)
*   **Kolom D (Divisi)**: `divisi` (Pendidikan, Kominfo, Lingkungan Hidup, Kesehatan Masyarakat, Kewirausahaan, Potensi Diri)
*   **Kolom E (Penerimaan Ke)**: `penerimaanKe` (Angka 1-4)
*   **Kolom F (Jabatan)**: `jabatan` (Ketua / Sekretaris / Bendahara / Kadiv / Anggota)
*   **Kolom G (Panitia)**: `panitia` (Jumlah keterlibatan, default: 0)
*   **Kolom H (Delegasi Kegiatan)**: `delegasiKegiatan` (Jumlah keterlibatan, default: 0)
*   **Kolom I (Delegasi Peserta)**: `delegasiPeserta` (Jumlah keterlibatan, default: 0)

#### Sheet 2: `Kegiatan_Log`
Lembar kerja mencatat riwayat transaksi pendelegasian peran proker.
*   **Kolom A (Timestamp)**: `timestamp` (Waktu input)
*   **Kolom B (Nama Proker)**: `namaProker`
*   **Kolom C (ID Anggota)**: `idAnggota`
*   **Kolom D (Nama Anggota)**: `namaAnggota`
*   **Kolom E (Peran)**: `peran` (Panitia / Delegasi Kegiatan / Delegasi Peserta)
*   **Kolom F (Operator)**: `operator` (Nama sekretaris yang menginput data dari web app)

#### Sheet 3: `Penilaian_Log`
Lembar kerja mencatat rekam nilai bulanan dari evaluator (Ketua & Kadiv).
*   **Kolom A (Timestamp)**: `timestamp` (Waktu penilaian)
*   **Kolom B (Bulan)**: `bulan` (Contoh: "Januari", "Februari", dst.)
*   **Kolom C (ID Penerima)**: `idPenerima` (ID Anggota/Pengurus yang dinilai)
*   **Kolom D (Nama Penerima)**: `namaPenerima`
*   **Kolom E (Jabatan Penerima)**: `jabatanPenerima`
*   **Kolom F (Nilai)**: `nilai` (Angka skala 1-100)
*   **Kolom G (Catatan)**: `catatan` (Evaluasi kualitatif singkat)
*   **Kolom H (ID Penilai)**: `idPenilai` (ID Ketua atau Kadiv yang menilai)
*   **Kolom I (Operator)**: `operator` (Nama pengurus aktif yang menekan tombol simpan nilai)

---

### 2. LOGIKA PEMBATASAN & ATURAN VALIDASI

*   **Exemption Logic (Frontend & Backend)**: Saat merender panel statistik dashboard, saring (filter) data anggota di mana kolom jabatan harus sama dengan "Anggota". Abaikan jika jabatan bernilai "Ketua", "Sekretaris", "Bendahara", atau "Kadiv".
*   **Grading Authorization Logic**:
    *   Jika pengguna aktif adalah **Ketua**, ia berhak mengisi formulir penilaian untuk anggota dengan jabatan "Sekretaris", "Bendahara", dan "Kadiv".
    *   Jika pengguna aktif adalah **Kadiv** dari Divisi $X$, ia hanya berhak mengisi formulir penilaian untuk anggota dengan jabatan "Anggota" yang divisinya cocok dengan Divisi $X$.

---

### 3. SPESIFIKASI KEAMANAN TIM MULTI-SEKRETARIS

Agen AI wajib menulis kode dengan memenuhi standar keamanan penulisan berikut:

*   **Penerapan LockService di Backend**:
    *   Setiap fungsi penulisan baris baru (seperti `catatPenugasanBaru`, `daftarAnggotaBaru`, dan `simpanPenilaianBulanan`) wajib dibungkus dengan `LockService.getScriptLock()` berdurasi tunggu maksimal 30 detik (`waitLock(30000)`).
    *   Pastikan blok `try-catch-finally` melepas kunci (`lock.releaseLock()`) di bagian `finally` agar tidak memblokir antrean sekretaris berikutnya.
*   **Pencatatan Parameter Operator**:
    *   Setiap API call dari frontend yang memodifikasi data spreadsheet harus mengirimkan informasi operator (mengambil dari nama profil pengguna yang teridentifikasi dari sesi login aktif di frontend).
*   **Trigger Backup Otomatis**:
    *   Buat fungsi `backupDatabaseOtomatis()` yang menyalin database spreadsheet utama ke ID folder khusus Google Drive.
    *   Instruksikan operator untuk memasang pemicu berbasis waktu (Time-driven trigger) mingguan di konsol Apps Script.

---

### 4. LANGKAH DEPLOYMENT BAGI OPERATOR

1.  Buka Google Spreadsheet yang telah disiapkan dengan 3 sheets di atas.
2.  Klik menu Ekstensi > Apps Script.
3.  Hapus kode default di editor, buat berkas `Code.gs` dan isi dengan kode backend yang disediakan.
4.  Klik tombol + (Tambahkan file), pilih HTML, beri nama berkas `index`, lalu isi dengan kode frontend.
5.  Klik Terapkan (Deploy) di pojok kanan atas > Penerapan baru.
6.  Pilih jenis penerapan: Aplikasi Web (Akses: Siapa saja).
7.  Berikan otorisasi penuh saat diminta pertama kali dijalankan.
