

let uid = 0;

// ============================================================================
// TYPE CHECKING
// ============================================================================

/**
 * Check whether the value is null or undefined.
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === undefined || value === null;
}

/**
 * Check whether the value is undefined.
 */
export function isUndefined(value: unknown): value is undefined {
  return typeof value === 'undefined';
}

/**
 * Check whether the given argument is a plain object.
 */
export function isObject(obj: unknown): obj is Record<string, unknown> {
  return !isNullOrUndefined(obj) && obj.constructor === {}.constructor;
}

/**
 * Check whether the given value is an array whose first element is a plain object.
 * Type guard: narrows to Record<string, unknown>[] so callers get the element type.
 */
export function isObjectArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && isObject(value[0]);
}

// ============================================================================
// OBJECT MANIPULATION
// ============================================================================

/**
 * Get nested object value by path string.
 * @example getValue('user.settings.theme', config) // returns config.user.settings.theme
 */
export function getValue(nameSpace: string, obj: Record<string, unknown>): unknown {
  let value: unknown = obj;
  const splits = nameSpace.replace(/\[/g, '.').replace(/\]/g, '').split('.');

  for (const key of splits) {
    if (isUndefined(value)) break;
    value = (value as Record<string, unknown>)[key];
  }

  return value;
}

/**
 * Set nested object value by path string.
 * @example setValue('user.settings.theme', 'dark', config)
 */
export function setValue(
  nameSpace: string,
  value: unknown,
  obj: Record<string, unknown> = {}
): Record<string, unknown> {
  const keys = nameSpace.replace(/\[/g, '.').replace(/\]/g, '').split('.');
  const start = obj;
  let fromObj = start;

  for (const [i, key] of keys.entries()) {

    // Prevent prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    if (i + 1 === keys.length) {
      fromObj[key] = value ?? {};
    } else if (isNullOrUndefined(fromObj[key])) {
      fromObj[key] = {};
    }

    fromObj = fromObj[key] as Record<string, unknown>;
  }

  return start;
}

/**
 * Delete an item from an object.
 */
export function deleteObject(obj: Record<string, unknown>, key: string): void {
  Reflect.deleteProperty(obj, key);
}

/**
 * Deep merge objects. Later sources override earlier ones.
 * @example extend({}, defaults, userConfig, { deep: true })
 */
export function extend<T extends Record<string, unknown>>(
  target: T,
  ...sources: (Record<string, unknown> | undefined | null)[]
): T {
  const result = target;

  for (const source of sources) {
    if (!source) continue;

    Object.keys(source).forEach((key) => {
      const srcValue = (result as Record<string, unknown>)[key];
      const copyValue = source[key];

      if (isObject(copyValue) || Array.isArray(copyValue)) {
        if (isObject(copyValue)) {
          const clone = srcValue && isObject(srcValue) ? srcValue : {};
          (result as Record<string, unknown>)[key] = extend(
            clone,
            copyValue
          );
        } else if (Array.isArray(copyValue)) {
          (result as Record<string, unknown>)[key] = [...(copyValue as unknown[])];
        }
      } else {
        (result as Record<string, unknown>)[key] = copyValue;
      }
    });
  }

  return result;
}

// (removed `merge` — it was a confusingly-named, backwards Object.assign.
//  Use Object.assign(target, source) for shallow merge, or extend() for deep.)

// ============================================================================
// UNIQUE ID GENERATION
// ============================================================================

/**
 * Generate a unique ID with optional prefix.
 * @example getUniqueID('slide') // returns 'slide_0', 'slide_1', etc.
 */
export function getUniqueID(prefix = 'id'): string {
  return `${prefix}_${uid++}`;
}

/**
 * Generate a cryptographically random unique ID.
 * Uses crypto.randomUUID where available (Node, Electron, modern browsers),
 * falls back to getRandomValues, then to the plain counter as a last resort.
 */
export function uniqueID(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) {
    return c.randomUUID();
  }
  if (c?.getRandomValues) {
    const num = new Uint16Array(8);
    c.getRandomValues(num);
    return Array.from(num, (n) => n.toString(16).padStart(4, '0')).join('');
  }
  return getUniqueID();
}

// ============================================================================
// FUNCTION UTILITIES
// ============================================================================

/**
 * Debounce a function - only executes after delay ms of inactivity.
 * @example const debouncedSave = debounce(save, 300)
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function(this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle a function - executes at most once per delay ms.
 * @example const throttledResize = throttle(onResize, 100)
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function(this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else {
      timeoutId ??= setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * Run a callback as soon as possible after the current task, without the
 * ~4ms clamp of setTimeout(0). Uses MessageChannel. Returns a cancel function.
 * (Renamed from setImmediate to avoid shadowing Node's global of that name.)
 */
export function defer(handler: () => void): () => void {
  if (typeof MessageChannel === 'undefined') {
    const id = setTimeout(handler, 0);
    return () => { clearTimeout(id); };
  }

  const channel = new MessageChannel();
  let cancelled = false;

  channel.port1.onmessage = () => {
    channel.port1.close();
    channel.port2.close();
    if (!cancelled) handler();
  };
  channel.port2.postMessage(0);

  return () => {
    cancelled = true;
  };
}

// ============================================================================
// DOM UTILITIES
// ============================================================================

/**
 * Check if child element is descendant of parent (or same element).
 */
export function compareElementParent(child: Node | null, parent: Node): boolean {
  const node: Node | null = child;

  if (node === parent) return true;
  if (node === document || !node) return false;

  return compareElementParent(node.parentNode, parent);
}

/**
 * Normalize CSS unit values - adds 'px' if no unit specified.
 * @example formatUnit(100) // '100px'
 * @example formatUnit('50%') // '50%'
 */
export function formatUnit(value: number | string): string {
  const result = String(value);

  if (/auto|cm|mm|in|px|pt|pc|%|em|ex|ch|rem|vw|vh|vmin|vmax/.exec(result)) {
    return result;
  }

  return result + 'px';
}

// ============================================================================
// URL UTILITIES
// ============================================================================

/**
 * Convert object to URL query string.
 * @example queryParams({ page: 1, limit: 10 }) // 'page=1&limit=10'
 */
export function queryParams(data: Record<string, string | number | boolean>): string {
  return Object.keys(data)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(data[key]))}`)
    .join('&');
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Throw a custom error with stack trace.
 */
export function throwError(message: string): never {
  throw new Error(message);
}

// ============================================================================
// CLAMP & MATH UTILITIES
// ============================================================================

/**
 * Clamp a number between min and max values.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values.
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Map a value from one range to another.
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
