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

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Gagal', 'Email wajib diisi.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Gagal', 'Format email tidak valid.');
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      // Navigate to reset screen - code will be sent to email
      navigation.navigate('ResetPassword', { email: email.trim() });
    } catch (e) {
      Alert.alert('Gagal', (e as Error).message ?? 'Tidak dapat mengirim kode reset.');
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
            <Text style={authStyles.title}>Lupa Kata Sandi</Text>
            <Text style={authStyles.subtitle}>
              Masukkan email Anda. Kami akan mengirimkan kode untuk mereset kata sandi.
            </Text>
          </View>

          <View style={authStyles.form}>
            <FormField
              label="Email"
              icon="mail-outline"
              placeholder="nama@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
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
                <Text style={authStyles.primaryBtnText}>Kirim Kode</Text>
              )}
            </TouchableOpacity>

            <Text style={authStyles.termsText}>
              Kode reset akan dikirim ke email Anda dan berlaku selama 15 menit.
            </Text>
          </View>

          <View style={authStyles.footer}>
            <Text style={authStyles.footerText}>Sudah ingat kata sandi? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={authStyles.footerLink}>Masuk</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
