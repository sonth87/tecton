/**
 * Procedural Web Audio Synthesizer:
 * - Melodic warm synthwave/chiptune pentatonic arpeggio loop (matching the video's vibe)
 * - Subtle wooden/mineral placement click when a new step lands in place
 */
export class ArchitecturalAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted = true;
  private arpTimer: number | null = null;
  private noteIdx = 0;

  // F# major / D#m pentatonic-7th melodic sequence
  private readonly arpNotesHz = [
    369.99, 440.0, 554.37, 659.25, 739.99, 659.25, 554.37, 440.0,
    329.63, 415.3, 493.88, 659.25, 739.99, 659.25, 493.88, 415.3,
  ];

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.16;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopArp();
    } else {
      this.ensureContext();
      this.startArp();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(0.4, vol * 0.28)), this.ctx.currentTime, 0.05);
    }
  }

  public playStepTick(pitchFactor = 1.0): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190 * pitchFactor, now);
    osc.frequency.exponentialRampToValueAtTime(68, now + 0.038);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  private startArp(): void {
    if (this.arpTimer !== null) return;
    this.arpTimer = window.setInterval(() => {
      if (this.isMuted) return;
      const ctx = this.ctx;
      if (!ctx || !this.masterGain || ctx.state !== 'running') return;

      const freq = this.arpNotesHz[this.noteIdx % this.arpNotesHz.length];
      this.noteIdx++;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const env = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1350, now);
      filter.frequency.exponentialRampToValueAtTime(420, now + 0.19);

      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(0.09, now + 0.015);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.21);

      osc.connect(filter);
      filter.connect(env);
      env.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.22);
    }, 145);
  }

  private stopArp(): void {
    if (this.arpTimer !== null) {
      window.clearInterval(this.arpTimer);
      this.arpTimer = null;
    }
  }

  public dispose(): void {
    this.stopArp();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

export const soundEngine = new ArchitecturalAudioEngine();
