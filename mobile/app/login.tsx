import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import client from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [alertState, setAlertState] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'error', title: '', message: '' });

  const handleLogin = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setAlertState({
        visible: true,
        type: 'warning',
        title: 'Missing Credentials',
        message: 'Please enter your username/email and password.',
      });
      return;
    }

    setLoading(true);
    try {
      const { data } = await client.post('/login', {
        identifier: cleanEmail,
        password,
      });
      const payload = data?.data || data;

      if (payload?.token && payload?.user) {
        await login(payload.token, payload.user);
        router.replace('/(tabs)');
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        'Invalid credentials. Please check your username/email and password.';
      setAlertState({
        visible: true,
        type: 'error',
        title: 'Sign-In Failed',
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* White Card (1:1 replica of app/(public)/login/page.tsx) */}
        <View style={styles.card}>
          {/* Brand Logo */}
          <View style={styles.brandWrap}>
            <View style={styles.logoSquare}>
              <Text style={styles.logoLetter}>H</Text>
            </View>
            <Text style={styles.welcomeTitle}>Welcome back</Text>
            <Text style={styles.welcomeSubtitle}>Sign in to HGF Connect</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username or Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your username or email"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Text style={styles.forgotText}>
            Forgot password?{' '}
            <Text
              style={styles.forgotLink}
              onPress={() => router.push('/church?tab=ai' as any)}
            >
              Ask AI for help
            </Text>{' '}
            to retrieve your account.
          </Text>

          <TouchableOpacity
            style={[styles.signInBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.signInBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.linksWrap}>
            <Text style={styles.registerPrompt}>
              Don't have an account?{' '}
              <Text
                style={styles.registerLink}
                onPress={() => router.push('/register')}
              >
                Register here
              </Text>
            </Text>

            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backHomeText}>← Back to home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <AlertPromptModal
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState((prev) => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a4a5e',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoSquare: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#4eb1cb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoLetter: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 22,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  welcomeSubtitle: {
    fontSize: 13.5,
    color: '#64748b',
    marginTop: 4,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0f172a',
  },
  forgotText: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'right',
    marginTop: -6,
    marginBottom: 18,
  },
  forgotLink: {
    color: '#4eb1cb',
    fontWeight: '600',
  },
  signInBtn: {
    backgroundColor: '#4eb1cb',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  signInBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  linksWrap: {
    alignItems: 'center',
    marginTop: 22,
    gap: 10,
  },
  registerPrompt: {
    fontSize: 13.5,
    color: '#64748b',
  },
  registerLink: {
    color: '#4eb1cb',
    fontWeight: '700',
  },
  backHomeText: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
