import React from "react";
import { Icon } from "./Icon";

interface StatusBarProps {
  theme: "latte" | "mocha";
  onToggleTheme: () => void;
  activeSection: string;
  viewMode: "sidebar" | "tab";
  onToggleViewMode: () => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
  wordCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  theme,
  onToggleTheme,
  activeSection,
  viewMode,
  onToggleViewMode,
  zenMode,
  onToggleZenMode,
  wordCount,
}) => {
  return (
    <footer
      className={`
      flex items-center h-7 text-xs font-medium
      border-t border-[var(--ctp-surface0)]
      bg-[var(--ctp-base)]
      shadow-[0_-1px_3px_rgba(0,0,0,0.05)]
    `}
    >
      <div
        className={`
        flex items-center px-3 h-full
        bg-[var(--ctp-surface1)] text-[var(--ctp-lavender)]
        font-bold tracking-wider
      `}
      >
        <Icon name="fas fa-terminal" className="mr-1.5 text-[10px]" />
        <span>NORMAL</span>
      </div>

      <div
        className={`
        hidden sm:flex items-center px-3 h-full
        bg-[var(--ctp-surface0)] text-[var(--ctp-text)]
      `}
      >
        <Icon
          name="fas fa-code-branch"
          className="mr-1.5 text-[var(--ctp-mauve)] text-[10px]"
        />
        <span>main</span>
      </div>

      <div
        className={`
        flex items-center px-3 h-full
        bg-[var(--ctp-mantle)] text-[var(--ctp-text)]
        flex-1 min-w-0
      `}
      >
        <Icon name="fas fa-file-code" className="mr-1.5 text-[var(--ctp-blue)] text-[10px] flex-shrink-0" />
        <span className="truncate">{activeSection}</span>
      </div>

      <div
        className={`
        hidden md:flex items-center px-3 h-full
        bg-[var(--ctp-mantle)] text-[var(--ctp-subtext0)]
      `}
      >
        <Icon
          name="fas fa-pen-nib"
          className="mr-1.5 text-[var(--ctp-green)] text-[10px]"
        />
        <span>{wordCount.toLocaleString()} words</span>
      </div>

      <div className="flex items-center px-1.5 h-full gap-1 bg-[var(--ctp-surface0)]">
        <StatusButton
          onClick={onToggleTheme}
          icon={theme === "mocha" ? "fa fa-moon" : "fa fa-sun"}
          label={theme}
          color="yellow"
          isActive={false}
        />

        <StatusButton
          onClick={onToggleViewMode}
          icon={viewMode === "sidebar" ? "fas fa-columns" : "fas fa-window-maximize"}
          label={viewMode}
          color="pink"
          isActive={false}
        />

        <StatusButton
          onClick={onToggleZenMode}
          icon={zenMode ? "fas fa-compress" : "fas fa-expand"}
          label="zen"
          color="teal"
          isActive={zenMode}
        />
      </div>

      <div
        className={`
        flex items-center px-2 h-full
        bg-[var(--ctp-surface2)] text-[var(--ctp-blue)]
        font-bold
      `}
      >
        <Icon name="fas fa-terminal" className="mr-1 text-[10px] text-[var(--ctp-red)]" />
        <span className="hidden sm:inline">NeoVim</span>
      </div>
    </footer>
  );
};

interface StatusButtonProps {
  onClick: () => void;
  icon: string;
  label: string;
  color: 'yellow' | 'pink' | 'teal' | 'blue' | 'green';
  isActive: boolean;
}

const StatusButton: React.FC<StatusButtonProps> = ({ onClick, icon, label, color, isActive }) => {
  const colorClasses = {
    yellow: 'text-[var(--ctp-yellow)] hover:bg-[var(--ctp-yellow)]/10',
    pink: 'text-[var(--ctp-pink)] hover:bg-[var(--ctp-pink)]/10',
    teal: 'text-[var(--ctp-teal)] hover:bg-[var(--ctp-teal)]/10',
    blue: 'text-[var(--ctp-blue)] hover:bg-[var(--ctp-blue)]/10',
    green: 'text-[var(--ctp-green)] hover:bg-[var(--ctp-green)]/10',
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center px-2 py-0.5 h-5 rounded
        transition-all duration-200 ease-out
        ${colorClasses[color]}
        ${isActive ? 'bg-current/10' : ''}
      `}
      title={label.charAt(0).toUpperCase() + label.slice(1)}
    >
      <Icon name={icon} className="text-[10px]" />
      <span className="hidden lg:inline ml-1.5 uppercase tracking-wide">{label}</span>
    </button>
  );
};
