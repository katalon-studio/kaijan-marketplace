// SVG documents as strings, for the `Svg` element (desktop, vscode, mobile).
// Colours are raw hex: an SVG cannot read the app's theme keys. Picked to read
// on both the light and the dark app background.

import type { Run, RunSummary, ThemeName } from "./types";
import { tally } from "./state";

export const C = {
  pass: "#3fb950",
  fail: "#f85149",
  skip: "#d29922",
  queued: "#8b949e",
  run: "#58a6ff",
  accent: "#d97757",
  grid: "#8b949e33",
  label: "#8b949e",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A donut of passed / failed / skipped / remaining, with the pass rate in the middle. */
export function donut(r: Run, size = 120): string {
  const t = tally(r);
  const rest = t.total - t.passed - t.failed - t.skipped;
  const parts = [
    { n: t.passed, c: C.pass, label: "passed" },
    { n: t.failed, c: C.fail, label: "failed" },
    { n: t.skipped, c: C.skip, label: "skipped" },
    { n: rest, c: C.grid, label: "not run" },
  ];
  const rad = 15.915; // circumference 100
  let offset = 25;
  const arcs = parts
    .filter((p) => p.n > 0)
    .map((p) => {
      const pct = (p.n / t.total) * 100;
      const arc = `<circle r="${rad}" cx="21" cy="21" fill="none" stroke="${p.c}" stroke-width="5" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${offset}"><title>${p.n} ${p.label}</title></circle>`;
      offset -= pct;
      return arc;
    })
    .join("");
  const rate =
    t.done === 0
      ? "—"
      : `${Math.round((t.passed / Math.max(1, t.done - t.skipped)) * 100)}%`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42" width="${size}" height="${size}">
<circle r="${rad}" cx="21" cy="21" fill="none" stroke="${C.grid}" stroke-width="5"/>
${arcs}
<text x="21" y="22.5" text-anchor="middle" font-family="system-ui,sans-serif" font-size="7" font-weight="600" fill="${C.label}">${rate}</text>
<text x="21" y="28" text-anchor="middle" font-family="system-ui,sans-serif" font-size="3" fill="${C.label}">pass rate</text>
</svg>`;
}

/** One stacked bar: the run's progress, segment per case in order. */
export function progressBar(r: Run, width = 560): string {
  const h = 10;
  const w = width / r.cases.length;
  const color = (s: string) =>
    s === "passed"
      ? C.pass
      : s === "failed"
        ? C.fail
        : s === "skipped"
          ? C.skip
          : s === "running"
            ? C.run
            : C.grid;
  const segs = r.cases
    .map((c, i) => {
      const pulse =
        c.status === "running"
          ? `<animate attributeName="opacity" values="1;0.35;1" dur="1s" repeatCount="indefinite"/>`
          : "";
      return `<rect x="${i * w + 1}" y="0" width="${w - 2}" height="${h}" rx="3" fill="${color(c.status)}">${pulse}<title>${esc(c.name)}: ${c.status}</title></rect>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}">${segs}</svg>`;
}

/** Horizontal bars of each case's duration, with hover tooltips and a grow-in animation. */
export function durationBars(r: Run, width = 560): string {
  const row = 22;
  const labelW = 210;
  const max = Math.max(1, ...r.cases.map((c) => c.ms));
  const bars = r.cases
    .map((c, i) => {
      const y = i * row;
      const w = Math.max(2, ((width - labelW - 50) * c.ms) / max);
      const fill =
        c.status === "failed"
          ? C.fail
          : c.status === "skipped"
            ? C.skip
            : c.ms === 0
              ? C.grid
              : C.pass;
      return `<g>
<text x="0" y="${y + 14}" font-family="system-ui,sans-serif" font-size="11" fill="${C.label}">${esc(c.name.length > 32 ? c.name.slice(0, 31) + "…" : c.name)}</text>
<rect x="${labelW}" y="${y + 4}" height="13" rx="3" fill="${fill}" width="${w}"><animate attributeName="width" from="0" to="${w}" dur="0.8s" fill="freeze"/><title>${esc(c.name)}: ${c.ms} ms</title></rect>
<text x="${labelW + w + 6}" y="${y + 14}" font-family="ui-monospace,monospace" font-size="10" fill="${C.label}">${c.ms ? c.ms + "ms" : "—"}</text>
</g>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${r.cases.length * row}" width="${width}" height="${r.cases.length * row}">${bars}</svg>`;
}

/** Pass-rate trend over the run history: an area sparkline with dots. */
export function trend(list: RunSummary[], width = 560, height = 90): string {
  const pts =
    list.length > 0
      ? list
      : [{ id: 0, passed: 0, failed: 0, skipped: 0, ms: 0 }];
  const rate = (s: RunSummary) =>
    s.passed + s.failed === 0 ? 0 : s.passed / (s.passed + s.failed);
  const step = pts.length > 1 ? (width - 20) / (pts.length - 1) : 0;
  const xy = pts.map(
    (s, i) => [10 + i * step, height - 12 - rate(s) * (height - 24)] as const,
  );
  const line = xy
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const last = xy[xy.length - 1] ?? [10, height - 12];
  const area = `${line} L${last[0].toFixed(1)},${height - 12} L10,${height - 12} Z`;
  const dots = xy
    .map(([x, y], i) => {
      const s = pts[i];
      const tip = s
        ? `Run #${s.id}: ${s.passed} passed, ${s.failed} failed`
        : "";
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${C.accent}"><title>${tip}</title></circle>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.accent}" stop-opacity="0.45"/><stop offset="1" stop-color="${C.accent}" stop-opacity="0"/></linearGradient></defs>
<line x1="10" x2="${width - 10}" y1="12" y2="12" stroke="${C.grid}" stroke-dasharray="3 3"/>
<line x1="10" x2="${width - 10}" y1="${height - 12}" y2="${height - 12}" stroke="${C.grid}"/>
<text x="${width - 10}" y="9" text-anchor="end" font-family="system-ui,sans-serif" font-size="9" fill="${C.label}">100%</text>
<path d="${area}" fill="url(#g)"/>
<path d="${line}" fill="none" stroke="${C.accent}" stroke-width="2"/>
${dots}
</svg>`;
}

/** A small animated logo mark for card headers. */
export function badge(size = 28): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">
<rect width="32" height="32" rx="8" fill="${C.accent}"/>
<g transform="translate(16 16)"><g>
<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite"/>
<path d="M0,-9 L2.4,-2.4 L9,0 L2.4,2.4 L0,9 L-2.4,2.4 L-9,0 L-2.4,-2.4 Z" fill="#fff"/>
</g></g>
</svg>`;
}

/** Full-window backdrops for `$.theme.set`, drawn behind the conversation. */
export function backdrop(name: ThemeName): string {
  const open = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">`;
  if (name === "grid") {
    return `${open}
<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#5b8def" stroke-opacity="0.25"/></pattern>
<pattern id="P" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M200 0H0V200" fill="none" stroke="#5b8def" stroke-opacity="0.45" stroke-width="1.5"/></pattern></defs>
<rect width="1600" height="1000" fill="#0b2545"/>
<rect width="1600" height="1000" fill="url(#p)"/><rect width="1600" height="1000" fill="url(#P)"/>
<circle cx="1250" cy="260" r="160" fill="none" stroke="#9cc3ff" stroke-opacity="0.5" stroke-dasharray="6 8"><animateTransform attributeName="transform" type="rotate" from="0 1250 260" to="360 1250 260" dur="40s" repeatCount="indefinite"/></circle>
</svg>`;
  }
  if (name === "sunset") {
    return `${open}
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1055"/><stop offset="0.55" stop-color="#d53369"/><stop offset="1" stop-color="#f9a03f"/></linearGradient></defs>
<rect width="1600" height="1000" fill="url(#s)"/>
<circle cx="800" cy="720" r="220" fill="#ffd166" fill-opacity="0.85"><animate attributeName="cy" values="720;700;720" dur="12s" repeatCount="indefinite"/></circle>
<path d="M0 760 Q400 700 800 760 T1600 760 V1000 H0 Z" fill="#2b1055" fill-opacity="0.85"/>
<path d="M0 840 Q400 790 800 840 T1600 840 V1000 H0 Z" fill="#14072b"/>
</svg>`;
  }
  // aurora
  return `${open}
<defs>
<radialGradient id="a" cx="0.2" cy="0.3" r="0.6"><stop offset="0" stop-color="#3ddc97" stop-opacity="0.8"/><stop offset="1" stop-color="#3ddc97" stop-opacity="0"/></radialGradient>
<radialGradient id="b" cx="0.8" cy="0.2" r="0.6"><stop offset="0" stop-color="#7c5cff" stop-opacity="0.8"/><stop offset="1" stop-color="#7c5cff" stop-opacity="0"/></radialGradient>
<radialGradient id="c" cx="0.6" cy="0.9" r="0.6"><stop offset="0" stop-color="#d97757" stop-opacity="0.7"/><stop offset="1" stop-color="#d97757" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1600" height="1000" fill="#0d1117"/>
<rect width="1600" height="1000" fill="url(#a)"><animate attributeName="opacity" values="0.6;1;0.6" dur="9s" repeatCount="indefinite"/></rect>
<rect width="1600" height="1000" fill="url(#b)"><animate attributeName="opacity" values="1;0.5;1" dur="11s" repeatCount="indefinite"/></rect>
<rect width="1600" height="1000" fill="url(#c)"><animate attributeName="opacity" values="0.5;0.9;0.5" dur="13s" repeatCount="indefinite"/></rect>
</svg>`;
}
