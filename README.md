
# IMVanz Local Versioning

**IMVanz Local Versioning** adalah ekstensi Visual Studio Code yang membantu Anda menyimpan dan mengelola riwayat file secara lokal. Dengan ekstensi ini, setiap kali Anda menyimpan file, versi-versi terdahulu secara otomatis dicatat sehingga Anda dapat dengan mudah kembali ke versi sebelumnya atau membandingkan perubahan yang telah dibuat.

---

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

