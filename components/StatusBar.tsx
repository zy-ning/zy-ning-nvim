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
      flex items-center h-6 text-sm font-medium
      border-t border-[var(--ctp-surface0)]
      bg-[var(--ctp-base)]
    `}
    >
      {/* Mode indicator - like nvim's mode display */}
      <div
        className={`
        flex items-center px-3 h-full
        bg-[var(--ctp-surface1)] text-[var(--ctp-lavender)]
        font-bold
    `}
      >
        <span>NORMAL</span>
      </div>

      {/* Git branch */}
      <div
        className={`
        flex items-center px-3 h-full
        bg-[var(--ctp-surface0)] text-[var(--ctp-text)]
      `}
      >
        <Icon
          name="fas fa-code-branch"
          className="mr-2 text-[var(--ctp-mauve)]"
        />
        <span>main</span>
      </div>

      {/* Active section / file info */}
      <div
        className={`
        flex items-center px-3 h-full
        bg-[var(--ctp-mantle)] text-[var(--ctp-text)]
        flex-1
      `}
      >
        <Icon name="fas fa-file-code" className="mr-2 text-[var(--ctp-blue)]" />
        <span>{activeSection}</span>
      </div>

      {/* Word count */}
      <div
        className={`
        flex items-center px-3 h-full
        bg-[var(--ctp-mantle)] text-[var(--ctp-text)]
        flex-1
      `}
      >
        <Icon
          name="fas fa-pen-nib"
          className="mr-2 text-[var(--ctp-green)]"
        />
        <span>{wordCount.toLocaleString()} words</span>
      </div>

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        className={`
          flex items-center px-3 h-full
          bg-[var(--ctp-surface0)] text-[var(--ctp-text)]
          hover:bg-[var(--ctp-mantle)]
          transition-colors duration-150
          border-l border-b  border-[var(--ctp-yellow)]
          rounded-full
        `}
      >
        <Icon
          name={theme === "mocha" ? "fa fa-moon" : "fa fa-sun"}
          className="mr-2 text-[var(--ctp-yellow)]"
        />
        <span className="text-xs">{theme.toUpperCase()}</span>
      </button>

      <span className="mx-1"> </span>

      {/* View mode toggle */}
      <button
        onClick={onToggleViewMode}
        className={`
          flex items-center px-3 h-full
          bg-[var(--ctp-surface0)] text-[var(--ctp-text)]
          hover:bg-[var(--ctp-mantle)]
          transition-colors duration-150
          border-l border-b  border-[var(--ctp-pink)]
          rounded-full
        `}
      >
        <Icon
          name={viewMode === "sidebar" ? "fas fa-bars" : "fas fa-layer-group"}
          className="mr-2 text-[var(--ctp-pink)]"
        />
        <span className="text-xs">{viewMode.toUpperCase()}</span>
      </button>

      <span className="mx-1"> </span>

      {/* Zen mode toggle */}
      <button
        onClick={onToggleZenMode}
        className={`
          flex items-center px-3 h-full
          bg-[var(--ctp-surface0)] text-[var(--ctp-text)]
          hover:bg-[var(--ctp-mantle)]
          transition-colors duration-150
          border-l border-b border-[var(--ctp-teal)]
          rounded-full
        `}
      >
        <Icon
          name={zenMode ? "fas fa-compress" : "fas fa-expand"}
          className="mr-2 text-[var(--ctp-teal)]"
        />
        <span className="text-xs">ZEN</span>
      </button>

      <span className="mx-1"> </span>

      {/* Percentage/position indicator */}
      <div
        className={`
        flex items-center px-3 h-full
        bg-[var(--ctp-surface2)] text-[var(--ctp-blue)]
        font-bold text-xs
      `}
      >
        {/* <Icon name="fas fa-terminal" className="mr-2" /> */}
        <i class="fas fa-neovim"></i>
        <span>  NEOVIM</span>
      </div>
    </footer>
  );
};
