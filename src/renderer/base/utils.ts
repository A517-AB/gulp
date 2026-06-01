

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
 * Check whether the given array contains objects.
 */
export function isObjectArray<T>(value: T[]): boolean {
  const parser = Object.prototype.toString;
  if (parser.call(value) === '[object Array]') {
    if (parser.call(value[0]) === '[object Object]') {
      return true;
    }
  }
  return false;
}

// ============================================================================
// OBJECT MANIPULATION
// ============================================================================

/**
 * Get nested object value by path string.
 * @example getValue('user.settings.theme', config) // returns config.user.settings.theme
 */
export function getValue<T = unknown>(nameSpace: string, obj: Record<string, unknown>): T | undefined {
  let value: unknown = obj;
  const splits = nameSpace.replace(/\[/g, '.').replace(/\]/g, '').split('.');
  
  for (let i = 0; i < splits.length && !isUndefined(value); i++) {
    value = (value as Record<string, unknown>)[splits[i]!];
  }
  
  return value as T | undefined;
}

/**
 * Set nested object value by path string.
 * @example setValue('user.settings.theme', 'dark', config)
 */
export function setValue<T = unknown>(
  nameSpace: string, 
  value: T, 
  obj: Record<string, unknown> = {}
): Record<string, unknown> {
  const keys = nameSpace.replace(/\[/g, '.').replace(/\]/g, '').split('.');
  const start = obj;
  let fromObj = start;
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    
    // Prevent prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    
    if (i + 1 === keys.length) {
      fromObj[key] = value === undefined ? {} : value;
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
  delete obj[key];
}

/**
 * Deep merge objects. Later sources override earlier ones.
 * @example extend({}, defaults, userConfig, { deep: true })
 */
export function extend<T extends Record<string, unknown>>(
  target: T,
  ...sources: (Record<string, unknown> | undefined | null)[]
): T {
  const result = (target && typeof target === 'object' ? target : {}) as T;
  
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
          (result as Record<string, unknown>)[key] = [...copyValue];
        }
      } else {
        (result as Record<string, unknown>)[key] = copyValue;
      }
    });
  }
  
  return result;
}

/**
 * Shallow merge source into destination (mutates destination).
 */
export function merge<T extends Record<string, unknown>>(
  source: T, 
  destination: Record<string, unknown>
): void {
  if (isNullOrUndefined(destination)) return;
  
  const keys = Object.keys(destination);
  for (const key of keys) {
    (source as Record<string, unknown>)[key] = destination[key];
  }
}

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
 */
export function uniqueID(): string {
  if (typeof window === 'undefined') return getUniqueID();
  
  const num = new Uint16Array(5);
  const intCrypto = (window as any).msCrypto || window.crypto;
  intCrypto.getRandomValues(num);
  
  return Array.from(num).join('-');
}

// ============================================================================
// FUNCTION UTILITIES
// ============================================================================

/**
 * Debounce a function - only executes after delay ms of inactivity.
 * @example const debouncedSave = debounce(save, 300)
 */
export function debounce<T extends (...args: any[]) => any>(
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
export function throttle<T extends (...args: any[]) => any>(
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
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
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
    setTimeout(handler, 0);
    return () => {};
  }
  
  let unbind: () => void;
  const num = new Uint16Array(5);
  const intCrypto = (window as any).msCrypto || window.crypto;
  intCrypto.getRandomValues(num);
  const secret = 'ca2' + Array.from(num).join('');
  
  const messageHandler = (event: MessageEvent) => {
    if (
      event.source === window && 
      typeof event.data === 'string' && 
      event.data === secret
    ) {
      handler();
      unbind();
    }
  };
  
  window.addEventListener('message', messageHandler, false);
  window.postMessage(secret, window.location.origin);
  
  return unbind = () => {
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
// INSTANCE MANAGEMENT
// ============================================================================

const INSTANCES_KEY = 'ca_instances';

/**
 * Get component instance from an element.
 */
export function getInstance<T>(
  element: string | HTMLElement, 
  component: new (...args: any[]) => T
): T | null {
  const elem = typeof element === 'string' 
    ? document.querySelector(element)!
    : element;
    
  if (!elem) return null;
  
  const instances = (elem as any)[INSTANCES_KEY] as T[] | undefined;
  
  if (instances) {
    for (const inst of instances) {
      if (inst instanceof component) {
        return inst;
      }
    }
  }
  
  return null;
}

/**
 * Add component instance to an element.
 */
export function addInstance(element: string | HTMLElement, instance: unknown): void {
  const elem = typeof element === 'string' 
    ? document.querySelector(element)!
    : element;
    
  if (!elem) return;
  
  if ((elem as any)[INSTANCES_KEY]) {
    (elem as any)[INSTANCES_KEY].push(instance);
  } else {
    (elem as any)[INSTANCES_KEY] = [instance];
  }
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
