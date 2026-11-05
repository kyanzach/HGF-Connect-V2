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
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import client from '@/api/client';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';

interface ListingItem {
  id: number;
  title: string;
  description: string;
  listingType: string;
  category: string;
  price: number | null;
  discountedPrice: number | null;
  priceLabel: string | null;
  locationArea: string;
  loveGiftAmount: number;
  seller: {
    id: number;
    name: string;
    isVerified: boolean;
    avatar?: string | null;
  };
  photos: string[];
}

const CATEGORIES = [
  { key: 'all', label: 'All Listings' },
  { key: 'sale', label: 'For Sale' },
  { key: 'service', label: 'Services' },
  { key: 'rent', label: 'For Rent' },
];

export default function StewardShopScreen() {
  const [category, setCategory] = useState('all');
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<ListingItem | null>(null);

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

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
    setAlertModal({
      visible: true,
      type: 'success',
      title: 'Listing Reported',
      message: 'Thank you. Our StewardShop moderators review all flagged listings within 24 hours.',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, category === c.key && styles.chipActive]}
              onPress={() => setCategory(c.key)}
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
                <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
                  <FontAwesome name="shopping-bag" size={28} color="#94a3b8" />
                </View>
              )}
              <View style={styles.cardBody}>
                <View style={styles.badgeRow}>
                  <Text style={styles.catLabel}>{item.category}</Text>
                  {item.loveGiftAmount > 0 ? (
                    <View style={styles.loveGiftBadge}>
                      <Text style={styles.loveGiftText}>
                        Love Gift PHP {item.loveGiftAmount.toLocaleString()}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={2} style={styles.title}>
                  {item.title}
                </Text>
                <Text style={styles.price}>{formatPrice(item)}</Text>
                <View style={styles.sellerRow}>
                  <FontAwesome name="user-circle-o" size={13} color="#64748b" />
                  <Text numberOfLines={1} style={styles.sellerName}>
                    {item.seller.name} &bull; {item.locationArea}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {selected ? (
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {selected.title}
                  </Text>
                  <TouchableOpacity onPress={() => setSelected(null)}>
                    <FontAwesome name="times" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {selected.photos && selected.photos.length > 0 ? (
                  <Image source={{ uri: selected.photos[0] }} style={styles.modalImg} />
                ) : null}

                <Text style={styles.modalPrice}>{formatPrice(selected)}</Text>
                <Text style={styles.modalSeller}>
                  Listed by {selected.seller.name} ({selected.locationArea})
                </Text>
                <Text style={styles.modalDesc}>{selected.description}</Text>

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
        </View>
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
  },
  filterScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
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
  center: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  listContent: {
    padding: 14,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardImg: {
    width: '100%',
    height: 170,
    backgroundColor: '#f1f5f9',
  },
  cardImgPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0e7490',
    textTransform: 'uppercase',
  },
  loveGiftBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  loveGiftText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0e7490',
    marginBottom: 6,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sellerName: {
    fontSize: 12,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalImg: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: '#f1f5f9',
  },
  modalPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0e7490',
    marginBottom: 4,
  },
  modalSeller: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  modalDesc: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 20,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    marginBottom: 16,
  },
  reportBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
});
