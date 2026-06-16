/// <reference lib="dom" />

export type SwipeDirection = 'Up' | 'Down' | 'Left' | 'Right';

export interface SwipePoint {
  x:    number;
  y:    number;
  time: number;
}

export interface SwipeEvent {
  direction: SwipeDirection;
  velocity:  number;
  distanceX: number;
  distanceY: number;
}

export interface SwipeOptions {
  threshold?: number;
  timeout?:   number;
}

export function swipeDirection(start: SwipePoint, end: SwipePoint): SwipeDirection {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  if (dx > dy) return end.x > start.x ? 'Right' : 'Left';
  return end.y < start.y ? 'Up' : 'Down';
}

// EJ2 bug fixed: their getVelocity used startPoint.clientX for both axes
export function swipeVelocity(start: SwipePoint, end: SwipePoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dt = end.time - start.time;
  return dt === 0 ? 0 : Math.sqrt(dx * dx + dy * dy) / dt;
}

/** Attaches swipe detection to an element. Returns cleanup. */
export function onSwipe(
  element: HTMLElement,
  handler: (e: SwipeEvent) => void,
  options: SwipeOptions = {},
): () => void {
  const threshold = options.threshold ?? 50;
  const timeout   = options.timeout   ?? 300;

  element.style.touchAction = 'none';

  let start: SwipePoint | null = null;

  function onDown(e: PointerEvent): void {
    element.setPointerCapture(e.pointerId);
    start = { x: e.clientX, y: e.clientY, time: Date.now() };
  }

  function onUp(e: PointerEvent): void {
    if (!start || !element.hasPointerCapture(e.pointerId)) return;
    const end: SwipePoint = { x: e.clientX, y: e.clientY, time: Date.now() };

    const dt = end.time - start.time;
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);

    if (dt <= timeout && (dx >= threshold || dy >= threshold)) {
      handler({
        direction: swipeDirection(start, end),
        velocity:  swipeVelocity(start, end),
        distanceX: end.x - start.x,
        distanceY: end.y - start.y,
      });
    }
    start = null;
  }

  function onCancel(): void {
    start = null;
  }

  element.addEventListener('pointerdown',   onDown);
  element.addEventListener('pointerup',     onUp);
  element.addEventListener('pointercancel', onCancel);

  return () => {
    element.style.touchAction = '';
    element.removeEventListener('pointerdown',   onDown);
    element.removeEventListener('pointerup',     onUp);
    element.removeEventListener('pointercancel', onCancel);
  };
}
