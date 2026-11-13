import React, { useEffect, useRef } from 'react';

export interface KeyboardCommand {
  key: string;
  label: string;
  group: 'Navigate' | 'Tools';
  run: () => void;
}

export function KeyboardHelp({ commands, onClose }: { commands: KeyboardCommand[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className="keyboard-dialog" aria-labelledby="keyboard-title" onCancel={onClose} onClick={event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) onClose();
  }}>
    <header><div><kbd>Space</kbd><span id="keyboard-title">Keyboard navigation</span></div><button type="button" onClick={onClose} aria-label="Close keyboard guide">Esc <span aria-hidden="true">×</span></button></header>
    <div className="keyboard-groups">{(['Navigate', 'Tools'] as const).map(group => <section key={group}><h2>{group}</h2><div>{commands.filter(command => command.group === group).map(command => <button type="button" key={command.key} onClick={command.run}><kbd>{command.key}</kbd><span>{command.label}</span></button>)}</div></section>)}</div>
    <footer>Press a key or choose an item.<span>Ctrl/⌘ P · search</span></footer>
  </dialog>;
}
