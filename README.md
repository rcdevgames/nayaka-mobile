# NayakaCCTV (Mobile)

Aplikasi mobile monitoring CCTV untuk pengguna akhir — **Bahasa Indonesia UI**.

## Fitur

- **Autentikasi**: Login & Registrasi (sesi tersimpan via AsyncStorage, simulasi API)
- **Dashboard**: ringkasan sistem, statistik aktivitas/insiden, kamera, alert terbaru
- **Kamera**: daftar kamera dengan pencarian & filter status (online/merekam/offline), thumbnail dari frame pertama stream
- **Detail Kamera**: info spesifikasi, toggle deteksi gerakan & notifikasi, rekaman terkait
- **Live View**: stream MJPEG dari gateway kamera, timer rekaman, tombol foto/fullscreen
- **Playback Rekaman**: filter kamera & rentang tanggal, daftar rekaman, player dummy dengan timeline & kecepatan putar
- **Notifikasi Alert**: filter Semua/Kritis/Belum dibaca, tandai sudah dibaca
- **Profil**: info akun, pengaturan notifikasi/biometrik, keluar akun

> Video live sudah memakai stream MJPEG asli dari gateway kamera. Playback rekaman dan checkout langganan masih mock.

## Struktur

```
src/
  components/   UI reuse (Icon, StatusBadge, CameraThumbnail, MjpegView, FormField)
  context/      AuthContext (sesi)
  data/         mock data & tipe (Camera, Recording, AlertItem)
  navigation/   Root stack, bottom tabs, home stack
  screens/      auth/ + home/ (Dashboard, Kamera, Live, Playback, Alert, Profil)
  theme/        warna, spacing, radius, shadow
  utils/        format angka/waktu
```

## Menjalankan

```sh
npm install

# iOS (pertama kali perlu Pods)
cd ios && pod install && cd ..

npm start          # Metro
npm run ios        # atau: npm run android
```

## Verifikasi

```sh
npx tsc --noEmit   # typecheck
npm run lint       # eslint
npm test           # jest
```
