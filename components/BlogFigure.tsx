import React from 'react';
import { FigureFrame } from './PaperFigure';

export function BlogFigure({ slug }: { slug: string }) {
  const article = slug.replace(/_en$/, '');
  if (article === 'nano-scalemb') return <FigureFrame kind="memory" className="blog-figure">
    {[{ x: 29, y: 48 }, { x: 39, y: 59 }, { x: 49, y: 70 }].map(({ x, y }, i) => <rect key={i} x={x} y={y} width="28" height="16" rx="2" fill="var(--panel)" stroke="currentColor" opacity={.3 + i * .25} />)}
    <path d="M78 78h16l16-17 17 17-17 17-16-17m33 0h25" stroke="currentColor" opacity=".65" />
    <path d="M103 74h14m-14 7h14m-9-11-3 15m11-15-3 15" stroke="currentColor" opacity=".5" />
    <rect x="153" y="24" width="85" height="86" rx="3" stroke="currentColor" opacity=".55" />
    {Array.from({ length: 6 }, (_, row) => Array.from({ length: 6 }, (_, col) => <rect key={`${row}-${col}`} x={160 + col * 12} y={31 + row * 12} width="9" height="9" rx="1" fill="currentColor" opacity={row === 3 ? col === 2 ? .9 : .45 : .08 + ((row + col) % 3) * .035} />))}
    <path d="M239 72h25l14-14m-18 14 18 14" stroke="currentColor" opacity=".6" />
    <rect x="280" y="47" width="48" height="22" rx="3" stroke="currentColor" opacity=".8" /><path d="M289 54h30m-30 7h22" stroke="currentColor" opacity=".4" />
    <circle cx="290" cy="98" r="11" stroke="currentColor" opacity=".55" /><path d="m298 106 9 9M284 98h12m-6-6v12" stroke="currentColor" opacity=".6" />
    <path d="M64 98v24h199v-13" stroke="currentColor" strokeDasharray="3 4" opacity=".25" />
  </FigureFrame>;

  if (article === 'attn_res') return <FigureFrame kind="residual" className="blog-figure">
    {/* Multiple routes connect the layer stack, rather than one serial bypass. */}
    {[0, 1, 2].flatMap(from => [1, 2, 3].filter(to => to > from).map(to => {
      const y1 = 24 + from * 29;
      const y2 = 24 + to * 29;
      const reach = 95 - (to - from) * 20;
      return <g key={`${from}-${to}`}>
        <path d={`M133 ${y1}C${reach} ${y1} ${reach} ${y2} 133 ${y2}`} stroke="currentColor" opacity={.2 + (to - from) * .1} />
        <path d={`M227 ${y1}C${360 - reach} ${y1} ${360 - reach} ${y2} 227 ${y2}`} stroke="currentColor" opacity={.15 + from * .13} />
      </g>;
    }))}
    {[24, 53, 82, 111].map((y, layer) => <g key={y}>
      <rect x="133" y={y - 8} width="94" height="16" rx="3" fill="var(--panel)" stroke="currentColor" opacity=".8" />
      {[153, 180, 207].map((x, stream) => <g key={x}>
        <circle cx={x} cy={y} r="2.3" fill="currentColor" opacity={.4 + stream * .2} />
        {layer < 3 && <path d={`M${x} ${y + 8}v13`} stroke="currentColor" opacity=".35" />}
      </g>)}
    </g>)}
    <path d="M35 24h33m-33 87h33M292 24h33m-33 87h33" stroke="currentColor" opacity=".2" />
  </FigureFrame>;

  return null;
}
