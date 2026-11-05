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

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setAlertModal({
        visible: true,
        type: 'warning',
        title: 'Credentials Required',
        message: 'Please enter your username, email, or mobile number and password.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await client.post('/login', {
        identifier: identifier.trim(),
        password,
      });

      if (res.data?.success && res.data?.data?.token) {
        await login(res.data.data.token, res.data.data.user);
        router.replace('/(tabs)' as any);
      } else {
        setAlertModal({
          visible: true,
          type: 'error',
          title: 'Sign In Failed',
          message: res.data?.message || 'Invalid credentials. Please try again.',
        });
      }
    } catch (err: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Sign In Failed',
        message:
          err.response?.data?.message ||
          'Unable to sign in. Please check your credentials and try again.',
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
          { paddingTop: Math.max(insets.top + 16, 48), paddingBottom: insets.bottom + 24 },
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
                router.replace('/(tabs)' as any);
              }
            }}
          >
            <FontAwesome name="arrow-left" size={15} color="#ffffff" />
            <Text style={styles.backBtnText}>Back to App</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../assets/images/hgf_logo.png')}
              style={styles.logoImg}
            />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to HGF Connect</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username, Email, or Mobile</Text>
            <View style={styles.inputBox}>
              <FontAwesome name="user-o" size={16} color="#64748b" />
              <TextInput
                style={styles.input}
                placeholder="username or email@example.com"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                value={identifier}
                onChangeText={setIdentifier}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputBox}>
              <FontAwesome name="lock" size={17} color="#64748b" />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <FontAwesome
                  name={showPassword ? 'eye-slash' : 'eye'}
                  size={16}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.signInBtn, submitting && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.signInBtnText}>
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLinkBtn}
            onPress={() => router.push('/register' as any)}
            activeOpacity={0.85}
          >
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.registerLinkText}>
              New to House of Grace? Create Account
            </Text>
          </TouchableOpacity>

          <View style={styles.legalLinks}>
            <Text style={styles.legalHint}>
              By signing in, you agree to our community standards:
            </Text>
            <View style={styles.legalRow}>
              <TouchableOpacity onPress={() => openLegal('/privacy')}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.legalDot}>&bull;</Text>
              <TouchableOpacity onPress={() => openLegal('/terms')}>
                <Text style={styles.legalLink}>Terms &amp; EULA</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  topRow: {
    marginBottom: 16,
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
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#e0f7fb',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoImg: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 22,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: '#f8fafc',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
  },
  signInBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#4EB1CB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  signInBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  registerLinkBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
  },
  registerLinkText: {
    color: '#0e7490',
    fontSize: 13,
    fontWeight: '800',
  },
  legalLinks: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'center',
  },
  legalHint: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 6,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0e7490',
  },
  legalDot: {
    color: '#cbd5e1',
  },
});
