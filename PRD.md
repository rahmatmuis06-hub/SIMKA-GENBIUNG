# PRODUCT REQUIREMENT DOCUMENT (PRD)

## Sistem Informasi Monitoring Keaktifan Anggota (SIMKA) GenBI UNG berbasis Google Apps Script

### 1. PENDAHULUAN & LATAR BELAKANG

GenBI Universitas Negeri Gorontalo (UNG) memerlukan mekanisme yang transparan dalam mengelola distribusi kerja sekaligus menilai kinerja anggotanya. Selain melacak keterlibatan anggota dalam program kerja (proker), sistem ini juga harus mewadahi struktur kepengurusan di mana pengurus inti (Ketua, Sekretaris, Bendahara) dan Kepala Divisi (Kadiv) bertindak sebagai evaluator.

Pengurus inti dan Kadiv memiliki tanggung jawab manajerial yang besar sehingga dikecualikan dari kewajiban penugasan taktis bulanan (tidak masuk dalam perhitungan grafik keaktifan ekstrem). Sebagai gantinya, evaluasi dilakukan secara berjenjang lewat fitur Penilaian Kinerja Bulanan.

Sistem ini didesain untuk dikelola oleh tim sekretariat (multi-sekretaris), sehingga keamanan transaksi data, pencegahan race condition (bentrokan data), dan rekam jejak penginputan menjadi prioritas utama.

---

### 2. METRIK, PERAN, & ATURAN EXEMPTION

#### A. Peran dalam Organisasi (User Roles)
*   **Ketua**: Pimpinan tertinggi komisariat. Berwenang memberikan nilai bulanan kepada Sekretaris, Bendahara, dan para Kepala Divisi.
*   **Sekretaris / Bendahara (BPH)**: Pengelola administratif. Bertugas menginput kegiatan, mendaftarkan anggota baru, mengimpor data WhatsApp, dan mengecualikan diri dari penilaian keaktifan standar.
*   **Kepala Divisi (Kadiv)**: Pemimpin divisi. Berwenang memberikan penilaian bulanan khusus untuk anggota di divisinya sendiri.
*   **Anggota**: Pelaksana taktis di 6 divisi. Wajib dipantau keaktifannya (termasuk kepatuhan minimal 1 proker untuk Penerimaan Ke-4).

#### B. Aturan Pengecualian (Exemption Rule)
Ketua, Sekretaris, Bendahara, dan Kadiv tidak dimasukkan ke dalam "Zona Kontributor Utama" (Panel Kiri) maupun "Zona Prioritas Penugasan" (Panel Kanan). Dashboard keaktifan murni melacak anggota biasa.

#### C. Alur Penilaian Bulanan (Monthly Grading Flow)
Setiap bulan, penilaian diinput ke sistem dengan skala 1-100 disertai catatan evaluasi singkat:
*   **Kadiv $\rightarrow$ Anggota**: Kadiv hanya bisa menilai anggota yang terdaftar di divisinya sendiri.
*   **Ketua $\rightarrow$ Kadiv & BPH**: Ketua menilai kinerja manajerial Sekretaris, Bendahara, dan 6 orang Kepala Divisi.

---

### 3. STRUKTUR DIVISI RESMI
1.  Pendidikan
2.  Kominfo
3.  Lingkungan Hidup
4.  Kesehatan Masyarakat
5.  Kewirausahaan
6.  Potensi Diri

---

### 4. FITUR UTAMA & SISTEM MULTI-SEKRETARIS
Untuk mendukung kolaborasi tim sekretariat yang efektif dan aman, sistem wajib mengimplementasikan fitur-fitur berikut:

#### A. Fitur WhatsApp List Parser
*   Sekretaris dapat menyalin (copy) daftar delegasi dari obrolan grup WhatsApp dan menempelkannya (paste) langsung ke web app.
*   Sistem melakukan pencocokan nama otomatis menggunakan algoritma pencocokan cerdas (fuzzy matching) agar sekretaris tidak perlu memilih nama satu per satu.

#### B. Audit Trail & Operator Tracker
*   Sistem wajib melacak akun sekretaris yang sedang aktif melakukan penginputan. Setiap transaksi penulisan (kegiatan baru maupun penilaian) harus mencatat nama operator tersebut di database.

#### C. Sistem Anti-Tabrakan Data (Data Lock)
*   Sistem wajib menangani konkurensi. Jika beberapa sekretaris mengklik tombol simpan pada detik yang sama, sistem tidak boleh mengalami kegagalan penulisan atau tumpang tindih data.

#### D. Standardisasi Input & Validasi Frontend
*   Otomatisasi standardisasi format teks (Title Case untuk nama proker/anggota, serta pembersihan karakter non-numerik pada NIM) untuk mencegah kekacauan pencarian di database.

#### E. Cadangan Data Otomatis (Auto-Backup)
*   Sistem harus melakukan duplikasi database spreadsheet secara terjadwal ke Google Drive pengurus demi mengantisipasi penghapusan data secara tidak sengaja melalui aplikasi spreadsheet seluler.

---

### 5. SKEMA DATABASE SPREADSHEET (GAS BACKEND)

#### A. Sheet `Anggota`
Menyimpan profil dasar ditambah kolom jabatan (Ketua, Sekretaris, Bendahara, Kadiv, Anggota).
*   Kolom yang direncanakan: `NIM`, `Nama`, `Divisi`, `Jabatan`, `Status Keaktifan`, dll.

#### B. Sheet `Kegiatan_Log`
Log pendelegasian kegiatan/proker reguler (dilengkapi data operator).
*   Kolom yang direncanakan: `ID_Kegiatan`, `Tanggal`, `Nama_Kegiatan`, `Nama_Anggota`, `NIM`, `Peran_Dalam_Kegiatan`, `Operator_Sekretaris`, `Timestamp`.

#### C. Sheet `Penilaian_Log`
Menyimpan transaksi nilai bulanan yang diberikan oleh Ketua dan Kadiv (dilengkapi data operator).
*   Kolom yang direncanakan: `ID_Penilaian`, `Bulan_Tahun`, `Penilai_Nama`, `Penilai_Jabatan`, `Dinilai_Nama`, `Dinilai_NIM`, `Nilai_Skala_1_100`, `Catatan_Evaluasi`, `Operator_Sekretaris`, `Timestamp`.
