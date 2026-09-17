// app/band/lib/padSynth.ts
// Ambient worship pad dual-deck audio engine with deterministic 3.0s fade-in, crossfade, and fade-out.

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
  // Dual-deck architecture to guarantee zero ghost audio and prevent mobile decoder exhaustion
  private deckA: HTMLAudioElement | null = null;
  private deckB: HTMLAudioElement | null = null;
  private activeDeckName: 'A' | 'B' = 'A';

  private currentKey: string = 'C';
  private masterVolume: number = 0.85;

  private isPlaying: boolean = false;
  private isFadingOut: boolean = false;

  private fadeTimer: any = null;
  private requestId: number = 0;

  private onStateChange?: (isPlaying: boolean, key: string, isFadingOut: boolean) => void;

  constructor(onStateChange?: (isPlaying: boolean, key: string, isFadingOut: boolean) => void) {
    this.onStateChange = onStateChange;
    this.initDecks();
  }

  private initDecks() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.deckA) {
        this.deckA = new Audio();
        this.deckA.loop = true;
        this.deckA.volume = 0;
        (this.deckA as any).playsInline = true;
      }
      if (!this.deckB) {
        this.deckB = new Audio();
        this.deckB.loop = true;
        this.deckB.volume = 0;
        (this.deckB as any).playsInline = true;
      }
    } catch (e) {
      console.error('Failed to initialize pad decks:', e);
    }
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    const activeDeck = this.getActiveDeck();
    if (activeDeck && this.isPlaying && !this.isFadingOut && !this.fadeTimer) {
      activeDeck.volume = this.masterVolume;
    }
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  public getKey(): string {
    return this.currentKey;
  }

  public setKey(keyName: string) {
    if (typeof keyName !== 'string') return;
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

  private getActiveDeck(): HTMLAudioElement | null {
    return this.activeDeckName === 'A' ? this.deckA : this.deckB;
  }

  public toggle(key?: any) {
    const validKey = typeof key === 'string' && key ? key : this.currentKey;
    if (this.isFadingOut) {
      // User tapped stop again while fading out -> IMMEDIATE HARD CUT
      this.stop(true);
    } else if (this.isPlaying) {
      // Normal stop with 3s fade
      this.stop(false);
    } else {
      // Start playing with 3s fade
      this.play(validKey);
    }
  }

  public play(keyName?: any) {
    const validKey = typeof keyName === 'string' && keyName ? keyName : this.currentKey;
    const rootKey = (validKey || 'C').replace('m', '');
    const path = PAD_AUDIO_FILES[rootKey] || '/audio/pads/C.mp3';

    if (!this.deckA || !this.deckB) {
      this.initDecks();
    }
    if (!this.deckA || !this.deckB) return;

    this.requestId++;
    const thisReq = this.requestId;

    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }

    const wasPlaying = this.isPlaying;
    const oldActiveDeck = this.getActiveDeck();

    // Switch active deck if we were already playing to crossfade
    if (wasPlaying && oldActiveDeck) {
      this.activeDeckName = this.activeDeckName === 'A' ? 'B' : 'A';
    }

    const incomingDeck = this.getActiveDeck();
    const outgoingDeck = wasPlaying ? oldActiveDeck : null;

    if (!incomingDeck) return;

    this.currentKey = rootKey;
    this.isPlaying = true;
    this.isFadingOut = false;
    if (this.onStateChange) {
      this.onStateChange(true, this.currentKey, false);
    }

    // Configure incoming deck safely without DOMException
    if (!incomingDeck.src.endsWith(path)) {
      incomingDeck.src = path;
    }
    incomingDeck.loop = true;
    incomingDeck.volume = 0;
    try {
      if (incomingDeck.readyState > 0) {
        incomingDeck.currentTime = 0;
      }
    } catch (_) {}

    const playPromise = incomingDeck.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (thisReq !== this.requestId) {
            incomingDeck.pause();
            incomingDeck.currentTime = 0;
            incomingDeck.volume = 0;
            return;
          }

          // 3.0-second fade in (60 steps @ 50ms)
          let step = 0;
          const totalSteps = 60;
          const intervalMs = 50;
          const targetVol = this.masterVolume;
          const outgoingStartVol = outgoingDeck ? outgoingDeck.volume : 0;

          this.fadeTimer = setInterval(() => {
            if (thisReq !== this.requestId) {
              clearInterval(this.fadeTimer);
              this.fadeTimer = null;
              return;
            }

            step++;
            const progress = Math.min(1, step / totalSteps);

            // Ramp incoming deck up
            incomingDeck.volume = Math.min(targetVol, targetVol * progress);

            // Ramp outgoing deck down if active
            if (outgoingDeck && !outgoingDeck.paused) {
              outgoingDeck.volume = Math.max(0, outgoingStartVol * (1 - progress));
            }

            if (step >= totalSteps) {
              clearInterval(this.fadeTimer);
              this.fadeTimer = null;

              incomingDeck.volume = targetVol;
              if (outgoingDeck) {
                outgoingDeck.pause();
                outgoingDeck.currentTime = 0;
                outgoingDeck.volume = 0;
              }
            }
          }, intervalMs);
        })
        .catch((err) => {
          console.error('Ambient pad play error:', err);
          if (thisReq === this.requestId) {
            this.isPlaying = false;
            this.isFadingOut = false;
            if (this.onStateChange) {
              this.onStateChange(false, this.currentKey, false);
            }
          }
        });
    }
  }

  public stop(immediate: boolean = false) {
    this.requestId++;
    const thisReq = this.requestId;

    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }

    const deckA = this.deckA;
    const deckB = this.deckB;

    if (immediate || (!this.isPlaying && !this.isFadingOut)) {
      // Immediate hard stop: kill all sound instantly
      if (deckA) {
        deckA.pause();
        deckA.currentTime = 0;
        deckA.volume = 0;
      }
      if (deckB) {
        deckB.pause();
        deckB.currentTime = 0;
        deckB.volume = 0;
      }
      this.isPlaying = false;
      this.isFadingOut = false;
      if (this.onStateChange) {
        this.onStateChange(false, this.currentKey, false);
      }
      return;
    }

    // 3.0-second smooth fade out
    this.isPlaying = false;
    this.isFadingOut = true;
    if (this.onStateChange) {
      this.onStateChange(false, this.currentKey, true);
    }

    const activeAudios = [deckA, deckB].filter((d): d is HTMLAudioElement => !!d && !d.paused);
    const startVols = activeAudios.map((a) => a.volume);

    let step = 0;
    const totalSteps = 60; // 3.0s @ 50ms
    const intervalMs = 50;

    this.fadeTimer = setInterval(() => {
      if (thisReq !== this.requestId) {
        clearInterval(this.fadeTimer);
        this.fadeTimer = null;
        return;
      }

      step++;
      const progress = Math.min(1, step / totalSteps);

      activeAudios.forEach((audio, idx) => {
        audio.volume = Math.max(0, startVols[idx] * (1 - progress));
      });

      if (step >= totalSteps) {
        clearInterval(this.fadeTimer);
        this.fadeTimer = null;

        activeAudios.forEach((audio) => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 0;
        });

        this.isFadingOut = false;
        if (this.onStateChange) {
          this.onStateChange(false, this.currentKey, false);
        }
      }
    }, intervalMs);
  }
}
