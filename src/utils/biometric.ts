/**
 * Biometric Auth Utility
 * Uses react-native-keychain to store tokens with biometric protection
 */

import * as Keychain from 'react-native-keychain';

const BIOMETRIC_SERVICE = 'nayaka_cctv_biometric';
const BIOMETRIC_USERNAME = 'biometric_token';

// Store token with biometric protection
export async function enableBiometric(token: string): Promise<boolean> {
  try {
    await Keychain.setGenericPassword(BIOMETRIC_USERNAME, token, {
      service: BIOMETRIC_SERVICE,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
      accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    });
    return true;
  } catch (error) {
    console.error('Failed to enable biometric:', error);
    return false;
  }
}

// Disable biometric (remove stored token)
export async function disableBiometric(): Promise<boolean> {
  try {
    await Keychain.resetGenericPassword({ service: BIOMETRIC_SERVICE });
    return true;
  } catch (error) {
    console.error('Failed to disable biometric:', error);
    return false;
  }
}

// Get token via biometric (will prompt fingerprint/face)
export async function getBiometricToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: BIOMETRIC_SERVICE,
      authenticationPrompt: {
        title: 'Verifikasi Biometrik',
        subtitle: 'Gunakan sidik jari atau Face ID untuk masuk',
        cancel: 'Batal',
      },
    });

    if (credentials) {
      return credentials.password;
    }
    return null;
  } catch (error) {
    console.error('Failed to get biometric token:', error);
    return null;
  }
}

// Check if biometric is available and enrolled
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const biometryType = await Keychain.getSupportedBiometryType();
    return biometryType !== null;
  } catch (error) {
    console.error('Failed to check biometric availability:', error);
    return false;
  }
}

// Get biometry type name
export async function getBiometryTypeName(): Promise<string> {
  try {
    const biometryType = await Keychain.getSupportedBiometryType();
    switch (biometryType) {
      case Keychain.BIOMETRY_TYPE.FACE_ID:
        return 'Face ID';
      case Keychain.BIOMETRY_TYPE.TOUCH_ID:
        return 'Touch ID';
      case Keychain.BIOMETRY_TYPE.FINGERPRINT:
        return 'Sidik Jari';
      case Keychain.BIOMETRY_TYPE.IRIS:
        return 'Iris';
      default:
        return 'Biometrik';
    }
  } catch (error) {
    return 'Biometrik';
  }
}

// Check if biometric is set up (has stored token)
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: BIOMETRIC_SERVICE,
    });
    return credentials !== false;
  } catch (error) {
    return false;
  }
}
