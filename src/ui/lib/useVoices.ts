import { useEffect, useState } from 'react';
import { WebSpeechEngine } from '@/engines/tts/webspeech';
import type { TtsVoice } from '@/engines/tts/types';

export function useVoices(): TtsVoice[] {
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  useEffect(() => {
    const engine = new WebSpeechEngine(window);
    return engine.onVoicesChanged(setVoices);
  }, []);
  return voices;
}
