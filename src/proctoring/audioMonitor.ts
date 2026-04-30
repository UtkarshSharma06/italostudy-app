/**
 * Audio Detection Module
 * Uses: Web Audio API
 * Responsibilities:
 * - Detect ambient sound / voices indicating someone else is speaking
 * - Monitor sustained audio levels
 */

export class AudioMonitor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private interval: NodeJS.Timeout | null = null;

  private readonly NOISE_THRESHOLD = 30; // dB level
  private readonly SUSTAINED_MS = 5000; // 5 seconds of sustained audio = violation
  private noiseStartTime: number | null = null;
  private active = false;

  constructor(private callbacks: {
    onVoiceDetected: () => void;
  }) {}

  async start() {
    if (this.active) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      this.active = true;
      this.interval = setInterval(() => this.checkAudioLevel(), 500);
    } catch (err) {
      console.warn('[Audio] Could not start audio monitor:', err);
    }
  }

  private checkAudioLevel() {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate average audio level (0-255)
    const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
    const db = avg; // Scaled 0-255

    if (db > this.NOISE_THRESHOLD) {
      if (this.noiseStartTime === null) {
        this.noiseStartTime = Date.now();
      } else if (Date.now() - this.noiseStartTime > this.SUSTAINED_MS) {
        this.callbacks.onVoiceDetected();
        this.noiseStartTime = null; // reset after firing
      }
    } else {
      this.noiseStartTime = null;
    }
  }

  stop() {
    this.active = false;
    if (this.interval) clearInterval(this.interval);
    this.source?.disconnect();
    this.audioContext?.close();
    this.stream?.getTracks().forEach(t => t.stop());
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
  }
}
