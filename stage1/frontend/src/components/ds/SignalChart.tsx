import { useRef } from "react";

// Clinical signal chart for the OT cabinet: one or more time-series traces over a
// shared time axis, a playhead synced to video.currentTime, real event markers, and
// click-to-seek. Pure SVG, no chart lib. Shows RAW SIGNAL as facts (not judgments).

export interface ChartTrace {
  label: string;
  color: string;
  t: number[];           // seconds
  v: (number | null)[];  // same length; null = gap (signal absent)
}
export interface ChartMarker {
  t: number;             // seconds
  color: string;
  label: string;
}

const W = 600;
const H = 150;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 10;
const PAD_B = 22; // room for marker ticks
const INNER_W = W - PAD_L - PAD_R;
const INNER_H = H - PAD_T - PAD_B;

function tracePath(tr: ChartTrace, duration: number): string {
  const finite = tr.v.filter((x): x is number => x != null && isFinite(x));
  if (finite.length === 0 || duration <= 0) return "";
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min || 1;
  let d = "";
  let pen = false; // pen-up across null gaps
  for (let i = 0; i < tr.t.length; i++) {
    const val = tr.v[i];
    if (val == null || !isFinite(val)) {
      pen = false;
      continue;
    }
    const x = PAD_L + (Math.min(tr.t[i], duration) / duration) * INNER_W;
    const y = PAD_T + INNER_H - ((val - min) / span) * INNER_H;
    d += `${pen ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    pen = true;
  }
  return d;
}

export function SignalChart({
  traces,
  markers = [],
  duration,
  currentTime,
  onSeek,
}: {
  traces: ChartTrace[];
  markers?: ChartMarker[];
  duration: number;
  currentTime: number;
  onSeek: (t: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const seekFromEvent = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg || duration <= 0) return;
    const r = svg.getBoundingClientRect();
    let frac = (clientX - r.left) / r.width;
    if (document.documentElement.dir === "rtl") frac = 1 - frac;
    const px = PAD_L + Math.max(0, Math.min(1, frac)) * INNER_W;
    const t = ((px - PAD_L) / INNER_W) * duration;
    onSeek(Math.max(0, Math.min(duration, t)));
  };

  const headX = duration > 0 ? PAD_L + (Math.min(currentTime, duration) / duration) * INNER_W : PAD_L;
  const hasSignal = traces.some((tr) => tr.v.some((x) => x != null && isFinite(x)));

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="signal over time"
        style={{ display: "block", cursor: "pointer", touchAction: "none" }}
        onClick={(e) => seekFromEvent(e.clientX)}
      >
        {/* baseline */}
        <line x1={PAD_L} y1={PAD_T + INNER_H} x2={W - PAD_R} y2={PAD_T + INNER_H} stroke="var(--border-subtle)" strokeWidth={1} />
        {/* traces */}
        {traces.map((tr) => (
          <path key={tr.label} d={tracePath(tr, duration)} fill="none" stroke={tr.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {/* event markers (ticks along the bottom) */}
        {markers.map((m, i) => {
          const x = duration > 0 ? PAD_L + (Math.min(m.t, duration) / duration) * INNER_W : PAD_L;
          return <line key={i} x1={x} y1={PAD_T + INNER_H} x2={x} y2={H - 6} stroke={m.color} strokeWidth={2} />;
        })}
        {/* playhead */}
        <line x1={headX} y1={PAD_T - 2} x2={headX} y2={PAD_T + INNER_H} stroke="var(--navy-700)" strokeWidth={1.5} />
        <circle cx={headX} cy={PAD_T - 2} r={3.5} fill="var(--navy-700)" />
        {!hasSignal ? (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={13} fill="var(--text-muted)">no signal detected in this clip</text>
        ) : null}
      </svg>
    </div>
  );
}
