// Procedural audio synthesis using Web Audio API for Nightstalker game.
// No external asset loading required, 100% local and offline-safe.

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.5;
  private soundEnabled: boolean = true;

  // Audio Nodes
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private heartbeatTimer: any = null;
  private lastHeartbeatTime: number = 0;

  constructor() {
    // Lazy initialize to avoid blocking page load
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio API not supported in this browser:', e);
    }
  }

  setVolume(vol: number) {
    this.volume = vol;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.1);
    }
  }

  setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(enabled ? this.volume : 0, this.ctx.currentTime);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startAmbient() {
    this.init();
    this.resume();
    if (!this.ctx || !this.masterGain || !this.soundEnabled) return;

    try {
      // 1. Low rumbling industrial drone
      this.ambientOsc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      this.ambientGain = this.ctx.createGain();

      this.ambientOsc.type = 'sawtooth';
      this.ambientOsc.frequency.setValueAtTime(45, this.ctx.currentTime); // Low bass drone

      // Low pass filter to keep it heavy and muddy
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

      // Low frequency modulation (LFO) for breathing effect
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime); // 0.2Hz wave
      lfoGain.gain.setValueAtTime(30, this.ctx.currentTime); // Modulate filter cutoff by 30Hz

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      this.ambientGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

      this.ambientOsc.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);

      this.ambientOsc.start();
    } catch (e) {
      console.error('Error starting ambient drone:', e);
    }
  }

  stopAmbient() {
    try {
      if (this.ambientOsc) {
        this.ambientOsc.stop();
        this.ambientOsc.disconnect();
        this.ambientOsc = null;
      }
      if (this.ambientGain) {
        this.ambientGain.disconnect();
        this.ambientGain = null;
      }
    } catch (e) {}
  }

  // Heartbeat pulsing: increases in BPM and intensity as distance shrinks
  triggerHeartbeat(intensity: number) {
    if (!this.ctx || !this.masterGain || !this.soundEnabled || this.ctx.state === 'suspended') return;

    try {
      // Two thumps: "lub-dub"
      const now = this.ctx.currentTime;
      
      const playThump = (timeOffset: number, pitch: number, gainVal: number) => {
        if (!this.ctx || !this.masterGain) return;
        
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, now + timeOffset);
        osc.frequency.exponentialRampToValueAtTime(10, now + timeOffset + 0.18);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(80, now + timeOffset);

        gainNode.gain.setValueAtTime(0, now + timeOffset);
        gainNode.gain.linearRampToValueAtTime(gainVal, now + timeOffset + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.2);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.start(now + timeOffset);
        osc.stop(now + timeOffset + 0.22);
      };

      // Lub
      playThump(0, 55 + intensity * 15, 0.45 + intensity * 0.45);
      // Dub (slightly higher frequency and delayed)
      playThump(0.12, 58 + intensity * 15, 0.35 + intensity * 0.45);
    } catch (e) {}
  }

  // Intense screeching sound when monster spots the player
  triggerChaseScreech() {
    if (!this.ctx || !this.masterGain || !this.soundEnabled) return;

    try {
      const now = this.ctx.currentTime;
      
      // High pitched distorted screech
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(600, now);
      osc1.frequency.linearRampToValueAtTime(150, now + 1.2);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(610, now);
      osc2.frequency.linearRampToValueAtTime(140, now + 1.2);

      // Add a high-pass filter and resonance to make it sound sharp/screechy
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 1.0);
      filter.Q.setValueAtTime(3.0, now);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.35, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.25);
      osc2.stop(now + 1.25);
    } catch (e) {}
  }

  triggerPickup() {
    if (!this.ctx || !this.masterGain || !this.soundEnabled) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Arpeggio chime
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {}
  }

  triggerCorrectAnswer() {
    if (!this.ctx || !this.masterGain || !this.soundEnabled) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.25); // C6

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now); // E5
      osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.25); // E6

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch (e) {}
  }

  triggerWrongAnswer() {
    if (!this.ctx || !this.masterGain || !this.soundEnabled) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, now); // Low A2
      osc.frequency.linearRampToValueAtTime(55, now + 0.4); // Down to A1

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(250, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {}
  }

  triggerAngerSting() {
    if (!this.ctx || !this.masterGain || !this.soundEnabled) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(220, now); // A3
      osc1.frequency.linearRampToValueAtTime(311.13, now + 0.6); // Dissonant tritone slide

      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(233.08, now); // Bb3 (Dissonant minor 2nd)
      osc2.frequency.linearRampToValueAtTime(329.63, now + 0.6);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(400, now);
      filter.Q.setValueAtTime(2.0, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.75);
      osc2.stop(now + 0.75);
    } catch (e) {}
  }

  triggerClick() {
    if (!this.ctx || !this.masterGain || !this.soundEnabled) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  triggerJump() {
    if (!this.ctx || !this.masterGain || !this.soundEnabled) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  }

  // Monster jump-scare scream upon caught state
  triggerScareScream() {
    this.stopAmbient();
    if (!this.ctx || !this.masterGain || !this.soundEnabled) return;
    try {
      const now = this.ctx.currentTime;

      // Master volume boost for impact
      const temporaryBoostGain = this.ctx.createGain();
      temporaryBoostGain.gain.setValueAtTime(1.5, now);
      temporaryBoostGain.connect(this.masterGain);

      // 1. Modulated growl / noise
      const bufferSize = this.ctx.sampleRate * 2.5; // 2.5 seconds
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // white noise
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'peaking';
      noiseFilter.frequency.setValueAtTime(350, now);
      noiseFilter.Q.setValueAtTime(8, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.8, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

      // 2. High horror piercing oscillators
      const pitchOsc1 = this.ctx.createOscillator();
      const pitchOsc2 = this.ctx.createOscillator();
      const pitchGain = this.ctx.createGain();

      pitchOsc1.type = 'sawtooth';
      pitchOsc1.frequency.setValueAtTime(220, now);
      pitchOsc1.frequency.exponentialRampToValueAtTime(1800, now + 0.1);
      pitchOsc1.frequency.linearRampToValueAtTime(100, now + 2.0);

      pitchOsc2.type = 'square';
      pitchOsc2.frequency.setValueAtTime(225, now);
      pitchOsc2.frequency.exponentialRampToValueAtTime(1850, now + 0.1);
      pitchOsc2.frequency.linearRampToValueAtTime(95, now + 2.0);

      pitchGain.gain.setValueAtTime(0.4, now);
      pitchGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      // Connect noise and pitches to the output
      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(temporaryBoostGain);

      pitchOsc1.connect(temporaryBoostGain);
      pitchOsc2.connect(temporaryBoostGain);

      noiseNode.start(now);
      pitchOsc1.start(now);
      pitchOsc2.start(now);

      noiseNode.stop(now + 2.3);
      pitchOsc1.stop(now + 2.3);
      pitchOsc2.stop(now + 2.3);
    } catch (e) {
      console.error('Scare scream synthesis error:', e);
    }
  }

  cleanup() {
    this.stopAmbient();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audio = new SoundSynthesizer();
