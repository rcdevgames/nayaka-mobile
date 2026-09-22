# CHANGELOG_FIXES

Catatan perbaikan terverifikasi untuk Nayaka CCTV mobile. Terbaru di atas.
Bug baru dicari dengan: `grep -n -i "<gejala>" CHANGELOG_FIXES.md`

### Fix #7 — Halaman push tanpa header, dan halaman tab ikut di-push

| | |
|---|---|
| Tanggal | 2026-09-22 |
| File | `src/components/AppHeader.tsx` (baru), `src/screens/home/CameraDetailScreen.tsx`, `src/screens/home/DashboardScreen.tsx`, `src/navigation/types.ts`, `src/theme/styles.ts`, `__tests__/DashboardNavigation.test.tsx` |
| Masalah | Dua keluhan. (1) Halaman yang di-push tidak punya header aplikasi. (2) Halaman yang sebenarnya sudah jadi tab tetap dibuka sebagai halaman baru. |
| Akar | (1) Header aplikasi tidak pernah dilembagakan: tiap layar menulis header sendiri-sendiri, dan `CameraDetailScreen` tidak menulis sama sekali — header-nya cuma nama kamera yang ikut ter-scroll di dalam kartu preview, jadi tidak ada judul tetap maupun tombol kembali. (2) `HomeStack` diinstansiasi 5 kali oleh `MainTabs` (satu per tab, initial route berbeda: Dashboard/Cameras/Playback/Alerts/Settings). Karena `Alerts`, `Cameras`, dan `Playback` juga ada sebagai screen di dalam `HomeStackParamList`, tombol Dashboard men-`navigate('Alerts')` **di dalam stack** dan menumpuk layar baru di atas Dashboard — padahal tab `AlertsTab` sudah ada. Ketika itu terjadi, `goBack` pun tidak bisa kembali ke Dashboard, karena Dashboard sudah bukan layar teratas. |
| Fix | `AppHeader` dibuat sebagai komponen bersama (judul, subjudul opsional, tombol kembali opsional, slot kanan) dan dipakai `CameraDetailScreen`; `SafeAreaView`-nya diubah ke `edges={['bottom']}` karena header sekarang menangani inset atas. `MainTabParamList` diberi `NavigatorScreenParams<HomeStackParamList>` supaya navigasi tab bisa menyebut layar anak bertipe aman. Dashboard kini memakai `useNavigation<BottomTabNavigationProp<MainTabParamList>>` dan mengarah ke `AlertsTab` / `CamerasTab`, sedangkan kartu kamera memakai `navigate('CamerasTab', { screen: 'CameraDetail', params })` sehingga detail muncul **di dalam** tab Kamera. |
| Verifikasi | ✅ Terverifikasi untuk navigasi — `__tests__/DashboardNavigation.test.tsx` (2 test) mengunci bahwa Dashboard tidak lagi push `Alerts`/`Cameras`/`CameraDetail`. `npx tsc --noEmit` bersih (hanya `AuthContext` pre-existing), eslint 0 error baru, suite 9/10 (1 gagal pre-existing). ⚠️ **Tampilan header di device BELUM dilihat** — perlu rebuild dan buka Camera Detail untuk memastikan judul, subjudul lokasi, badge status, dan jarak aman atas tampak benar. |
| Pelajaran | **Satu screen di dalam `StackParamList` tidak otomatis berarti harus dipush.** Kalau layar itu juga jadi tab, arahkan lewat tab (`navigate('XTab', { screen: ... })`), bukan lewat stack. Tanda bahayanya: setelah push, tombol kembali terasa aneh karena layar sebelumnya bukan yang diharapkan. Dan: header aplikasi sebaiknya satu komponen bersama — begitu tiap layar menulis headernya sendiri, cepat atau lambat ada layar yang lupa, seperti `CameraDetailScreen` di sini. |
| Log Keyword | tidak ada header, push page tanpa header, bukan tab, halaman menumpuk, goBack tidak kembali, AppHeader, CameraDetail tanpa judul |
| Deploy | Belum — perubahan JS-only, ikut bundle berikutnya. |

### Fix #6 — "Gagal memuat pengaturan kamera ApiError: Gagal (404)"

| | |
|---|---|
| Tanggal | 2026-09-22 |
| File | `src/api.ts`, `src/screens/home/CameraDetailScreen.tsx`, `src/theme/styles.ts` |
| Masalah | Buka Camera Detail, console penuh `Gagal memuat pengaturan kamera ApiError: Gagal (404)`. Toggle "Deteksi Gerakan" dan "Notifikasi Alert" juga tidak pernah tersimpan. |
| Akar | **Endpoint-nya tidak ada.** `camerasApi.getSettings/updateSettings` memanggil `/mobile/cameras/{id}/settings`, tetapi kontrak mobile §5 hanya mendaftarkan `GET /mobile/cameras` dan `GET /mobile/cameras/{id}`. Bukti pembeda: pesannya `Gagal (404)`, bukan `Data tidak ditemukan.` — 404 domain (dengan envelope `error`) akan memakai pesan ramah dari `ERROR_MESSAGES`, sedangkan `Gagal (404)` hanya muncul saat response tidak punya envelope, yaitu pola 404 bawaan framework untuk rute tak terdaftar. |
| Fix | `getSettings`/`updateSettings` dihapus dari `camerasApi`. Section "Pengaturan" diganti "Preferensi Akun": nilainya dari `GET /mobile/me/settings` (yang memang ada di kontrak §9) dengan sub-label "Berlaku untuk semua kamera", sehingga tidak terbaca sebagai setelan per perangkat. Juga dihapus: kartu "Rekaman Terkait" (dipindah ke PlaybackScreen — list per kamera tetap ada di sana lewat `recordingsApi.list({camera_id})`), dan baris "Jadwal Perekaman" yang `onPress` kosong. `formatBytes` dan state `relatedRecordings` jadi ikut hilang. |
| Verifikasi | ✅ Terverifikasi untuk penyebab 404 — bukti dari kode client (pesan error) + kontrak §5. `npx tsc --noEmit` bersih (hanya error `AuthContext` pre-existing), eslint 0 error, suite tetap 7/8 dengan 1 gagal pre-existing. **Belum** dilihat langsung di device setelah rebuild. |
| Pelajaran | **Pesan error menentukan jenis 404.** `Gagal (404)` = rute tidak ada (framework 404 tanpa envelope). `Data tidak ditemukan.` = rute ada, resource tidak ada/milik orang lain. Jangan samakan keduanya saat mendiagnosis. **Dan: cek endpoint ada di kontrak sebelum menuduh backend rusak.** Layar sudah memanggil endpoint yang tidak pernah ada di kontrak; yang salah bukan servernya. Perhatikan juga bahwa `MOBILE_API_Contract.md` belum mencantumkan `/mobile/dashboard`, `/mobile/snapshots`, dan `/mobile/emergency-contacts` yang sudah dipakai mobile — kontraknya perlu disinkronkan. |
| Log Keyword | Gagal memuat pengaturan kamera, ApiError Gagal 404, cameras/{id}/settings, endpoint tidak ada di kontrak, toggle tidak tersimpan |
| Deploy | Belum — perubahan JS-only, ikut bundle berikutnya. Backend perlu memutuskan apakah endpoint settings per kamera mau dibuat; kalau ya, mobile bisa memakainya lagi. |

### Fix #5 — Preview Camera Detail selalu menulis "Kamera tidak terhubung"

| | |
|---|---|
| Tanggal | 2026-09-22 |
| File | `src/screens/home/CameraDetailScreen.tsx`, `src/theme/styles.ts` |
| Masalah | Footer preview selalu bertuliskan "Kamera tidak terhubung" walau kamera online dan stream jalan. |
| Akar | Dua hal. (1) Teks itu **hardcoded** — tidak pernah membaca `camera.status`. Ia juga hanya akurat di jalur offline, kebetulan cocok. (2) `styles.preview` memakai `minHeight: 220` tanpa `height` tetap; `MjpegView` memakai tinggi eksplisit `100%`, dan induknya berada di dalam `ScrollView` (tinggi tak terbatas), jadi stream bisa melebar menutupi header/footer preview. |
| Fix | Teks footer diturunkan dari `camera.status` (`MEREKAM` / `LIVE` / `TIDAK TERHUBUNG`). Placeholder menjelaskan alasannya sendiri: "Sumber stream belum tersedia" saat online tanpa `stream_url`, "Kamera tidak terhubung" + "Terakhir aktif …" saat offline. `styles.preview` dikunci `height: 260` (bukan `minHeight`) supaya header, stream, dan footer terbagi rapi di dalam ScrollView. `paddingVertical` di `previewCenter` dihapus karena sudah tak diperlukan. |
| Verifikasi | ⚠️ **PENDING verifikasi visual** — `npx tsc --noEmit` bersih untuk file ini, eslint tidak menambah error baru (3 error yang tersisa pre-existing), dan test kontrak tetap lulus 5/5. Tetapi tampilan akhir di device **belum** dilihat. Perlu rebuild + buka Camera Detail, cek: footer menulis LIVE saat online, dan tinggi preview tidak meluber. |
| Pelajaran | Teks status harus **diturunkan dari data**, bukan ditulis tetap — teks hardcoded terlihat benar selama kebetulan cocok, lalu jadi kebohongan begitu kondisinya berubah. Dan di dalam `ScrollView`, `minHeight` pada container yang memuat komponen bertinggi `100%` (WebView/Image full-bleed) tidak cukup: pakai `height` tetap, karena `100%` pada induk bertinggi tak terbatas jadi tak terdefinisi. |
| Log Keyword | Kamera tidak terhubung, preview footer, hardcoded status text, MjpegView overflow, ScrollView minHeight, preview menutupi header |
| Deploy | Belum — perubahan JS-only, ikut bundle berikutnya. |

### Fix #4 — CameraDetail crash "Cannot read property 'length' of undefined"

| | |
|---|---|
| Tanggal | 2026-09-22 |
| File | `src/api.ts`, `src/screens/home/{CameraDetailScreen,LiveViewScreen,PlaybackScreen,TermsScreen}.tsx`, `__tests__/RecordingsApi.test.ts` |
| Masalah | Masuk halaman Camera Detail langsung crash. Error menunjuk `relatedRecordings.length` di bagian "Rekaman Terkait". Layar lain (snapshot, pengaturan kamera, Terms, Playback) juga ikut rusak dengan gejala berbeda. |
| Akar | `api()` **sudah** membuka envelope `{data, meta}` (src/api.ts:150-157) dan mengembalikan `data` saja. Tetapi belasan deklarasi endpoint masih bertipe `api<{ data: X; meta: … }>`, seolah envelope belum dibuka. Jadi hasilnya object `undefined`, dan `res.data` → `undefined` → `.length` meledak. Satu akar, banyak gejala. |
| Fix | Semua deklarasi `api<{ data: X }>` diubah jadi `api<X>` untuk endpoint **objek** (recordings.get, alerts.get, snapshots.create, cameras.getSettings/updateSettings, start/stopRecording, terms, forgotPassword, registerPushToken, enableBiometric, legacyAuthApi.me/updateProfile). Untuk endpoint **list** (recordings.list, snapshots.list), pindah ke `request()` + `unwrapList` — pola yang sudah dipakai `alertsApi.list` dan `camerasApi.list`. Call site di layar disesuaikan, plus guard `Array.isArray`. Helper mati `unwrapApiData` dihapus (duplikat logika envelope — sumber kebingungan itu sendiri). |
| Verifikasi | ✅ Terverifikasi — `__tests__/RecordingsApi.test.ts` memastikan list mengembalikan array langsung. `npx tsc --noEmit` justru yang menemukan 2 call site tersembunyi di `TermsScreen` (`response.data` pada `LegalDocument`) yang belum saya sadari. Suite penuh tetap 6/7 (satu gagal pre-existing, lihat di bawah). |
| Pelajaran | **`api()` mengembalikan payload dalam, bukan envelope.** Tulis `api<Recording>`, bukan `api<{data: Recording}>`. TypeScript TIDAK menangkap versi salah untuk endpoint objek — `res.data` bertipe `any`-ish sehingga baru meledak saat runtime. Untuk list, selalu `request()` + `unwrapList` + guard `Array.isArray` di call site: payload non-array tidak boleh sampai ke `.length`/`.map`. |
| Log Keyword | cannot read property length of undefined, CameraDetail crash, relatedRecordings, envelope, unwrapList, res.data undefined, Rekaman Terkait |
| Deploy | Belum — perubahan JS-only, ikut bundle berikutnya. |

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
