import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme';
import { authScreenStyles as styles } from '../../theme/styles';
import { Icon } from '../../components/Icon';
import { FormField, styles as authStyles } from '../../components/FormField';
import { useAuth } from '../../context/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [showPass, setShowPass] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Gagal Daftar', 'Semua kolom wajib diisi.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Gagal Daftar', 'Konfirmasi kata sandi tidak cocok.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Gagal Daftar', 'Kata sandi minimal 8 karakter.');
      return;
    }
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
    } catch (e) {
      Alert.alert('Gagal Daftar', (e as Error).message);
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
        <ScrollView contentContainerStyle={authStyles.container}>
          <TouchableOpacity
            style={authStyles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={12}
          >
            <Icon name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>

          <View style={[authStyles.brand, { marginTop: Spacing.sm }]}>
            <Text style={authStyles.title}>Buat Akun Baru</Text>
            <Text style={authStyles.subtitle}>
              Daftar untuk mulai memantau kamera CCTV Anda.
            </Text>
          </View>

          <View style={authStyles.form}>
            <FormField
              label="Nama Lengkap"
              icon="person-outline"
              placeholder="Nama Anda"
              value={name}
              onChangeText={setName}
            />
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
              placeholder="Minimal 8 karakter"
              secureTextEntry={!showPass}
              autoComplete="new-password"
              rightIcon={showPass ? 'visibility-off' : 'visibility'}
              onRightPress={() => setShowPass(s => !s)}
              value={password}
              onChangeText={setPassword}
            />
            <FormField
              label="Konfirmasi Kata Sandi"
              icon="lock-outline"
              placeholder="Ulangi kata sandi"
              secureTextEntry={!showPass}
              autoComplete="new-password"
              value={confirm}
              onChangeText={setConfirm}
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
                <Text style={authStyles.primaryBtnText}>Daftar</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={authStyles.footer}>
            <Text style={authStyles.footerText}>Sudah punya akun? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={authStyles.footerLink}>Masuk</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
