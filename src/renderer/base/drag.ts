/// <reference lib="dom" />

import { clamp } from './utils.ts';

export interface DragOptions {
  handle?:   string;
  axis?:     'x' | 'y';
  containTo?: HTMLElement | string;
  distance?:  number;
  onStart?:  (pos: DragPos) => void;
  onDrag?:   (pos: DragPos) => void;
  onStop?:   (pos: DragPos) => void;
  onCancel?: (pos: DragPos) => void;
}

export interface DragPos {
  x:      number;
  y:      number;
  deltaX: number;
  deltaY: number;
}

/** Makes an element draggable via Pointer Events. Returns cleanup. Element must have `position: absolute/fixed`. */
export function drag(element: HTMLElement, options: DragOptions = {}): () => void {
  const { handle, axis, distance = 1, onStart, onDrag, onStop } = options;

  const trigger = handle
    ? (element.querySelector<HTMLElement>(handle) ?? element)
    : element;

  // prevent browser scroll/zoom on touch without needing passive:false on pointermove
  trigger.style.touchAction = 'none';
  trigger.style.userSelect  = 'none';

  let active      = false;
  let startX      = 0, startY    = 0;
  let startLeft   = 0, startTop  = 0;
  let parentOffX  = 0, parentOffY = 0;

  function containerRect(): DOMRect | null {
    if (!options.containTo) return null;
    const el = typeof options.containTo === 'string'
      ? document.querySelector<HTMLElement>(options.containTo)
      : options.containTo;
    return el?.getBoundingClientRect() ?? null;
  }

  function onDown(e: PointerEvent): void {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // routes all pointermove/up/cancel for this pointer to trigger, even outside the window
    trigger.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    // read CSS position, not getBoundingClientRect — the latter includes parent offset
    const style  = getComputedStyle(element);
    startLeft    = parseFloat(style.left) || 0;
    startTop     = parseFloat(style.top)  || 0;
    const rect   = element.getBoundingClientRect();
    parentOffX   = rect.left - startLeft;
    parentOffY   = rect.top  - startTop;
    active       = false;
  }

  function onMove(e: PointerEvent): void {
    if (!trigger.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!active) {
      if (Math.sqrt(dx * dx + dy * dy) < distance) return;
      active = true;
      onStart?.({ x: e.clientX, y: e.clientY, deltaX: 0, deltaY: 0 });
    }

    let nx = startLeft + dx;
    let ny = startTop  + dy;

    const box = containerRect();
    if (box) {
      const el = element.getBoundingClientRect();
      nx = clamp(nx, box.left - parentOffX, box.right  - el.width  - parentOffX);
      ny = clamp(ny, box.top  - parentOffY, box.bottom - el.height - parentOffY);
    }

    if (axis !== 'y') element.style.left = `${nx}px`;
    if (axis !== 'x') element.style.top  = `${ny}px`;

    onDrag?.({ x: e.clientX, y: e.clientY, deltaX: dx, deltaY: dy });
  }

  function onUp(e: PointerEvent): void {
    if (!active) return;
    active = false;
    onStop?.({
      x:      e.clientX,
      y:      e.clientY,
      deltaX: e.clientX - startX,
      deltaY: e.clientY - startY,
    });
  }

  function onPtrCancel(e: PointerEvent): void {
    if (!active) return;
    active = false;
    options.onCancel?.({
      x:      e.clientX,
      y:      e.clientY,
      deltaX: e.clientX - startX,
      deltaY: e.clientY - startY,
    });
  }

  trigger.addEventListener('pointerdown',   onDown);
  trigger.addEventListener('pointermove',   onMove);
  trigger.addEventListener('pointerup',     onUp);
  trigger.addEventListener('pointercancel', onPtrCancel);

  return () => {
    trigger.style.touchAction = '';
    trigger.style.userSelect  = '';
    trigger.removeEventListener('pointerdown',   onDown);
    trigger.removeEventListener('pointermove',   onMove);
    trigger.removeEventListener('pointerup',     onUp);
    trigger.removeEventListener('pointercancel', onPtrCancel);
  };
}
