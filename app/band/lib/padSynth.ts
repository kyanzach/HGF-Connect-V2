// app/band/lib/padSynth.ts
// Ambient worship pad audio playback engine with 3-second smooth fade-in / crossfade and 3-second fade-out

export const PAD_AUDIO_FILES: Record<string, string> = {
  'C': '/audio/pads/C.mp3',
  'C#': '/audio/pads/Db.mp3',
  'Db': '/audio/pads/Db.mp3',
  'D': '/audio/pads/D.mp3',
  'D#': '/audio/pads/Eb.mp3',
  'Eb': '/audio/pads/Eb.mp3',
  'E': '/audio/pads/E.mp3',
  'F': '/audio/pads/F.mp3',
  'F#': '/audio/pads/Gb.mp3',
  'Gb': '/audio/pads/Gb.mp3',
  'G': '/audio/pads/G.mp3',
  'G#': '/audio/pads/Ab.mp3',
  'Ab': '/audio/pads/Ab.mp3',
  'A': '/audio/pads/A.mp3',
  'A#': '/audio/pads/Bb.mp3',
  'Bb': '/audio/pads/Bb.mp3',
  'B': '/audio/pads/B.mp3',
};

export class AmbientPadPlayer {
  private currentAudio: HTMLAudioElement | null = null;
  private currentKey: string = 'C';
  private volume: number = 0.85;
  private fadeTimer: any = null;
  private isPlaying: boolean = false;
  private isFadingOut: boolean = false;
  private requestId: number = 0;
  private allActiveAudios: Set<HTMLAudioElement> = new Set();
  private onStateChange?: (isPlaying: boolean, key: string, isFadingOut: boolean) => void;

  constructor(onStateChange?: (isPlaying: boolean, key: string, isFadingOut: boolean) => void) {
    this.onStateChange = onStateChange;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.currentAudio && !this.isFadingOut) {
      this.currentAudio.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getKey(): string {
    return this.currentKey;
  }

  public setKey(keyName: string) {
    this.currentKey = keyName.replace('m', '');
    if (this.onStateChange) {
      this.onStateChange(this.isPlaying, this.currentKey, this.isFadingOut);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsFadingOut(): boolean {
    return this.isFadingOut;
  }

  public toggle(key?: string) {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play(key || this.currentKey);
    }
  }

  public play(keyName: string) {
    const rootKey = keyName.replace('m', '');
    const path = PAD_AUDIO_FILES[rootKey] || '/audio/pads/C.mp3';

    // Increment request token to invalidate any prior pending play/fade operations
    this.requestId++;
    const thisReq = this.requestId;

    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }

    this.currentKey = rootKey;
    this.isPlaying = true;
    this.isFadingOut = false;
    if (this.onStateChange) this.onStateChange(true, this.currentKey, false);

    const oldAudios = Array.from(this.allActiveAudios);
    const newAudio = new Audio(path);
    newAudio.loop = true;
    newAudio.volume = 0;
    this.allActiveAudios.add(newAudio);

    // Safari / iOS loop fallback
    newAudio.addEventListener('ended', () => {
      newAudio.currentTime = 0;
      newAudio.play().catch(() => {});
    });

    newAudio
      .play()
      .then(() => {
        // If a subsequent stop() or play() was triggered while audio was loading/playing, immediately abort
        if (thisReq !== this.requestId || !this.isPlaying) {
          newAudio.pause();
          newAudio.src = '';
          this.allActiveAudios.delete(newAudio);
          return;
        }

        this.currentAudio = newAudio;

        // Smooth 3.0-second fade in & crossfade (60 steps @ 50ms)
        let step = 0;
        const totalSteps = 60;
        const intervalMs = 50;

        this.fadeTimer = setInterval(() => {
          if (thisReq !== this.requestId) {
            clearInterval(this.fadeTimer);
            this.fadeTimer = null;
            return;
          }

          step++;
          const progress = Math.min(1, step / totalSteps);
          newAudio.volume = Math.min(this.volume, this.volume * progress);

          // Fade out all previous audios
          oldAudios.forEach((oa) => {
            if (!oa.paused) {
              oa.volume = Math.max(0, this.volume * (1 - progress));
            }
          });

          if (step >= totalSteps) {
            clearInterval(this.fadeTimer);
            this.fadeTimer = null;
            newAudio.volume = this.volume;

            oldAudios.forEach((oa) => {
              oa.pause();
              oa.src = '';
              this.allActiveAudios.delete(oa);
            });
          }
        }, intervalMs);
      })
      .catch(() => {
        this.allActiveAudios.delete(newAudio);
        if (thisReq === this.requestId) {
          this.isPlaying = false;
          if (this.onStateChange) this.onStateChange(false, this.currentKey, false);
        }
      });
  }

  public stop(immediate: boolean = false) {
    this.requestId++;
    const thisReq = this.requestId;

    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }

    if (immediate || this.allActiveAudios.size === 0) {
      this.allActiveAudios.forEach((a) => {
        a.pause();
        a.src = '';
      });
      this.allActiveAudios.clear();
      this.currentAudio = null;
      this.isPlaying = false;
      this.isFadingOut = false;
      if (this.onStateChange) this.onStateChange(false, this.currentKey, false);
      return;
    }

    this.isPlaying = false;
    this.isFadingOut = true;
    if (this.onStateChange) this.onStateChange(false, this.currentKey, true);

    const audiosToFade = Array.from(this.allActiveAudios);
    const initialVols = audiosToFade.map((a) => a.volume);
    let step = 0;
    const totalSteps = 60; // 3.0s fade out
    const intervalMs = 50;

    this.fadeTimer = setInterval(() => {
      if (thisReq !== this.requestId) {
        clearInterval(this.fadeTimer);
        this.fadeTimer = null;
        return;
      }

      step++;
      const progress = Math.min(1, step / totalSteps);

      audiosToFade.forEach((a, idx) => {
        a.volume = Math.max(0, initialVols[idx] * (1 - progress));
      });

      if (step >= totalSteps) {
        clearInterval(this.fadeTimer);
        this.fadeTimer = null;

        audiosToFade.forEach((a) => {
          a.pause();
          a.src = '';
          this.allActiveAudios.delete(a);
        });

        this.currentAudio = null;
        this.isFadingOut = false;
        if (this.onStateChange) this.onStateChange(false, this.currentKey, false);
      }
    }, intervalMs);
  }
}
