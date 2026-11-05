import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const openLegal = async (path: string) => {
    const url = `https://connect.houseofgrace.ph${path}`;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Linking.openURL(url).catch(() => {});
    }
  };

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !username.trim() || !password) {
      setAlertModal({
        visible: true,
        type: 'warning',
        title: 'Missing Fields',
        message: 'Please fill in your first name, last name, username, and password.',
      });
      return;
    }

    if (!agreedTerms) {
      setAlertModal({
        visible: true,
        type: 'warning',
        title: 'Terms Required',
        message: 'Please accept the Terms of Use and Privacy Policy to join HGF Connect.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await client.post('/register', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim().toLowerCase(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.data?.success && res.data?.data?.token) {
        await login(res.data.data.token, res.data.data.user);
        router.replace('/(tabs)' as any);
      } else {
        setAlertModal({
          visible: true,
          type: 'error',
          title: 'Registration Failed',
          message: res.data?.message || 'Unable to create your account.',
        });
      }
    } catch (err: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Registration Failed',
        message:
          err.response?.data?.message ||
          'Unable to create your account. Please verify your details.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: Math.max(insets.top + 12, 44), paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/login' as any);
              }
            }}
          >
            <FontAwesome name="arrow-left" size={15} color="#ffffff" />
            <Text style={styles.backBtnText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../assets/images/hgf_logo.png')}
              style={styles.logoImg}
            />
          </View>
          <Text style={styles.title}>Join HGF Connect</Text>
          <Text style={styles.subtitle}>House of Grace Fellowship Community</Text>

          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="First name"
                placeholderTextColor="#94a3b8"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Last name"
                placeholderTextColor="#94a3b8"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={styles.input}
              placeholder="Choose a unique username"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="09XX XXX XXXX"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAgreedTerms((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, agreedTerms && styles.checkboxActive]}>
              {agreedTerms ? <FontAwesome name="check" size={12} color="#ffffff" /> : null}
            </View>
            <Text style={styles.checkboxText}>
              I agree to the HGF Connect Community Terms of Use (Zero-Tolerance UGC Policy) and Privacy Policy.
            </Text>
          </TouchableOpacity>

          <View style={styles.legalLinksRow}>
            <TouchableOpacity onPress={() => openLegal('/terms')}>
              <Text style={styles.legalLink}>Read Terms &amp; EULA</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>&bull;</Text>
            <TouchableOpacity onPress={() => openLegal('/privacy')}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.submitBtnText}>
                Create Account
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AlertPromptModal
        visible={alertModal.visible}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f2d3d',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 18,
  },
  topRow: {
    marginBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  backBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#e0f7fb',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoImg: {
    width: 42,
    height: 42,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 18,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 13,
    height: 46,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#4EB1CB',
    borderColor: '#4EB1CB',
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 14,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0e7490',
  },
  legalDot: {
    color: '#cbd5e1',
  },
  submitBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#4EB1CB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
