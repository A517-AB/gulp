/// <reference lib="dom" />

export const KEY_CODES: Readonly<Record<string, number>> = {
  backspace:    8,
  tab:          9,
  enter:        13,
  shift:        16,
  control:      17,
  alt:          18,
  pause:        19,
  capslock:     20,
  escape:       27,
  space:        32,
  pageup:       33,
  pagedown:     34,
  end:          35,
  home:         36,
  leftarrow:    37,
  uparrow:      38,
  rightarrow:   39,
  downarrow:    40,
  insert:       45,
  delete:       46,
  f1: 112, f2: 113,  f3: 114,  f4:  115,
  f5: 116, f6: 117,  f7: 118,  f8:  119,
  f9: 120, f10: 121, f11: 122, f12: 123,
  semicolon:    186,
  plus:         187,
  comma:        188,
  minus:        189,
  dot:          190,
  forwardslash: 191,
  graveaccent:  192,
  openbracket:  219,
  backslash:    220,
  closebracket: 221,
  singlequote:  222,
};

export interface ParsedShortcut {
  ctrlKey:  boolean;
  shiftKey: boolean;
  altKey:   boolean;
  metaKey:  boolean;
  keyCode:  number;
}

const parseCache = new Map<string, ParsedShortcut>();

function resolveKeyCode(key: string): number {
  return KEY_CODES[key] ?? key.toUpperCase().charCodeAt(0);
}

export function parseShortcut(combo: string): ParsedShortcut {
  const cached = parseCache.get(combo);
  if (cached) return cached;

  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const parsed: ParsedShortcut = {
    ctrlKey:  parts.includes('ctrl'),
    shiftKey: parts.includes('shift'),
    altKey:   parts.includes('alt'),
    metaKey:  parts.includes('meta') || parts.includes('cmd'),
    keyCode:  key.length > 1 && !isNaN(Number(key)) ? Number(key) : resolveKeyCode(key),
  };

  parseCache.set(combo, parsed);
  return parsed;
}

export function matchesShortcut(event: KeyboardEvent, combo: string): boolean {
  const s = parseShortcut(combo);
  return (
    event.ctrlKey  === s.ctrlKey  &&
    event.shiftKey === s.shiftKey &&
    event.altKey   === s.altKey   &&
    event.metaKey  === s.metaKey  &&
    event.which    === s.keyCode
  );
}

/** Returns the first matching combo string, or null. */
export function matchesAny(event: KeyboardEvent, combos: readonly string[]): string | null {
  for (const combo of combos) {
    if (matchesShortcut(event, combo)) return combo;
  }
  return null;
}
