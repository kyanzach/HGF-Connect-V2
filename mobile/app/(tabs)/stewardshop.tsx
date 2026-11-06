import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import client from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';

interface ListingItem {
  id: number;
  title: string;
  description?: string | null;
  category: string;
  listingType: string;
  price?: number | null;
  originalPrice?: number | null;
  priceLabel?: string | null;
  loveGiftAmount?: number | null;
  conditionType?: string | null;
  locationArea?: string | null;
  viewCount: number;
  createdAt: string;
  photo?: string | null;
  photos: string[];
  seller: {
    id: number;
    name: string;
    phone?: string | null;
    avatar?: string | null;
  };
}

const LISTING_TYPE_CHIPS = [
  { key: '', label: 'All Types' },
  { key: 'SALE', label: 'For Sale' },
  { key: 'FREE', label: 'Free' },
  { key: 'TRADE', label: 'Trade' },
  { key: 'SERVICE', label: 'Service' },
  { key: 'RENT', label: 'Rent' },
  { key: 'OFFICIAL_STORE', label: 'Official Store' },
];

const TYPE_META: Record<string, { label: string; color: string }> = {
  SALE: { label: 'For Sale', color: '#3b82f6' },
  TRADE: { label: 'For Trade', color: '#8b5cf6' },
  FREE: { label: 'Free / Blessing', color: '#10b981' },
  SERVICE: { label: 'Service', color: '#f59e0b' },
  RENT: { label: 'For Rent', color: '#ec4899' },
  OFFICIAL_STORE: { label: 'Official Store', color: '#0d9488' },
};

export default function StewardShopScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [listings, setListings] = useState<ListingItem[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'latest' | 'price_asc' | 'price_desc'>('latest');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected listing detail modal
  const [selectedItem, setSelectedItem] = useState<ListingItem | null>(null);

  // Create Listing Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [locationArea, setLocationArea] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const fetchListings = useCallback(async () => {
    try {
      const { data } = await client.get('/stewardshop');
      const payload = data?.data || data;
      if (payload?.listings) {
        setListings(
          payload.listings.map((l: any) => ({
            ...l,
            photo: l.photo || l.photos?.[0] || null,
          }))
        );
      }
    } catch {
      // Keep cached
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleCreateListing = async () => {
    if (!title.trim()) {
      setAlertModal({
        visible: true,
        type: 'warning',
        title: 'Title Required',
        message: 'Please enter a listing title.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await client.post('/stewardshop', {
        action: 'create',
        title: title.trim(),
        price: price ? Number(price) : null,
        description: description.trim(),
        locationArea: locationArea.trim() || 'Davao City',
        category: 'OTHER',
        listingType: 'SALE',
      });
      fetchListings();
      setCreateOpen(false);
      setTitle('');
      setPrice('');
      setDescription('');
      setLocationArea('');
      setAlertModal({
        visible: true,
        type: 'success',
        title: 'Listing Published',
        message: 'Your item is now live on StewardShop.',
      });
    } catch (err: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Failed to Post',
        message: err?.response?.data?.error || 'Could not create listing.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter and sort listings identically to app/(public)/stewardshop/page.tsx
  const filteredListings = listings
    .filter((item) => {
      if (selectedType && item.listingType !== selectedType) return false;
      if (
        searchQuery.trim() &&
        !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(item.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortOrder === 'price_desc') return (b.price || 0) - (a.price || 0);
      return 0;
    });

  const renderHeader = () => (
    <View>
      {/* Hero Banner (app/(public)/stewardshop/page.tsx) */}
      <View style={styles.heroBanner}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>🤝 StewardShop</Text>
            <Text style={styles.heroSubtitle}>Trade well. Give well. Serve well.</Text>
          </View>
          <View style={styles.heroBtnGroup}>
            <TouchableOpacity
              style={styles.postListingBtn}
              onPress={() => {
                if (!user) {
                  router.push('/login');
                } else {
                  setCreateOpen(true);
                }
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.postListingBtnText} numberOfLines={1}>
                + Post a Listing
              </Text>
            </TouchableOpacity>
            {user && (
              <TouchableOpacity
                style={styles.loveGiftsBtn}
                onPress={() =>
                  setAlertModal({
                    visible: true,
                    type: 'info',
                    title: '❤️ Love Gifts',
                    message:
                      'Love Gifts shared through StewardShop support fellow church members and ministry missions.',
                  })
                }
                activeOpacity={0.85}
              >
                <Text style={styles.loveGiftsBtnText} numberOfLines={1}>
                  ❤️ Love Gifts
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* MarketplaceFilters (components/marketplace/MarketplaceFilters.tsx) */}
      <View style={styles.filterContainer}>
        <View style={styles.searchBoxWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search listings…"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchBtn}
              onPress={() => setSearchQuery('')}
            >
              <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {LISTING_TYPE_CHIPS.map((t) => {
            const active = selectedType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setSelectedType(t.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[
              styles.sortPill,
              sortOrder !== 'latest' && styles.sortPillActive,
            ]}
            onPress={() =>
              setSortOrder((prev) =>
                prev === 'price_desc' ? 'price_asc' : 'price_desc'
              )
            }
          >
            <Text
              style={[
                styles.sortPillText,
                sortOrder !== 'latest' && styles.sortPillTextActive,
              ]}
            >
              💰 Price {sortOrder === 'price_asc' ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );

  const renderCard = ({ item }: { item: ListingItem }) => {
    const typeMeta = TYPE_META[item.listingType] ?? { label: item.listingType, color: '#64748b' };

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => setSelectedItem(item)}
      >
        {/* Image Container (130px height matching web) */}
        <View style={styles.imageContainer}>
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderBox}>
              <Text style={{ fontSize: 36 }}>📦</Text>
            </View>
          )}

          {/* Top-left Type Badge */}
          <View style={[styles.typeBadge, { backgroundColor: typeMeta.color }]}>
            <Text style={styles.typeBadgeText}>{typeMeta.label}</Text>
          </View>

          {/* Bottom-right Love Gift Badge */}
          {item.loveGiftAmount && item.loveGiftAmount > 0 ? (
            <View style={styles.loveGiftBadge}>
              <Text style={styles.loveGiftBadgeText}>
                ❤️ ₱{Number(item.loveGiftAmount).toLocaleString()}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Info Body */}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {item.listingType === 'FREE' ? (
            <Text style={styles.freePriceText}>FREE 🎁</Text>
          ) : item.price != null ? (
            !user && item.originalPrice && item.originalPrice > item.price ? (
              <View style={styles.guestPriceWrap}>
                <Text style={styles.strikethroughPrice}>
                  ₱{Number(item.originalPrice).toLocaleString('en-PH')}
                </Text>
                <View style={styles.revealPriceBadge}>
                  <Text style={styles.revealPriceBadgeText}>🔒 Reveal Price</Text>
                </View>
              </View>
            ) : (
              <View style={styles.memberPriceRow}>
                {user && item.originalPrice && item.originalPrice > item.price ? (
                  <Text style={styles.strikethroughSmall}>
                    ₱{Number(item.originalPrice).toLocaleString('en-PH')}
                  </Text>
                ) : null}
                <Text style={styles.priceText}>
                  ₱{Number(item.price).toLocaleString('en-PH')}
                  {item.priceLabel ? (
                    <Text style={styles.priceLabelText}> {item.priceLabel}</Text>
                  ) : null}
                </Text>
              </View>
            )
          ) : item.priceLabel ? (
            <Text style={styles.priceLabelOnly}>{item.priceLabel}</Text>
          ) : null}

          <View style={styles.cardFooterRow}>
            <Text style={styles.footerMetaText} numberOfLines={1}>
              {item.locationArea ? `📍 ${item.locationArea}` : ''}
            </Text>
            <Text style={styles.footerMetaText} numberOfLines={1}>
              {item.seller.name}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading && listings.length === 0 ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4EB1CB" />
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          numColumns={2}
          keyExtractor={(item) => String(item.id)}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader()}
          renderItem={renderCard}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchListings();
              }}
              tintColor="#4EB1CB"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🛍️</Text>
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptySub}>
                Be the first to post an item, service, or blessing for the community!
              </Text>
            </View>
          }
        />
      )}

      {/* Listing Detail Modal */}
      <Modal
        visible={Boolean(selectedItem)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {selectedItem && (
              <>
                {selectedItem.photo ? (
                  <Image
                    source={{ uri: selectedItem.photo }}
                    style={styles.detailImage}
                    resizeMode="cover"
                  />
                ) : null}
                <Text style={styles.detailTitle}>{selectedItem.title}</Text>
                <Text style={styles.detailPrice}>
                  {selectedItem.listingType === 'FREE'
                    ? 'FREE 🎁'
                    : selectedItem.price != null
                    ? `₱${Number(selectedItem.price).toLocaleString()}`
                    : selectedItem.priceLabel || 'Inquire'}
                </Text>
                <Text style={styles.detailMeta}>
                  Seller: {selectedItem.seller.name}
                  {selectedItem.locationArea ? ` · 📍 ${selectedItem.locationArea}` : ''}
                </Text>
                <Text style={styles.detailDesc}>
                  {selectedItem.description || 'No additional description provided.'}
                </Text>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setSelectedItem(null)}
                >
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Post a Listing Modal */}
      <Modal
        visible={createOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.detailTitle}>Post a Listing</Text>
            <TextInput
              style={styles.input}
              placeholder="Item or Service Title"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Price in PHP (leave blank if free)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
            <TextInput
              style={styles.input}
              placeholder="Location Area (e.g. Buhangin, Davao City)"
              placeholderTextColor="#94a3b8"
              value={locationArea}
              onChangeText={setLocationArea}
            />
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Condition and details..."
              placeholderTextColor="#94a3b8"
              multiline
              value={description}
              onChangeText={setDescription}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.closeBtn, { flex: 1, backgroundColor: '#f1f5f9' }]}
                onPress={() => setCreateOpen(false)}
              >
                <Text style={[styles.closeBtnText, { color: '#475569' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.closeBtn, { flex: 2 }]}
                onPress={handleCreateListing}
                disabled={submitting}
              >
                <Text style={styles.closeBtnText}>
                  {submitting ? 'Publishing…' : 'Publish Listing'}
                </Text>
              </TouchableOpacity>
            </View>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  listContent: { paddingBottom: 32 },

  // Hero Header (app/(public)/stewardshop/page.tsx)
  heroBanner: {
    backgroundColor: '#2b8da6',
    paddingTop: 20,
    paddingBottom: 22,
    paddingHorizontal: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
  },
  heroBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postListingBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 99,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  postListingBtnText: {
    color: '#1a7a94',
    fontWeight: '800',
    fontSize: 13,
  },
  loveGiftsBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 99,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  loveGiftsBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },

  // MarketplaceFilters
  filterContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchBoxWrap: {
    position: 'relative',
    marginBottom: 8,
    justifyContent: 'center',
  },
  searchInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 99,
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 36,
    fontSize: 13,
    color: '#0f172a',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: '#f0f4f8',
  },
  filterPillActive: {
    backgroundColor: '#4EB1CB',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  sortPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: '#f0f4f8',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sortPillActive: {
    backgroundColor: '#e0f7fa',
    borderColor: '#4EB1CB',
  },
  sortPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  sortPillTextActive: {
    color: '#0d7490',
  },

  // 2-Column Grid
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  card: {
    width: '48.2%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    height: 130,
    backgroundColor: '#f0f4f8',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 99,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  loveGiftBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 99,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  loveGiftBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  cardBody: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 13.5,
    color: '#0f172a',
    lineHeight: 18,
    marginBottom: 4,
  },
  freePriceText: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 13,
  },
  guestPriceWrap: {
    marginTop: 2,
  },
  strikethroughPrice: {
    fontSize: 12,
    color: '#ef4444',
    textDecorationLine: 'line-through',
    fontWeight: '700',
    marginBottom: 2,
  },
  revealPriceBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    alignSelf: 'flex-start',
  },
  revealPriceBadgeText: {
    color: '#d97706',
    fontWeight: '800',
    fontSize: 10.5,
  },
  memberPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  strikethroughSmall: {
    fontSize: 11,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  priceText: {
    color: '#4EB1CB',
    fontWeight: '900',
    fontSize: 15,
  },
  priceLabelText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  priceLabelOnly: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  footerMetaText: {
    fontSize: 11,
    color: '#94a3b8',
    maxWidth: '48%',
  },

  // Empty & Modals
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 14,
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
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
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  detailTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  detailPrice: { fontSize: 20, fontWeight: '900', color: '#4EB1CB', marginBottom: 6 },
  detailMeta: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  detailDesc: { fontSize: 14, color: '#334155', lineHeight: 20, marginBottom: 18 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  closeBtn: {
    backgroundColor: '#4EB1CB',
    paddingVertical: 13,
    borderRadius: 99,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
