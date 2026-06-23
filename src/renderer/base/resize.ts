/// <reference lib="dom" />

export interface ResizeEntry {
  width:   number;
  height:  number;
  element: Element;
}

/** Observes element size changes. Returns cleanup. */
export function onResize(
  element: Element,
  handler: (entry: ResizeEntry) => void,
): () => void {
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      handler({
        width:   entry.contentRect.width,
        height:  entry.contentRect.height,
        element: entry.target,
      });
    }
  });
  observer.observe(element);
  return () => { observer.disconnect(); };
}
