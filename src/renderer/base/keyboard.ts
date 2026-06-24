/// <reference lib="dom" />

const KEY_MAP: Readonly<Record<string, string>> = {
    backspace: 'Backspace',
    tab: 'Tab',
    enter: 'Enter',
    shift: 'Shift',
    control: 'Control',
    alt: 'Alt',
    escape: 'Escape',
    space: ' ',
    pageup: 'PageUp',
    pagedown: 'PageDown',
    end: 'End',
    home: 'Home',
    leftarrow: 'ArrowLeft',
    uparrow: 'ArrowUp',
    rightarrow: 'ArrowRight',
    downarrow: 'ArrowDown',
    insert: 'Insert',
    delete: 'Delete',
    f1: 'F1', f2: 'F2', f3: 'F3', f4: 'F4',
    f5: 'F5', f6: 'F6', f7: 'F7', f8: 'F8',
    f9: 'F9', f10: 'F10', f11: 'F11', f12: 'F12',
    semicolon: ';',
    plus: '+',
    comma: ',',
    minus: '-',
    dot: '.',
    forwardslash: '/',
    graveaccent: '`',
    openbracket: '[',
    backslash: '\\',
    closebracket: ']',
    singlequote: "'",
};

export interface ParsedShortcut {
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    key: string;
}

const parseCache = new Map<string, ParsedShortcut>();

function resolveKey(name: string): string {
    return KEY_MAP[name] ?? name;
}

export function parseShortcut(combo: string): ParsedShortcut {
    const cached = parseCache.get(combo);
    if (cached) return cached;

    const parts = combo.toLowerCase().split('+');
    const keyName = parts[parts.length - 1] ?? '';
    const parsed: ParsedShortcut = {
        ctrlKey: parts.includes('ctrl'),
        shiftKey: parts.includes('shift'),
        altKey: parts.includes('alt'),
        metaKey: parts.includes('meta') || parts.includes('cmd'),
        key: resolveKey(keyName),
    };

    parseCache.set(combo, parsed);
    return parsed;
}

export function matchesShortcut(event: KeyboardEvent, combo: string): boolean {
    const s = parseShortcut(combo);
    return (
        event.ctrlKey === s.ctrlKey &&
        event.shiftKey === s.shiftKey &&
        event.altKey === s.altKey &&
        event.metaKey === s.metaKey &&
        event.key.toLowerCase() === s.key.toLowerCase()
    );
}

/** Returns the first matching combo string, or null. */
export function matchesAny(event: KeyboardEvent, combos: readonly string[]): string | null {
    for (const combo of combos) {
        if (matchesShortcut(event, combo)) return combo;
    }
    return null;
}
