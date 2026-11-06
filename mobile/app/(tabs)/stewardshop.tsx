import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import client from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';

interface ListingItem {
  id: number;
  title: string;
  description: string;
  listingType: string;
  status?: string;
  category: string;
  price: number | null;
  discountedPrice: number | null;
  priceLabel: string | null;
  locationArea: string;
  loveGiftAmount: number;
  prospectCount?: number;
  seller: {
    id: number;
    name: string;
    phone?: string | null;
    isVerified: boolean;
    avatar?: string | null;
  };
  photos: string[];
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'sale', label: 'For Sale' },
  { key: 'service', label: 'Services' },
  { key: 'rent', label: 'Rent' },
  { key: 'mine', label: 'My Listings' },
];

export default function StewardShopScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [category, setCategory] = useState('all');
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<ListingItem | null>(null);

  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [sellTitle, setSellTitle] = useState('');
  const [sellType, setSellType] = useState<'sale' | 'service' | 'rent'>('sale');
  const [sellPrice, setSellPrice] = useState('');
  const [sellLoveGift, setSellLoveGift] = useState('');
  const [sellLocation, setSellLocation] = useState('General Santos City');
  const [sellDesc, setSellDesc] = useState('');
  const [submittingSell, setSubmittingSell] = useState(false);

  const [inquiryMessage, setInquiryMessage] = useState('');
  const [sendingInquiry, setSendingInquiry] = useState(false);

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertModal({ visible: true, type, title, message });
  };

  const loadListings = useCallback(async () => {
    try {
      const res = await client.get(`/stewardshop?category=${category}`);
      if (res.data?.success) {
        setListings(res.data.data?.listings || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  useEffect(() => {
    setLoading(true);
    loadListings();
  }, [loadListings]);

  const formatPrice = (item: ListingItem) => {
    const val = item.discountedPrice ?? item.price;
    if (val !== null && val !== undefined && val > 0) {
      return `PHP ${val.toLocaleString()}`;
    }
    return item.priceLabel || 'Inquire for Price';
  };

  const handleCreateListing = async () => {
    if (!user) {
      setSellModalOpen(false);
      router.push('/login' as any);
      return;
    }
    if (!sellTitle.trim()) {
      showAlert('warning', 'Missing Title', 'Please enter a title for your listing.');
      return;
    }
    setSubmittingSell(true);
    try {
      const res = await client.post('/stewardshop', {
        action: 'create_listing',
        title: sellTitle.trim(),
        listingType: sellType,
        price: sellPrice ? Number(sellPrice) : null,
        loveGiftAmount: sellLoveGift ? Number(sellLoveGift) : 0,
        locationArea: sellLocation.trim() || 'General Santos City',
        description: sellDesc.trim(),
      });
      if (res.data?.success) {
        setSellModalOpen(false);
        setSellTitle('');
        setSellPrice('');
        setSellLoveGift('');
        setSellDesc('');
        loadListings();
        showAlert('success', 'Listing Published', res.data.message || 'Your listing is now live!');
      }
    } catch (err: any) {
      showAlert(
        'error',
        'Publish Failed',
        err.response?.data?.message || 'Unable to publish listing.'
      );
    } finally {
      setSubmittingSell(false);
    }
  };

  const handleSendInquiry = async () => {
    if (!selected) return;
    if (!user) {
      setSelected(null);
      router.push('/login' as any);
      return;
    }
    setSendingInquiry(true);
    try {
      const res = await client.post('/stewardshop', {
        action: 'inquire',
        listingId: selected.id,
        message:
          inquiryMessage.trim() ||
          `Hi ${selected.seller.name}! I am interested in "${selected.title}" on StewardShop.`,
      });
      if (res.data?.success) {
        const itemTitle = selected.title;
        setInquiryMessage('');
        setSelected(null);
        showAlert(
          'success',
          'Inquiry Sent',
          `Your inquiry for "${itemTitle}" was sent to the seller.`
        );
      }
    } catch (err: any) {
      showAlert(
        'error',
        'Inquiry Failed',
        err.response?.data?.message || 'Unable to send inquiry right now.'
      );
    } finally {
      setSendingInquiry(false);
    }
  };

  const handleMarkSold = async (item: ListingItem) => {
    try {
      const res = await client.post('/stewardshop', {
        action: 'mark_sold',
        listingId: item.id,
      });
      if (res.data?.success) {
        setSelected(null);
        loadListings();
        showAlert('success', 'Marked as Sold', 'Congratulations on your StewardShop sale!');
      }
    } catch {
      showAlert('error', 'Action Failed', 'Could not mark listing as sold.');
    }
  };

  const handleReportListing = async (item: ListingItem) => {
    setSelected(null);
    try {
      await client.post('/moderation', {
        action: 'report',
        targetType: 'listing',
        targetId: item.id,
        reason: 'Reported StewardShop listing',
      });
    } catch {
      // ignore
    }
    showAlert(
      'success',
      'Listing Reported',
      'Thank you. Our StewardShop moderators review all flagged listings within 24 hours.'
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, category === c.key && styles.chipActive]}
              onPress={() => {
                if (c.key === 'mine' && !user) {
                  router.push('/login' as any);
                  return;
                }
                setCategory(c.key);
              }}
            >
              <Text
                numberOfLines={1}
                style={[styles.chipText, category === c.key && styles.chipTextActive]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.sellBtn}
          onPress={() => {
            if (!user) {
              router.push('/login' as any);
            } else {
              setSellModalOpen(true);
            }
          }}
        >
          <FontAwesome name="plus" size={12} color="#ffffff" />
          <Text numberOfLines={1} style={styles.sellBtnText}>
            Sell
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4EB1CB" />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadListings();
              }}
              tintColor="#4EB1CB"
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <FontAwesome name="shopping-bag" size={32} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No listings in this category</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setSelected(item)}
              activeOpacity={0.9}
            >
              {item.photos && item.photos.length > 0 ? (
                <Image source={{ uri: item.photos[0] }} style={styles.cardImg} />
              ) : (
                <View style={styles.cardImgPlaceholder}>
                  <FontAwesome name="shopping-bag" size={28} color="#94a3b8" />
                </View>
              )}

              <View style={styles.cardBody}>
                <View style={styles.badgeRow}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{item.listingType.toUpperCase()}</Text>
                  </View>
                  {item.status === 'sold' ? (
                    <View style={[styles.loveGiftBadge, { backgroundColor: '#fee2e2' }]}>
                      <Text style={[styles.loveGiftText, { color: '#b91c1c' }]}>SOLD</Text>
                    </View>
                  ) : item.loveGiftAmount > 0 ? (
                    <View style={styles.loveGiftBadge}>
                      <Text style={styles.loveGiftText}>
                        Love Gift: PHP {item.loveGiftAmount}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text numberOfLines={2} style={styles.cardTitle}>
                  {item.title}
                </Text>
                <Text style={styles.priceText}>{formatPrice(item)}</Text>

                <View style={styles.sellerRow}>
                  <FontAwesome name="user-circle-o" size={13} color="#64748b" />
                  <Text numberOfLines={1} style={styles.sellerName}>
                    {item.seller.name}
                  </Text>
                  <Text style={styles.dot}>&bull;</Text>
                  <Text numberOfLines={1} style={styles.locationText}>
                    {item.locationArea}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Listing Detail & Inquiry Modal */}
      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text numberOfLines={1} style={styles.modalTitle}>
                {selected?.title}
              </Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <FontAwesome name="times" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selected ? (
              <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
                {selected.photos && selected.photos.length > 0 ? (
                  <Image source={{ uri: selected.photos[0] }} style={styles.modalImg} />
                ) : null}
                <Text style={styles.modalPrice}>{formatPrice(selected)}</Text>
                <Text style={styles.modalMeta}>
                  Listed by {selected.seller.name} &bull; {selected.locationArea}
                </Text>
                <Text style={styles.modalDesc}>
                  {selected.description || 'Contact the seller for full item details.'}
                </Text>

                {user && selected.seller.id === user.id && selected.status !== 'sold' ? (
                  <TouchableOpacity
                    style={styles.soldBtn}
                    onPress={() => handleMarkSold(selected)}
                  >
                    <FontAwesome name="check-circle" size={15} color="#ffffff" />
                    <Text style={styles.soldBtnText}>Mark Listing as Sold</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.inquiryBox}>
                    <Text style={styles.inquiryLabel}>Send Inquiry to Seller</Text>
                    <TextInput
                      style={styles.inquiryInput}
                      placeholder={`Hi ${selected.seller.name}, is this still available?`}
                      placeholderTextColor="#94a3b8"
                      value={inquiryMessage}
                      onChangeText={setInquiryMessage}
                    />
                    <View style={styles.contactRow}>
                      <TouchableOpacity
                        style={[styles.inquireBtn, sendingInquiry && { opacity: 0.7 }]}
                        onPress={handleSendInquiry}
                        disabled={sendingInquiry}
                      >
                        <FontAwesome name="paper-plane" size={13} color="#ffffff" />
                        <Text numberOfLines={1} style={styles.inquireBtnText}>
                          {sendingInquiry ? 'Sending...' : 'Send Inquiry'}
                        </Text>
                      </TouchableOpacity>

                      {selected.seller.phone ? (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() =>
                            Linking.openURL(`tel:${selected.seller.phone}`).catch(() => {})
                          }
                        >
                          <FontAwesome name="phone" size={14} color="#0e7490" />
                          <Text style={styles.callBtnText}>Call</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.reportBtn}
                  onPress={() => handleReportListing(selected)}
                >
                  <FontAwesome name="flag-o" size={14} color="#dc2626" />
                  <Text style={styles.reportBtnText}>Report Listing</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Listing Modal */}
      <Modal
        visible={sellModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSellModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post on StewardShop</Text>
              <TouchableOpacity onPress={() => setSellModalOpen(false)}>
                <FontAwesome name="times" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Listing Type</Text>
              <View style={styles.typeSwitchRow}>
                {(['sale', 'service', 'rent'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeOption, sellType === t && styles.typeOptionActive]}
                    onPress={() => setSellType(t)}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        sellType === t && styles.typeOptionTextActive,
                      ]}
                    >
                      {t === 'sale' ? 'For Sale' : t === 'service' ? 'Service' : 'For Rent'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Item or Service Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Homemade Baked Lasagna / Toyota Vios"
                placeholderTextColor="#94a3b8"
                value={sellTitle}
                onChangeText={setSellTitle}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Price (PHP)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 500"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={sellPrice}
                    onChangeText={setSellPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Love Gift (PHP)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 50"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={sellLoveGift}
                    onChangeText={setSellLoveGift}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Location / Area</Text>
              <TextInput
                style={styles.textInput}
                placeholder="General Santos City"
                placeholderTextColor="#94a3b8"
                value={sellLocation}
                onChangeText={setSellLocation}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, { height: 84, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder="Describe condition, pickup/delivery options, or service details..."
                placeholderTextColor="#94a3b8"
                multiline
                value={sellDesc}
                onChangeText={setSellDesc}
              />

              <TouchableOpacity
                style={[styles.publishBtn, submittingSell && { opacity: 0.7 }]}
                onPress={handleCreateListing}
                disabled={submittingSell}
              >
                {submittingSell ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text numberOfLines={1} style={styles.publishBtnText}>
                    Publish Listing
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  filterBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 10,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  chipActive: {
    backgroundColor: '#0f2d3d',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  sellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#4EB1CB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginLeft: 6,
  },
  sellBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    padding: 14,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardImg: {
    width: '100%',
    height: 190,
    backgroundColor: '#f1f5f9',
  },
  cardImgPlaceholder: {
    width: '100%',
    height: 130,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  typeBadge: {
    backgroundColor: '#e0f7fb',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0e7490',
  },
  loveGiftBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  loveGiftText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0e7490',
    marginBottom: 8,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sellerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  dot: {
    color: '#cbd5e1',
  },
  locationText: {
    fontSize: 12,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalImg: {
    width: '100%',
    height: 210,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: '#f1f5f9',
  },
  modalPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0e7490',
    marginBottom: 4,
  },
  modalMeta: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  modalDesc: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
    marginBottom: 16,
  },
  inquiryBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  inquiryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inquiryInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 10,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inquireBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0e7490',
    paddingVertical: 11,
    borderRadius: 10,
  },
  inquireBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#e0f7fb',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
  },
  callBtnText: {
    color: '#0e7490',
    fontSize: 13,
    fontWeight: '800',
  },
  soldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#15803d',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  soldBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  reportBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
    marginTop: 8,
  },
  typeSwitchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: '#0e7490',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  typeOptionTextActive: {
    color: '#ffffff',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  publishBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#4EB1CB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  publishBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
