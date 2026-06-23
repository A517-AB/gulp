export const EASING = {
  ease:         'cubic-bezier(0.250, 0.100, 0.250, 1.000)',
  linear:       'cubic-bezier(0.250, 0.250, 0.750, 0.750)',
  easeIn:       'cubic-bezier(0.420, 0.000, 1.000, 1.000)',
  easeOut:      'cubic-bezier(0.000, 0.000, 0.580, 1.000)',
  easeInOut:    'cubic-bezier(0.420, 0.000, 0.580, 1.000)',
  elasticInOut: 'cubic-bezier(0.500, -0.580, 0.380, 1.810)',
  elasticIn:    'cubic-bezier(0.170, 0.670, 0.590, 1.810)',
  elasticOut:   'cubic-bezier(0.700, -0.750, 0.990, 1.010)',
} as const;

export type EasingName = keyof typeof EASING;

export function cssEasing(name: EasingName | (string & {})): string {
  return (EASING as Record<string, string>)[name] ?? name;
}

function mergeTransition(element: HTMLElement, next: string): void {
  const current = element.style.transition;
  if (!current) { element.style.transition = next; return; }

  const property = next.split(' ')[0];
  const parts = current.split(',').map(t => t.trim());
  const idx = parts.findIndex(t => t.split(' ')[0] === property);

  if (idx === -1) parts.push(next); else parts[idx] = next;
  element.style.transition = parts.join(', ');
}

/** Applies a CSS transition, merging with existing ones. Returns cleanup that removes it. */
export function applyTransition(
  element: HTMLElement,
  property: string,
  durationMs: number,
  easing: EasingName | (string & {}) = 'ease',
  delayMs = 0,
): () => void {
  const delay = delayMs ? ` ${delayMs}ms` : '';
  mergeTransition(element, `${property} ${durationMs}ms ${cssEasing(easing)}${delay}`);
  return () => { clearTransition(element, property); };
}

export function clearTransition(element: HTMLElement, property?: string): void {
  if (!property) { element.style.transition = ''; return; }
  const parts = element.style.transition.split(',').map(t => t.trim());
  element.style.transition = parts.filter(t => t.split(' ')[0] !== property).join(', ');
}
