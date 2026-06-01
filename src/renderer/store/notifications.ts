import { create } from 'zustand'
import type { AppNotification, NotificationAction } from '@shared/notifications'

interface NotificationStore {
  items: AppNotification[]
  add:      (n: AppNotification) => void
  dismiss:  (id: string) => void
  clearAll: () => void
}

export const useNotifications = create<NotificationStore>((set) => ({
  items: [],
  add:      (n) => { set((s) => ({ items: [n, ...s.items].slice(0, 20) })); },
  dismiss:  (id) => { set((s) => ({ items: s.items.filter((i) => i.id !== id) })); },
  clearAll: () => { set({ items: [] }); },
}))

/** Play a simple notification ding via Web Audio API. */
export function playAlarmBeep(): void {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 1.5)
  } catch { /* AudioContext not available */ }
}

class AlarmSoundManager {
  private active = new Map<string, { stop: () => void }>();

  play(id: string) {
    if (this.active.has(id)) return;
    try {
      const ctx = new AudioContext();
      let isRunning = true;
      let nextStartTime = ctx.currentTime;

      const schedulePattern = () => {
        if (!isRunning) return;
        const beepLength = 0.1;
        const shortPause = 0.1;
        const longPause = 0.6;
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.value = 1200;
          const time = nextStartTime + i * (beepLength + shortPause);
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(0.3, time + 0.01);
          gain.gain.setValueAtTime(0.3, time + beepLength - 0.02);
          gain.gain.linearRampToValueAtTime(0, time + beepLength);
          osc.start(time);
          osc.stop(time + beepLength);
        }
        nextStartTime += 4 * (beepLength + shortPause) + longPause;
        setTimeout(schedulePattern, 500); 
      };

      schedulePattern();

      this.active.set(id, {
        stop: () => {
          isRunning = false;
          ctx.close().catch(() => {});
        }
      });
    } catch { /* AudioContext not available */ }
  }

  stop(id: string) {
    const audio = this.active.get(id);
    if (audio) {
      audio.stop();
      this.active.delete(id);
    }
  }
}

export const alarmAudio = new AlarmSoundManager();

/** Actions the user can take on a notification from the renderer. */
export type { NotificationAction }
