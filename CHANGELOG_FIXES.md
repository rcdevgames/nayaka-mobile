# CHANGELOG_FIXES

Catatan perbaikan terverifikasi untuk Nayaka CCTV mobile. Terbaru di atas.
Bug baru dicari dengan: `grep -n -i "<gejala>" CHANGELOG_FIXES.md`

### Fix #3 — Kamera tanpa stream_url: layar tidak bisa memutar live view

| | |
|---|---|
| Tanggal | 2026-09-21 |
| File | `src/api.ts`, `src/types.ts`, `__tests__/CameraApi.test.ts` |
| Masalah | Backend mengirim `stream_url`/`thumbnail_url` di GET `/mobile/cameras`, `…/:id`, dan dashboard, tetapi tipe `Camera` di mobile tidak punya field itu. LiveViewScreen hanya menampilkan placeholder "Live stream akan tampil di sini". |
| Akar | Tipe `Camera` masih format legacy (id/name/location/ip/status/type/resolution/fov) dan tidak pernah diselaraskan saat kontrak kamera bertambah kolom. |
| Fix | Tambah `serial_number`, `model`, `recording_status`, `thumbnail_url`, `stream_url`, `thumbnail_expires_at`, `last_seen_at` ke `Camera` di kedua file. URL **tidak** dinormalisasi — dikirim apa adanya dari kolom DB. Sekaligus koreksi tipe `camerasApi.get`: `api()` sudah membuka envelope, jadi `{ data: Camera }` salah dan seharusnya `Camera`. |
| Verifikasi | ✅ Terverifikasi — `__tests__/CameraApi.test.ts` lulus, membandingkan `stream_url` hasil call dengan nilai yang sama persis. |
| Pelajaran | Kalau kontrak mengirim field baru, ubah tipenya lebih dulu, bukan fallback di layar. Fallback membuat field yang hilang terbaca seperti "belum ada data" padahal tidak pernah ada di tipe. |
| Log Keyword | camera contract, stream_url, thumbnail_url, camerasApi.get envelope |
| Deploy | Belum — perubahan JS-only, ikut bundle berikutnya. |

### Fix #2 — MJPEG dihapus dari thumbnail daftar: <Image> tidak paham multipart

| | |
|---|---|
| Tanggal | 2026-09-21 |
| File | `src/components/CameraThumbnail.tsx`, `src/theme/styles.ts`, `__tests__/CameraThumbnail.test.tsx` |
| Masalah | Thumbnail daftar kamera tidak bisa menampilkan live view meski `stream_url` tersedia. |
| Akar | Dua hal bertumpuk. (1) `thumbnail_url` dikirim identik dengan `stream_url`, yaitu stream `multipart/x-mixed-replace`, bukan satu file JPEG — `<Image>` RN tidak bisa me-render itu. (2) Satu-satunya jalan me-render MJPEG di daftar adalah WebView per baris; `DataContext` memakai `limit: 50`, jadi paling buruk 50 instance WebView native sekaligus. |
| Fix | `CameraThumbnail` hanya memakai `<Image>` ketika `thumbnail_url !== stream_url` (URL foto diam sungguhan), dengan fallback placeholder saat load gagal. Tidak ada WebView di daftar. |
| Verifikasi | ✅ Terverifikasi — 3 test di `__tests__/CameraThumbnail.test.tsx` lulus. **Catatan:** masih placeholder di produksi sampai backend mengirim JPEG. Kontrak API §2.1 mensyaratkan signed URL berumur pendek, jadi `thumbnail_url == stream_url` melanggar kontrak — ini pekerjaan backend, bukan mobile. |
| Pelajaran | Jangan pindahkan masalah "URL-nya stream, bukan gambar" ke sisi UI dengan memaksakan player. Bedakan dulu mana yang bisa dijawab mobile dan mana yang menuntut perubahan kontrak. |
| Log Keyword | thumbnail, multipart, x-mixed-replace, WebView list, limit 50, signed url |
| Deploy | Belum — perubahan JS-only. |

### Fix #1 — App.test.tsx crash setelah pasang react-native-webview

| | |
|---|---|
| Tanggal | 2026-09-21 |
| File | `jest.config.js`, `jest.setup.js` |
| Masalah | Menambah `react-native-webview` membuat `__tests__/App.test.tsx` gagal total, bukan hanya test yang memakai WebView. |
| Akar | Dua lapisan. (1) Paket itu mengirim ESM (`import …` di `index.js`) dan tidak ikut ditransformasi karena tidak terdaftar di `transformIgnorePatterns`. (2) Setelah ditransformasi, modulnya memanggil `TurboModuleRegistry.getEnforcing('RNCWebViewModule')` saat import — native module itu tidak ada di environment Jest. |
| Fix | Tambah `react-native-webview` ke `transformIgnorePatterns` dan mock ringan (`View` dengan `testID="webview"`) di `jest.setup.js`, mengikuti pola mock native module yang sudah ada di file itu. |
| Verifikasi | ✅ Terverifikasi berantai — `App.test.tsx`: FAIL (SyntaxError) → FAIL (Invariant Violation) → **PASS**. Suite penuh: 6/7 lulus. |
| Pelajaran | Dependency native baru hampir selalu butuh dua tempat sekaligus di setup ini: `transformIgnorePatterns` DAN mock di `jest.setup.js`. Memperbaiki salah satunya hanya memindahkan error ke lapisan berikutnya. Karena `MjpegView` diimpor `CameraDetailScreen` → `HomeStack` → `RootNavigator` → `App`, satu import native bisa menjatuhkan seluruh smoke test. |
| Log Keyword | react-native-webview, Cannot use import statement outside a module, RNCWebViewModule, TurboModuleRegistry.getEnforcing, transformIgnorePatterns |
| Deploy | Tidak perlu — hanya konfigurasi test. |
