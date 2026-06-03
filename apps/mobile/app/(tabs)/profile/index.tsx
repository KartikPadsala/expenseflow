import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Edit2, LogOut, X, Camera, CheckCircle, AlertCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useProfile, useUpdateProfile } from '../../../hooks/use-profile';
import { useAuthStore } from '../../../store/auth.store';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { LoadingState } from '../../../components/ui/LoadingState';
import api from '../../../lib/api';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'CNY', 'CHF', 'MXN'];
const LANGUAGES = ['en', 'fr', 'es', 'de', 'pt', 'hi', 'gu'];
const LANGUAGE_LABELS: Record<string, string> = { en: 'English', fr: 'French', es: 'Spanish', de: 'German', pt: 'Portuguese', hi: 'Hindi', gu: 'Gujarati' };

const editSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50),
  defaultCurrency: z.string().length(3, 'Must be 3-letter currency code'),
  language: z.string().min(2).max(5),
  timezone: z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

export default function ProfileScreen() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [showEdit, setShowEdit] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const profile = useProfile();
  const { mutate: updateProfile, isPending: saving } = useUpdateProfile();

  const profileData = profile.data ?? user;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      displayName: profileData?.displayName ?? '',
      defaultCurrency: profileData?.defaultCurrency ?? 'USD',
      language: (profileData as any)?.language ?? 'en',
      timezone: (profileData as any)?.timezone ?? 'UTC',
    },
  });

  const openEditModal = () => {
    reset({
      displayName: profileData?.displayName ?? '',
      defaultCurrency: profileData?.defaultCurrency ?? 'USD',
      language: (profileData as any)?.language ?? 'en',
      timezone: (profileData as any)?.timezone ?? 'UTC',
    });
    setShowEdit(true);
  };

  const onSave = (data: EditForm) => {
    updateProfile(data, {
      onSuccess: () => setShowEdit(false),
      onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Could not update profile'),
    });
  };

  const handleAvatarUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to upload an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      const fileName = asset.uri.split('/').pop() ?? 'avatar.jpg';
      const mimeType = asset.mimeType ?? 'image/jpeg';
      formData.append('avatar', { uri: asset.uri, name: fileName, type: mimeType } as any);
      await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      profile.refetch();
    } catch (err: any) {
      Alert.alert('Upload failed', err?.response?.data?.message ?? 'Could not upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (profile.isLoading && !user) return <LoadingState fullScreen />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={openEditModal} style={styles.editBtn}>
          <Edit2 size={18} color="#22c55e" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleAvatarUpload} disabled={uploadingAvatar} style={styles.avatarWrapper}>
            <Avatar name={profileData?.displayName} uri={profileData?.avatarUrl} size="xl" />
            <View style={styles.cameraOverlay}>
              <Camera size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{profileData?.displayName ?? 'User'}</Text>
          <Text style={styles.profileUsername}>@{profileData?.username ?? ''}</Text>
          <View style={styles.verifyBadge}>
            {(profileData as any)?.isEmailVerified ? (
              <>
                <CheckCircle size={13} color="#16a34a" />
                <Text style={styles.verifyText}>Email verified</Text>
              </>
            ) : (
              <>
                <AlertCircle size={13} color="#ca8a04" />
                <Text style={[styles.verifyText, styles.verifyTextWarn]}>Email not verified</Text>
              </>
            )}
          </View>
        </View>

        {/* Profile info */}
        <Card>
          <InfoRow label="Email" value={profileData?.email ?? '-'} />
          <InfoRow label="Currency" value={profileData?.defaultCurrency ?? 'USD'} />
          <InfoRow label="Language" value={LANGUAGE_LABELS[(profileData as any)?.language ?? 'en'] ?? (profileData as any)?.language ?? 'English'} />
          {(profileData as any)?.timezone && <InfoRow label="Timezone" value={(profileData as any).timezone} last />}
        </Card>

        {/* Account actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Card noPadding>
            <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
              <LogOut size={18} color="#ef4444" />
              <Text style={[styles.actionText, styles.actionTextDanger]}>Sign Out</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEdit(false)}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Controller
                control={control}
                name="displayName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Display Name"
                    placeholder="Your name"
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                    error={errors.displayName?.message}
                  />
                )}
              />

              <View style={styles.selectGroup}>
                <Text style={styles.selectLabel}>Default Currency</Text>
                <Controller
                  control={control}
                  name="defaultCurrency"
                  render={({ field: { onChange, value } }) => (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
                      {CURRENCIES.map((c) => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => onChange(c)}
                          style={[styles.pill, value === c && styles.pillActive]}
                        >
                          <Text style={[styles.pillText, value === c && styles.pillTextActive]}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                />
              </View>

              <View style={styles.selectGroup}>
                <Text style={styles.selectLabel}>Language</Text>
                <Controller
                  control={control}
                  name="language"
                  render={({ field: { onChange, value } }) => (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
                      {LANGUAGES.map((l) => (
                        <TouchableOpacity
                          key={l}
                          onPress={() => onChange(l)}
                          style={[styles.pill, value === l && styles.pillActive]}
                        >
                          <Text style={[styles.pillText, value === l && styles.pillTextActive]}>
                            {LANGUAGE_LABELS[l]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                />
              </View>

              <Controller
                control={control}
                name="timezone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Timezone (optional)"
                    placeholder="e.g. America/New_York"
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                  />
                )}
              />

              <Button onPress={handleSubmit(onSave)} loading={saving} fullWidth style={styles.saveBtn}>
                Save Changes
              </Button>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[infoStyles.row, !last && infoStyles.rowBorder]}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}
const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { fontSize: 14, color: '#6b7280' },
  value: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 1, textAlign: 'right' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  editBtn: { padding: 8 },
  content: { padding: 16, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  avatarWrapper: { position: 'relative', marginBottom: 8 },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#22c55e',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileName: { fontSize: 22, fontWeight: '700', color: '#111827' },
  profileUsername: { fontSize: 14, color: '#6b7280' },
  verifyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  verifyText: { fontSize: 12, color: '#16a34a', fontWeight: '500' },
  verifyTextWarn: { color: '#ca8a04' },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  actionText: { fontSize: 15, fontWeight: '500', color: '#111827' },
  actionTextDanger: { color: '#ef4444' },
  modal: { flex: 1, backgroundColor: '#ffffff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalContent: { padding: 20, gap: 16, paddingBottom: 40 },
  selectGroup: { gap: 8 },
  selectLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f3f4f6' },
  pillActive: { backgroundColor: '#dcfce7' },
  pillText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  pillTextActive: { color: '#16a34a', fontWeight: '600' },
  saveBtn: { marginTop: 8 },
});
