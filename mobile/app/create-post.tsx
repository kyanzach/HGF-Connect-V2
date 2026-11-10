import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Image,
  ImageBackground,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopHeader from '@/components/ui/TopHeader';
import client from '@/api/client';
import { useAuth } from '@/context/AuthContext';

const PRIMARY = '#4EB1CB';
const PURPLE = '#0284c7';

const PRIMARY_TABS = [
  { value: 'thoughts', icon: '✍️', label: 'Thoughts' },
  { value: 'testimony', icon: '🙌', label: 'Testimony' },
  { value: 'prayer', icon: '🙏', label: 'Prayer' },
] as const;

const EMOJIS = [
  '🙏', '🙌', '❤️', '✨', '📖',
  '📜', '🕊️', '⛪', '😊', '👍',
  '🎉', '🔥', '🌟', '💡', '👏',
];

const VISIBILITY_OPTIONS = [
  { value: 'MEMBERS_ONLY', label: 'Members Only' },
  { value: 'PUBLIC', label: 'Everyone (Public)' },
  { value: 'PRIVATE', label: 'Only Me' },
];

const DOCK_ITEMS = [
  { route: '/(tabs)', icon: '🏠', label: 'Home' },
  { route: '/(tabs)/prayer', icon: '🙏', label: 'Prayer Wall' },
  { route: '/create-post', icon: '✍️', label: 'Write', isFab: true },
  { route: '/(tabs)/stewardshop', icon: '🤝', label: 'StewardShop' },
  { route: '/(tabs)/profile', icon: '👤', label: 'Me' },
];

export default function CreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const bottomInset = Math.max(insets.bottom, 8);

  const [activeTab, setActiveTab] = useState<'thoughts' | 'testimony' | 'prayer'>(
    params.tab === 'prayer'
      ? 'prayer'
      : params.tab === 'testimony'
      ? 'testimony'
      : 'thoughts'
  );
  const [content, setContent] = useState('');
  const [selectedBg, setSelectedBg] = useState('');
  const [showBgOptions, setShowBgOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [photos, setPhotos] = useState<{ uri: string; name: string; type: string }[]>([]);
  const [visibility, setVisibility] = useState('MEMBERS_ONLY');
  const [showVisModal, setShowVisModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // AI Rewriter State (Cebuano | Taglish | English)
  const [showAiLangPicker, setShowAiLangPicker] = useState(false);
  const [aiRewriting, setAiRewriting] = useState(false);
  const [preAiContent, setPreAiContent] = useState<string | null>(null);

  // Automatic URL Link Preview State
  const [linkPreview, setLinkPreview] = useState<{
    url: string;
    title?: string | null;
    description?: string | null;
    image?: string | null;
  } | null>(null);
  const [dismissedUrl, setDismissedUrl] = useState<string | null>(null);

  const handleContentChange = (txt: string) => {
    setContent(txt);
    const urlMatch = txt.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      const detectedUrl = urlMatch[0];
      if (detectedUrl !== dismissedUrl && linkPreview?.url !== detectedUrl) {
        client
          .get(`/feed?checkMetadataUrl=${encodeURIComponent(detectedUrl)}`)
          .then((res) => {
            const meta = res.data?.data || res.data;
            if (meta && (meta.title || meta.description || meta.image)) {
              setLinkPreview({
                url: detectedUrl,
                title: meta.title || detectedUrl,
                description: meta.description || null,
                image: meta.image || null,
              });
            }
          })
          .catch(() => {});
      }
    }
  };

  const handleAiRewrite = async (language: 'Cebuano' | 'Taglish' | 'English') => {
    if (!content.trim() || aiRewriting) return;
    setAiRewriting(true);
    setError('');
    try {
      const { data } = await client.post('/feed', {
        action: 'improve_text',
        text: content.trim(),
        language,
        type: activeTab,
      });
      const improved = data?.data?.improved || data?.improved;
      if (improved) {
        setPreAiContent(content);
        setContent(improved);
        setShowAiLangPicker(false);
      }
    } catch {
      setError('Could not rewrite text right now. Please try again.');
    } finally {
      setAiRewriting(false);
    }
  };

  const handlePickPhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, 21 - photos.length),
        quality: 0.85,
      });

      if (!result.canceled && result.assets.length > 0) {
        const picked = result.assets.map((a, idx) => ({
          uri: a.uri,
          name: a.fileName || `photo_${Date.now()}_${idx}.jpg`,
          type: a.mimeType || 'image/jpeg',
        }));
        if (photos.length + picked.length > 21) {
          setError('You can upload a maximum of 21 photos. 📸');
          const allowed = 21 - photos.length;
          if (allowed > 0) {
            setPhotos((prev) => [...prev, ...picked.slice(0, allowed)]);
          }
        } else {
          setError('');
          setPhotos((prev) => [...prev, ...picked]);
        }
      }
    } catch {
      setError('Could not open photo library.');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) {
      router.push('/login' as any);
      return;
    }
    if (!content.trim() && !selectedBg && photos.length === 0) {
      setError('Write something to share first! ✍️');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const uploadedPaths: string[] = [];
      for (const p of photos) {
        const formData = new FormData();
        formData.append('file', {
          uri: p.uri,
          name: p.name,
          type: p.type,
        } as any);
        const upRes = await client.post('/posts/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (upRes.data?.photoPath) {
          uploadedPaths.push(upRes.data.photoPath);
        }
      }

      const postType =
        activeTab === 'prayer'
          ? 'PRAYER'
          : activeTab === 'testimony'
          ? 'PRAISE'
          : 'TEXT';

      await client.post('/feed', {
        type: postType,
        content: content.trim(),
        imageUrl: activeTab === 'thoughts' && selectedBg ? selectedBg : null,
        visibility,
        photos: uploadedPaths,
        linkUrl: linkPreview?.url || null,
        linkTitle: linkPreview?.title || null,
        linkDescription: linkPreview?.description || null,
        linkImage: linkPreview?.image || null,
      });

      router.replace('/(tabs)' as any);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const visLabel =
    VISIBILITY_OPTIONS.find((v) => v.value === visibility)?.label || 'Members Only';

  const renderCardContent = () => {
    const isColoredBg = activeTab === 'thoughts' && Boolean(selectedBg);

    return (
      <>
        {activeTab === 'testimony' ? (
          <Text style={styles.cardInnerLabel}>Your Testimony</Text>
        ) : null}
        {activeTab === 'prayer' ? (
          <Text style={styles.cardInnerLabel}>Your Prayer Request</Text>
        ) : null}

        <View style={[isColoredBg && styles.coloredTextWrap]}>
          <TextInput
            value={content}
            onChangeText={handleContentChange}
            placeholder={
              activeTab === 'prayer'
                ? 'Share your prayer request with the community...'
                : activeTab === 'testimony'
                ? 'Salamat sa Ginoo kay...'
                : 'What are your thoughts?'
            }
            placeholderTextColor={isColoredBg ? 'rgba(255,255,255,0.75)' : '#94a3b8'}
            multiline
            style={[
              styles.textarea,
              isColoredBg && styles.textareaColored,
            ]}
          />
        </View>

        {/* ✨ Make it better with AI (Cebuano | Taglish | English) */}
        {content.trim().length > 5 && (
          <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowAiLangPicker((v) => !v)}
                disabled={aiRewriting}
                style={{
                  backgroundColor: isColoredBg ? 'rgba(255,255,255,0.22)' : '#e0f2fe',
                  borderWidth: 1,
                  borderColor: isColoredBg ? 'rgba(255,255,255,0.4)' : '#bae6fd',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: isColoredBg ? '#ffffff' : '#0284c7',
                  }}
                >
                  {aiRewriting ? '✨ Rewriting...' : '✨ Make it better with AI'}
                </Text>
              </TouchableOpacity>

              {preAiContent !== null && (
                <TouchableOpacity
                  onPress={() => {
                    setContent(preAiContent);
                    setPreAiContent(null);
                  }}
                  style={{
                    backgroundColor: '#f1f5f9',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#475569' }}>
                    ↩️ Undo AI rewrite
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {showAiLangPicker && !aiRewriting && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Text
                  style={{
                    fontSize: 11.5,
                    color: isColoredBg ? '#ffffff' : '#64748b',
                    fontWeight: '600',
                  }}
                >
                  Rewrite in:
                </Text>
                {(['Cebuano', 'Taglish', 'English'] as const).map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    onPress={() => handleAiRewrite(lang)}
                    style={{
                      backgroundColor: PRIMARY,
                      paddingHorizontal: 11,
                      paddingVertical: 5,
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#ffffff' }}>
                      {lang}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Automatic URL Link Preview Card */}
        {linkPreview && (
          <View
            style={{
              marginHorizontal: 14,
              marginBottom: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              backgroundColor: '#f8fafc',
              padding: 10,
              position: 'relative',
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setDismissedUrl(linkPreview.url);
                setLinkPreview(null);
              }}
              style={{
                position: 'absolute',
                top: 6,
                right: 8,
                zIndex: 2,
                padding: 4,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748b' }}>✕</Text>
            </TouchableOpacity>
            <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', paddingRight: 20 }}>
              🔗 {linkPreview.title || linkPreview.url}
            </Text>
            {linkPreview.description ? (
              <Text numberOfLines={2} style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                {linkPreview.description}
              </Text>
            ) : null}
          </View>
        )}

        {/* Bottom control row: Aa background picker & 😊 emoji picker */}
        <View
          style={[
            styles.bottomControlRow,
            {
              borderTopColor: isColoredBg
                ? 'rgba(255,255,255,0.2)'
                : '#f1f5f9',
            },
          ]}
        >
          {/* Left: Aa button + circular options */}
          <View style={styles.aaControlsRow}>
            {activeTab === 'thoughts' && photos.length === 0 ? (
              <>
                <TouchableOpacity
                  onPress={() => setShowBgOptions((v) => !v)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#f093fb', '#f5576c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.aaBtn}
                  >
                    <Text style={styles.aaBtnText}>Aa</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {showBgOptions ? (
                  <View style={styles.bgCirclesRow}>
                    {/* Clear plain background */}
                    <TouchableOpacity
                      onPress={() => setSelectedBg('')}
                      style={[
                        styles.bgCirclePlain,
                        {
                          borderColor:
                            selectedBg === '' ? PRIMARY : '#cbd5e1',
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>
                        ✕
                      </Text>
                    </TouchableOpacity>

                    {/* Teal gradient circle */}
                    <TouchableOpacity onPress={() => setSelectedBg('bg:teal')}>
                      <LinearGradient
                        colors={['#2d8fa6', '#4EB1CB']}
                        style={[
                          styles.bgCircleOption,
                          selectedBg === 'bg:teal' && styles.bgCircleSelected,
                        ]}
                      />
                    </TouchableOpacity>

                    {/* Red gradient circle */}
                    <TouchableOpacity onPress={() => setSelectedBg('bg:red')}>
                      <LinearGradient
                        colors={['#991b1b', '#ef4444']}
                        style={[
                          styles.bgCircleOption,
                          selectedBg === 'bg:red' && styles.bgCircleSelected,
                        ]}
                      />
                    </TouchableOpacity>

                    {/* Mountain image circle */}
                    <TouchableOpacity onPress={() => setSelectedBg('bg:mountain')}>
                      <Image
                        source={require('../assets/images/mountain.png')}
                        style={[
                          styles.bgCircleOption,
                          selectedBg === 'bg:mountain' && styles.bgCircleSelected,
                        ]}
                      />
                    </TouchableOpacity>

                    {/* Ocean image circle */}
                    <TouchableOpacity onPress={() => setSelectedBg('bg:ocean')}>
                      <Image
                        source={require('../assets/images/ocean.png')}
                        style={[
                          styles.bgCircleOption,
                          selectedBg === 'bg:ocean' && styles.bgCircleSelected,
                        ]}
                      />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>

          {/* Right: 😊 Emoji Picker Toggler */}
          <TouchableOpacity
            style={styles.emojiBtn}
            onPress={() => setShowEmojiPicker((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 20 }}>😊</Text>
          </TouchableOpacity>
        </View>

        {showEmojiPicker ? (
          <View style={styles.emojiGrid}>
            {EMOJIS.map((em) => (
              <TouchableOpacity
                key={em}
                style={styles.emojiCell}
                onPress={() => {
                  setContent((c) => c + em);
                  setShowEmojiPicker(false);
                }}
              >
                <Text style={{ fontSize: 20 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <TopHeader />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header: ← Back  Share with the Community */}
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderRow}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backBtn}
                activeOpacity={0.75}
              >
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.pageTitle}>
                {activeTab === 'prayer'
                  ? 'Submit Prayer Request'
                  : 'Share with the Community'}
              </Text>
            </View>
            {activeTab === 'prayer' ? (
              <Text style={styles.prayerSubtitle}>
                The community will pray with you
              </Text>
            ) : null}
          </View>

          {/* Streamlined Primary Tabs */}
          <View style={styles.tabsRow}>
            {PRIMARY_TABS.map((t) => {
              const active = activeTab === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.tabBtn,
                    active && {
                      backgroundColor:
                        activeTab === 'prayer' ? '#f3e8ff' : '#e0f7fb',
                    },
                  ]}
                  onPress={() => {
                    setActiveTab(t.value);
                    setError('');
                    if (t.value !== 'thoughts') {
                      setSelectedBg('');
                      setShowBgOptions(false);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      {
                        color: active
                          ? activeTab === 'prayer'
                            ? PURPLE
                            : PRIMARY
                          : '#64748b',
                        fontWeight: active ? '700' : '500',
                      },
                    ]}
                  >
                    {t.icon} {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeTab === 'testimony' ? (
            <View style={styles.testimonyNotice}>
              <Text style={styles.testimonyNoticeText}>
                Share what God has done in your life! Feel free to write in Cebuano, Taglish, or English in your own words.
              </Text>
            </View>
          ) : null}

          {/* Content Card container with custom background option */}
          {activeTab === 'thoughts' && selectedBg === 'bg:teal' ? (
            <LinearGradient
              colors={['#2d8fa6', '#4EB1CB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.contentCard, styles.contentCardColored]}
            >
              {renderCardContent()}
            </LinearGradient>
          ) : activeTab === 'thoughts' && selectedBg === 'bg:red' ? (
            <LinearGradient
              colors={['#991b1b', '#ef4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.contentCard, styles.contentCardColored]}
            >
              {renderCardContent()}
            </LinearGradient>
          ) : activeTab === 'thoughts' && selectedBg === 'bg:mountain' ? (
            <ImageBackground
              source={require('../assets/images/mountain.png')}
              style={[styles.contentCard, styles.contentCardColored, { overflow: 'hidden' }]}
              imageStyle={{ borderRadius: 16 }}
            >
              <View style={styles.bgDarkOverlay} />
              {renderCardContent()}
            </ImageBackground>
          ) : activeTab === 'thoughts' && selectedBg === 'bg:ocean' ? (
            <ImageBackground
              source={require('../assets/images/ocean.png')}
              style={[styles.contentCard, styles.contentCardColored, { overflow: 'hidden' }]}
              imageStyle={{ borderRadius: 16 }}
            >
              <View style={styles.bgDarkOverlay} />
              {renderCardContent()}
            </ImageBackground>
          ) : (
            <View style={[styles.contentCard, styles.contentCardPlain]}>
              {renderCardContent()}
            </View>
          )}

          {/* Add Photos (Optional) Card */}
          {!selectedBg ? (
            <View style={styles.photoCard}>
              <Text style={styles.photoCardTitle}>Add Photos (Optional)</Text>

              <View style={styles.photoPreviewsWrap}>
                {photos.map((p, i) => (
                  <View key={i} style={styles.photoPreviewBox}>
                    <Image source={{ uri: p.uri }} style={styles.photoPreviewImg} />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => removePhoto(i)}
                    >
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                        ✕
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {photos.length < 21 ? (
                  <TouchableOpacity
                    style={styles.addPhotoDashedBtn}
                    onPress={handlePickPhotos}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addPhotoPlus}>+</Text>
                    <Text style={styles.addPhotoLabel}>Add</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.photoCounterRow}>
                <Text style={styles.photoCounterText}>Max 21 photos</Text>
                <Text style={styles.photoCounterText}>
                  {photos.length} / 21 selected
                </Text>
              </View>
            </View>
          ) : null}

          {/* 🔒 Visible to Card */}
          <View style={styles.visibilityCard}>
            <Text style={styles.visibilityLabel}>🔒 Visible to</Text>
            <TouchableOpacity
              style={styles.visibilitySelectBtn}
              onPress={() => setShowVisModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.visibilitySelectText}>{visLabel}</Text>
              <Text style={styles.visibilitySelectChevron}>⌄</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: activeTab === 'prayer' ? PURPLE : PRIMARY,
                opacity: submitting ? 0.7 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.88}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {activeTab === 'prayer'
                  ? '🙏 Submit Prayer Request'
                  : activeTab === 'testimony'
                  ? '🙌 Post Testimony'
                  : '✍️ Post Thoughts'}
              </Text>
            )}
          </TouchableOpacity>

          {activeTab === 'prayer' ? (
            <Text style={styles.prayerFooterHint}>
              Your request will be visible on the Prayer Wall for the community to pray over.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Dock — exact replica of screenshot #3 */}
      <View
        style={[
          styles.dockWrap,
          {
            height: 64 + bottomInset,
            paddingBottom: bottomInset,
          },
        ]}
      >
        {DOCK_ITEMS.map((item) => {
          if (item.isFab) {
            return (
              <TouchableOpacity
                key={item.route}
                style={styles.fabSlot}
                activeOpacity={0.85}
              >
                <View style={styles.fabCircle}>
                  <Text style={styles.fabIcon}>{item.icon}</Text>
                </View>
                <Text style={styles.fabLabel}>{item.label}</Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={item.route}
              style={styles.dockItem}
              activeOpacity={0.8}
              onPress={() => router.replace(item.route as any)}
            >
              <Text style={styles.dockIcon}>{item.icon}</Text>
              <Text style={styles.dockLabel}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Visibility Selector Modal */}
      <Modal
        visible={showVisModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVisModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowVisModal(false)}
        >
          <View style={styles.visModalCard}>
            <Text style={styles.visModalTitle}>Visible to</Text>
            {VISIBILITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.visOptionRow,
                  visibility === opt.value && { backgroundColor: '#e0f7fb' },
                ]}
                onPress={() => {
                  setVisibility(opt.value);
                  setShowVisModal(false);
                }}
              >
                <Text
                  style={[
                    styles.visOptionText,
                    visibility === opt.value && {
                      color: PRIMARY,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    marginBottom: 18,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 4,
  },
  backBtnText: {
    fontSize: 18,
    color: PRIMARY,
    fontWeight: '500',
  },
  pageTitle: {
    fontSize: 17.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  prayerSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 4,
    paddingLeft: 66,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  tabBtnText: {
    fontSize: 14,
  },
  testimonyNotice: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  testimonyNoticeText: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 20,
  },
  contentCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: 'relative',
  },
  contentCardPlain: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  contentCardColored: {
    minHeight: 260,
    justifyContent: 'space-between',
  },
  bgDarkOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 16,
  },
  cardInnerLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  coloredTextWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  textarea: {
    minHeight: 110,
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    textAlignVertical: 'top',
    lineHeight: 22,
    width: '100%',
  },
  textareaColored: {
    fontSize: 21,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 30,
  },
  bottomControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  aaControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aaBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aaBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  bgCirclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bgCirclePlain: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgCircleOption: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  bgCircleSelected: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  emojiBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiGrid: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emojiCell: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  photoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  photoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },
  photoPreviewsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoPreviewBox: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  photoPreviewImg: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoDashedBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addPhotoPlus: {
    fontSize: 24,
    color: '#64748b',
    lineHeight: 26,
  },
  addPhotoLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
  },
  photoCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  photoCounterText: {
    fontSize: 11.5,
    color: '#64748b',
  },
  visibilityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  visibilityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  visibilitySelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  visibilitySelectText: {
    fontSize: 13,
    color: '#1e293b',
  },
  visibilitySelectChevron: {
    fontSize: 13,
    color: '#475569',
    marginTop: -3,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  errorBannerText: {
    color: '#ef4444',
    fontSize: 13.5,
  },
  submitBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  prayerFooterHint: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  dockWrap: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  dockItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    gap: 2,
  },
  dockIcon: {
    fontSize: 22,
    lineHeight: 25,
  },
  dockLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    position: 'relative',
  },
  fabCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -18,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: PRIMARY,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabIcon: {
    fontSize: 22,
  },
  fabLabel: {
    fontSize: 10,
    color: PRIMARY,
    fontWeight: '600',
    position: 'absolute',
    bottom: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  visModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
  },
  visModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
  },
  visOptionRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  visOptionText: {
    fontSize: 14,
    color: '#334155',
  },
});
