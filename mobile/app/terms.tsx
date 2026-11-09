import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopHeader from '@/components/ui/TopHeader';

const PRIMARY = '#4EB1CB';

export default function TermsOfUseScreen() {
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
              <Text style={styles.badgeText}>Community Standards &amp; EULA</Text>
            </View>
            <Text style={styles.title}>Terms of Use &amp; Community Guidelines</Text>
            <Text style={styles.subtitle}>
              Effective Date: November 6, 2026 &bull; House of Grace Fellowship (HGF Connect)
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.bodyText}>
              By accessing or using the HGF Connect mobile application or website, you agree to
              abide by these Terms of Use and our Christian community standards.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              2. Zero-Tolerance Policy for Objectionable Content &amp; Abuse
            </Text>
            <Text style={styles.bodyText}>
              HGF Connect maintains a strict <Text style={styles.bold}>zero-tolerance policy</Text>{' '}
              for objectionable content, harassment, hate speech, defamation, fraudulent
              StewardShop listings, or abusive behavior. Members may not post content that is
              unlawful, threatening, sexually explicit, or harmful to others.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              3. Content Reporting, Blocking &amp; Moderation
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>
                &bull; <Text style={styles.bold}>Report Content:</Text> Any member can flag or
                report a feed post, comment, prayer request, or marketplace listing using the
                in-app Report option.
              </Text>
              <Text style={styles.bulletItem}>
                &bull; <Text style={styles.bold}>Block Users:</Text> Members can immediately block
                any user whose content they do not wish to see; blocked users&apos; posts are
                instantly hidden from your feed.
              </Text>
              <Text style={styles.bulletItem}>
                &bull; <Text style={styles.bold}>24-Hour Review Commitment:</Text> Church
                moderators review all reported content within 24 hours and will remove
                objectionable content and suspend or eject offending accounts.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. StewardShop Community Marketplace</Text>
            <Text style={styles.bodyText}>
              StewardShop is a church member livelihood directory. All listings are subject to
              moderator review. House of Grace Fellowship is not a party to member-to-member
              transactions, and members must represent their goods and services truthfully.
            </Text>
          </View>

          <View style={styles.footerRow}>
            <TouchableOpacity onPress={handleBack} activeOpacity={0.8}>
              <Text style={styles.backLink}>&larr; Back to HGF Connect</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.replace('/privacy' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryLink}>View Privacy Policy &rarr;</Text>
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
    fontSize: 22,
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
    marginTop: 6,
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
