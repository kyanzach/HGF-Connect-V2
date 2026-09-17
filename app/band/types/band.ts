// app/band/types/band.ts
// Strict TypeScript definitions for THE BAND Musician Songbook & Stage Tool

export type ChordFormat = 'chords_over_lyrics' | 'chordpro' | 'lyrics_only';

export interface AudioMarker {
  id: string;
  time: number; // in seconds
  label: string; // 'Intro', 'Verse', 'Chorus', 'Bridge', 'Drop', 'Hold', etc.
}

export interface AudioTrack {
  filename?: string;
  url: string;
  title?: string;
  sizeBytes?: number;
  durationSec?: number;
  waveform?: number[];
  markers?: AudioMarker[];
  isLocalOnly?: boolean;
  uploadedAt?: number;
}

export interface DrawingPoint {
  x: number;
  y: number;
  nx: number; // Normalized 0..1 for responsive cross-device redraw
  ny: number;
}

export interface DrawingStroke {
  color: string;
  width: number;
  points: DrawingPoint[];
  scope?: 'global' | 'user';
  userId?: string;
  authorName?: string;
  role?: string;
  timestamp?: number;
}

export interface Song {
  id: string;
  title: string;
  alternativeTitle?: string;
  artist?: string;
  key: string;
  originalKey?: string;
  chords: string;
  lyrics?: string;
  chordFormat?: ChordFormat;
  capo?: string | number;
  tempo?: number | string | null;
  timeSignature?: string;
  duration?: string;
  sectionOrder?: string;
  songNumber?: string;
  copyright?: string;
  webUrl?: string;
  notes?: string;
  exhortation?: string;
  tags?: string[];
  audioTrack?: AudioTrack | null;
  useBacktrack?: boolean;
  drawingStrokes?: DrawingStroke[];
  updatedAt?: number;
}

export interface SetlistSongItem {
  id: string;
  title?: string;
  key?: string;
  capo?: string | number;
  tempo?: number;
  timeSignature?: string;
  notes?: string;
  chords?: string;
  duration?: string;
}

export interface Setlist {
  id: string;
  name: string;
  serviceDate?: string;
  leader?: string;
  songs: (string | SetlistSongItem)[];
  notes?: string;
  songCount?: number;
  updatedAt?: number;
}

export interface BandUser {
  id: string;
  username: string;
  displayName: string;
  role: 'MD' | 'guitarist' | 'bassist' | 'keyboardist' | 'drummer' | 'vocalist' | 'sound' | 'admin' | string;
  password?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface ScratchpadNote {
  id: string;
  songId: string;
  userId: string;
  userName: string;
  userRole?: string;
  content: string;
  updatedAt: number;
}

export interface KeyOption {
  key: string;
  display: string;
}
