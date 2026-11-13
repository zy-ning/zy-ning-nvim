import React from 'react';

type IconName = 'mail' | 'github' | 'scholar' | 'linkedin' | 'university' | 'school' | 'lab' | 'network' | 'chip' | 'dots' | 'ai-lab' | 'abb' | 'teleai';

export function UiIcon({ name, className = '' }: { name: IconName; className?: string }) {
  const shared = { className: `ui-icon ${className}`, width: 20, height: 20, viewBox: '0 0 24 24', 'aria-hidden': true as const };
  if (name === 'github') return <svg {...shared} fill="currentColor"><path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.64-1.25-1.64-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.5-.29-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.09 1.15a10.8 10.8 0 0 1 5.62 0c2.15-1.45 3.09-1.15 3.09-1.15.62 1.55.23 2.7.12 2.98.72.79 1.15 1.79 1.15 3.02 0 4.32-2.63 5.27-5.14 5.55.4.35.76 1.04.76 2.1v3.08c0 .3.2.65.77.54A11.25 11.25 0 0 0 12 .75Z" /></svg>;
  if (name === 'linkedin') return <svg {...shared} fill="currentColor"><path d="M5.2 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3.5 9h3.4v12H3.5V9Zm6 0h3.3v1.64h.05c.46-.87 1.58-1.8 3.25-1.8 3.47 0 4.1 2.22 4.1 5.1V21h-3.45v-6.25c0-1.5-.03-3.43-2.09-3.43-2.1 0-2.42 1.64-2.42 3.32V21H9.5V9Z" /></svg>;
  if (name === 'abb') return <svg {...shared} viewBox="0 0 34 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18 6 6l4 12M3.5 14h5M14 6v12h4a3 3 0 0 0 0-6 3 3 0 0 0 0-6h-4Zm0 6h4M25 6v12h4a3 3 0 0 0 0-6 3 3 0 0 0 0-6h-4Zm0 6h4" /></svg>;
  return <svg {...shared} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {name === 'dots' && <><path d="m5 14 13-10-4 14-9-4Zm2 7h9" /><circle cx="5" cy="14" r="1" fill="currentColor" stroke="none" /><circle cx="18" cy="4" r="1" fill="currentColor" stroke="none" /></>}
    {name === 'ai-lab' && <><path d="m3 18 5-12 5 12M5 13h6M18 6v12M15.5 6h5M15.5 18h5" /><circle cx="8" cy="6" r="1.8" fill="var(--surface)" /><circle cx="18" cy="12" r="1.8" fill="var(--surface)" /><path d="M11 9h3" strokeDasharray="1 2" /></>}
    {name === 'teleai' && <><circle cx="12" cy="10" r="2.1" /><path d="m12 12-4 9h8l-4-9M8 6a5.7 5.7 0 0 0 0 8m8-8a5.7 5.7 0 0 1 0 8M5 3a10 10 0 0 0 0 14M19 3a10 10 0 0 1 0 14" /></>}
    {name === 'mail' && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>}
    {name === 'scholar' && <><path d="m2 8 10-5 10 5-10 5-10-5Zm4 3v5c4 3 8 3 12 0v-5m4-3v9" /><path d="M9 20h6" /></>}
    {name === 'university' && <><path d="m3 8 9-5 9 5H3Zm2 3v7m5-7v7m4-7v7m5-7v7M3 21h18M4 18h16" /><circle cx="12" cy="6.2" r=".4" /></>}
    {name === 'school' && <><path d="M4 10h16v11H4V10Zm3 0V6l5-3 5 3v4M9 21v-6h6v6" /><path d="M7 13h.01M17 13h.01M12 7v2" /></>}
    {name === 'lab' && <><path d="M9 3h6m-5 0v7L4.5 19a1.3 1.3 0 0 0 1.1 2h12.8a1.3 1.3 0 0 0 1.1-2L14 10V3M7.5 14h9" /><circle cx="11" cy="17" r=".5" /><circle cx="14" cy="19" r=".5" /></>}
    {name === 'network' && <><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="18" r="2.5" /><circle cx="19" cy="18" r="2.5" /><path d="m11 7-5 9m7-9 5 9M8 18h8" /></>}
    {name === 'chip' && <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3M10 10h4v4h-4z" /></>}
  </svg>;
}

export function ContactIcon({ label }: { label: string }) {
  const names: Record<string, IconName> = { Email: 'mail', GitHub: 'github', Scholar: 'scholar', LinkedIn: 'linkedin' };
  return <UiIcon name={names[label] || 'mail'} />;
}
