// app/band/lib/padSynth.ts
// Ambient worship pad audio playback engine with seamless crossfade

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
  private onStateChange?: (isPlaying: boolean, key: string) => void;

  constructor(onStateChange?: (isPlaying: boolean, key: string) => void) {
    this.onStateChange = onStateChange;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.currentAudio && !this.fadeTimer) {
      this.currentAudio.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getKey(): string {
    return this.currentKey;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
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

    if (this.isPlaying && this.currentKey === rootKey && this.currentAudio && !this.currentAudio.paused) {
      return;
    }

    this.currentKey = rootKey;
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }

    const oldAudio = this.currentAudio;
    const newAudio = new Audio(path);
    newAudio.loop = true;
    newAudio.volume = 0;

    newAudio.addEventListener('ended', () => {
      newAudio.currentTime = 0;
      newAudio.play().catch(() => {});
    });

    newAudio.play().then(() => {
      this.currentAudio = newAudio;
      this.isPlaying = true;
      if (this.onStateChange) this.onStateChange(true, this.currentKey);

      // Smooth 2.5s crossfade
      let step = 0;
      const totalSteps = 50;
      this.fadeTimer = setInterval(() => {
        step++;
        const progress = step / totalSteps;
        newAudio.volume = Math.min(this.volume, this.volume * progress);
        if (oldAudio && !oldAudio.paused) {
          oldAudio.volume = Math.max(0, this.volume * (1 - progress));
        }
        if (step >= totalSteps) {
          clearInterval(this.fadeTimer);
          this.fadeTimer = null;
          if (oldAudio) {
            oldAudio.pause();
            oldAudio.src = '';
          }
        }
      }, 50);
    }).catch(() => {
      this.isPlaying = false;
      if (this.onStateChange) this.onStateChange(false, this.currentKey);
    });
  }

  public stop() {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.currentAudio) {
      let step = 0;
      const totalSteps = 20;
      const audioToStop = this.currentAudio;
      const startVol = audioToStop.volume;

      this.fadeTimer = setInterval(() => {
        step++;
        const progress = step / totalSteps;
        audioToStop.volume = Math.max(0, startVol * (1 - progress));
        if (step >= totalSteps) {
          clearInterval(this.fadeTimer);
          this.fadeTimer = null;
          audioToStop.pause();
          audioToStop.src = '';
          this.currentAudio = null;
          this.isPlaying = false;
          if (this.onStateChange) this.onStateChange(false, this.currentKey);
        }
      }, 50);
    } else {
      this.isPlaying = false;
      if (this.onStateChange) this.onStateChange(false, this.currentKey);
    }
  }
}
