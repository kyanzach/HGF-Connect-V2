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
  Share,
  Linking,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import client from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';
import { SkeletonStewardShopLoading } from '@/components/ui/SkeletonPulse';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ListingItem {
  id: number;
  memberId?: number;
  isOwner?: boolean;
  title: string;
  description?: string | null;
  category: string;
  listingType: string;
  status?: string;
  ogPrice?: number | null;
  price?: number | null;
  discountedPrice?: number | null;
  hasDiscount?: boolean;
  discountPercent?: number;
  priceLabel?: string | null;
  loveGiftAmount?: number | null;
  conditionType?: string | null;
  locationArea?: string | null;
  videoUrl?: string | null;
  viewCount: number;
  prospectCount?: number;
  shareCount?: number;
  createdAt: string;
  photo?: string | null;
  photos: string[];
  seller: {
    id: number;
    firstName?: string;
    lastName?: string;
    name: string;
    phone?: string | null;
    createdAt?: string | null;
    isVerified?: boolean;
    avatar?: string | null;
  };
}

const LISTING_TYPE_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'sale', label: '🏷️ For Sale' },
  { key: 'free', label: '🎁 Free' },
  { key: 'trade', label: '🔃 Trade' },
  { key: 'service', label: '🛠️ Service' },
  { key: 'rent', label: '🔄 Rent' },
  { key: 'official_store', label: '🏪 Official Store' },
];

const SELL_LISTING_TYPES = [
  { key: 'sale', label: '🏷️ For Sale' },
  { key: 'free', label: '🎁 Free / Donate' },
  { key: 'service', label: '🛠️ Service' },
  { key: 'rent', label: '🔄 Rent / Lend' },
  { key: 'trade', label: '🔃 Trade / Swap' },
];

const CATEGORIES = [
  'General',
  'Electronics',
  'Vehicles',
  'Home & Living',
  'Fashion & Apparel',
  'Food & Delicacies',
  'Services',
  'Books & Faith',
  'Health & Wellness',
  'Babies & Kids',
  'Real Estate & Rentals',
];

const CONDITIONS = [
  { key: 'brand_new', label: 'Brand New' },
  { key: 'like_new', label: 'Like New' },
  { key: 'good', label: 'Good' },
  { key: 'fair', label: 'Fair' },
  { key: 'na', label: 'N/A' },
];

const CONDITION_LABELS: Record<string, string> = {
  brand_new: 'Brand New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  na: 'N/A',
};

const TYPE_META: Record<string, { label: string; color: string }> = {
  sale: { label: 'For Sale', color: '#3b82f6' },
  trade: { label: 'For Trade', color: '#0284c7' },
  free: { label: 'Free / Blessing', color: '#10b981' },
  service: { label: 'Service', color: '#f59e0b' },
  rent: { label: 'For Rent', color: '#ec4899' },
  official_store: { label: 'Official Store', color: '#0d9488' },
};

function strikeText(text: string): string {
  return text
    .split('')
    .map((ch) => ch + '\u0336')
    .join('');
}

export default function StewardShopScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const deepLinkId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [listings, setListings] = useState<ListingItem[]>([]);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilterOpen, setPriceFilterOpen] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastLocationArea, setLastLocationArea] = useState('General Santos City');

  // Detail View state
  const [selectedItem, setSelectedItem] = useState<ListingItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [revealedData, setRevealedData] = useState<{
    prospectId?: number;
    actionType: string;
    couponCode: string;
    ogPrice?: number | null;
    discountedPrice?: number | null;
    sellerName: string;
    sellerMobile?: string | null;
  } | null>(null);
  const [myShareData, setMyShareData] = useState<{
    id?: number;
    shareCode: string;
    shareUrl: string;
    impressions: number;
    ctaClicks: number;
    prospectCount?: number;
  } | null>(null);
  const [generatingShare, setGeneratingShare] = useState(false);

  // Prospect Gate Modal ("Reveal Discount & Get Code" / "Contact the Seller")
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [gateActionType, setGateActionType] = useState<'reveal' | 'contact'>('reveal');
  const [prospectName, setProspectName] = useState('');
  const [prospectMobile, setProspectMobile] = useState('');
  const [prospectEmail, setProspectEmail] = useState('');
  const [gateSubmitting, setGateSubmitting] = useState(false);

  // Analytics Modal (for Seller / Admin)
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Post a Listing View
  const [createOpen, setCreateOpen] = useState(false);
  const [sellType, setSellType] = useState('sale');
  const [sellPhotos, setSellPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [sellCategory, setSellCategory] = useState('General');
  const [sellCondition, setSellCondition] = useState('good');
  const [ogPriceInput, setOgPriceInput] = useState('');
  const [discountedPriceInput, setDiscountedPriceInput] = useState('');
  const [priceLabelInput, setPriceLabelInput] = useState('');
  const [locationArea, setLocationArea] = useState('General Santos City');
  const [loveGiftInput, setLoveGiftInput] = useState('');
  const [aiEnhancingTarget, setAiEnhancingTarget] = useState<'title' | 'description' | null>(null);
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
      if (payload?.lastLocationArea) {
        setLastLocationArea(payload.lastLocationArea);
        setLocationArea(payload.lastLocationArea);
      }
    } catch {
      // keep cached
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (user) {
      setProspectName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
      setProspectMobile((user as any).phone || '');
      setProspectEmail(user.email || '');
    }
  }, [user]);

  const openListingDetail = async (item: ListingItem) => {
    setSelectedItem(item);
    setActivePhotoIdx(0);
    setRevealedData(null);
    setMyShareData(null);
    setDetailLoading(true);
    try {
      const { data } = await client.get(`/stewardshop?id=${item.id}`);
      const payload = data?.data || data;
      if (payload?.listing) {
        setSelectedItem({
          ...payload.listing,
          photo: payload.listing.photos?.[0] || item.photo || null,
        });
      }
      if (payload?.previouslyRevealed) {
        setRevealedData(payload.previouslyRevealed);
      }
      if (payload?.myShare) {
        setMyShareData(payload.myShare);
      }
    } catch {
      // fallback to item
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (deepLinkId && listings.length > 0) {
      const targetId = Number(deepLinkId);
      const found = listings.find((l) => Number(l.id) === targetId);
      if (found && (!selectedItem || Number(selectedItem.id) !== targetId)) {
        openListingDetail(found);
      }
    }
  }, [deepLinkId, listings]);

  const openAnalytics = async (listingId: number) => {
    setAnalyticsModalOpen(true);
    setAnalyticsLoading(true);
    try {
      const { data } = await client.get(`/stewardshop?analyticsFor=${listingId}`);
      setAnalyticsData(data?.data || data);
    } catch {
      setAnalyticsData(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleOpenGate = (actionType: 'reveal' | 'contact') => {
    if (!user) {
      setSelectedItem(null);
      router.push('/login');
      return;
    }
    setGateActionType(actionType);
    setGateModalOpen(true);
  };

  const handleSubmitProspectGate = async () => {
    if (!selectedItem) return;
    if (!prospectName.trim() || !prospectMobile.trim()) {
      setAlertModal({
        visible: true,
        type: 'warning',
        title: 'Required Fields',
        message: 'Please enter your name and mobile number.',
      });
      return;
    }
    setGateSubmitting(true);
    try {
      const { data } = await client.post('/stewardshop', {
        action: 'prospect',
        listingId: selectedItem.id,
        actionType: gateActionType,
        prospectName: prospectName.trim(),
        prospectMobile: prospectMobile.trim(),
        prospectEmail: prospectEmail.trim() || null,
      });
      const resData = data?.data || data;
      setRevealedData({
        prospectId: resData.prospectId,
        actionType: gateActionType,
        couponCode: resData.couponCode,
        ogPrice: resData.ogPrice,
        discountedPrice: resData.discountedPrice,
        sellerName: resData.sellerName || selectedItem.seller.name,
        sellerMobile: resData.sellerMobile || selectedItem.seller.phone,
      });
      setGateModalOpen(false);
    } catch (err: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Could Not Unlock',
        message: err?.response?.data?.message || 'Please try again.',
      });
    } finally {
      setGateSubmitting(false);
    }
  };

  const handleGenerateShareLink = async () => {
    if (!selectedItem) return;
    if (!user) {
      setSelectedItem(null);
      router.push('/login');
      return;
    }
    setGeneratingShare(true);
    try {
      const { data } = await client.post('/stewardshop', {
        action: 'generate_share',
        listingId: selectedItem.id,
      });
      const resData = data?.data || data;
      setMyShareData({
        id: resData.shareId,
        shareCode: resData.shareCode,
        shareUrl: resData.shareUrl,
        impressions: resData.impressions || 0,
        ctaClicks: resData.ctaClicks || 0,
      });
    } catch (err: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Share Link Failed',
        message: err?.response?.data?.message || 'Could not generate share link.',
      });
    } finally {
      setGeneratingShare(false);
    }
  };

  const handleShareListing = async (item: ListingItem, customUrl?: string) => {
    const slug = (item.title || `listing-${item.id}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const url = customUrl || `https://hgfapp.link/s/${slug}`;
    const og = item.ogPrice ?? item.price;
    const priceLine =
      item.hasDiscount && og
        ? `${strikeText(`₱${Number(og).toLocaleString()}`)} → Tap link to reveal special discount!`
        : og
        ? `₱${Number(og).toLocaleString()}`
        : 'Check this out on StewardShop!';
    try {
      await Share.share({
        message: `🤝 ${item.title}\n${priceLine}\n📍 ${item.locationArea || 'General Santos City'}\n\n${url}`,
      });
    } catch {}
  };

  const handlePickSellPhoto = async () => {
    if (sellPhotos.length >= 5) {
      setAlertModal({
        visible: true,
        type: 'info',
        title: 'Maximum 5 Photos',
        message: 'You can upload up to 5 photos per listing.',
      });
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - sellPhotos.length,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploadingPhoto(true);
    try {
      const uploaded: string[] = [];
      for (const asset of result.assets.slice(0, 5 - sellPhotos.length)) {
        const formData = new FormData();
        const ext = asset.uri.split('.').pop() || 'jpg';
        formData.append('file', {
          uri: asset.uri,
          name: `listing_${Date.now()}.${ext}`,
          type: asset.mimeType || 'image/jpeg',
        } as any);
        const { data } = await client.post('/posts/upload?folder=marketplace', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const url = data?.data?.imageUrl || data?.imageUrl;
        if (url) uploaded.push(url);
      }
      setSellPhotos((prev) => [...prev, ...uploaded].slice(0, 5));
    } catch {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Upload Failed',
        message: 'Could not upload photo. Please try again.',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAiEnhance = async (target: 'title' | 'description') => {
    const raw = target === 'title' ? title.trim() : description.trim();
    if (!raw && !title.trim()) {
      setAlertModal({
        visible: true,
        type: 'info',
        title: 'Enter a Title First',
        message: 'Type a basic title first so AI can enhance it.',
      });
      return;
    }
    setAiEnhancingTarget(target);
    try {
      const { data } = await client.post('/stewardshop', {
        action: 'enhance_listing',
        target,
        listingType: sellType,
        category: sellCategory,
        condition: sellCondition,
        title: title.trim(),
        description: description.trim(),
      });
      const enhanced = data?.data?.enhanced;
      if (enhanced) {
        if (target === 'title') setTitle(enhanced);
        else setDescription(enhanced);
      }
    } catch {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'AI Enhance Failed',
        message: 'Could not enhance text right now.',
      });
    } finally {
      setAiEnhancingTarget(null);
    }
  };

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
    if (sellType !== 'free' && sellType !== 'trade' && !ogPriceInput.trim()) {
      setAlertModal({
        visible: true,
        type: 'warning',
        title: 'Price Required',
        message: 'Please enter the Original Price (₱).',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await client.post('/stewardshop', {
        action: 'create_listing',
        title: title.trim(),
        description: description.trim(),
        listingType: sellType,
        category: sellCategory,
        conditionType: sellCondition === 'na' ? null : sellCondition,
        ogPrice: sellType === 'free' ? null : ogPriceInput ? Number(ogPriceInput) : null,
        discountedPrice:
          sellType === 'free' || !discountedPriceInput
            ? null
            : Number(discountedPriceInput),
        priceLabel: priceLabelInput.trim() || null,
        locationArea: locationArea.trim() || lastLocationArea || 'General Santos City',
        loveGiftAmount: loveGiftInput ? Number(loveGiftInput) : 0,
        videoUrl: videoUrl.trim() || null,
        photoPaths: sellPhotos,
      });
      await fetchListings();
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setSellPhotos([]);
      setOgPriceInput('');
      setDiscountedPriceInput('');
      setPriceLabelInput('');
      setLoveGiftInput('');
      setAlertModal({
        visible: true,
        type: 'success',
        title: 'Listing Published!',
        message: data?.message || 'Your listing is now live on StewardShop.',
      });
    } catch (err: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Failed to Post',
        message: err?.response?.data?.message || 'Could not create listing.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter listings identically to app/(public)/stewardshop/page.tsx
  const filteredListings = listings.filter((item) => {
    if (
      selectedType &&
      selectedType !== 'all' &&
      String(item.listingType || '').toLowerCase() !== selectedType.toLowerCase()
    ) {
      return false;
    }
    if (
      searchQuery.trim() &&
      !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(item.category || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(item.locationArea || '').toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    const p = item.ogPrice ?? item.price ?? 0;
    if (minPrice && !isNaN(Number(minPrice)) && p < Number(minPrice)) return false;
    if (maxPrice && !isNaN(Number(maxPrice)) && p > Number(maxPrice)) return false;
    return true;
  });

  // Live savings preview in Post a Listing form
  const ogNum = Number(ogPriceInput) || 0;
  const discNum = Number(discountedPriceInput) || 0;
  const liveSavings = ogNum > 0 && discNum > 0 && discNum < ogNum ? ogNum - discNum : 0;
  const liveSavingsPct = liveSavings > 0 ? Math.round((liveSavings / ogNum) * 100) : 0;

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
                onPress={() => router.push('/church?page=my-shares' as any)}
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
            <TouchableOpacity style={styles.clearSearchBtn} onPress={() => setSearchQuery('')}>
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
              (priceFilterOpen || Boolean(minPrice || maxPrice)) && styles.sortPillActive,
            ]}
            onPress={() => setPriceFilterOpen((p) => !p)}
          >
            <Text
              style={[
                styles.sortPillText,
                (priceFilterOpen || Boolean(minPrice || maxPrice)) && styles.sortPillTextActive,
              ]}
            >
              💰 Price {minPrice || maxPrice ? `(₱${minPrice || '0'}–${maxPrice || '∞'})` : '▾'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {priceFilterOpen && (
          <View style={styles.priceFilterBar}>
            <TextInput
              style={styles.priceFilterInput}
              placeholder="Min ₱"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={minPrice}
              onChangeText={setMinPrice}
            />
            <Text style={{ color: '#94a3b8', fontWeight: '700' }}>–</Text>
            <TextInput
              style={styles.priceFilterInput}
              placeholder="Max ₱"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={maxPrice}
              onChangeText={setMaxPrice}
            />
            {(minPrice || maxPrice) ? (
              <TouchableOpacity
                onPress={() => {
                  setMinPrice('');
                  setMaxPrice('');
                }}
                style={styles.clearPriceBtn}
              >
                <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '700' }}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );

  const renderCard = ({ item }: { item: ListingItem }) => {
    const typeKey = String(item.listingType || 'sale').toLowerCase();
    const typeMeta = TYPE_META[typeKey] ?? { label: item.listingType, color: '#64748b' };
    const og = item.ogPrice ?? item.price;
    const hasDiscount = Boolean(
      item.hasDiscount ||
        (item.discountedPrice && og && Number(item.discountedPrice) < Number(og))
    );

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => openListingDetail(item)}
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

          {typeKey === 'free' ? (
            <Text style={styles.freePriceText}>FREE 🎁</Text>
          ) : og != null ? (
            hasDiscount ? (
              <View style={styles.discountPriceRow}>
                <Text style={styles.strikethroughSmall}>
                  ₱{Number(og).toLocaleString('en-PH')}
                </Text>
                <View style={styles.revealTealBadge}>
                  <Text style={styles.revealTealBadgeText}>🔒 Reveal Price</Text>
                </View>
              </View>
            ) : (
              <View style={styles.memberPriceRow}>
                <Text style={styles.priceText}>
                  ₱{Number(og).toLocaleString('en-PH')}
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
              {item.seller?.name}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading && listings.length === 0 ? (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {renderHeader()}
          <SkeletonStewardShopLoading />
        </ScrollView>
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
              <Text style={styles.emptyTitle}>No listings found</Text>
              <Text style={styles.emptySub}>
                Be the first to post an item, service, or blessing for the community!
              </Text>
            </View>
          }
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          1:1 WEB REPLICA: LISTING DETAIL VIEW (ListingDetailClient.tsx)
         ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={Boolean(selectedItem)}
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        {selectedItem && (
          <View style={styles.detailScreen}>
            {/* Top Bar */}
            <View style={styles.detailTopBar}>
              <TouchableOpacity
                onPress={() => setSelectedItem(null)}
                style={styles.detailBackBtn}
              >
                <Text style={styles.detailBackText}>← StewardShop</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  handleShareListing(selectedItem, myShareData?.shareUrl)
                }
                style={styles.detailShareIconBtn}
              >
                <Text style={{ fontSize: 16 }}>📤 Share</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
              {/* Multi-Photo Carousel */}
              <View style={styles.carouselBox}>
                {selectedItem.photos && selectedItem.photos.length > 0 ? (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.92}
                      onPress={() => setLightboxOpen(true)}
                      style={{ width: '100%', height: 290 }}
                    >
                      <Image
                        source={{
                          uri:
                            selectedItem.photos[activePhotoIdx] ||
                            selectedItem.photos[0],
                        }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    {selectedItem.photos.length > 1 && (
                      <>
                        <View style={styles.photoCounterPill}>
                          <Text style={styles.photoCounterText}>
                            {activePhotoIdx + 1} / {selectedItem.photos.length}
                          </Text>
                        </View>
                        {activePhotoIdx > 0 && (
                          <TouchableOpacity
                            style={[styles.carouselArrow, { left: 10 }]}
                            onPress={() => setActivePhotoIdx((i) => Math.max(0, i - 1))}
                          >
                            <Text style={styles.carouselArrowText}>‹</Text>
                          </TouchableOpacity>
                        )}
                        {activePhotoIdx < selectedItem.photos.length - 1 && (
                          <TouchableOpacity
                            style={[styles.carouselArrow, { right: 10 }]}
                            onPress={() =>
                              setActivePhotoIdx((i) =>
                                Math.min(selectedItem.photos.length - 1, i + 1)
                              )
                            }
                          >
                            <Text style={styles.carouselArrowText}>›</Text>
                          </TouchableOpacity>
                        )}
                        <View style={styles.dotsRow}>
                          {selectedItem.photos.map((_, idx) => (
                            <TouchableOpacity
                              key={idx}
                              onPress={() => setActivePhotoIdx(idx)}
                              style={[
                                styles.dotIndicator,
                                idx === activePhotoIdx && styles.dotIndicatorActive,
                              ]}
                            />
                          ))}
                        </View>
                      </>
                    )}
                  </>
                ) : (
                  <View style={styles.placeholderBox}>
                    <Text style={{ fontSize: 54 }}>📦</Text>
                  </View>
                )}

                {selectedItem.status === 'sold' && (
                  <View style={styles.soldOverlay}>
                    <View style={styles.soldBadgeLarge}>
                      <Text style={styles.soldBadgeLargeText}>SOLD</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Main Content Card */}
              <View style={styles.detailBodyCard}>
                {/* Badges Row */}
                <View style={styles.detailBadgesRow}>
                  {(() => {
                    const tk = String(selectedItem.listingType || 'sale').toLowerCase();
                    const tm = TYPE_META[tk] || { label: selectedItem.listingType, color: '#3b82f6' };
                    return (
                      <View style={[styles.detailTypeBadge, { backgroundColor: tm.color }]}>
                        <Text style={styles.detailTypeBadgeText}>{tm.label}</Text>
                      </View>
                    );
                  })()}
                  {selectedItem.conditionType && CONDITION_LABELS[selectedItem.conditionType] ? (
                    <View style={styles.conditionBadge}>
                      <Text style={styles.conditionBadgeText}>
                        {CONDITION_LABELS[selectedItem.conditionType]}
                      </Text>
                    </View>
                  ) : null}
                  {selectedItem.category ? (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{selectedItem.category}</Text>
                    </View>
                  ) : null}

                  <View style={{ flex: 1 }} />

                  {/* Views count (clickable for owner/admin to open AnalyticsModal) */}
                  <TouchableOpacity
                    disabled={
                      !selectedItem.isOwner &&
                      user?.role !== 'admin' &&
                      user?.role !== 'moderator'
                    }
                    onPress={() => openAnalytics(selectedItem.id)}
                  >
                    <Text
                      style={[
                        styles.viewsCounterText,
                        (selectedItem.isOwner || user?.role === 'admin') && {
                          color: '#4EB1CB',
                          fontWeight: '700',
                          textDecorationLine: 'underline',
                        },
                      ]}
                    >
                      👁 {selectedItem.viewCount || 0} views
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Title */}
                <Text style={styles.detailHeading}>{selectedItem.title}</Text>

                {/* Price Section */}
                {(() => {
                  const tk = String(selectedItem.listingType || 'sale').toLowerCase();
                  const og = selectedItem.ogPrice ?? selectedItem.price;
                  const disc = selectedItem.discountedPrice;
                  const hasDisc = Boolean(
                    selectedItem.hasDiscount || (disc && og && Number(disc) < Number(og))
                  );
                  if (tk === 'free') {
                    return <Text style={styles.detailFreePrice}>FREE 🎁</Text>;
                  }
                  if (hasDisc && og) {
                    if (revealedData && revealedData.discountedPrice) {
                      const pct = Math.round(
                        ((Number(og) - Number(revealedData.discountedPrice)) / Number(og)) * 100
                      );
                      return (
                        <View style={styles.detailPriceRevealedRow}>
                          <Text style={styles.detailStrikeLarge}>
                            ₱{Number(og).toLocaleString('en-PH')}
                          </Text>
                          <Text style={styles.detailPriceLarge}>
                            ₱{Number(revealedData.discountedPrice).toLocaleString('en-PH')}
                          </Text>
                          <View style={styles.pctOffPill}>
                            <Text style={styles.pctOffPillText}>{pct}% OFF</Text>
                          </View>
                        </View>
                      );
                    }
                    return (
                      <View style={styles.detailPriceHiddenRow}>
                        <Text style={styles.detailStrikeLarge}>
                          ₱{Number(og).toLocaleString('en-PH')}
                        </Text>
                        <TouchableOpacity
                          style={styles.revealDiscountPillBtn}
                          onPress={() => handleOpenGate('reveal')}
                        >
                          <Text style={styles.revealDiscountPillText}>
                            🔒 Reveal Discount Price
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }
                  if (og != null) {
                    return (
                      <Text style={styles.detailPriceLarge}>
                        ₱{Number(og).toLocaleString('en-PH')}
                        {selectedItem.priceLabel ? (
                          <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '500' }}>
                            {' '}
                            {selectedItem.priceLabel}
                          </Text>
                        ) : null}
                      </Text>
                    );
                  }
                  return null;
                })()}

                {/* Description */}
                {selectedItem.description ? (
                  <Text style={styles.detailDescriptionText}>{selectedItem.description}</Text>
                ) : null}

                {/* Video Link if present */}
                {selectedItem.videoUrl ? (
                  <TouchableOpacity
                    style={styles.videoLinkBtn}
                    onPress={() => Linking.openURL(selectedItem.videoUrl!)}
                  >
                    <Text style={styles.videoLinkBtnText}>🎬 Watch Product Video →</Text>
                  </TouchableOpacity>
                ) : null}

                {/* Location & Date */}
                <View style={styles.locationDateRow}>
                  <Text style={styles.locationDateText}>
                    📍 {selectedItem.locationArea || 'General Santos City'}
                  </Text>
                  <Text style={styles.locationDateText}>
                    🗓️ Listed{' '}
                    {new Date(selectedItem.createdAt).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                {/* ── GATED CTAS OR COUPON REVEAL CARD ── */}
                {selectedItem.status !== 'sold' && !selectedItem.isOwner && (
                  <View style={{ marginTop: 18 }}>
                    {revealedData ? (
                      <View style={styles.couponRevealCard}>
                        <Text style={styles.couponRevealHeader}>
                          🎉 SPECIAL OFFER & CONTACT UNLOCKED
                        </Text>
                        {revealedData.discountedPrice && revealedData.ogPrice ? (
                          <Text style={styles.couponSavingsSub}>
                            You unlocked ₱
                            {(
                              Number(revealedData.ogPrice) -
                              Number(revealedData.discountedPrice)
                            ).toLocaleString()}{' '}
                            in community savings!
                          </Text>
                        ) : null}

                        <View style={styles.dashedCouponBox}>
                          <Text style={styles.dashedCouponLabel}>YOUR DISCOUNT CARD</Text>
                          <Text style={styles.dashedCouponCode}>{revealedData.couponCode}</Text>
                          <TouchableOpacity
                            style={styles.copyCodeSmallBtn}
                            onPress={() => {
                              Share.share({ message: revealedData.couponCode }).catch(() => {});
                            }}
                          >
                            <Text style={styles.copyCodeSmallBtnText}>📋 Copy / Share Code</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.sellerContactBox}>
                          <Text style={styles.sellerContactTitle}>
                            Seller: {revealedData.sellerName}
                          </Text>
                          {revealedData.sellerMobile ? (
                            <View style={styles.sellerPhoneActionsRow}>
                              <Text style={styles.sellerPhoneText}>
                                📱 {revealedData.sellerMobile}
                              </Text>
                              <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                  style={styles.phoneActionBtn}
                                  onPress={() => {
                                    Share.share({ message: revealedData.sellerMobile! }).catch(() => {});
                                  }}
                                >
                                  <Text style={styles.phoneActionBtnText}>📋 Share</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[
                                    styles.phoneActionBtn,
                                    { backgroundColor: '#10b981' },
                                  ]}
                                  onPress={() =>
                                    Linking.openURL(`tel:${revealedData.sellerMobile}`)
                                  }
                                >
                                  <Text style={[styles.phoneActionBtnText, { color: '#fff' }]}>
                                    📞 Call
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <Text style={{ fontSize: 12, color: '#64748b' }}>
                              The seller has been notified and will reach out to you.
                            </Text>
                          )}
                        </View>
                      </View>
                    ) : (
                      <View style={{ gap: 10 }}>
                        {(selectedItem.hasDiscount ||
                          (selectedItem.discountedPrice &&
                            selectedItem.ogPrice &&
                            Number(selectedItem.discountedPrice) <
                              Number(selectedItem.ogPrice))) && (
                          <TouchableOpacity
                            style={styles.ctaRevealBtn}
                            onPress={() => handleOpenGate('reveal')}
                            activeOpacity={0.88}
                          >
                            <Text style={styles.ctaRevealBtnText}>
                              🎟️ Reveal Discount & Get Code
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.ctaContactBtn}
                          onPress={() => handleOpenGate('contact')}
                          activeOpacity={0.88}
                        >
                          <Text style={styles.ctaContactBtnText}>💬 Contact the Seller</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* ── SHARE & BLESS PANEL (Love Gift Referral) ── */}
                {!selectedItem.isOwner &&
                  selectedItem.loveGiftAmount != null &&
                  selectedItem.loveGiftAmount > 0 && (
                    <View style={styles.shareAndBlessCard}>
                      <Text style={styles.shareAndBlessTitle}>
                        ❤️ Share & Bless — Earn ₱
                        {Number(selectedItem.loveGiftAmount).toLocaleString()}
                      </Text>
                      <Text style={styles.shareAndBlessSub}>
                        Share this listing with friends! When a buyer purchases through your
                        unique referral link, the seller will bless you with a{' '}
                        <Text style={{ fontWeight: '800', color: '#be123c' }}>
                          ₱{Number(selectedItem.loveGiftAmount).toLocaleString()} Love Gift
                        </Text>
                        .
                      </Text>

                      {myShareData ? (
                        <View style={styles.myShareGeneratedBox}>
                          <Text style={styles.myShareCodeLabel}>
                            Your Coupon Code: <Text style={{ fontWeight: '900' }}>{myShareData.shareCode}</Text>
                          </Text>
                          <Text style={styles.myShareUrlText} numberOfLines={1}>
                            {myShareData.shareUrl}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                            <TouchableOpacity
                              style={[styles.shareActionBtn, { backgroundColor: '#0f172a' }]}
                              onPress={() => {
                                Share.share({ message: myShareData.shareUrl }).catch(() => {});
                              }}
                            >
                              <Text style={styles.shareActionBtnText}>📋 Copy / Share Link</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.shareActionBtn, { backgroundColor: '#e11d48' }]}
                              onPress={() =>
                                handleShareListing(selectedItem, myShareData.shareUrl)
                              }
                            >
                              <Text style={styles.shareActionBtnText}>📤 Share Now</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.shareStatsMini}>
                            👁 {myShareData.impressions || 0} clicks · 🎯{' '}
                            {myShareData.ctaClicks || 0} unlocks
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.getShareLinkBtn}
                          onPress={handleGenerateShareLink}
                          disabled={generatingShare}
                        >
                          <Text style={styles.getShareLinkBtnText}>
                            {generatingShare
                              ? 'Generating Link…'
                              : '🔗 Get My Share Link'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                {/* ── OWNER SHARE PANEL ── */}
                {selectedItem.isOwner && (
                  <View style={styles.ownerPanelCard}>
                    <Text style={styles.ownerPanelTitle}>📣 Share Your Listing</Text>
                    <Text style={styles.ownerPanelSub}>
                      Share your listing link on Facebook or Messenger to reach more buyers.
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <TouchableOpacity
                        style={[styles.shareActionBtn, { backgroundColor: '#4EB1CB' }]}
                        onPress={() => handleShareListing(selectedItem)}
                      >
                        <Text style={styles.shareActionBtnText}>📤 Share Listing</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.shareActionBtn, { backgroundColor: '#0f172a' }]}
                        onPress={() => {
                          setSelectedItem(null);
                          router.push('/church?page=my-listings' as any);
                        }}
                      >
                        <Text style={styles.shareActionBtnText}>⚙️ Manage in My Listings</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* ── SELLER PROFILE CARD ── */}
                <View style={styles.sellerInfoCard}>
                  <View style={styles.sellerAvatarCircle}>
                    {selectedItem.seller?.avatar ? (
                      <Image
                        source={{ uri: selectedItem.seller.avatar }}
                        style={{ width: 48, height: 48, borderRadius: 24 }}
                      />
                    ) : (
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#4EB1CB' }}>
                        {selectedItem.seller?.name?.[0] || 'M'}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.sellerCardName}>{selectedItem.seller?.name}</Text>
                      {selectedItem.seller?.isVerified && (
                        <View style={styles.verifiedSellerPill}>
                          <Text style={styles.verifiedSellerPillText}>✓ Verified</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.sellerCardMeta}>
                      House of Grace Community Member · 📍{' '}
                      {selectedItem.locationArea || 'General Santos City'}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════
          LIGHTBOX FULLSCREEN PHOTO MODAL
         ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={lightboxOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxOpen(false)}
      >
        <View style={styles.lightboxBackdrop}>
          <TouchableOpacity
            style={styles.lightboxCloseBtn}
            onPress={() => setLightboxOpen(false)}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>✕</Text>
          </TouchableOpacity>
          {selectedItem?.photos?.[activePhotoIdx] && (
            <Image
              source={{ uri: selectedItem.photos[activePhotoIdx] }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.1 }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════
          PROSPECT GATE MODAL ("Reveal Discount & Get Code" / "Contact Seller")
         ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={gateModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setGateModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.detailTitle}>
              {gateActionType === 'reveal'
                ? '🎟️ Unlock Community Discount'
                : '💬 Contact the Seller'}
            </Text>
            <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
              {gateActionType === 'reveal'
                ? 'Confirm your contact details to reveal the special discounted price and receive your personal coupon code.'
                : 'Confirm your contact details to view the seller’s phone number and notify them of your interest.'}
            </Text>

            <Text style={styles.formFieldLabel}>Your Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#94a3b8"
              value={prospectName}
              onChangeText={setProspectName}
            />

            <Text style={styles.formFieldLabel}>Mobile Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="09XX XXX XXXX"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={prospectMobile}
              onChangeText={setProspectMobile}
            />

            <Text style={styles.formFieldLabel}>Email (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              value={prospectEmail}
              onChangeText={setProspectEmail}
            />

            <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>
              🔒 Your details are shared only with the seller of this listing.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.closeBtn, { flex: 1, backgroundColor: '#f1f5f9', marginTop: 0 }]}
                onPress={() => setGateModalOpen(false)}
              >
                <Text style={[styles.closeBtnText, { color: '#475569' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.closeBtn, { flex: 2, marginTop: 0 }]}
                onPress={handleSubmitProspectGate}
                disabled={gateSubmitting}
              >
                <Text style={styles.closeBtnText}>
                  {gateSubmitting
                    ? 'Unlocking…'
                    : gateActionType === 'reveal'
                    ? '🎟️ Reveal Price & Code'
                    : '💬 Show Seller Contact'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════
          ANALYTICS MODAL (For Seller / Admin)
         ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={analyticsModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAnalyticsModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.detailTitle}>📊 Listing Performance</Text>
            {analyticsLoading ? (
              <ActivityIndicator size="large" color="#4EB1CB" style={{ marginVertical: 30 }} />
            ) : analyticsData ? (
              <ScrollView>
                <View style={styles.analyticsKpiGrid}>
                  <View style={styles.analyticsKpiBox}>
                    <Text style={styles.analyticsKpiVal}>{analyticsData.views || 0}</Text>
                    <Text style={styles.analyticsKpiLabel}>Total Views</Text>
                  </View>
                  <View style={styles.analyticsKpiBox}>
                    <Text style={styles.analyticsKpiVal}>{analyticsData.uniqueViews || 0}</Text>
                    <Text style={styles.analyticsKpiLabel}>Unique Reach</Text>
                  </View>
                  <View style={styles.analyticsKpiBox}>
                    <Text style={styles.analyticsKpiVal}>{analyticsData.shares || 0}</Text>
                    <Text style={styles.analyticsKpiLabel}>Active Sharers</Text>
                  </View>
                  <View style={styles.analyticsKpiBox}>
                    <Text style={styles.analyticsKpiVal}>{analyticsData.prospects || 0}</Text>
                    <Text style={styles.analyticsKpiLabel}>Prospect Leads</Text>
                  </View>
                </View>

                {analyticsData.topSharers?.length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.formFieldLabel}>🏅 Top Sharers</Text>
                    {analyticsData.topSharers.map((s: any) => (
                      <View key={s.id} style={styles.analyticsRowItem}>
                        <Text style={{ fontWeight: '700', color: '#0f172a', flex: 1 }}>
                          {s.name} ({s.code})
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748b' }}>
                          {s.clicks} clicks · {s.leads} leads
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : null}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setAnalyticsModalOpen(false)}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════
          1:1 WEB REPLICA: POST A LISTING VIEW (app/(app)/stewardshop/sell/page.tsx)
         ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={createOpen}
        animationType="slide"
        onRequestClose={() => setCreateOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#f8fafc' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.detailTopBar}>
            <TouchableOpacity onPress={() => setCreateOpen(false)} style={styles.detailBackBtn}>
              <Text style={styles.detailBackText}>← Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
              Post a Listing
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
            {/* 1. Listing Type */}
            <View style={styles.sellSectionCard}>
              <Text style={styles.sellSectionTitle}>Listing Type</Text>
              <View style={styles.sellTypeGrid}>
                {SELL_LISTING_TYPES.map((t) => {
                  const active = sellType === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => setSellType(t.key)}
                      style={[styles.sellTypePill, active && styles.sellTypePillActive]}
                    >
                      <Text
                        style={[
                          styles.sellTypePillText,
                          active && styles.sellTypePillTextActive,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. Photos (Up to 5) */}
            <View style={styles.sellSectionCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.sellSectionTitle}>📷 Photos (up to 5)</Text>
                <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                  {sellPhotos.length} / 5 uploaded
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, marginTop: 10 }}
              >
                {sellPhotos.map((uri, idx) => (
                  <View key={idx} style={styles.sellPhotoThumbWrap}>
                    <Image source={{ uri }} style={styles.sellPhotoThumb} />
                    {idx === 0 && (
                      <View style={styles.mainPhotoBadge}>
                        <Text style={styles.mainPhotoBadgeText}>MAIN</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() =>
                        setSellPhotos((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {sellPhotos.length < 5 && (
                  <TouchableOpacity
                    style={styles.addPhotoBox}
                    onPress={handlePickSellPhoto}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <ActivityIndicator size="small" color="#4EB1CB" />
                    ) : (
                      <>
                        <Text style={{ fontSize: 24, color: '#4EB1CB' }}>＋</Text>
                        <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '700' }}>
                          Add Photo
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            {/* 3. Title & Description with AI Enhance */}
            <View style={styles.sellSectionCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.formFieldLabel}>Title *</Text>
                <TouchableOpacity
                  style={styles.aiEnhanceBtn}
                  onPress={() => handleAiEnhance('title')}
                  disabled={aiEnhancingTarget !== null}
                >
                  <Text style={styles.aiEnhanceBtnText}>
                    {aiEnhancingTarget === 'title' ? '✨ Enhancing…' : '✨ AI Enhance'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="What are you offering?"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
              />

              <View style={[styles.rowBetween, { marginTop: 8 }]}>
                <Text style={styles.formFieldLabel}>Description</Text>
                <TouchableOpacity
                  style={styles.aiEnhanceBtn}
                  onPress={() => handleAiEnhance('description')}
                  disabled={aiEnhancingTarget !== null}
                >
                  <Text style={styles.aiEnhanceBtnText}>
                    {aiEnhancingTarget === 'description'
                      ? '✨ Enhancing…'
                      : '✨ Enhance with AI'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { minHeight: 96, textAlignVertical: 'top' }]}
                placeholder="Share condition, specs, pickup/delivery details..."
                placeholderTextColor="#94a3b8"
                multiline
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.formFieldLabel}>Video URL (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Facebook or YouTube video link (optional)"
                placeholderTextColor="#94a3b8"
                value={videoUrl}
                onChangeText={setVideoUrl}
              />
            </View>

            {/* 4. Category & Condition */}
            <View style={styles.sellSectionCard}>
              <Text style={styles.formFieldLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, marginBottom: 14 }}
              >
                {CATEGORIES.map((cat) => {
                  const active = sellCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setSellCategory(cat)}
                      style={[styles.sellTypePill, active && styles.sellTypePillActive]}
                    >
                      <Text
                        style={[
                          styles.sellTypePillText,
                          active && styles.sellTypePillTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.formFieldLabel}>Condition</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6 }}
              >
                {CONDITIONS.map((c) => {
                  const active = sellCondition === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      onPress={() => setSellCondition(c.key)}
                      style={[styles.sellTypePill, active && styles.sellTypePillActive]}
                    >
                      <Text
                        style={[
                          styles.sellTypePillText,
                          active && styles.sellTypePillTextActive,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 5. Pricing & Hidden Community Discount */}
            {sellType !== 'free' && (
              <View style={styles.sellSectionCard}>
                <Text style={styles.sellSectionTitle}>💰 Pricing & Community Discount</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formFieldLabel}>Original Price (₱) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 1500"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={ogPriceInput}
                      onChangeText={setOgPriceInput}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formFieldLabel}>🔒 Discounted Price (₱)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Optional"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={discountedPriceInput}
                      onChangeText={setDiscountedPriceInput}
                    />
                  </View>
                </View>

                {liveSavings > 0 && (
                  <View style={styles.savingsBanner}>
                    <Text style={styles.savingsBannerText}>
                      🎉 ₱{ogNum.toLocaleString()} → ₱{discNum.toLocaleString()} — saving ₱
                      {liveSavings.toLocaleString()} ({liveSavingsPct}% off)! Buyers unlock this
                      special price with a coupon code.
                    </Text>
                  </View>
                )}

                <Text style={styles.formFieldLabel}>Price Label (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. per kilo, per hour, negotiable"
                  placeholderTextColor="#94a3b8"
                  value={priceLabelInput}
                  onChangeText={setPriceLabelInput}
                />
              </View>
            )}

            {/* 6. Location Area */}
            <View style={styles.sellSectionCard}>
              <Text style={styles.formFieldLabel}>📍 Location Area</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Lagao, General Santos City"
                placeholderTextColor="#94a3b8"
                value={locationArea}
                onChangeText={setLocationArea}
              />
            </View>

            {/* 7. Share & Bless — Love Gift */}
            {sellType !== 'free' && (
              <View style={styles.shareAndBlessCard}>
                <Text style={styles.shareAndBlessTitle}>
                  ❤️ Share & Bless — Love Gift (₱)
                </Text>
                <Text style={styles.shareAndBlessSub}>
                  Optional: Offer a Love Gift reward to church members who share your listing and
                  bring you the winning buyer!
                </Text>
                <TextInput
                  style={[styles.input, { marginTop: 10, marginBottom: 0 }]}
                  placeholder="e.g. 100 (leave blank if none)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={loveGiftInput}
                  onChangeText={setLoveGiftInput}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.closeBtn, { paddingVertical: 15, marginTop: 18 }]}
              onPress={handleCreateListing}
              disabled={submitting}
            >
              <Text style={[styles.closeBtnText, { fontSize: 16 }]}>
                {submitting ? 'Publishing Listing…' : '🚀 Post Listing'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Hero Header
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
  priceFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  priceFilterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  clearPriceBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  discountPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  revealTealBadge: {
    backgroundColor: '#e0f7fa',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  revealTealBadgeText: {
    color: '#0f766e',
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
    fontSize: 11.5,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    fontWeight: '700',
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

  // Empty State
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 60,
    paddingHorizontal: 24,
    marginHorizontal: 14,
    alignItems: 'center',
  },
  emptyTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },

  // Detail Screen
  detailScreen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  detailTopBar: {
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailBackBtn: {
    paddingVertical: 4,
  },
  detailBackText: {
    color: '#4EB1CB',
    fontWeight: '800',
    fontSize: 15,
  },
  detailShareIconBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  carouselBox: {
    width: '100%',
    height: 290,
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  photoCounterPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  photoCounterText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  carouselArrow: {
    position: 'absolute',
    top: '42%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselArrowText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: -2,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dotIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotIndicatorActive: {
    backgroundColor: '#ffffff',
    width: 18,
  },
  soldOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldBadgeLarge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  soldBadgeLargeText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  detailBodyCard: {
    padding: 18,
  },
  detailBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  detailTypeBadge: {
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  detailTypeBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  conditionBadge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  conditionBadgeText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryBadgeText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  viewsCounterText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  detailHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  detailFreePrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10b981',
    marginBottom: 10,
  },
  detailPriceLarge: {
    fontSize: 24,
    fontWeight: '900',
    color: '#4EB1CB',
  },
  detailStrikeLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  detailPriceHiddenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  detailPriceRevealedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  pctOffPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  pctOffPillText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '800',
  },
  revealDiscountPillBtn: {
    backgroundColor: '#e0f7fa',
    borderWidth: 1,
    borderColor: '#4EB1CB',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  revealDiscountPillText: {
    color: '#0f766e',
    fontWeight: '800',
    fontSize: 12,
  },
  detailDescriptionText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 12,
  },
  videoLinkBtn: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  videoLinkBtnText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 13,
  },
  locationDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  locationDateText: {
    fontSize: 12,
    color: '#64748b',
  },
  ctaRevealBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaRevealBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
  },
  ctaContactBtn: {
    backgroundColor: '#4EB1CB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaContactBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
  },

  // CouponRevealCard
  couponRevealCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: 16,
    padding: 16,
  },
  couponRevealHeader: {
    fontSize: 14,
    fontWeight: '900',
    color: '#166534',
    textAlign: 'center',
  },
  couponSavingsSub: {
    fontSize: 12,
    color: '#15803d',
    textAlign: 'center',
    marginTop: 4,
  },
  dashedCouponBox: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginVertical: 12,
  },
  dashedCouponLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
  },
  dashedCouponCode: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginVertical: 4,
  },
  copyCodeSmallBtn: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    marginTop: 4,
  },
  copyCodeSmallBtnText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
  },
  sellerContactBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
  },
  sellerContactTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  sellerPhoneActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sellerPhoneText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f766e',
  },
  phoneActionBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  phoneActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },

  // Share & Bless Card
  shareAndBlessCard: {
    backgroundColor: '#fff1f2',
    borderWidth: 1.5,
    borderColor: '#fecdd3',
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
  },
  shareAndBlessTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#be123c',
  },
  shareAndBlessSub: {
    fontSize: 13,
    color: '#881337',
    lineHeight: 19,
    marginTop: 4,
  },
  getShareLinkBtn: {
    backgroundColor: '#e11d48',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 12,
  },
  getShareLinkBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  myShareGeneratedBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  myShareCodeLabel: {
    fontSize: 12,
    color: '#be123c',
  },
  myShareUrlText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  shareActionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  shareStatsMini: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },

  // Owner Share Panel
  ownerPanelCard: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 14,
    padding: 16,
    marginTop: 18,
  },
  ownerPanelTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0369a1',
  },
  ownerPanelSub: {
    fontSize: 12,
    color: '#0c4a6e',
    marginTop: 4,
  },

  // Seller Profile Card
  sellerInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sellerAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0f7fa',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sellerCardName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  verifiedSellerPill: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  verifiedSellerPillText: {
    color: '#1d4ed8',
    fontSize: 10,
    fontWeight: '800',
  },
  sellerCardMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  // Lightbox
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 54,
    right: 20,
    zIndex: 10,
    padding: 8,
  },

  // Analytics Modal
  analyticsKpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  analyticsKpiBox: {
    width: '47%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  analyticsKpiVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  analyticsKpiLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  analyticsRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  // Sell Form
  sellSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sellSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  sellTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  sellTypePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sellTypePillActive: {
    backgroundColor: '#4EB1CB',
    borderColor: '#4EB1CB',
  },
  sellTypePillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  sellTypePillTextActive: {
    color: '#ffffff',
  },
  sellPhotoThumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  sellPhotoThumb: {
    width: '100%',
    height: '100%',
  },
  mainPhotoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#4EB1CB',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  mainPhotoBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBox: {
    width: 84,
    height: 84,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  formFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  aiEnhanceBtn: {
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#5eead4',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  aiEnhanceBtnText: {
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '800',
  },
  savingsBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  savingsBannerText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '700',
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  closeBtn: {
    marginTop: 18,
    backgroundColor: '#4EB1CB',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
    backgroundColor: '#f8fafc',
  },
});
