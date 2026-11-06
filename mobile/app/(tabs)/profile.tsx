import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import client from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import * as SecureStore from 'expo-secure-store';

interface ProfileData {
  id: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  status: string;
  type?: string | null;
  ageGroup?: string | null;
  profilePicture?: string | null;
  coverPhoto?: string | null;
  bio?: string | null;
  favoriteVerse?: string | null;
  createdAt?: string | null;
  ministries?: { id: number; name: string; role: string }[];
}

export default function MeScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  // Biometric settings
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnabled, setBioEnabledState] = useState(false);

  // Edit Profile Modal
  const [editOpen, setEditOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [favoriteVerse, setFavoriteVerse] = useState('');
  const [saving, setSaving] = useState(false);

  // Settings & Account Modal
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await client.get('/profile');
      const payload = data?.data || data;
      if (payload?.user) {
        setProfile({
          ...payload.user,
          createdAt: payload.user.createdAt || payload.user.joinDate,
        });
        setFirstName(payload.user.firstName || '');
        setLastName(payload.user.lastName || '');
        setPhone(payload.user.phone || '');
        setFavoriteVerse(payload.user.favoriteVerse || '');
      }
    } catch {
      // Fallback to AuthContext user
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
    (async () => {
      try {
        const val = await SecureStore.getItemAsync('hgf_biometric_enabled');
        setBioSupported(true);
        setBioEnabledState(val === 'true');
      } catch {
        setBioSupported(false);
      }
    })();
  }, [loadProfile]);

  const handleToggleBiometric = async (nextVal: boolean) => {
    await SecureStore.setItemAsync('hgf_biometric_enabled', nextVal ? 'true' : 'false');
    setBioEnabledState(nextVal);
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setAlertModal({
        visible: true,
        type: 'warning',
        title: 'Name Required',
        message: 'First name and last name cannot be empty.',
      });
      return;
    }
    setSaving(true);
    try {
      await client.patch('/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        favoriteVerse: favoriteVerse.trim(),
      });
      await updateUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        phone: phone.trim(),
        favoriteVerse: favoriteVerse.trim(),
      });
      await loadProfile();
      setEditOpen(false);
      setAlertModal({
        visible: true,
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been saved.',
      });
    } catch (err: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Update Failed',
        message: err?.response?.data?.error || 'Could not update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await client.delete('/account');
      setConfirmDelete(false);
      setSettingsOpen(false);
      await logout();
      router.replace('/login');
    } catch (err: any) {
      setConfirmDelete(false);
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Deletion Failed',
        message: err?.response?.data?.error || 'Unable to delete account right now.',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.guestWrap}>
        <View style={styles.guestCard}>
          <Text style={{ fontSize: 44, marginBottom: 10 }}>👤</Text>
          <Text style={styles.guestTitle}>Sign In to HGF Connect</Text>
          <Text style={styles.guestSubtitle}>
            Access your church profile, ministries, devotionals, prayer requests, and StewardShop listings.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.primaryBtnText}>🔑 Login to Account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => router.push('/register')}
          >
            <Text style={styles.outlineBtnText}>Create New Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayFirst = profile?.firstName || user.firstName || user.fullName?.split(' ')[0] || 'Member';
  const displayLast = profile?.lastName || user.lastName || '';
  const initials = `${displayFirst?.[0] || 'M'}${displayLast?.[0] || ''}`.toUpperCase();
  const avatarUrl = profile?.profilePicture || user.profilePicture || null;
  const fullAvatarUrl =
    avatarUrl && avatarUrl.startsWith('http')
      ? avatarUrl
      : avatarUrl
      ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${avatarUrl.replace(/^\/uploads\/(avatars|profile_pictures)\//, '')}`
      : null;

  const MENU_ITEMS = [
    { icon: '👤', label: 'Edit Profile', onPress: () => setEditOpen(true) },
    {
      icon: '🔔',
      label: 'Notifications',
      onPress: () =>
        setAlertModal({
          visible: true,
          type: 'info',
          title: 'Notifications',
          message: 'You are up to date with all community notifications.',
        }),
    },
    { icon: '📖', label: 'My Grace Blog', onPress: () => router.push('/church?tab=devo' as any) },
    { icon: '🙏', label: 'My Prayer Requests', onPress: () => router.push('/(tabs)/prayer') },
    { icon: '🤝', label: 'My Listings', onPress: () => router.push('/(tabs)/stewardshop') },
    { icon: '🛡️', label: 'Privacy Policy', onPress: () => router.push('/privacy' as any) },
    { icon: '📄', label: 'Terms of Use', onPress: () => router.push('/terms' as any) },
    { icon: '⚙️', label: 'Settings & Account', onPress: () => setSettingsOpen(true) },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Cover Banner (app/(app)/me/page.tsx) */}
      <View style={styles.coverBanner} />

      <View style={styles.bodyWrap}>
        {/* Main Profile Card overlapping cover */}
        <View style={styles.profileCard}>
          <View style={styles.avatarHeaderRow}>
            <View style={styles.avatarCircle}>
              {fullAvatarUrl ? (
                <Image source={{ uri: fullAvatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>
                {displayFirst} {displayLast}
              </Text>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>
                  {(profile?.role || user.role || 'member').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {loading && <ActivityIndicator size="small" color="#4EB1CB" style={{ marginTop: 8 }} />}

          <View style={styles.metaList}>
            {profile?.createdAt ? (
              <Text style={styles.memberSinceText}>
                📅 Member since{' '}
                {new Date(profile.createdAt).toLocaleDateString('en-PH', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            ) : null}

            {profile?.favoriteVerse ? (
              <View style={styles.favVerseBox}>
                <Text style={styles.favVerseText}>📖 {profile.favoriteVerse}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Ministries Card */}
        {profile?.ministries && profile.ministries.length > 0 && (
          <View style={styles.ministriesCard}>
            <Text style={styles.ministriesHeader}>🤲 MY MINISTRIES</Text>
            <View style={styles.ministriesPillsWrap}>
              {profile.ministries.map((m) => (
                <View key={m.id} style={styles.ministryPill}>
                  <Text style={styles.ministryPillText}>{m.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* View Public Profile Button */}
        <TouchableOpacity
          style={styles.viewFullProfileBtn}
          onPress={() => router.push(`/member/${user.id}` as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.viewFullProfileText}>👁 View My Full Profile</Text>
        </TouchableOpacity>

        {/* Menu List Card */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuRow,
                idx < MENU_ITEMS.length - 1 && styles.menuRowBorder,
              ]}
              onPress={item.onPress}
              activeOpacity={0.75}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          ))}

          {(user.role === 'admin' || user.role === 'moderator') && (
            <TouchableOpacity
              style={[styles.menuRow, { borderTopWidth: 1, borderTopColor: '#f8fafc' }]}
              onPress={() =>
                setAlertModal({
                  visible: true,
                  type: 'info',
                  title: 'Admin Panel',
                  message: 'All members are currently approved and active.',
                })
              }
            >
              <Text style={styles.menuIcon}>🛡️</Text>
              <Text style={[styles.menuLabel, { color: '#4EB1CB', fontWeight: '700' }]}>
                Admin Panel
              </Text>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() => setConfirmLogout(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.signOutBtnText}>🚪 Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={editOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>👤 Edit Profile</Text>
            <Text style={styles.fieldLabel}>First Name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First Name"
            />
            <Text style={styles.fieldLabel}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last Name"
            />
            <Text style={styles.fieldLabel}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="09XX XXX XXXX"
              keyboardType="phone-pad"
            />
            <Text style={styles.fieldLabel}>Favorite Bible Verse</Text>
            <TextInput
              style={styles.input}
              value={favoriteVerse}
              onChangeText={setFavoriteVerse}
              placeholder="e.g. Psalm 23:1"
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.outlineBtn, { flex: 1, marginTop: 0 }]}
                onPress={() => setEditOpen(false)}
              >
                <Text style={styles.outlineBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 2 }]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                <Text style={styles.primaryBtnText}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings & Account Modal */}
      <Modal
        visible={settingsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>⚙️ Settings & Account</Text>
            {bioSupported && (
              <View style={styles.bioSwitchRow}>
                <Text style={styles.menuLabel}>Face ID / Biometric Unlock</Text>
                <Switch
                  value={bioEnabled}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ false: '#cbd5e1', true: '#4EB1CB' }}
                />
              </View>
            )}
            <TouchableOpacity
              style={styles.deleteAccountBtn}
              onPress={() => setConfirmDelete(true)}
            >
              <Text style={styles.deleteAccountText}>🗑️ Delete My Account Permanently</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.outlineBtn, { marginTop: 12 }]}
              onPress={() => setSettingsOpen(false)}
            >
              <Text style={styles.outlineBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmLogout}
        title="Sign Out?"
        message="Are you sure you want to sign out of your HGF Connect account?"
        confirmText="Sign Out"
        onConfirm={async () => {
          setConfirmLogout(false);
          await logout();
        }}
        onCancel={() => setConfirmLogout(false)}
      />

      <ConfirmModal
        visible={confirmDelete}
        title="Delete Account Permanently?"
        message="This will permanently remove your HGF Connect account and personal data. This action cannot be undone."
        confirmText="Delete Forever"
        destructive
        loading={deleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />

      <AlertPromptModal
        visible={alertModal.visible}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingBottom: 40 },
  coverBanner: {
    backgroundColor: '#2b8da6',
    height: 105,
  },
  bodyWrap: {
    paddingHorizontal: 14,
    marginTop: -40,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4EB1CB',
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -44,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 22,
  },
  memberName: {
    fontWeight: '800',
    fontSize: 18,
    color: '#111827',
  },
  rolePill: {
    backgroundColor: '#e0f7fb',
    borderRadius: 99,
    paddingVertical: 2,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  rolePillText: {
    fontSize: 11,
    color: '#4EB1CB',
    fontWeight: '700',
  },
  metaList: {
    gap: 6,
  },
  memberSinceText: {
    fontSize: 13,
    color: '#6b7280',
  },
  favVerseBox: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 3,
    borderLeftColor: '#4EB1CB',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  favVerseText: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: '#1a5276',
  },

  // Ministries Card
  ministriesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  ministriesHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  ministriesPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ministryPill: {
    backgroundColor: '#e0f7fb',
    borderRadius: 99,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  ministryPillText: {
    color: '#1a7a94',
    fontSize: 13,
    fontWeight: '700',
  },

  // View Full Profile Button
  viewFullProfileBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#4EB1CB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  viewFullProfileText: {
    color: '#4EB1CB',
    fontWeight: '700',
    fontSize: 14,
  },

  // Menu Card
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  menuIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  menuLabel: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  menuChevron: {
    color: '#d1d5db',
    fontSize: 18,
  },

  // Sign Out Button
  signOutBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutBtnText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 14.5,
  },

  // Guest Fallback
  guestWrap: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    justifyContent: 'center',
  },
  guestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  guestTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  guestSubtitle: {
    fontSize: 13.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: '#4EB1CB',
    width: '100%',
    paddingVertical: 13,
    borderRadius: 99,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  outlineBtn: {
    marginTop: 10,
    width: '100%',
    paddingVertical: 13,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  outlineBtnText: { color: '#334155', fontWeight: '700', fontSize: 14 },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  bioSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  deleteAccountBtn: {
    marginTop: 14,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  deleteAccountText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 13.5,
  },
});
