
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
      flex items-center h-6 text-sm font-medium
      border-t border-[var(--ctp-surface0)]
      bg-[var(--ctp-base)]
    `}>
      {/* Mode indicator - like nvim's mode display */}
    <div className={`
        flex items-center px-3 h-full
        bg-[var(--ctp-surface1)] text-[var(--ctp-lavender)]
        font-bold
    `}>
        <span>NORMAL</span>
    </div>

      {/* Git branch */}
      <div className={`
        flex items-center px-3 h-full
        bg-[var(--ctp-surface0)] text-[var(--ctp-text)]
      `}>
        <Icon name="fas fa-code-branch" className="mr-2 text-[var(--ctp-mauve)]" />
        <span>main</span>
      </div>

      {/* Active section / file info */}
      <div className={`
        flex items-center px-3 h-full
        bg-[var(--ctp-mantle)] text-[var(--ctp-text)]
        flex-1
      `}>
        <Icon name="fas fa-file-code" className="mr-2 text-[var(--ctp-blue)]" />
        <span>{activeSection}</span>
      </div>

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        className={`
          flex items-center px-3 h-full
          bg-[var(--ctp-surface1)] text-[var(--ctp-text)]
          hover:bg-[var(--ctp-surface0)]
          transition-colors duration-150
        `}
      >
        <Icon name={theme === 'mocha' ? 'fa fa-moon' : 'fa fa-sun'} className="mr-2 text-[var(--ctp-yellow)]" />
        <span className="text-xs">{theme.toUpperCase()}</span>
      </button>

      {/* Percentage/position indicator */}
      <div className={`
        flex items-center px-3 h-full
        bg-[var(--ctp-surface2)] text-[var(--ctp-blue)]
        font-bold text-xs
      `}>
        {/* <Icon name="fas fa-terminal" className="mr-2" /> */}
        <i class="fas fa-neovim"></i>
        <span>  NEOVIM</span>
      </div>
    </footer>
  );
};
