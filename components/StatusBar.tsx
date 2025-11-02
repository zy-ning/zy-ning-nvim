
import React from 'react';
import { Icon } from './Icon';

interface StatusBarProps {
  theme: 'latte' | 'mocha';
  onToggleTheme: () => void;
  activeSection: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ theme, onToggleTheme, activeSection }) => {
  return (
    <footer className={`
      flex items-center justify-between px-4 py-0.5 text-sm
      border-t-2 border-double
      border-t-[var(--ctp-surface2)]
      bg-[var(--ctp-mauve)] text-[var(--ctp-base)]
      font-bold
    `}>
      <div className="flex items-center">
        <span className="mr-4">-- NORMAL --</span>
        <Icon name="fas fa-code-branch" className="mr-2" />
        <span>main</span>
      </div>
      <div className="flex items-center">
        <span className="mr-4">{activeSection}</span>
        <button onClick={onToggleTheme} className="flex items-center">
          <Icon name={theme === 'mocha' ? 'fas fa-moon' : 'fas fa-sun'} className="mr-2" />
          <span>{theme.toUpperCase()}</span>
        </button>
      </div>
    </footer>
  );
};
