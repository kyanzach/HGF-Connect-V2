// app/band/components/modals/SongScraperModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Song, Setlist } from '../../types/band';
import {
  ENHARMONIC_KEYS,
  FLAT_KEYS,
  calculateSemitoneDistance,
  transposeChordSheetText,
  detectRootKeyFromChords,
} from '../../lib/musicTheory';

interface ScrapedResult {
  id?: number | string;
  song_name: string;
  artist_name: string;
  type?: string;
  rating?: string;
  votes?: number;
  tab_url: string;
  tonality_name?: string;
  version?: number;
  source?: string;
}

interface ScrapedDetail {
  song_name: string;
  artist_name: string;
  key?: string;
  original_key?: string;
  capo?: number | string;
  bpm?: number | string;
  lyrics?: string;
  chords_text?: string;
  chords_over_lyrics?: string;
  chordpro?: string;
  source?: string;
}

interface SongScraperModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  activeSetlist?: Setlist | null;
  onImportSong: (song: Song, addToSetlist?: boolean) => Promise<void>;
  onOverwriteChords?: (chords: string, title?: string, artist?: string, key?: string, tempo?: number) => void;
  isEditingExisting?: boolean;
}

export const SongScraperModal: React.FC<SongScraperModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  activeSetlist,
  onImportSong,
  onOverwriteChords,
  isEditingExisting = false,
}) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [results, setResults] = useState<ScrapedResult[]>([]);
  const [statusText, setStatusText] = useState<string>('');
  
  // Preview state
  const [previewData, setPreviewData] = useState<ScrapedDetail | null>(null);
  const [targetKey, setTargetKey] = useState<string>('C');
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (initialQuery.trim()) {
        setQuery(initialQuery);
        handleSearch(initialQuery);
      } else {
        setResults([]);
        setPreviewData(null);
        setStatusText('');
      }
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const handleSearch = async (searchPhrase = query) => {
    const q = searchPhrase.trim();
    if (!q) return;

    setIsSearching(true);
    setStatusText('Searching Ultimate Guitar & worship archives...');
    setResults([]);
    setPreviewData(null);

    try {
      const res = await fetch('/api/worship/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: q }),
      });
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        setResults(data.results);
        setStatusText(`Found ${data.results.length} versions (click preview to inspect chords):`);
      } else {
        setStatusText('No results found. Try another search phrase or artist.');
      }
    } catch (err) {
      setStatusText('Failed to search online tabs. Check your network connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFetchPreview = async (tabUrl: string) => {
    setIsLoadingPreview(true);
    setStatusText('Fetching and formatting chord sheet...');
    try {
      const res = await fetch('/api/worship/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch', url: tabUrl, stripChords: false }),
      });
      const data: ScrapedDetail = await res.json();
      if (data && (data.chords_over_lyrics || data.chords_text || data.lyrics)) {
        setPreviewData(data);
        const rawChords = data.chords_over_lyrics || data.chords_text || data.lyrics || '';
        const detected = data.original_key || data.key || detectRootKeyFromChords(rawChords) || 'C';
        setTargetKey(detected);
        setStatusText('');
      } else {
        setStatusText('Could not extract chord sheet from this tab version.');
      }
    } catch (err) {
      setStatusText('Error fetching tab preview.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleImport = async (addToSetlist = false) => {
    if (!previewData) return;
    setIsImporting(true);

    try {
      const rawChords = previewData.chords_over_lyrics || previewData.chords_text || previewData.lyrics || '';
      const originalScrapedKey = previewData.original_key || previewData.key || detectRootKeyFromChords(rawChords) || 'C';
      const diff = calculateSemitoneDistance(originalScrapedKey, targetKey);
      const finalChords = diff !== 0 ? transposeChordSheetText(rawChords, diff, FLAT_KEYS.includes(targetKey)) : rawChords;

      const newSong: Song = {
        id: `song-${Date.now()}`,
        title: previewData.song_name || query || 'New Song',
        artist: previewData.artist_name || 'HGF Worship',
        key: targetKey,
        originalKey: targetKey,
        capo: String(previewData.capo || 0),
        tempo: previewData.bpm ? parseInt(String(previewData.bpm), 10) : 72,
        timeSignature: '4/4',
        chords: finalChords.trim(),
        updatedAt: Date.now(),
      };

      await onImportSong(newSong, addToSetlist);
      onClose();
    } finally {
      setIsImporting(false);
    }
  };

  const handleDirectImportFromList = async (tabUrl: string) => {
    // Open preview with target key option ready so musicians can choose key before importing
    handleFetchPreview(tabUrl);
  };

  const handleOverwrite = () => {
    if (!previewData || !onOverwriteChords) return;
    const rawChords = previewData.chords_over_lyrics || previewData.chords_text || previewData.lyrics || '';
    const originalScrapedKey = previewData.original_key || previewData.key || detectRootKeyFromChords(rawChords) || 'C';
    const diff = calculateSemitoneDistance(originalScrapedKey, targetKey);
    const finalChords = diff !== 0 ? transposeChordSheetText(rawChords, diff, FLAT_KEYS.includes(targetKey)) : rawChords;

    onOverwriteChords(
      finalChords.trim(),
      previewData.song_name,
      previewData.artist_name,
      targetKey,
      previewData.bpm ? parseInt(String(previewData.bpm), 10) : undefined
    );
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(6px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '88vh',
          backgroundColor: '#0c1017',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#0f1420',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔍</span>
            <div style={{ fontWeight: 800, fontSize: '16px', color: '#fff' }}>
              {previewData ? 'Tab Preview' : 'Search Worship Chords'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: '#1e293b',
              color: '#94a3b8',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' }}>
          {!previewData ? (
            /* Search & List Mode */
            <>
              {/* Search Bar */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  placeholder="Search song title or artist (e.g. Goodness of God, Gratitude)..."
                  style={{
                    flex: 1,
                    height: '40px',
                    borderRadius: '8px',
                    background: '#131c2e',
                    border: '1px solid #2d3f5e',
                    color: '#fff',
                    padding: '0 12px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                  autoFocus
                />
                <button
                  onClick={() => handleSearch()}
                  disabled={isSearching || !query.trim()}
                  style={{
                    height: '40px',
                    padding: '0 18px',
                    borderRadius: '8px',
                    background: '#4EB1CB',
                    border: 'none',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: isSearching || !query.trim() ? 'not-allowed' : 'pointer',
                    opacity: isSearching || !query.trim() ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Status banner */}
              {statusText && (
                <div
                  style={{
                    fontSize: '12px',
                    color: statusText.includes('Failed') || statusText.includes('No results') ? '#f87171' : '#94a3b8',
                    marginBottom: '10px',
                    fontWeight: 600,
                  }}
                >
                  {statusText}
                </div>
              )}

              {/* Results List */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {results.map((r, idx) => (
                  <div
                    key={`${r.tab_url}-${idx}`}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: '#131c2e',
                      border: '1px solid #1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      transition: 'border 0.15s ease',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.song_name}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#60a5fa',
                            background: 'rgba(59, 130, 246, 0.12)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            borderRadius: '4px',
                            padding: '1px 6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          🎸 {r.source || 'Ultimate Guitar'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {r.artist_name} • {r.type || 'Chords'} {r.tonality_name ? `• Key: ${r.tonality_name}` : ''} {r.rating ? `• ⭐ ${r.rating}` : ''}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        onClick={() => handleFetchPreview(r.tab_url)}
                        disabled={isLoadingPreview}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          borderRadius: '6px',
                          background: 'rgba(78, 177, 203, 0.12)',
                          color: '#4EB1CB',
                          border: '1px solid #4EB1CB',
                          cursor: 'pointer',
                        }}
                      >
                        👁 Preview
                      </button>
                      <button
                        onClick={() => handleDirectImportFromList(r.tab_url)}
                        disabled={isLoadingPreview}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 800,
                          borderRadius: '6px',
                          background: '#4EB1CB',
                          color: '#000',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        + Import
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Preview Mode */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Back Bar & Metadata */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #1e293b',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <button
                  onClick={() => setPreviewData(null)}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '6px 12px',
                    background: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  ⬅ Back to Results
                </button>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#60a5fa',
                      background: 'rgba(59, 130, 246, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '4px',
                      padding: '2px 7px',
                    }}
                  >
                    🎸 {previewData.source || 'Ultimate Guitar'}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#facc15',
                      background: '#1e293b',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #334155',
                    }}
                  >
                    Key: {previewData.key || 'C'}
                  </span>
                  {previewData.bpm && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#4EB1CB',
                        background: '#1e293b',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid #334155',
                      }}
                    >
                      BPM: {previewData.bpm}
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Artist */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                  {previewData.song_name}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {previewData.artist_name || 'HGF Worship'}
                </div>
              </div>

              {/* Target Key Selection Bar before Importing */}
              {(() => {
                const rawPreviewChords = previewData.chords_over_lyrics || previewData.chords_text || previewData.lyrics || '';
                const originalScrapedKey = previewData.original_key || previewData.key || detectRootKeyFromChords(rawPreviewChords) || 'C';
                const previewDiff = calculateSemitoneDistance(originalScrapedKey, targetKey);
                const displayedPreviewChords = previewDiff !== 0
                  ? transposeChordSheetText(rawPreviewChords, previewDiff, FLAT_KEYS.includes(targetKey))
                  : rawPreviewChords;

                return (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        background: '#131c2e',
                        border: '1px solid #2d3f5e',
                        borderRadius: '10px',
                        padding: '8px 14px',
                        marginBottom: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
                          Original Tab:
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: '#facc15',
                            background: '#1e293b',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid #334155',
                          }}
                        >
                          Key of {originalScrapedKey}
                        </span>
                        {previewDiff !== 0 && (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>
                            ({previewDiff > 0 ? `+${previewDiff}` : previewDiff} semitones)
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          🎵 Import in Key:
                          <select
                            value={targetKey}
                            onChange={(e) => setTargetKey(e.target.value)}
                            style={{
                              background: '#0c1017',
                              color: '#4EB1CB',
                              border: '1px solid #4EB1CB',
                              borderRadius: '6px',
                              padding: '5px 12px',
                              fontSize: '13px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            {ENHARMONIC_KEYS.map((k) => (
                              <option key={k.key} value={k.key} style={{ background: '#0c1017', color: '#fff' }}>
                                Key of {k.display}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>

                    {/* Monospace Chord Sheet Box */}
                    <div
                      style={{
                        flex: 1,
                        maxHeight: '380px',
                        overflowY: 'auto',
                        backgroundColor: '#070a0f',
                        border: '1px solid #1e293b',
                        borderRadius: '10px',
                        padding: '14px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '13px',
                        lineHeight: 1.6,
                        color: '#e2e8f0',
                        whiteSpace: 'pre-wrap',
                        userSelect: 'text',
                      }}
                    >
                      {displayedPreviewChords || 'No chords extracted.'}
                    </div>
                  </>
                );
              })()}

              {/* Import Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                  borderTop: '1px solid #1e293b',
                  paddingTop: '12px',
                  marginTop: '12px',
                }}
              >
                {isEditingExisting && onOverwriteChords && (
                  <button
                    onClick={handleOverwrite}
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '8px 14px',
                      background: '#1e293b',
                      color: '#cbd5e1',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    ✍️ Overwrite in Key {targetKey}
                  </button>
                )}

                {activeSetlist && (
                  <button
                    onClick={() => handleImport(true)}
                    disabled={isImporting}
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '8px 16px',
                      background: 'rgba(78, 177, 203, 0.2)',
                      color: '#4EB1CB',
                      border: '1px solid #4EB1CB',
                      borderRadius: '8px',
                      cursor: isImporting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ➕ Import in Key {targetKey} & Add to {activeSetlist.name}
                  </button>
                )}

                <button
                  onClick={() => handleImport(false)}
                  disabled={isImporting}
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '8px 16px',
                    background: '#4EB1CB',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isImporting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isImporting ? 'Importing...' : `➕ Import in Key ${targetKey}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
