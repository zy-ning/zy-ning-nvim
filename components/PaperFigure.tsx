import React, { useId } from 'react';

/** Shared canvas for small conceptual illustrations, never experiment plots. */
export function FigureFrame({ kind, className = '', children }: { kind: string; className?: string; children: React.ReactNode }) {
  const id = useId();
  return <svg className={`paper-figure paper-figure-${kind} ${className}`.trim()} data-figure={kind} viewBox="0 0 360 135" fill="none" aria-hidden="true" focusable="false">
    <defs><pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="currentColor" opacity=".18" /></pattern></defs>
    <rect width="360" height="135" fill={`url(#${id})`} />
    {children}
  </svg>;
}

const paperKinds: Record<string, string> = {
  NimbleMoE: 'merging',
  'Faster Than Flash': 'attention',
  MOVA: 'waves',
  'Breaking Model Lock-in': 'routing',
  'CAS-Spec': 'cascade',
  LinguaSafe: 'safety',
};

export function PaperFigure({ name }: { name: string }) {
  const kind = paperKinds[name];
  if (!kind) return null;
  return <FigureFrame kind={kind}>
    {kind === 'merging' && <>
      {[33, 67, 101].map((y, i) => <g key={y}><path d={`M54 ${y} C120 ${y} 126 67 179 67 S242 ${y} 307 ${y}`} stroke="currentColor" opacity={.4 + i * .2} /><circle cx="54" cy={y} r="5" stroke="currentColor" /><rect x="296" y={y - 8} width="19" height="16" stroke="currentColor" /></g>)}
      <circle cx="180" cy="67" r="19" fill="var(--panel)" stroke="currentColor" /><path d="M172 67h16m-8-8v16" stroke="currentColor" />
    </>}
    {kind === 'attention' && <>
      {Array.from({ length: 8 }, (_, row) => Array.from({ length: 18 }, (_, col) => <rect key={`${row}-${col}`} x={72 + col * 12} y={20 + row * 12} width="7" height="7" fill="currentColor" opacity={col <= row * 2 && (row + col) % 3 !== 0 ? .65 : .08} />))}
      <path d="M58 20v96h228" stroke="currentColor" opacity=".35" />
    </>}
    {kind === 'waves' && <>
      {Array.from({ length: 7 }, (_, i) => <path key={i} d={Array.from({ length: 100 }, (_, x) => `${x ? 'L' : 'M'}${30 + x * 3} ${67 + Math.sin(x / 7 + i * .35) * (10 + 29 * Math.sin(x / 31)) + (i - 3) * 5}`).join(' ')} stroke="currentColor" opacity={.2 + i * .1} />)}
      <path d="M30 112h300M30 108v8m300-8v8" stroke="currentColor" opacity=".3" />
    </>}
    {kind === 'routing' && <>
      {[38, 67, 96].map((y, i) => <g key={y}>
        <rect x="35" y={y - 8} width="25" height="16" rx="3" stroke="currentColor" opacity=".6" />
        <path d={`M60 ${y}C90 ${y} 99 67 132 67`} stroke="currentColor" opacity=".4" />
        <path d={`M221 67C254 67 261 ${y} 293 ${y}`} stroke="currentColor" strokeDasharray={i === 1 ? undefined : '3 4'} opacity={i === 1 ? .9 : .35} />
        <rect x="293" y={y - 10} width="32" height="20" rx="3" stroke="currentColor" fill="currentColor" fillOpacity={i === 1 ? .12 : .02} opacity={i === 1 ? .9 : .45} />
        <path d={`M300 ${y - 3}h18m-18 6h12`} stroke="currentColor" opacity=".35" />
      </g>)}
      <path d="m130 50 57-22 35 55-57 22Z" fill="currentColor" fillOpacity=".035" stroke="currentColor" opacity=".7" />
      <path d="m148 43 35 55m-17-62 35 55m-62-25 57-22m-47 38 57-22" stroke="currentColor" opacity=".15" />
      {[[157, 60], [173, 54], [184, 73], [167, 85], [199, 81]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 2 ? 4 : 2} fill="currentColor" opacity={i === 2 ? 1 : .5} />)}
      <path d="m176 73 8 0 10-3" stroke="currentColor" opacity=".65" />
    </>}
    {kind === 'cascade' && <>
      {[{ x: 35, y: 24, count: 3 }, { x: 133, y: 55, count: 4 }, { x: 231, y: 86, count: 5 }].map(({ x, y, count }, stage) => <g key={stage}>
        <rect x={x} y={y} width="76" height="25" rx="4" stroke="currentColor" opacity={.35 + stage * .25} />
        {Array.from({ length: count }, (_, token) => <rect key={token} x={x + 9 + token * 12} y={y + 8} width="7" height="9" rx="1" fill="currentColor" opacity={.25 + stage * .2} />)}
        {stage < 2 && <path d={`M${x + 76} ${y + 12}h11v31h11m-5-4 5 4-5 4`} stroke="currentColor" opacity=".6" />}
      </g>)}
      <path d="M73 18v-7h197v68m-4-5 4 5 4-5" stroke="currentColor" strokeDasharray="3 5" opacity=".25" />
      <path d="M307 98h13" stroke="currentColor" opacity=".7" /><circle cx="329" cy="98" r="10" stroke="currentColor" opacity=".85" /><path d="m325 98 3 3 5-6" stroke="currentColor" />
      <path d="M35 119h272" stroke="currentColor" opacity=".15" />
    </>}
    {kind === 'safety' && <>
      {[{ y: 29, glyph: 'A' }, { y: 67, glyph: '文' }, { y: 105, glyph: 'あ' }].map(({ y, glyph }) => <g key={glyph}>
        <rect x="46" y={y - 12} width="31" height="24" rx="4" stroke="currentColor" opacity=".5" />
        <text x="61.5" y={y + 4} textAnchor="middle" fontSize="13" fontFamily="var(--sans)" fill="currentColor" opacity=".85">{glyph}</text>
        <path d={`M77 ${y}C119 ${y} 115 67 153 67M208 67C247 67 244 ${y} 281 ${y}`} stroke="currentColor" opacity=".35" />
        <circle cx="290" cy={y} r="9" stroke="currentColor" opacity=".5" /><path d={`m286 ${y} 3 3 5-6`} stroke="currentColor" opacity=".7" />
      </g>)}
      <path d="m180 31 30 12v24c0 20-15 33-30 40-15-7-30-20-30-40V43Z" fill="var(--panel)" stroke="currentColor" opacity=".9" />
      <path d="m180 42 20 8v17c0 13-9 23-20 29-11-6-20-16-20-29V50Z" stroke="currentColor" opacity=".2" />
      <path d="m169 66 8 8 15-17" stroke="currentColor" />
    </>}
  </FigureFrame>;
}
