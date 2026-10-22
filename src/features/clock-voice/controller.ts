import type { ClockReading, ClockSnapshot, ClockSide, ClockProvider } from '@/adapters/types';
import { t, categoryLabelKey } from '@/core/i18n';
import type { Logger } from '@/core/logger';
import { classifyTimeControl, type TimeControlCategory } from '@/core/time-control';
import type { AppSettings } from '@/core/settings/types';
import type { TtsEngine } from '@/engines/tts/types';
import { ClockAnnouncer } from './announcer';
import { renderPhrase } from './phrase';
import { getClockVoiceSettings, getTimeControlConfig } from './settings';

export interface ClockVoiceControllerOptions {
  provider: ClockProvider;
  getSettings: () => AppSettings;
  engine: TtsEngine;
  logger: Logger;
}

interface TurnState {
  isTurn: boolean;
  since: number;
}

export class ClockVoiceController {
  private readonly provider: ClockProvider;
  private readonly getSettings: () => AppSettings;
  private readonly engine: TtsEngine;
  private readonly logger: Logger;
  private readonly announcer = new ClockAnnouncer();
  private readonly turns = new Map<ClockSide, TurnState>();
  private unsubscribe: (() => void) | null = null;
  private lastSpokenText = '';
  private lastSpokenAt = 0;
  private warnedUnsupported = false;

  constructor(options: ClockVoiceControllerOptions) {
    this.provider = options.provider;
    this.getSettings = options.getSettings;
    this.engine = options.engine;
    this.logger = options.logger;
  }

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.provider.onTick((snapshot) => this.handleTick(snapshot));
    this.logger.info('Clock voice listening');
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.engine.cancel();
  }

  onSettingsChanged(settings: AppSettings): void {
    if (!settings.masterEnabled) {
      this.engine.cancel();
      this.announcer.reset();
    }
  }

  private handleTick(snapshot: ClockSnapshot): void {
    const app = this.getSettings();
    if (!app.masterEnabled) return;

    const settings = getClockVoiceSettings(app);
    const { timeControl } = snapshot;
    const category = this.resolveCategory(snapshot);
    const config = getTimeControlConfig(settings, category);
    if (!config.enabled) return;

    const sides = this.targetSides(snapshot, settings.clockScope);
    const now = Date.now();

    for (const side of sides) {
      const reading = side === 'top' ? snapshot.top : snapshot.bottom;
      if (!reading.isTurn || reading.seconds === null) continue;

      const turn = this.trackTurn(side, reading.isTurn, now);
      if (now - turn.since < settings.settleMs) continue;

      const decision = this.announcer.tick(side, {
        seconds: reading.seconds,
        now,
        threshold: config.threshold,
        incrementSeconds: timeControl.incrementSeconds,
        incrementAware: settings.incrementAware,
        cadence: settings.cadence,
        milestones: settings.milestones,
        settleMs: settings.settleMs,
      });

      if (!decision.announce || decision.second === undefined) continue;

      const text = renderPhrase(settings.phrase || '{seconds}', {
        seconds: decision.second,
        increment: timeControl.incrementSeconds,
        timeControl: t(categoryLabelKey(category)),
      });

      this.speak(text, now);
    }
  }

  private resolveCategory(snapshot: ClockSnapshot): TimeControlCategory {
    if (snapshot.timeControl.category) return snapshot.timeControl.category;
    const base =
      snapshot.timeControl.baseSeconds ??
      Math.max(snapshot.top.seconds ?? 0, snapshot.bottom.seconds ?? 0, 0);
    return base > 0 ? classifyTimeControl(base, snapshot.timeControl.incrementSeconds) : 'blitz';
  }

  private targetSides(snapshot: ClockSnapshot, scope: 'mine' | 'opponent' | 'both'): ClockSide[] {
    const mine = snapshot.playerSide;
    const opponent: ClockSide = mine === 'top' ? 'bottom' : 'top';
    if (scope === 'both') return ['top', 'bottom'];
    if (scope === 'opponent') return [opponent];
    return [mine];
  }

  private trackTurn(side: ClockSide, isTurn: boolean, now: number): TurnState {
    const existing = this.turns.get(side);
    if (!existing) {
      const created = { isTurn, since: now };
      this.turns.set(side, created);
      return created;
    }
    if (existing.isTurn !== isTurn) {
      existing.isTurn = isTurn;
      existing.since = now;
    }
    return existing;
  }

  private speak(text: string, now: number): void {
    const clean = text.trim();
    if (!clean) return;

    if (clean === this.lastSpokenText && now - this.lastSpokenAt < 800) return;
    if (now - this.lastSpokenAt < 200) return;

    if (!this.engine.isSupported()) {
      if (!this.warnedUnsupported) {
        this.logger.warn('speechSynthesis is not available in this browser');
        this.warnedUnsupported = true;
      }
      return;
    }

    const settings = getClockVoiceSettings(this.getSettings());
    this.engine.speak(clean, {
      voiceURI: settings.voiceURI,
      lang: settings.lang,
      rate: settings.rate,
      pitch: settings.pitch,
      volume: settings.volume,
    });
    this.lastSpokenText = clean;
    this.lastSpokenAt = now;
    this.logger.debug(`Spoke "${clean}"`);
  }
}

export function readingForSide(snapshot: ClockSnapshot, side: ClockSide): ClockReading {
  return side === 'top' ? snapshot.top : snapshot.bottom;
}
