import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

/**
 * Web Client ID dari Google Cloud Console (OAuth client ID tipe "Web").
 *
 * CARA SETUP (sekali saja, wajib manual oleh developer):
 * 1. Buka https://console.cloud.google.com → buat project (mis. "Nayaka CCTV")
 * 2. "APIs & Services" → "OAuth consent screen" → pilih External → lengkapi.
 * 3. "Credentials" → "Create Credentials" → "OAuth client ID":
 *    a. Type: Android  → Package name: com.nayakacctv
 *       SHA-1: jalankan `cd android && ./gradlew signingReport`
 *       (ambil SHA1 baris "debug" / "androiddebugkey"). Tanpa ini muncul
 *       error DEVELOPER_ERROR (10) saat sign-in.
 *    b. Type: Web → beri nama bebas → salin "Client ID"-nya ke bawah.
 * 4. Set GOOGLE_WEB_CLIENT_ID di bawah (nilai dari langkah 3b).
 * 5. Server: set env GOOGLE_CLIENT_ID ke nilai yang SAMA (3b).
 *
 * idToken yang dihasilkan punya `aud` = web client id ini; server mencocokkan
 * lewat GOOGLE_CLIENT_ID.
 */
export const GOOGLE_WEB_CLIENT_ID =
  'xxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com';

export const GOOGLE_IS_CONFIGURED = !/^xxxxxxxx-/.test(GOOGLE_WEB_CLIENT_ID);

export function configureGoogleSignin() {
  if (!GOOGLE_IS_CONFIGURED) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
}
/**
 * Minta user memilih akun Google, kembalikan ID token.
 * Melempar Error dengan pesan yang bisa langsung ditampilkan.
 */
export async function requestGoogleIdToken(): Promise<string> {
  if (!GOOGLE_IS_CONFIGURED) {
    throw new Error(
      'Google Sign-In belum dikonfigurasi. Isi GOOGLE_WEB_CLIENT_ID di src/auth/google.ts',
    );
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (res.type !== 'success') throw new Error('Login Google dibatalkan.');
    const idToken = res.data.idToken;
    if (!idToken) throw new Error('Gagal mendapatkan token Google. Coba lagi.');
    return idToken;
  } catch (e: any) {
    if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services tidak tersedia di perangkat ini.');
    }
    if (e?.code === statusCodes.IN_PROGRESS) {
      throw new Error('Login Google sedang berlangsung. Tunggu sebentar.');
    }
    throw e;
  }
}
