import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopHeader from '@/components/ui/TopHeader';

const PRIMARY = '#4EB1CB';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile' as any);
    }
  };

  return (
    <View style={styles.root}>
      <TopHeader />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom + 36, 48) },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.headerBlock}>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>Data Protection &amp; Privacy</Text>
            </View>
            <Text style={styles.title}>Privacy Policy</Text>
            <Text style={styles.subtitle}>
              Effective Date: November 6, 2026 &bull; House of Grace Fellowship (HGF Connect)
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            <Text style={styles.bodyText}>
              HGF Connect collects only the information necessary to provide our church community
              social feed, prayer wall, events, devotionals, and StewardShop directory:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>
                &bull; <Text style={styles.bold}>Account &amp; Profile Data:</Text> Name, username,
                email address, mobile number, birthdate, gender, favorite Bible verse, and optional
                profile/cover photos.
              </Text>
              <Text style={styles.bulletItem}>
                &bull; <Text style={styles.bold}>Community Content:</Text> Posts, comments, prayer
                requests, testimonies, devotional reflections, and StewardShop listings you
                voluntarily share.
              </Text>
              <Text style={styles.bulletItem}>
                &bull; <Text style={styles.bold}>Device &amp; Notification Permissions:</Text>{' '}
                Camera and Photo Library access (only when you choose to upload a photo) and Push
                Notification permissions (to deliver church updates, prayer alerts, and community
                notifications).
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.bodyText}>
              We use your information strictly for church community fellowship, ministry
              coordination, event RSVP reminders, prayer support, and account security. We never
              sell, rent, or trade your personal data to third-party advertisers or data brokers.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              3. Directory Visibility &amp; Privacy Controls
            </Text>
            <Text style={styles.bodyText}>
              You have granular control over whether your email address, phone number, or home
              address is visible to other approved church members via{' '}
              <Text style={styles.bold}>Profile &rarr; Edit Profile &rarr; Privacy</Text>. You may
              also opt in or out of SMS event reminders at any time.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Account &amp; Data Deletion (Self-Service)</Text>
            <Text style={styles.bodyText}>
              In compliance with Apple App Store Guideline 5.1.1(v) and Google Play Data Deletion
              requirements, you can permanently delete your account at any time directly inside the
              app by navigating to{' '}
              <Text style={styles.bold}>
                Me &rarr; Settings &amp; Account &rarr; Delete My Account
              </Text>
              . Upon confirmation, your personal contact details and credentials are immediately
              scrubbed and deactivated.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Contact Us</Text>
            <Text style={styles.bodyText}>
              If you have questions about this Privacy Policy or your personal data, please contact
              House of Grace Fellowship Administration in Davao City, Philippines, or via{' '}
              <Text
                style={styles.inlineLink}
                onPress={() => Linking.openURL('https://connect.houseofgrace.ph')}
              >
                connect.houseofgrace.ph
              </Text>
              .
            </Text>
          </View>

          <View style={styles.footerRow}>
            <TouchableOpacity onPress={handleBack} activeOpacity={0.8}>
              <Text style={styles.backLink}>&larr; Back to HGF Connect</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.replace('/terms' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryLink}>View Terms of Use &rarr;</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f2d3d',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerBlock: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 16,
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0f7fb',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  badgeText: {
    color: '#0e7490',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f2d3d',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f2d3d',
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  bulletList: {
    marginTop: 8,
    gap: 8,
    paddingLeft: 4,
  },
  bulletItem: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
    color: '#1e293b',
  },
  inlineLink: {
    color: PRIMARY,
    fontWeight: '600',
  },
  footerRow: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  backLink: {
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryLink: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
});
