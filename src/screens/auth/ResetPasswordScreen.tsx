import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme';
import { authScreenStyles as styles } from '../../theme/styles';
import { Icon } from '../../components/Icon';
import { FormField } from '../../components/FormField';
import { formFieldStyles as authStyles } from '../../theme/styles';
import { authApi } from '../../api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!code.trim()) {
      Alert.alert('Gagal', 'Kode verifikasi wajib diisi.');
      return;
    }
    if (code.trim().length !== 6) {
      Alert.alert('Gagal', 'Kode verifikasi harus 6 digit.');
      return;
    }
    if (!password) {
      Alert.alert('Gagal', 'Kata sandi baru wajib diisi.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Gagal', 'Kata sandi minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Gagal', 'Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(email, code.trim(), password);
      Alert.alert(
        'Berhasil',
        'Kata sandi berhasil direset. Silakan masuk dengan kata sandi baru.',
        [{ text: 'Masuk', onPress: () => navigation.navigate('Login') }],
      );
    } catch (e) {
      Alert.alert('Gagal', (e as Error).message ?? 'Tidak dapat mereset kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={authStyles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={authStyles.container}>
          <TouchableOpacity
            style={authStyles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={12}
          >
            <Icon name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>

          <View style={[authStyles.brand, { marginTop: Spacing.sm }]}>
            <View style={authStyles.logo}>
              <Icon name="lock-reset" size={30} color={Colors.white} />
            </View>
            <Text style={authStyles.title}>Reset Kata Sandi</Text>
            <Text style={authStyles.subtitle}>
              Masukkan kode 6 digit yang telah dikirim ke email {email}
            </Text>
          </View>

          <View style={authStyles.form}>
            <FormField
              label="Kode Verifikasi"
              icon="pin"
              placeholder="6 digit kode"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />

            <FormField
              label="Kata Sandi Baru"
              icon="lock-outline"
              placeholder="Minimal 6 karakter"
              secureTextEntry={!showPass}
              autoComplete="password-new"
              value={password}
              onChangeText={setPassword}
            />

            <FormField
              label="Konfirmasi Kata Sandi"
              icon="lock-outline"
              placeholder="Ulangi kata sandi baru"
              secureTextEntry={!showPass}
              autoComplete="password-new"
              rightIcon={showPass ? 'visibility-off' : 'visibility'}
              onRightPress={() => setShowPass(s => !s)}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
              style={[authStyles.primaryBtn, loading && authStyles.btnDisabled]}
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={authStyles.primaryBtnText}>Reset Kata Sandi</Text>
              )}
            </TouchableOpacity>

            <Text style={authStyles.termsText}>
              Kode berlaku selama 15 menit.{' '}
              <Text
                style={authStyles.footerLink}
                onPress={() => navigation.goBack()}
              >
                Kirim ulang kode
              </Text>
            </Text>
          </View>

          <View style={authStyles.footer}>
            <Text style={authStyles.footerText}>Sudah ingat kata sandi? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={authStyles.footerLink}>Masuk</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
