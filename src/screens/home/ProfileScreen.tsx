import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme';
import { profileStyles as styles } from '../../theme/styles';
import { Icon, type IconName } from '../../components/Icon';
import { authApi, meApi, settingsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Settings'>;

export default function ProfileScreen(_props: Props) {
  const {
    user,
    signOut,
    updateUser,
    biometricAvailable,
    biometricType,
    biometricEnabled,
    enableBiometricLogin,
    disableBiometricLogin,
  } = useAuth();

  // Settings state
  const [pushNotif, setPushNotif] = useState(false);
  const [motionNotif, setMotionNotif] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Edit Profil
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Ganti Kata Sandi
  const [passOpen, setPassOpen] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passSaving, setPassSaving] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsApi.get();
        setPushNotif(response.data.push_enabled);
        setMotionNotif(response.data.motion_notifications);
      } catch (e) {
        console.warn('Gagal memuat settings', e);
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Toggle handlers
  const handlePushToggle = useCallback(async (value: boolean) => {
    setPushNotif(value);
    try {
      await settingsApi.update({ push_enabled: value });
    } catch (e) {
      setPushNotif(!value); // revert on error
      Alert.alert('Gagal', 'Tidak dapat memperbarui pengaturan.');
    }
  }, []);

  const handleMotionToggle = useCallback(async (value: boolean) => {
    setMotionNotif(value);
    try {
      await settingsApi.update({ motion_notifications: value });
    } catch (e) {
      setMotionNotif(!value);
      Alert.alert('Gagal', 'Tidak dapat memperbarui pengaturan.');
    }
  }, []);

  const handleBiometricToggle = useCallback(async (value: boolean) => {
    if (value) {
      // Enable biometric
      const success = await enableBiometricLogin();
      if (!success) {
        Alert.alert(
          'Gagal',
          `Tidak dapat mengaktifkan ${biometricType}. Pastikan Anda sudah login.`,
        );
        return;
      }
      Alert.alert('Berhasil', `${biometricType} berhasil diaktifkan.`);
    } else {
      // Disable biometric
      Alert.alert(
        'Nonaktifkan Biometrik',
        'Anda yakin ingin menonaktifkan login biometrik?',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Nonaktifkan',
            style: 'destructive',
            onPress: async () => {
              await disableBiometricLogin();
            },
          },
        ],
      );
    }
  }, [biometricType, enableBiometricLogin, disableBiometricLogin]);

  const confirmSignOut = () => {
    Alert.alert(
      'Keluar Akun',
      'Anda yakin ingin keluar dari aplikasi?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ],
    );
  };

  const openEdit = () => {
    setEditName(user?.name ?? '');
    setEditOpen(true);
  };

  const saveProfile = async () => {
    const name = editName.trim();
    if (!name) {
      Alert.alert('Nama wajib diisi');
      return;
    }
    setEditSaving(true);
    try {
      const response = await meApi.update({ full_name: name });
      // Convert Customer to legacy User format for updateUser
      const legacyUser = {
        id: response.data.id,
        name: response.data.full_name,
        email: response.data.email,
        role: response.data.status,
      };
      await updateUser(legacyUser);
      setEditOpen(false);
      Alert.alert('Berhasil', 'Profil berhasil diperbarui.');
    } catch (e) {
      Alert.alert('Gagal', (e as Error).message ?? 'Simpan profil gagal.');
    } finally {
      setEditSaving(false);
    }
  };

  const savePassword = async () => {
    if (!oldPass || !newPass || !confirmPass) {
      Alert.alert('Semua kolom wajib diisi');
      return;
    }
    if (newPass !== confirmPass) {
      Alert.alert('Konfirmasi kata sandi tidak cocok');
      return;
    }
    setPassSaving(true);
    try {
      await authApi.changePassword(oldPass, newPass);
      setPassOpen(false);
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
      Alert.alert('Berhasil', 'Kata sandi berhasil diubah.');
    } catch (e) {
      Alert.alert('Gagal', (e as Error).message ?? 'Ubah kata sandi gagal.');
    } finally {
      setPassSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profil</Text>

        {/* Kartu profil */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name ?? 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name ?? 'Pengguna'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? '-'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role ?? 'Pengguna'}</Text>
            </View>
          </View>
        </View>

        {/* Grup menu */}
        <Group title="Akun">
          <MenuItem
            icon="card-membership"
            label="Langganan Saya"
            onPress={() => _props.navigation.navigate('Subscription')}
          />
          <Divider />
          <MenuItem icon="edit" label="Edit Profil" onPress={openEdit} />
        </Group>

        <Group title="Umum">
          <MenuItem icon="badge" label="Kartu Identitas / Lisensi" />
          <Divider />
          <MenuItem icon="notifications-none" label="Preferensi Notifikasi" />
        </Group>

        <Group title="Keamanan">
          <MenuSwitch
            icon="push-pin"
            label="Notifikasi Push"
            value={pushNotif}
            onChange={handlePushToggle}
          />
          <Divider />
          <MenuSwitch
            icon="motion-photos-on"
            label="Alert Deteksi Gerakan"
            value={motionNotif}
            onChange={handleMotionToggle}
          />
          <Divider />
          <MenuSwitch
            icon="fingerprint"
            label={`Masuk dengan ${biometricType}`}
            value={biometricEnabled}
            onChange={handleBiometricToggle}
          />
          <Divider />
          <MenuItem
            icon="lock-reset"
            label="Ganti Kata Sandi"
            onPress={() => setPassOpen(true)}
          />
        </Group>

        <Group title="Bantuan & Tentang">
          <MenuItem
            icon="help-outline"
            label="Pusat Bantuan"
            onPress={() => _props.navigation.navigate('Help', {})}
          />
          <Divider />
          <MenuItem
            icon="article"
            label="Syarat & Ketentuan"
            onPress={() => _props.navigation.navigate('Terms')}
          />
          <Divider />
          <MenuItem icon="info-outline" label="Tentang Aplikasi" value="v1.0.0" />
        </Group>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={confirmSignOut}
          activeOpacity={0.8}
        >
          <Icon name="logout" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Keluar Akun</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Nayaka CCTV · v1.0.0</Text>
      </ScrollView>

      {/* Modal Edit Profil */}
      <Modal
        visible={editOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!editSaving) setEditOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profil</Text>
            <Field
              label="Nama"
              placeholder="Nama lengkap"
              value={editName}
              onChangeText={setEditName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setEditOpen(false)}
                disabled={editSaving}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalPrimary]}
                onPress={saveProfile}
                disabled={editSaving}
              >
                {editSaving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalPrimaryText}>Simpan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Ganti Kata Sandi */}
      <Modal
        visible={passOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!passSaving) setPassOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ganti Kata Sandi</Text>
            <Field
              label="Kata sandi lama"
              placeholder="Masukkan kata sandi lama"
              secureTextEntry={!showPass}
              value={oldPass}
              onChangeText={setOldPass}
            />
            <Field
              label="Kata sandi baru"
              placeholder="Minimal 6 karakter"
              secureTextEntry={!showPass}
              value={newPass}
              onChangeText={setNewPass}
            />
            <Field
              label="Ulangi kata sandi baru"
              placeholder="Ulangi kata sandi baru"
              secureTextEntry={!showPass}
              value={confirmPass}
              onChangeText={setConfirmPass}
            />
            <TouchableOpacity
              style={styles.showPassRow}
              onPress={() => setShowPass(s => !s)}
            >
              <Icon
                name={showPass ? 'visibility-off' : 'visibility'}
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.showPassText}>
                {showPass ? 'Sembunyikan' : 'Tampilkan'} kata sandi
              </Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setPassOpen(false)}
                disabled={passSaving}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalPrimary]}
                onPress={savePassword}
                disabled={passSaving}
              >
                {passSaving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalPrimaryText}>Simpan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldBox}>
        <TextInput
          placeholderTextColor="#94A3B8"
          style={styles.fieldInput}
          autoCapitalize="none"
          {...rest}
        />
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function MenuItem({
  icon,
  label,
  value,
  onPress,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress ?? (() => Alert.alert('Info', `Menu "${label}" (dummy).`))}
      activeOpacity={0.7}
    >
      <View style={styles.menuIcon}>
        <Icon name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      <Icon name="chevron-right" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

function MenuSwitch({
  icon,
  label,
  value,
  onChange,
}: {
  icon: IconName;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.menuItem}>
      <View style={styles.menuIcon}>
        <Icon name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: Colors.primarySoft, false: Colors.border }}
        thumbColor={value ? Colors.primary : Colors.surface}
      />
    </View>
  );
}

