import type { SpeakOptions, TtsEngine, TtsVoice } from './types';

function clamp(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export class WebSpeechEngine implements TtsEngine {
  readonly id = 'webspeech';
  private readonly win: Window & typeof globalThis;
  private current: SpeechSynthesisUtterance | null = null;

  constructor(win: Window & typeof globalThis = window) {
    this.win = win;
  }

  isSupported(): boolean {
    return (
      typeof this.win.speechSynthesis !== 'undefined' &&
      typeof this.win.SpeechSynthesisUtterance !== 'undefined'
    );
  }

  getVoices(): TtsVoice[] {
    if (!this.isSupported()) return [];
    return this.win.speechSynthesis.getVoices().map((voice) => ({
      voiceURI: voice.voiceURI,
      name: voice.name,
      lang: voice.lang,
      localService: voice.localService,
      default: voice.default,
    }));
  }

  onVoicesChanged(listener: (voices: TtsVoice[]) => void): () => void {
    if (!this.isSupported()) return () => undefined;
    const synth = this.win.speechSynthesis;
    const handler = () => listener(this.getVoices());
    synth.addEventListener('voiceschanged', handler);
    if (synth.getVoices().length > 0) listener(this.getVoices());
    return () => synth.removeEventListener('voiceschanged', handler);
  }

  speak(text: string, options: SpeakOptions = {}): void {
    if (!this.isSupported()) return;
    const clean = text.trim();
    if (!clean) return;

    const synth = this.win.speechSynthesis;
    this.cancel();
    try {
      synth.resume();
    } catch {
      // Some platforms throw when the synthesizer is in an odd state.
    }

    const utterance = new this.win.SpeechSynthesisUtterance(clean);
    const voices = synth.getVoices();
    const selected =
      (options.voiceURI
        ? voices.find((voice) => voice.voiceURI === options.voiceURI)
        : undefined) ??
      (options.lang
        ? (voices.find((voice) => voice.lang.toLowerCase() === options.lang!.toLowerCase()) ??
          voices.find((voice) =>
            voice.lang.toLowerCase().startsWith(options.lang!.slice(0, 2).toLowerCase()),
          ))
        : undefined);

    if (selected) utterance.voice = selected;
    utterance.lang = selected?.lang ?? options.lang ?? 'en-US';
    utterance.rate = clamp(options.rate, 1, 0.5, 2);
    utterance.pitch = clamp(options.pitch, 1, 0, 2);
    utterance.volume = clamp(options.volume, 1, 0, 1);
    utterance.onend = () => {
      if (this.current === utterance) this.current = null;
    };
    utterance.onerror = () => {
      if (this.current === utterance) this.current = null;
    };

    this.current = utterance;
    synth.speak(utterance);
  }

  cancel(): void {
    if (!this.isSupported()) return;
    this.current = null;
    try {
      this.win.speechSynthesis.cancel();
    } catch {
      // Ignore cancellation errors on browsers without a live synthesizer.
    }
  }
}
