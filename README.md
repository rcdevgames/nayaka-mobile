# NayakaCCTV (Mobile)

Aplikasi mobile monitoring CCTV untuk pengguna akhir — **Bahasa Indonesia UI**.

## Fitur

- **Autentikasi**: Login & Registrasi (sesi tersimpan via AsyncStorage, simulasi API)
- **Dashboard**: ringkasan sistem, statistik aktivitas/insiden, kamera, alert terbaru
- **Kamera**: daftar kamera dengan pencarian & filter status (online/merekam/offline)
- **Detail Kamera**: info spesifikasi, toggle deteksi gerakan & notifikasi, rekaman terkait
- **Live View**: layar stream (placeholder), timer rekaman, tombol foto/fullscreen
- **Playback Rekaman**: filter kamera & rentang tanggal, daftar rekaman, player dummy dengan timeline & kecepatan putar
- **Notifikasi Alert**: filter Semua/Kritis/Belum dibaca, tandai sudah dibaca
- **Profil**: info akun, pengaturan notifikasi/biometrik, keluar akun

> Semua data & stream video masih **dummy** — belum ada backend CCTV.

## Struktur

```
src/
  components/   UI reuse (Icon, StatusBadge, CameraThumbnail, FormField)
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
