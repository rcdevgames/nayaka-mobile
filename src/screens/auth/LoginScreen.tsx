import React from 'react';
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
import { Colors } from '../../theme';
import { authScreenStyles as styles } from '../../theme/styles';
import { Icon } from '../../components/Icon';
import { FormField, styles as authStyles } from '../../components/FormField';
import { useAuth } from '../../context/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { signIn, signInWithBiometric, biometricEnabled, biometricType } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPass, setShowPass] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Gagal Masuk', 'Email dan kata sandi wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      Alert.alert('Gagal Masuk', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onBiometric = async () => {
    setLoading(true);
    try {
      const success = await signInWithBiometric();
      if (!success) {
        Alert.alert(
          'Gagal',
          `Tidak dapat masuk dengan ${biometricType}. Pastikan biometrik sudah diaktifkan di pengaturan.`,
        );
      }
    } catch (e) {
      Alert.alert('Gagal', (e as Error).message);
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
          <View style={authStyles.brand}>
            <View style={authStyles.logo}>
              <Icon name="videocam" size={30} color={Colors.white} />
            </View>
            <Text style={authStyles.title}>Nayaka CCTV</Text>
            <Text style={authStyles.subtitle}>
              Pantau keamanan properti Anda dari mana saja, kapan saja.
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
            <FormField
              label="Kata Sandi"
              icon="lock-outline"
              placeholder="Masukkan kata sandi"
              secureTextEntry={!showPass}
              autoComplete="password"
              rightIcon={showPass ? 'visibility-off' : 'visibility'}
              onRightPress={() => setShowPass(s => !s)}
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={authStyles.linkRow}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={authStyles.link}>Lupa kata sandi?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[authStyles.primaryBtn, loading && authStyles.btnDisabled]}
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={authStyles.primaryBtnText}>Masuk</Text>
              )}
            </TouchableOpacity>

            {/* Biometric Login Button */}
            {biometricEnabled && (
              <>
                <View style={authStyles.dividerRow}>
                  <View style={authStyles.dividerLine} />
                  <Text style={authStyles.dividerText}>atau</Text>
                  <View style={authStyles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[authStyles.googleBtn, loading && authStyles.btnDisabled]}
                  onPress={onBiometric}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.text} />
                  ) : (
                    <>
                      <Icon name="fingerprint" size={24} color={Colors.primary} />
                      <Text style={authStyles.googleBtnText}>
                        Masuk dengan {biometricType}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={authStyles.footer}>
            <Text style={authStyles.footerText}>Belum punya akun? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={authStyles.footerLink}>Daftar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
