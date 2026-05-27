import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 100;
const SVG_ORIGIN = `${CX} ${CY}` as const;
const VIEW_BOX = `0 0 ${SIZE} ${SIZE}` as const;

function ticks() {
  return Array.from({ length: 60 }, (_, i) => {
    const isHour = i % 5 === 0;
    const isQuarter = i % 15 === 0;
    const angle = (i * 6 * Math.PI) / 180;
    const cos = Math.cos(angle - Math.PI / 2);
    const sin = Math.sin(angle - Math.PI / 2);
    const outer = R;
    const inner = isQuarter ? R - 16 : isHour ? R - 10 : R - 5;
    return (
      <line
        key={i}
        x1={CX + cos * outer} y1={CY + sin * outer}
        x2={CX + cos * inner} y2={CY + sin * inner}
        stroke="currentColor"
        strokeWidth={isQuarter ? 2.5 : isHour ? 1.5 : 0.6}
        strokeLinecap="round"
        opacity={isQuarter ? 1 : isHour ? 0.5 : 0.18}
      />
    );
  });
}

function batonPath(tipY: number, wideY: number, wideX: number, baseY: number, baseX: number, tailY: number): string {
  return `M ${CX},${tipY} L ${CX + wideX},${wideY} L ${CX + baseX},${baseY} L ${CX},${tailY} L ${CX - baseX},${baseY} L ${CX - wideX},${wideY} Z`;
}

interface ClockProps {
  size?: number;
  className?: string;
}

export function Clock({ size = 240, className }: ClockProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const hourRef = useRef<SVGGElement>(null);
  const minuteRef = useRef<SVGGElement>(null);
  const secondRef = useRef<SVGGElement>(null);

  useGSAP(() => {
    const tick = () => {
      const now = new Date();
      const ms = now.getMilliseconds();
      const sec = now.getSeconds() + ms / 1000;
      const min = now.getMinutes() + sec / 60;
      const hr = (now.getHours() % 12) + min / 60;

      gsap.set(hourRef.current,   { rotation: hr * 30, svgOrigin: SVG_ORIGIN });
      gsap.set(minuteRef.current, { rotation: min * 6, svgOrigin: SVG_ORIGIN });
      gsap.set(secondRef.current, { rotation: sec * 6, svgOrigin: SVG_ORIGIN });
    };

    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); };
  }, { scope: svgRef });

  return (
    <svg
      ref={svgRef}
      viewBox={VIEW_BOX}
      width={size}
      height={size}
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        <filter id="face-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="14" floodColor="black" floodOpacity="0.45" />
          <feDropShadow dx="0" dy="2" stdDeviation="4"  floodColor="black" floodOpacity="0.3" />
        </filter>
        <filter id="hand-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="black" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Face */}
      <circle cx={CX} cy={CY} r={R + 4} fill="var(--card)" filter="url(#face-shadow)" />

      {/* Ticks */}
      <g color="var(--foreground)">{ticks()}</g>

      {/* Hour hand */}
      <g ref={hourRef} filter="url(#hand-shadow)">
        <path
          d={batonPath(CY - 54, CY - 16, 4.5, CY + 8, 3, CY + 10)}
          fill="var(--primary)"
        />
      </g>

      {/* Minute hand */}
      <g ref={minuteRef} filter="url(#hand-shadow)">
        <path
          d={batonPath(CY - 72, CY - 20, 3, CY + 10, 2, CY + 12)}
          fill="var(--primary)"
        />
      </g>

      {/* Second hand */}
      <g ref={secondRef} filter="url(#hand-shadow)">
        <line
          x1={CX} y1={CY - 82}
          x2={CX} y2={CY + 6}
          stroke="var(--primary)"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity={0.9}
        />
        <line
          x1={CX} y1={CY + 6}
          x2={CX} y2={CY + 22}
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity={0.6}
        />
      </g>

      {/* Cap */}
      <circle cx={CX} cy={CY} r={6} fill="var(--primary)" />
      <circle cx={CX} cy={CY} r={3} fill="var(--card)" />
    </svg>
  );
}
