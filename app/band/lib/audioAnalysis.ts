// app/band/lib/audioAnalysis.ts
// Client-side Web Audio API analysis for vocal activity & song section chapters
import { AudioMarker } from '../types/band';

/**
 * Extract roadmap section headers from chord chart text
 */
export function extractRoadmapSections(chordsText: string): string[] {
  if (!chordsText) return ['Intro', 'Verse 1', 'Chorus', 'Bridge', 'Outro'];

  const lines = chordsText.split('\n');
  const found: string[] = [];
  const sectionRegex = /^(\[?(intro|verse\s*\d*|chorus\s*\d*|bridge\s*\d*|interlude\s*\d*|drop|hold|pre-?chorus\s*\d*|instrumental|outro|ending|hook)\]?):?/i;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(sectionRegex);
    if (match) {
      // Clean up bracket and colon
      let label = match[1].replace(/[\[\]]/g, '').trim();
      // Capitalize nicely
      label = label.charAt(0).toUpperCase() + label.slice(1);
      if (!found.includes(label)) {
        found.push(label);
      }
    }
  }

  return found.length > 0 ? found : ['Intro', 'Verse 1', 'Chorus', 'Bridge', 'Outro'];
}

/**
 * Get cached markers from localStorage
 */
export function getCachedAudioMarkers(songId: string): AudioMarker[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`hgf_band_audio_markers_${songId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save markers to localStorage
 */
export function saveCachedAudioMarkers(songId: string, markers: AudioMarker[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`hgf_band_audio_markers_${songId}`, JSON.stringify(markers));
  } catch {}
}

/**
 * Detect vocal and energy section transitions from audio file using Web Audio API
 */
export async function detectAudioChapters(
  audioUrl: string,
  durationSec: number,
  knownSections: string[]
): Promise<AudioMarker[]> {
  if (!audioUrl || durationSec <= 0) return [];

  try {
    // Attempt Web Audio API analysis
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      return generateFallbackMarkers(durationSec, knownSections);
    }

    const resp = await fetch(audioUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const arrayBuf = await resp.arrayBuffer();

    const audioCtx = new AudioContextClass();
    const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
    await audioCtx.close();

    const channelData = audioBuf.getChannelData(0);
    const sampleRate = audioBuf.sampleRate;
    const totalSamples = channelData.length;

    // Window size: 200ms
    const windowSamples = Math.floor(sampleRate * 0.2);
    const stepSamples = Math.floor(sampleRate * 0.1); // 100ms hop
    const energyProfile: { time: number; energy: number }[] = [];

    for (let i = 0; i < totalSamples - windowSamples; i += stepSamples) {
      let sum = 0;
      for (let j = 0; j < windowSamples; j += 4) { // stride 4 for speed
        const val = channelData[i + j];
        sum += val * val;
      }
      const rms = Math.sqrt(sum / (windowSamples / 4));
      energyProfile.push({
        time: i / sampleRate,
        energy: rms,
      });
    }

    if (energyProfile.length === 0) {
      return generateFallbackMarkers(durationSec, knownSections);
    }

    // Identify significant energy jumps / section onsets
    // Filter points where energy increases sharply compared to previous 2 seconds
    const minSectionIntervalSec = Math.max(16, Math.floor(durationSec / (knownSections.length + 1)));
    const detectedTimestamps: number[] = [0]; // Intro is always at 0s

    let lastMarkTime = 0;
    const lookbackSteps = 20; // 2 seconds at 100ms step

    for (let i = lookbackSteps; i < energyProfile.length - 10; i++) {
      const currentTime = energyProfile[i].time;
      if (currentTime - lastMarkTime < minSectionIntervalSec) continue;
      if (currentTime > durationSec - 10) break; // Don't mark right at the end

      let prevEnergy = 0;
      for (let k = 1; k <= lookbackSteps; k++) {
        prevEnergy += energyProfile[i - k].energy;
      }
      prevEnergy /= lookbackSteps;

      const currentEnergy = energyProfile[i].energy;
      // If significant rise (vocal entry or band drop/chorus) or sudden drop/hold
      const ratio = prevEnergy > 0.001 ? currentEnergy / prevEnergy : 1;
      const absoluteDiff = Math.abs(currentEnergy - prevEnergy);

      if ((ratio > 2.2 || ratio < 0.35 || absoluteDiff > 0.08) && currentEnergy > 0.02) {
        detectedTimestamps.push(Math.round(currentTime));
        lastMarkTime = currentTime;
      }
    }

    // Align detected timestamps with known sections
    return mapTimestampsToSections(detectedTimestamps, durationSec, knownSections);
  } catch (err) {
    console.warn('[AudioAnalysis] Web Audio decode failed, using intelligent spacing:', err);
    return generateFallbackMarkers(durationSec, knownSections);
  }
}

/**
 * Map timestamps to labels like Intro, Verse, Chorus, Bridge, Drop, Hold, Outro
 */
function mapTimestampsToSections(
  timestamps: number[],
  durationSec: number,
  sections: string[]
): AudioMarker[] {
  // Always start with Intro at 0
  const cleanTimes = Array.from(new Set(timestamps)).sort((a, b) => a - b);
  if (cleanTimes[0] !== 0) cleanTimes.unshift(0);

  const markers: AudioMarker[] = [];
  const count = Math.min(cleanTimes.length, sections.length);

  for (let i = 0; i < count; i++) {
    markers.push({
      id: `marker-${i}-${cleanTimes[i]}`,
      time: cleanTimes[i],
      label: sections[i] || `Part ${i + 1}`,
    });
  }

  // If there are more sections than detected times, space remaining
  if (sections.length > count && count > 0) {
    const lastTime = cleanTimes[count - 1];
    const remainingTime = durationSec - lastTime;
    const remainingSections = sections.slice(count);
    const step = remainingTime / (remainingSections.length + 1);

    remainingSections.forEach((sec, idx) => {
      const time = Math.round(lastTime + step * (idx + 1));
      if (time < durationSec - 5) {
        markers.push({
          id: `marker-${count + idx}-${time}`,
          time,
          label: sec,
        });
      }
    });
  }

  return markers;
}

/**
 * Generate fallback markers evenly distributed based on song roadmap
 */
export function generateFallbackMarkers(durationSec: number, sections: string[]): AudioMarker[] {
  if (durationSec <= 0 || sections.length === 0) return [];
  const markers: AudioMarker[] = [];
  const step = durationSec / sections.length;

  sections.forEach((sec, idx) => {
    const time = idx === 0 ? 0 : Math.round(idx * step);
    markers.push({
      id: `fallback-${idx}-${time}`,
      time,
      label: sec,
    });
  });

  return markers;
}
