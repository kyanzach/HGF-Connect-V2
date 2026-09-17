// app/band/lib/metronomeEngine.ts
// Web Audio Metronome with AudioContext synthesis & visual pulse synchronization

export class MetronomeEngine {
  private audioCtx: AudioContext | null = null;
  private timerId: any = null;
  private tempo: number = 72;
  private beat: number = 0;
  private isAudioActive: boolean = false;
  private onBeatCallback?: (beat: number, isDownbeat: boolean) => void;

  constructor(tempo = 72, onBeat?: (beat: number, isDownbeat: boolean) => void) {
    this.tempo = Math.max(30, Math.min(260, tempo));
    this.onBeatCallback = onBeat;
  }

  public setTempo(newTempo: number) {
    const valid = Math.max(30, Math.min(260, parseInt(String(newTempo), 10) || 72));
    this.tempo = valid;
    if (this.timerId) {
      this.stop();
      this.start();
    }
  }

  public getTempo(): number {
    return this.tempo;
  }

  public setAudioActive(active: boolean) {
    this.isAudioActive = active;
    if (active && !this.audioCtx) {
      this.initAudioContext();
    }
  }

  public getAudioActive(): boolean {
    return this.isAudioActive;
  }

  private initAudioContext() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    } catch (_) {}
  }

  public start() {
    this.stop();
    this.beat = 0;
    const intervalMs = (60 / this.tempo) * 1000;

    this.timerId = setInterval(() => {
      this.beat = (this.beat % 4) + 1;
      const isDownbeat = this.beat === 1;

      if (this.onBeatCallback) {
        this.onBeatCallback(this.beat, isDownbeat);
      }

      if (this.isAudioActive) {
        this.playClick(isDownbeat);
      }
    }, intervalMs);
  }

  public stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.beat = 0;
  }

  private playClick(isDownbeat: boolean) {
    try {
      if (!this.audioCtx) this.initAudioContext();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isDownbeat ? 880 : 440, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(isDownbeat ? 0.9 : 0.6, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(this.audioCtx.currentTime);
      osc.stop(this.audioCtx.currentTime + 0.045);
    } catch (_) {}
  }
}
