/// <reference lib="dom" />

export interface IntersectEntry {
  isIntersecting: boolean;
  ratio:          number;
  element:        Element;
}

export interface IntersectOptions {
  root?:       Element | null;
  rootMargin?: string;
  threshold?:  number | number[];
}

/** Observes intersection changes. Returns cleanup. */
export function onIntersect(
  element: Element,
  handler: (entry: IntersectEntry) => void,
  options: IntersectOptions = {},
): () => void {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      handler({
        isIntersecting: entry.isIntersecting,
        ratio:          entry.intersectionRatio,
        element:        entry.target,
      });
    }
  }, options);
  observer.observe(element);
  return () => { observer.disconnect(); };
}

/** Fires once when element becomes visible, then cleans itself up. */
export function onceVisible(
  element: Element,
  handler: (entry: IntersectEntry) => void,
  options: IntersectOptions = {},
): () => void {
  const cleanup = onIntersect(element, (entry) => {
    if (entry.isIntersecting) {
      handler(entry);
      cleanup();
    }
  }, options);
  return cleanup;
}
