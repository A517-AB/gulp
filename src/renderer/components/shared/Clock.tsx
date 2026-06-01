import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const SIZE = 280;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 118;
const ORIGIN = `${CX} ${CY}`;
const C = '#00B4C4';

function ticks() {
  return Array.from({ length: 60 }, (_, i) => {
    const isHour = i % 5 === 0;
    const isQuarter = i % 15 === 0;
    const angle = (i * 6 * Math.PI) / 180;
    const cos = Math.cos(angle - Math.PI / 2);
    const sin = Math.sin(angle - Math.PI / 2);
    const inner = isQuarter ? R - 18 : isHour ? R - 12 : R - 6;
    return (
      <line
        key={i}
        x1={CX + cos * R} y1={CY + sin * R}
        x2={CX + cos * inner} y2={CY + sin * inner}
        stroke={C}
        strokeWidth={isQuarter ? 2.5 : isHour ? 1.5 : 0.75}
        strokeLinecap="round"
        opacity={isQuarter ? 0.9 : isHour ? 0.45 : 0.2}
      />
    );
  });
}

function numbers() {
  return Array.from({ length: 12 }, (_, i) => {
    const n = i === 0 ? 12 : i;
    const angle = (i * 30 * Math.PI) / 180;
    const cos = Math.cos(angle - Math.PI / 2);
    const sin = Math.sin(angle - Math.PI / 2);
    const nr = R - 28;
    return (
      <text
        key={i}
        x={CX + cos * nr}
        y={CY + sin * nr}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="500"
        fill="rgba(255,255,255,0.55)"
      >
        {n}
      </text>
    );
  });
}

interface ClockProps {
  size?: number;
  className?: string;
}

export function Clock({ size = 240, className }: ClockProps) {
  const hourRef  = useRef<SVGGElement>(null);
  const minuteRef = useRef<SVGGElement>(null);
  const secondRef = useRef<SVGGElement>(null);
  const secRot = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const s   = now.getSeconds();
      const min = now.getMinutes() + s / 60;
      const hr  = (now.getHours() % 12) + min / 60;

      gsap.set(hourRef.current,   { rotation: hr * 30, svgOrigin: ORIGIN });
      gsap.set(minuteRef.current, { rotation: min * 6, svgOrigin: ORIGIN });

      if (secRot.current === null) {
        secRot.current = s * 6;
        gsap.set(secondRef.current, { rotation: secRot.current, svgOrigin: ORIGIN });
      } else {
        secRot.current += 6;
        gsap.to(secondRef.current, {
          rotation: secRot.current,
          svgOrigin: ORIGIN,
          duration: 0.45,
          ease: 'back.out(3)',
          overwrite: true,
        });
      }
    };

    update();
    const id = setInterval(update, 1000);
    return () => { clearInterval(id); };
  }, []);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="hand-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="black" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Outer ring */}
      <circle cx={CX} cy={CY} r={R + 2} fill="none" stroke={C} strokeWidth="0.5" opacity="0.2" />

      {/* Ticks + numbers */}
      {ticks()}
      {numbers()}

      {/* Hour hand */}
      <g ref={hourRef} filter="url(#hand-shadow)">
        <path
          d={`M${CX},${CY - 58} L${CX + 4},${CY - 18} L${CX + 3},${CY + 6} L${CX},${CY + 8} L${CX - 3},${CY + 6} L${CX - 4},${CY - 18} Z`}
          fill={C}
        />
      </g>

      {/* Minute hand */}
      <g ref={minuteRef} filter="url(#hand-shadow)">
        <path
          d={`M${CX},${CY - 88} L${CX + 2.5},${CY - 24} L${CX + 2},${CY + 10} L${CX},${CY + 12} L${CX - 2},${CY + 10} L${CX - 2.5},${CY - 24} Z`}
          fill={C}
        />
      </g>

      {/* Second hand */}
      <g ref={secondRef} filter="url(#glow)">
        <line
          x1={CX} y1={CY - 100}
          x2={CX} y2={CY + 26}
          stroke={C}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.9"
        />
        {/* tail accent */}
        <line
          x1={CX} y1={CY + 14}
          x2={CX} y2={CY + 26}
          stroke={C}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {/* Center cap */}
      <circle cx={CX} cy={CY} r={7} fill="white" />
      <circle cx={CX} cy={CY} r={4} fill={C} />
    </svg>
  );
}
