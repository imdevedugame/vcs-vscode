# IMVanz Local Versioning (VCS-VSCODE)

**IMVanz Local Versioning** adalah ekstensi Visual Studio Code yang menyediakan sistem versioning lokal untuk file-file dalam workspace. Ekstensi ini memungkinkan pengguna untuk menyimpan, mengelola, dan membandingkan riwayat perubahan file secara otomatis setiap kali file disimpan. Selain itu, ekstensi ini menyediakan berbagai fitur menarik seperti:

- **TreeView History:** Menampilkan riwayat versi file dalam tampilan pohon (TreeView) di sidebar VSCode.
- **Timeline Provider:** Menampilkan timeline versi file yang dapat diakses melalui fitur Timeline di VSCode.
- **Quick Diff:** Bandingkan perubahan file saat ini dengan versi terakhir yang disimpan.
- **Branching Sederhana:** Membuat “branch” baru untuk file tertentu agar riwayat bisa dipisahkan secara logis.
- **Partial Revert:** Memungkinkan pengguna untuk melakukan revert parsial melalui tampilan diff.
- **Favorite Versions:** Tandai versi tertentu sebagai favorit.
- **Export/Import Version:** Ekspor versi sebagai file patch (.patch atau .txt) dan impor kembali ke sistem versioning.
- **Full-text Search:** Cari teks tertentu di seluruh versi yang tersimpan.
- **Custom Changelog Panel:** Tampilkan ringkasan versi dari seluruh file dalam sebuah panel webview.

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Instalasi](#instalasi)
- [Cara Kerja dan Penggunaan](#cara-kerja-dan-penggunaan)
  - [Penyimpanan Riwayat](#penyimpanan-riwayat)
  - [TreeView History](#treeview-history)
  - [Timeline](#timeline)
  - [Perintah (Commands)](#perintah-commands)
- [Konfigurasi dan Batasan](#konfigurasi-dan-batasan)
- [Struktur Kode](#struktur-kode)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

Berikut adalah contoh *README* untuk pengguna yang akan ditampilkan di halaman ekstensi VSCode:

---

# IMVanz Local Versioning

**IMVanz Local Versioning** adalah ekstensi Visual Studio Code yang membantu Anda menyimpan dan mengelola riwayat file secara lokal. Dengan ekstensi ini, setiap kali Anda menyimpan file, versi-versi terdahulu secara otomatis dicatat sehingga Anda dapat dengan mudah kembali ke versi sebelumnya atau membandingkan perubahan yang telah dibuat.

---

## Fitur Utama

1. **Penyimpanan Riwayat Otomatis:**  
   - Menyimpan versi file setiap kali file disimpan (onDidSaveTextDocument).
   - Auto-prune history untuk membatasi jumlah versi yang tersimpan (default 5 versi).

2. **TreeView History:**  
   - Menampilkan daftar file yang memiliki riwayat versi.
   - Memungkinkan pengguna melihat daftar versi untuk setiap file.
   - Setiap versi dapat melakukan aksi seperti _Apply_, _Preview_, _Delete_, _Compare_, _Favorite_, dan _Partial Revert_.

3. **Toggle Favorite:**  
   - Tandai atau hapus tanda favorit pada versi tertentu.

4. **Partial Revert:**  
   - Buka tampilan diff antara versi yang diinginkan dengan file saat ini untuk melakukan revert sebagian secara manual.

5. **Timeline Provider:**  
   - Menampilkan riwayat versi file melalui fitur Timeline bawaan VSCode.

6. **Quick Diff:**  
   - Bandingkan file yang sedang aktif dengan versi terakhir yang disimpan.

7. **Branching Sederhana:**  
   - Buat branch baru pada riwayat file untuk memisahkan perubahan berdasarkan branch.

8. **Export & Import Version:**  
   - Ekspor versi tertentu ke file patch (.patch atau .txt) dan impor kembali versi tersebut ke dalam sistem.

9. **Full-Text Search:**  
   - Cari kata kunci di seluruh versi yang tersimpan.

10. **Custom Changelog Panel:**  
    - Tampilkan ringkasan perubahan versi seluruh file melalui panel webview.
## Fitur Utama

- **Auto Save History**  
  Otomatis menyimpan riwayat setiap kali file disimpan di workspace.

- **TreeView History**  
  Tampilkan daftar riwayat versi file melalui panel *TreeView* di sidebar VSCode.  
  Pilih file dan versi untuk:
  - Menerapkan (Apply) versi ke file asli.
  - Melihat pratinjau (Preview) versi secara *read-only*.
  - Menghapus (Delete) versi tertentu.
  - Membandingkan (Compare) versi dengan file saat ini.
  - Menandai versi sebagai favorit (Favorite/Unfavorite).
  - Melakukan *Partial Revert* untuk memulihkan bagian tertentu dari file.

- **Timeline**  
  Akses riwayat versi file melalui fitur Timeline bawaan VSCode, lengkap dengan timestamp dan opsi untuk menerapkan versi tertentu.

- **Quick Diff**  
  Bandingkan file yang sedang aktif dengan versi terakhir yang disimpan hanya dengan satu perintah.

---

## Instalasi

### Prasyarat

- Visual Studio Code (disarankan versi terbaru)
- Node.js (untuk pengembangan dan testing ekstensi)

### Langkah Instalasi

1. **Clone Repository**  
   Clone repository ini ke komputer Anda:

   ```bash
   git clone https://github.com/username/imvanz-local-versioning.git
   cd imvanz-local-versioning
   ```

2. **Install Dependencies**  
   Install dependensi yang diperlukan dengan npm:

   ```bash
   npm install
   ```

3. **Jalankan Ekstensi**  
   Buka folder ini di VSCode dan tekan `F5` untuk menjalankan ekstensi dalam _Extension Development Host_.

4. **Publikasi (Opsional)**  
   Untuk membangun dan menerbitkan ekstensi, Anda dapat menggunakan [vsce](https://code.visualstudio.com/api/working-with-extensions/publishing-extension):

   ```bash
   npm install -g vsce
   vsce package
   ```

---

## Cara Kerja dan Penggunaan

### Penyimpanan Riwayat

- **Sistem Penyimpanan:**  
  Setiap file yang disimpan akan memiliki riwayat yang disimpan di folder `.imvanz` di dalam workspace. File riwayat disimpan dalam format JSON dengan nama file yang telah disanitasi.

- **Auto-Prune:**  
  Riwayat akan dipangkas secara otomatis jika jumlah versi melebihi batas yang ditentukan (default 5 versi). Batas ini dapat dimodifikasi sesuai kebutuhan.

### TreeView History

- **Menampilkan Riwayat:**  
  Riwayat versi file ditampilkan dalam _TreeView_ dengan ID `imvanzHistory`.  
  Pengguna dapat meng-klik file untuk melihat daftar versinya.  
  Setiap entri versi menampilkan timestamp, branch (jika ada), dan indikator favorit.

- **Aksi pada Riwayat:**  
  Saat memilih sebuah versi, pengguna dapat memilih aksi dari menu cepat (Quick Pick) seperti:
  - Apply History
  - Preview History
  - Delete History
  - Compare History
  - Favorite/Unfavorite
  - Partial Revert
  - Export Version

### Timeline

- **Timeline Provider:**  
  Ekstensi ini juga menyediakan _Timeline Provider_ yang memungkinkan pengguna mengakses riwayat melalui fitur Timeline bawaan VSCode.
  Timeline menampilkan entri dengan timestamp, label versi, dan aksi untuk menerapkan versi tertentu.

### Perintah (Commands)

Ekstensi ini mendaftarkan beberapa perintah (commands) yang dapat diakses melalui Command Palette (`Ctrl+Shift+P` atau `Cmd+Shift+P`). Contoh perintah yang tersedia antara lain:

- `imvanz.init`  
  Inisialisasi ekstensi dan menampilkan pesan konfirmasi.

- `imvanz.applyHistory`  
  Menerapkan versi riwayat tertentu ke file asli.

- `imvanz.previewHistory`  
  Membuka preview (read-only) dari versi riwayat.

- `imvanz.deleteHistory`  
  Menghapus versi riwayat tertentu.

- `imvanz.compareHistory`  
  Membandingkan versi riwayat dengan file saat ini.

- `imvanz.quickDiff`  
  Menampilkan perbandingan (diff) antara file yang sedang aktif dengan versi terakhir yang disimpan.

- `imvanz.createBranch`  
  Membuat branch baru untuk file tertentu.

- `imvanz.importVersion`  
  Mengimpor versi dari file patch (.patch atau .txt).

- `imvanz.searchInHistory`  
  Melakukan pencarian teks pada seluruh riwayat versi.

- `imvanz.showChangelog`  
  Menampilkan ringkasan perubahan versi melalui panel webview.

- `imvanz.disableExtension`  
  Menonaktifkan ekstensi secara manual.

---

## Konfigurasi dan Batasan

- **Auto Save Warning:**  
  Ekstensi mendeteksi apakah fitur Auto Save aktif. Jika aktif, pengguna akan diperingatkan untuk menonaktifkan Auto Save agar pencatatan riwayat lebih efisien.

- **Maksimum Riwayat:**  
  Secara default, ekstensi menyimpan maksimal 5 versi per file. Batas ini dapat diubah dengan memodifikasi variabel `maxHistory` pada fungsi `autoPruneHistory`.

- **Penyimpanan Riwayat:**  
  Semua riwayat disimpan dalam folder `.imvanz` yang dibuat di root workspace. Pastikan workspace sudah terbuka agar ekstensi dapat bekerja dengan baik.

---

## Struktur Kode

- **Timeline Provider:**  
  Kelas `ImvanzTimelineProvider` bertanggung jawab menyediakan data untuk fitur Timeline VSCode.

- **History Provider:**  
  Kelas `HistoryProvider` mengatur tampilan TreeView riwayat file, mengelola ikon file berdasarkan ekstensi, dan menyediakan fungsi untuk mendapatkan data versi.

- **Fungsi Utama:**  
  Terdapat beberapa fungsi utama untuk menangani:
  - Penyimpanan riwayat (`saveHistory`)
  - Penghapusan riwayat (`deleteHistory`)
  - Penerapan riwayat ke file asli (`applyHistory`)
  - Preview dan compare versi (`previewHistory` dan `compareHistory`)
  - Fitur-fitur tambahan seperti toggle favorite, partial revert, export/import, quick diff, branch creation, dan search.

- **Registrasi Perintah:**  
  Perintah-perintah VSCode didaftarkan menggunakan fungsi `registerCommand`, yang menambahkan setiap perintah ke dalam `context.subscriptions`.
- **Branching Sederhana**  
  Buat *branch* baru untuk sebuah file, sehingga Anda dapat mengelompokkan perubahan ke dalam cabang terpisah.

- **Export & Import Version**  
  Ekspor versi file ke format patch (.patch atau .txt) untuk disimpan atau dipindahkan, dan impor kembali patch tersebut sebagai versi baru.

- **Full-Text Search**  
  Cari kata kunci di seluruh riwayat file untuk menemukan versi yang mengandung teks tertentu.

- **Changelog Panel**  
  Lihat ringkasan seluruh perubahan versi dari semua file melalui panel webview interaktif.

---

## Cara Menggunakan

1. **Menyimpan Riwayat**
   - Setiap kali Anda menyimpan file, ekstensi akan otomatis mencatat versi baru.
   - Riwayat disimpan di folder `.imvanz` di root workspace Anda.

2. **Melihat Riwayat File**
   - Buka panel *TreeView* (dengan ID `IMVanz History`) di sidebar.
   - Klik pada nama file untuk melihat daftar versi yang tersimpan.
   - Pilih versi yang diinginkan untuk melakukan aksi seperti *Apply*, *Preview*, *Delete*, *Compare*, dan lainnya.

3. **Menggunakan Timeline**
   - Buka fitur Timeline bawaan VSCode untuk melihat riwayat versi file dengan tampilan waktu (timestamp).

4. **Quick Diff**
   - Gunakan perintah `IMVanz: Quick Diff` melalui Command Palette (Ctrl+Shift+P / Cmd+Shift+P) untuk membandingkan file saat ini dengan versi terakhir.

5. **Branching**
   - Buat branch baru untuk file dengan perintah `IMVanz: Create Branch`.
   - Pilih file yang ingin dipisahkan perubahannya ke branch baru.

6. **Export & Import Versi**
   - Ekspor versi file ke file patch dengan perintah `IMVanz: Export Version`.
   - Impor file patch (.patch atau .txt) sebagai versi baru melalui perintah `IMVanz: Import Version`.

7. **Full-Text Search**
   - Cari kata kunci di seluruh riwayat file dengan perintah `IMVanz: Search in History`.

8. **Changelog Panel**
   - Tampilkan ringkasan perubahan versi dari seluruh file dengan perintah `IMVanz: Show Changelog`.

---

## Kontribusi

Kontribusi terhadap proyek ini sangat dihargai! Jika Anda memiliki saran, perbaikan, atau fitur tambahan, silakan buat _pull request_ atau _issue_ pada repository ini.

---

## Lisensi

Distribusi dan penggunaan ekstensi ini tunduk pada [Lisensi MIT](LICENSE).  
Pastikan untuk membaca dan memahami syarat-syarat lisensi sebelum menggunakan atau mendistribusikan ulang kode ini.

---

Selamat mencoba **IMVanz Local Versioning** dan semoga membantu meningkatkan produktivitas Anda dalam mengelola riwayat perubahan file di Visual Studio Code!

Happy Coding!
## **Follow dan Dukungan**

Ikuti perjalanan kami dan berikan dukungan Anda:
- **Instagram**: [@imvanz_](https://instagram.com/imvanz_)
- **GitHub**: [imdevedugame](https://github.com/imdevedugame)

Terima kasih telah mendukung kami! Dengan dukungan Anda, kami terus dapat meningkatkan ekstensi ini dan membuat pengkodean lebih mudah untuk semua orang.

---

z

## Peringatan & Batasan

- **Auto Save:**  
  Jika fitur Auto Save aktif, Anda akan menerima peringatan untuk menonaktifkannya demi pencatatan riwayat yang lebih akurat.

- **Batas Riwayat:**  
  Secara default, ekstensi hanya menyimpan maksimal 5 versi per file. Versi lama akan dipangkas secara otomatis.

---

## Butuh Bantuan?

Jika Anda memiliki pertanyaan, saran, atau menemui masalah dalam penggunaan ekstensi ini, silakan:
- **Laporkan masalah** melalui halaman *Issues* di repository ekstensi.
- **Hubungi** tim support melalui email: [ivan123045@gmail.com](Github:Imdevedugame).

---

Nikmati kemudahan mengelola versi file dengan **IMVanz Local Versioning** dan tingkatkan produktivitas kerja Anda di Visual Studio Code!

Happy Coding!

