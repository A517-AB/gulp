declare global {
  interface Window {
    msCrypto?: Crypto;
  }
}

let uid = 0;

type PlainObject = Record<string, unknown>;
type AnyFn<Args extends unknown[] = unknown[], Return = unknown> = (
  this: unknown,
  ...args: Args
) => Return;

type Constructor<T> = new (...args: unknown[]) => T;

const INSTANCES_KEY = 'ca_instances' as const;

type InstanceHost = HTMLElement & {
  [INSTANCES_KEY]?: unknown[];
};

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
export function isObject(obj: unknown): obj is PlainObject {
  return typeof obj === 'object' && obj !== null && Object.getPrototypeOf(obj) === Object.prototype;
}

/**
 * Check whether the given array contains plain objects.
 */
export function isObjectArray(value: unknown[]): boolean {
  return value.length > 0 && value.every((item) => isObject(item));
}

// ============================================================================
// OBJECT MANIPULATION
// ============================================================================

/**
 * Get nested object value by path string.
 * @example getValue('user.settings.theme', config) // returns config.user.settings.theme
 */
export function getValue(nameSpace: string, obj: PlainObject): unknown {
  let value: unknown = obj;
  const splits = nameSpace.replace(/\[/g, '.').replace(/\]/g, '').split('.').filter(Boolean);

  for (const key of splits) {
    if (isNullOrUndefined(value) || (typeof value !== 'object' && !Array.isArray(value))) {
      return undefined;
    }

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
  obj: PlainObject = {},
): PlainObject {
  const keys = nameSpace.replace(/\[/g, '.').replace(/\]/g, '').split('.').filter(Boolean);
  let current: PlainObject = obj;

  keys.forEach((key, index) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return;
    }

    const isLastKey = index === keys.length - 1;

    if (isLastKey) {
      current[key] = value;
      if (value === undefined) {
        current[key] = {};
      }
      return;
    }

    const nextValue = current[key];
    if (!isObject(nextValue)) {
      current[key] = {};
    }

    current = current[key] as PlainObject;
  });

  return obj;
}

/**
 * Delete an item from an object.
 */
export function deleteObject(obj: PlainObject, key: string): void {
  Reflect.deleteProperty(obj, key);
}

/**
 * Deep merge objects. Later sources override earlier ones.
 * @example extend({}, defaults, userConfig, { deep: true })
 */
export function extend<T extends PlainObject>(
  target: T,
  ...sources: (PlainObject | undefined | null)[]
): T {
  const result = (isObject(target) ? target : {}) as T;

  for (const source of sources) {
    if (!isObject(source)) continue;

    Object.keys(source).forEach((key) => {
      const srcValue = (result as PlainObject)[key];
      const copyValue = source[key];

      if (isObject(copyValue)) {
        const clone = isObject(srcValue) ? srcValue : {};
        (result as PlainObject)[key] = extend(clone, copyValue);
        return;
      }

      if (Array.isArray(copyValue)) {
        (result as PlainObject)[key] = Array.from(copyValue);
        return;
      }

      (result as PlainObject)[key] = copyValue;
    });
  }

  return result;
}

/**
 * Shallow merge source into destination (mutates destination).
 */
export function merge(source: PlainObject, destination: PlainObject): void {
  Object.keys(destination).forEach((key) => {
    source[key] = destination[key];
  });
}

// ============================================================================
// UNIQUE ID GENERATION
// ============================================================================

/**
 * Generate a unique ID with optional prefix.
 * @example getUniqueID('slide') // returns 'slide_0', 'slide_1', etc.
 */
export function getUniqueID(prefix = 'id'): string {
  return `${prefix}_${String(uid++)}`;
}

function getCrypto(): Crypto | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.msCrypto ?? window.crypto;
}

/**
 * Generate a cryptographically random unique ID.
 */
export function uniqueID(): string {
  const cryptoApi = getCrypto();
  if (!cryptoApi) return getUniqueID();

  const numbers = new Uint16Array(5);
  cryptoApi.getRandomValues(numbers);

  return Array.from(numbers, String).join('-');
}

// ============================================================================
// FUNCTION UTILITIES
// ============================================================================

/**
 * Debounce a function - only executes after delay ms of inactivity.
 * @example const debouncedSave = debounce(save, 300)
 */
export function debounce<Args extends unknown[]>(
  fn: AnyFn<Args>,
  delay: number,
): (...args: Args) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(this: unknown, ...args: Args) {
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
export function throttle<Args extends unknown[]>(
  fn: AnyFn<Args>,
  delay: number,
): (...args: Args) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function throttled(this: unknown, ...args: Args) {
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
 * Run a callback immediately after the browser completes other operations.
 * More efficient than setTimeout(fn, 0).
 */
export function setImmediate(handler: () => void): () => void {
  if (typeof window === 'undefined') {
    const timeoutId = setTimeout(handler, 0);
    return () => {
      clearTimeout(timeoutId);
    };
  }

  const cryptoApi = getCrypto();
  if (!cryptoApi) {
    const timeoutId = window.setTimeout(handler, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }

  const numbers = new Uint16Array(5);
  cryptoApi.getRandomValues(numbers);
  const secret = `ca2${Array.from(numbers, String).join('')}`;

  const messageHandler = (event: MessageEvent) => {
    if (
      event.source === window &&
      typeof event.data === 'string' &&
      event.data === secret
    ) {
      handler();
      window.removeEventListener('message', messageHandler);
    }
  };

  window.addEventListener('message', messageHandler, false);
  window.postMessage(secret, window.location.origin);

  return () => {
    window.removeEventListener('message', messageHandler);
  };
}

// ============================================================================
// DOM UTILITIES
// ============================================================================

/**
 * Check if child element is descendant of parent (or same element).
 */
export function compareElementParent(child: Node | null, parent: Node): boolean {
  let currentNode = child;

  while (currentNode) {
    if (currentNode === parent) return true;
    if (currentNode === document) return false;
    currentNode = currentNode.parentNode;
  }

  return false;
}

/**
 * Normalize CSS unit values - adds 'px' if no unit specified.
 * @example formatUnit(100) // '100px'
 * @example formatUnit('50%') // '50%'
 */
export function formatUnit(value: number | string): string {
  const result = String(value);
  const unitPattern = /auto|cm|mm|in|px|pt|pc|%|em|ex|ch|rem|vw|vh|vmin|vmax/;

  return unitPattern.exec(result) ? result : `${result}px`;
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
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(data[key]))}`)
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
// INSTANCE MANAGEMENT
// ============================================================================

function resolveElement(element: string | HTMLElement): InstanceHost | null {
  const resolvedElement = typeof element === 'string'
    ? document.querySelector<HTMLElement>(element)
    : element;

  return resolvedElement;
}

/**
 * Get component instance from an element.
 */
export function getInstance<T>(
  element: string | HTMLElement,
  component: Constructor<T>,
): T | null {
  const host = resolveElement(element);
  if (!host) return null;

  const instances = host[INSTANCES_KEY];
  if (!instances) return null;

  for (const instance of instances) {
    if ((typeof instance === 'object' || typeof instance === 'function') && instance instanceof component) {
      return instance;
    }
  }

  return null;
}

/**
 * Add component instance to an element.
 */
export function addInstance(element: string | HTMLElement, instance: unknown): void {
  const host = resolveElement(element);
  if (!host) return;

  host[INSTANCES_KEY] ??= [];
  host[INSTANCES_KEY].push(instance);
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
  outMax: number,
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
