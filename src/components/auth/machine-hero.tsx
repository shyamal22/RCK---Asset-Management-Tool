"use client";
import { useMachineState } from "./machine-state";

// Gauge geometry: a 270° tachometer arc around a compactor roller.
const C = 180;
const R = 150;
const START = 135; // degrees, bottom-left
const SWEEP = 270;
const TICKS = 28;
const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
};
const ARC_LEN = (2 * Math.PI * R * SWEEP) / 360;
const arcPath = (() => {
  const [x1, y1] = polar(START, R);
  const [x2, y2] = polar(START + SWEEP, R);
  return `M ${x1} ${y1} A ${R} ${R} 0 1 1 ${x2} ${y2}`;
})();

/**
 * Sign-in hero: engine gauge + roller with an amber beacon. Pure SVG + CSS (globals.css, .machine-*),
 * so it costs nothing to load and respects reduced motion.
 */
export function MachineHero() {
  const { state, reveal } = useMachineState();
  return (
    <div className="machine" data-state={state} data-reveal={reveal} aria-hidden>
      <svg viewBox="0 0 360 360" className="machine-svg">
        <defs>
          <radialGradient id="mh-glow" cx="50%" cy="52%" r="50%">
            <stop offset="0%" stopColor="var(--indigo)" stopOpacity="0.55" />
            <stop offset="60%" stopColor="var(--indigo)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--indigo)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mh-beacon" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--tangerine)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--tangerine)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={C} cy={C} r="170" fill="url(#mh-glow)" className="machine-glow" />

        {/* Gauge: ticks, track, level, redline */}
        {Array.from({ length: TICKS }, (_, i) => {
          const deg = START + (SWEEP * i) / (TICKS - 1);
          const major = i % 3 === 0;
          const [x1, y1] = polar(deg, R + 14);
          const [x2, y2] = polar(deg, R + (major ? 26 : 20));
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className={i >= TICKS - 5 ? "machine-tick machine-tick-red" : "machine-tick"}
              style={{ ["--i" as string]: i }}
            />
          );
        })}
        <path d={arcPath} className="machine-track" />
        <path d={arcPath} className="machine-level" style={{ strokeDasharray: ARC_LEN, ["--len" as string]: ARC_LEN }} />

        {/* Ground that scrolls when the machine "drives" */}
        <line x1="62" y1="268" x2="298" y2="268" className="machine-ground" />

        {/* Single-drum compactor roller: big front drum, cab, engine, rear tyre */}
        <g className="machine-body">
          {/* drum yoke */}
          <path d="M108 236 L150 212 M108 236 L150 228" className="machine-arm" />
          {/* chassis + engine hood */}
          <path d="M142 206 h104 a10 10 0 0 1 10 10 v18 h-114z" className="machine-panel" />
          <path d="M200 182 h40 a8 8 0 0 1 8 8 v16 h-48z" className="machine-panel machine-panel-dim" />
          <line x1="232" y1="182" x2="232" y2="170" className="machine-arm" style={{ strokeWidth: 4 }} />
          {/* cab with ROPS frame */}
          <path d="M150 142 h44 l6 64 h-56z" className="machine-cab" />
          <path d="M156 150 h32 l4 46 h-40z" className="machine-glass" />
          {/* operator: watches the form, looks away when a password is shown */}
          <circle cx="173" cy="182" r="11" className="machine-head" />
          <g className="machine-eyes">
            <ellipse cx="169" cy="180" rx="3.2" ry="3.6" className="machine-eye" />
            <ellipse cx="178" cy="180" rx="3.2" ry="3.6" className="machine-eye" />
            <g className="machine-pupils">
              <circle cx="170" cy="181" r="1.6" className="machine-pupil" />
              <circle cx="179" cy="181" r="1.6" className="machine-pupil" />
            </g>
          </g>
          {/* beacon */}
          <circle cx="172" cy="133" r="22" fill="url(#mh-beacon)" className="machine-beacon-halo" />
          <rect x="165" y="132" width="14" height="10" rx="4" className="machine-beacon" />
          {/* front steel drum */}
          <g className="machine-drum" style={{ transformOrigin: "106px 236px" }}>
            <circle cx="106" cy="236" r="31" className="machine-wheel" />
            <circle cx="106" cy="236" r="21" className="machine-wheel-inner" />
            {[0, 45, 90, 135].map((a) => (
              <line key={a} x1="106" y1="215" x2="106" y2="257" transform={`rotate(${a} 106 236)`} className="machine-spoke" />
            ))}
            <circle cx="106" cy="236" r="5" className="machine-hub" />
          </g>
          {/* rear tyre */}
          <g className="machine-drum" style={{ transformOrigin: "236px 246px" }}>
            <circle cx="236" cy="246" r="21" className="machine-wheel" />
            <circle cx="236" cy="246" r="11" className="machine-wheel-inner" />
            {[0, 60, 120].map((a) => (
              <line key={a} x1="236" y1="235" x2="236" y2="257" transform={`rotate(${a} 236 246)`} className="machine-spoke" />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
