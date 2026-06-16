/// <reference lib="dom" />

export interface RippleOptions {
  duration?: number;
  center?:   boolean;
  selector?: string;
  ignore?:   string;
  color?:    string;
}

function spawnRipple(host: HTMLElement, clientX: number, clientY: number, opts: Required<RippleOptions>): void {
  const rect = host.getBoundingClientRect();
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;

  const maxX = Math.max(relX, rect.width  - relX);
  const maxY = Math.max(relY, rect.height - relY);
  const size = Math.sqrt(maxX * maxX + maxY * maxY) * 2;
  const half = size / 2;

  const el = document.createElement('span');
  const s  = el.style;
  s.position        = 'absolute';
  s.borderRadius    = '50%';
  s.pointerEvents   = 'none';
  s.width = s.height = `${size}px`;
  s.left            = opts.center ? `${(rect.width  - size) / 2}px` : `${relX - half}px`;
  s.top             = opts.center ? `${(rect.height - size) / 2}px` : `${relY - half}px`;
  s.transform       = 'scale(0)';
  s.opacity         = '0.3';
  s.backgroundColor = opts.color;
  s.transition      = `transform ${opts.duration}ms ease-out, opacity ${opts.duration}ms ease-out`;

  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.style.overflow = 'hidden';
  host.appendChild(el);

  void el.offsetWidth;
  el.style.transform = 'scale(1)';
  el.style.opacity   = '0';

  setTimeout(() => el.remove(), opts.duration);
}

/** Attaches a material ripple to an element. Returns cleanup that removes the listener. */
export function ripple(element: HTMLElement, options: RippleOptions = {}): () => void {
  const opts: Required<RippleOptions> = {
    duration: options.duration ?? 350,
    center:   options.center   ?? false,
    selector: options.selector ?? '',
    ignore:   options.ignore   ?? '',
    color:    options.color    ?? 'currentColor',
  };

  function onPointerDown(e: PointerEvent): void {
    const target = e.target as Element;
    const host: HTMLElement | null = opts.selector
      ? (target.closest(opts.selector) as HTMLElement | null)
      : element;
    if (!host) return;
    if (opts.ignore && target.closest(opts.ignore)) return;
    spawnRipple(host, e.clientX, e.clientY, opts);
  }

  element.addEventListener('pointerdown', onPointerDown);
  return () => element.removeEventListener('pointerdown', onPointerDown);
}

/** Drop into useEffect: `useEffect(() => useRippleEffect(ref), [])` */
export function useRippleEffect(
  ref: { current: HTMLElement | null },
  options?: RippleOptions,
): () => void {
  if (!ref.current) return () => undefined;
  return ripple(ref.current, options);
}
