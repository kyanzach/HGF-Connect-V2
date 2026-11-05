import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import client from '@/api/client';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';

interface AdminStats {
  totalApprovedMembers: number;
  autoApprovedCount: number;
  forceActiveCount: number;
  pendingApprovals: number;
  totalPosts: number;
  activePrayers: number;
  upcomingEvents: number;
  activeListings: number;
  openReports: number;
}

interface AdminMemberRow {
  id: number;
  name: string;
  username: string | null;
  phone: string | null;
  status: string;
  role: string;
  type: string;
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [members, setMembers] = useState<AdminMemberRow[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'moderation'>('members');

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const topPad =
    Platform.OS === 'android'
      ? Math.max(insets.top, StatusBar.currentHeight || 0, 32)
      : Math.max(insets.top, 44);

  const loadAdmin = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const res = await client.get(`/admin?q=${encodeURIComponent(q)}`);
      if (res.data?.success) {
        setStats(res.data.data?.stats || null);
        setMembers(res.data.data?.members || []);
        setReports(res.data.data?.reports || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  const updateMemberStatus = async (memberId: number, status: string) => {
    try {
      const res = await client.post('/admin', {
        action: 'update_member_status',
        memberId,
        status,
      });
      if (res.data?.success) {
        setAlertModal({
          visible: true,
          type: 'success',
          title: 'Status Updated',
          message: res.data.message || 'Member status updated.',
        });
        loadAdmin(search);
      }
    } catch (err: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Admin Action Failed',
        message: err.response?.data?.message || 'Admin or Moderator role required.',
      });
    }
  };

  const resolveReport = async (reportId: string) => {
    try {
      const res = await client.post('/admin', {
        action: 'resolve_report',
        reportId,
      });
      if (res.data?.success) {
        loadAdmin(search);
      }
    } catch (err: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Action Failed',
        message: err.response?.data?.message || 'Unable to resolve report.',
      });
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: topPad }]}>
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
          <FontAwesome name="arrow-left" size={16} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Admin Control Center</Text>
          <Text style={styles.headerSub}>Members, Status Parity &amp; UGC Moderation</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => loadAdmin(search)}>
          <FontAwesome name="refresh" size={15} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {stats ? (
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiVal}>{stats.totalApprovedMembers}</Text>
              <Text style={styles.kpiLabel}>Approved ({stats.autoApprovedCount} Auto)</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiVal, { color: '#059669' }]}>
                {stats.pendingApprovals}
              </Text>
              <Text style={styles.kpiLabel}>Pending Approval</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiVal}>{stats.totalPosts}</Text>
              <Text style={styles.kpiLabel}>Feed Posts</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiVal}>{stats.openReports}</Text>
              <Text style={styles.kpiLabel}>Open UGC Reports</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'members' && styles.tabBtnActive]}
            onPress={() => setActiveTab('members')}
          >
            <Text
              numberOfLines={1}
              style={[styles.tabBtnText, activeTab === 'members' && styles.tabBtnTextActive]}
            >
              Members ({members.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'moderation' && styles.tabBtnActive]}
            onPress={() => setActiveTab('moderation')}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.tabBtnText,
                activeTab === 'moderation' && styles.tabBtnTextActive,
              ]}
            >
              UGC Reports ({reports.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'members' ? (
          <>
            <View style={styles.searchBox}>
              <FontAwesome name="search" size={14} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search member by name or username..."
                placeholderTextColor="#94a3b8"
                value={search}
                onChangeText={(txt) => {
                  setSearch(txt);
                  loadAdmin(txt);
                }}
              />
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#4EB1CB" style={{ marginTop: 24 }} />
            ) : (
              members.map((m) => (
                <View key={m.id} style={styles.memberCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberSub}>
                      @{m.username || 'member'} &bull;{' '}
                      {m.status === 'approved'
                        ? 'Auto (Approved)'
                        : m.status === 'active'
                          ? 'Force Active'
                          : m.status}
                    </Text>
                  </View>
                  <View style={styles.statusActions}>
                    <TouchableOpacity
                      style={[
                        styles.statusPill,
                        m.status === 'approved' && styles.statusPillActive,
                      ]}
                      onPress={() => updateMemberStatus(m.id, 'approved')}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          m.status === 'approved' && styles.statusPillTextActive,
                        ]}
                      >
                        Auto
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.statusPill,
                        m.status === 'active' && styles.statusPillActive,
                      ]}
                      onPress={() => updateMemberStatus(m.id, 'active')}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          m.status === 'active' && styles.statusPillTextActive,
                        ]}
                      >
                        Force
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            {reports.length === 0 ? (
              <View style={styles.emptyCard}>
                <FontAwesome name="check-circle" size={28} color="#10b981" />
                <Text style={styles.emptyTitle}>All Clear</Text>
                <Text style={styles.emptySub}>No open UGC moderation reports.</Text>
              </View>
            ) : (
              reports.map((r, i) => (
                <View key={r.id || i} style={styles.memberCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>
                      {r.targetType?.toUpperCase() || 'CONTENT'} #{r.targetId}
                    </Text>
                    <Text style={styles.memberSub}>
                      Reason: {r.reason || 'Community report'} &bull; Status:{' '}
                      {r.status || 'open'}
                    </Text>
                  </View>
                  {r.status !== 'resolved' ? (
                    <TouchableOpacity
                      style={[styles.statusPill, styles.statusPillActive]}
                      onPress={() => resolveReport(String(r.id))}
                    >
                      <Text style={styles.statusPillTextActive}>Resolve</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <AlertPromptModal
        visible={alertModal.visible}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#0f2d3d',
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 12,
    color: '#4EB1CB',
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f2d3d',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#0e7490',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  memberSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusActions: {
    flexDirection: 'row',
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  statusPillActive: {
    backgroundColor: '#0e7490',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  statusPillTextActive: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 28,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
});
