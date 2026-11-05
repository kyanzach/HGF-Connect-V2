import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import client from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { triggerLocalNotification } from '@/services/notificationService';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editing, setEditing] = useState(false);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [favoriteVerse, setFavoriteVerse] = useState(user?.favoriteVerse || '');
  const [stats, setStats] = useState({ posts: 0, prayers: 0, attendance: 0 });

  // Apple Guideline 5.1.1(v) & Google Play Data Deletion
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertModal({ visible: true, type, title, message });
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    client
      .get('/profile')
      .then((res) => {
        if (res.data?.success && res.data.data?.user) {
          const u = res.data.data.user;
          setFirstName(u.firstName || '');
          setLastName(u.lastName || '');
          setEmail(u.email || '');
          setPhone(u.phone || '');
          setFavoriteVerse(u.favoriteVerse || '');
          if (u.stats) setStats(u.stats);
          updateUser({
            firstName: u.firstName,
            lastName: u.lastName,
            fullName: u.fullName,
            status: u.status,
            role: u.role,
            profilePicture: u.profilePicture,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const openLegal = async (path: string) => {
    const url = `https://connect.houseofgrace.ph${path}`;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Linking.openURL(url).catch(() => {});
    }
  };

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert(
        'warning',
        'Permission Required',
        'Please allow photo library access to update your profile photo.'
      );
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!res.canceled && res.assets && res.assets.length > 0) {
      setUploadingPhoto(true);
      try {
        const uri = res.assets[0].uri;
        const fd = new FormData();
        const fileName = uri.split('/').pop() || 'avatar.jpg';
        fd.append('photo', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          name: fileName,
          type: 'image/jpeg',
        } as any);

        const uploadRes = await client.post('/profile/photo', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (uploadRes.data?.success && uploadRes.data.data?.profilePicture) {
          await updateUser({ profilePicture: uploadRes.data.data.profilePicture });
          showAlert('success', 'Photo Updated', 'Your profile photo has been updated.');
        }
      } catch {
        showAlert('error', 'Upload Failed', 'Unable to upload photo right now.');
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showAlert('warning', 'Name Required', 'Please enter both your first and last name.');
      return;
    }
    setSaving(true);
    try {
      const res = await client.put('/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        favoriteVerse: favoriteVerse.trim(),
      });
      if (res.data?.success) {
        await updateUser({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName: `${firstName.trim()} ${lastName.trim()}`,
          email: email.trim(),
          phone: phone.trim(),
          favoriteVerse: favoriteVerse.trim(),
        });
        setEditing(false);
        showAlert('success', 'Profile Saved', 'Your profile details have been updated.');
      }
    } catch {
      showAlert('error', 'Save Failed', 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await client.post('/profile/delete-account');
      setDeleteModalOpen(false);
      await logout();
    } catch {
      setDeleteModalOpen(false);
      showAlert('error', 'Deletion Failed', 'Could not delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <ScrollView contentContainerStyle={styles.guestWrap}>
        <View style={styles.guestCard}>
          <View style={styles.guestIconCircle}>
            <FontAwesome name="user-o" size={32} color="#0e7490" />
          </View>
          <Text style={styles.guestTitle}>Member Profile &amp; Account</Text>
          <Text style={styles.guestSub}>
            Sign in to view your church profile, ministries, prayer requests, and notification settings.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/login' as any)}
          >
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.primaryBtnText}>
              Sign In to HGF Connect
            </Text>
          </TouchableOpacity>

          <View style={styles.legalSection}>
            <TouchableOpacity style={styles.legalRow} onPress={() => openLegal('/privacy')}>
              <FontAwesome name="shield" size={15} color="#0e7490" />
              <Text style={styles.legalRowText}>Privacy Policy</Text>
              <FontAwesome name="angle-right" size={16} color="#94a3b8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.legalRow} onPress={() => openLegal('/terms')}>
              <FontAwesome name="file-text-o" size={14} color="#0e7490" />
              <Text style={styles.legalRowText}>Terms of Use &amp; Community EULA</Text>
              <FontAwesome name="angle-right" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.profileCard}>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={handlePickPhoto}
          disabled={uploadingPhoto}
        >
          {uploadingPhoto ? (
            <ActivityIndicator size="small" color="#4EB1CB" />
          ) : user.profilePicture ? (
            <Image source={{ uri: user.profilePicture }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarInitials}>
              {(user.firstName?.[0] || 'M').toUpperCase()}
            </Text>
          )}
          <View style={styles.cameraBadge}>
            <FontAwesome name="camera" size={10} color="#ffffff" />
          </View>
        </TouchableOpacity>

        <Text style={styles.fullName}>{user.fullName}</Text>
        <View style={styles.statusRow}>
          <View style={styles.activeBadge}>
            <FontAwesome name="check-circle" size={12} color="#059669" />
            <Text style={styles.activeBadgeText}>Active HGF Member</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.attendance}</Text>
            <Text style={styles.statLabel}>Visits</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.posts}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.prayers}</Text>
            <Text style={styles.statLabel}>Prayers</Text>
          </View>
        </View>
      </View>

      {/* Edit Profile Form */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <TouchableOpacity onPress={() => setEditing((v) => !v)}>
            <Text style={styles.editLink}>{editing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {editing ? (
          <View>
            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />
            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
            <Text style={styles.inputLabel}>Mobile Number</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} />
            <Text style={styles.inputLabel}>Favorite Bible Verse</Text>
            <TextInput
              style={[styles.input, { minHeight: 70 }]}
              multiline
              value={favoriteVerse}
              onChangeText={setFavoriteVerse}
            />
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              <Text numberOfLines={1} style={styles.primaryBtnText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.infoList}>
            <Text style={styles.infoLine}>
              <Text style={styles.infoKey}>Username: </Text>@{user.username || 'member'}
            </Text>
            <Text style={styles.infoLine}>
              <Text style={styles.infoKey}>Email: </Text>
              {email || 'Not set'}
            </Text>
            <Text style={styles.infoLine}>
              <Text style={styles.infoKey}>Phone: </Text>
              {phone || 'Not set'}
            </Text>
            {favoriteVerse ? (
              <Text style={styles.verseText}>&ldquo;{favoriteVerse}&rdquo;</Text>
            ) : null}
          </View>
        )}
      </View>

      {/* Native Push & Legal */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Notifications &amp; Legal</Text>
        <TouchableOpacity
          style={styles.legalRow}
          onPress={() =>
            triggerLocalNotification(
              'HGF Connect Push Verified',
              'Native push notifications are enabled and active on your device!'
            )
          }
        >
          <FontAwesome name="bell-o" size={15} color="#0e7490" />
          <Text style={styles.legalRowText}>Test Native Push Notification</Text>
          <FontAwesome name="angle-right" size={16} color="#94a3b8" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.legalRow} onPress={() => openLegal('/privacy')}>
          <FontAwesome name="shield" size={15} color="#0e7490" />
          <Text style={styles.legalRowText}>Privacy Policy</Text>
          <FontAwesome name="angle-right" size={16} color="#94a3b8" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.legalRow} onPress={() => openLegal('/terms')}>
          <FontAwesome name="file-text-o" size={14} color="#0e7490" />
          <Text style={styles.legalRowText}>Terms of Use &amp; Community EULA</Text>
          <FontAwesome name="angle-right" size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Sign Out & Account Deletion (Apple Guideline 5.1.1(v)) */}
      <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
        <FontAwesome name="sign-out" size={15} color="#334155" />
        <Text numberOfLines={1} style={styles.signOutBtnText}>
          Sign Out
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteAccountBtn}
        onPress={() => setDeleteModalOpen(true)}
      >
        <FontAwesome name="trash-o" size={15} color="#dc2626" />
        <Text numberOfLines={1} style={styles.deleteAccountText}>
          Delete My Account
        </Text>
      </TouchableOpacity>

      <ConfirmModal
        visible={deleteModalOpen}
        title="Delete Your Account?"
        message="This will permanently deactivate your HGF Connect account and scrub your personal contact details. This action cannot be undone."
        confirmText="Delete Account"
        destructive
        loading={deleting}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  guestWrap: {
    flexGrow: 1,
    padding: 18,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  guestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  guestIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e0f7fb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  guestTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  guestSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#4EB1CB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  legalSection: {
    width: '100%',
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  legalRowText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#e0f7fb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  avatarImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0e7490',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0f2d3d',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  fullName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusRow: {
    marginTop: 6,
    marginBottom: 14,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  editLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0e7490',
  },
  infoList: {
    gap: 6,
  },
  infoLine: {
    fontSize: 13,
    color: '#334155',
  },
  infoKey: {
    fontWeight: '700',
    color: '#64748b',
  },
  verseText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#0e7490',
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteAccountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
});
