export interface TtsVoice {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export interface SpeakOptions {
  voiceURI?: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface TtsEngine {
  readonly id: string;
  isSupported(): boolean;
  speak(text: string, options?: SpeakOptions): void;
  cancel(): void;
  getVoices(): TtsVoice[];
  onVoicesChanged(listener: (voices: TtsVoice[]) => void): () => void;
}
