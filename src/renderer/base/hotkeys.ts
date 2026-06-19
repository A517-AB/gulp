/// <reference lib="dom" />
import { matchesShortcut } from './keyboard.ts';

export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

function makeHandler(map: HotkeyMap): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent): void => {
    for (const combo of Object.keys(map)) {
      if (matchesShortcut(e, combo)) {
        map[combo]?.(e);
        return;
      }
    }
  };
}

export const hotkeys = {
  bind(
    target: EventTarget,
    map: HotkeyMap,
    event: 'keydown' | 'keyup' = 'keydown',
  ): () => void {
    const handler = makeHandler(map);
    target.addEventListener(event, handler as EventListener);
    return () => target.removeEventListener(event, handler as EventListener);
  },
};
