import React from 'react';
import { Icon } from './Icon';

interface TabBarProps {
  sections: string[];
  activeSection: string;
  onSelectSection: (section: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ sections, activeSection, onSelectSection }) => {
  return (
    <div className={`
      flex items-center h-10
      border-b-2 border-double
      border-b-[var(--ctp-surface2)]
      bg-[var(--ctp-mantle)]
      overflow-x-auto
    `}>
      {sections.map((section, index) => {
        const isActive = activeSection === section;
        return (
          <button
            key={section}
            onClick={() => onSelectSection(section)}
            className={`
              flex items-center px-4 h-full
              border-r border-[var(--ctp-surface1)]
              hover:bg-[var(--ctp-surface0)]
              transition-colors duration-150
              whitespace-nowrap
              ${isActive
                ? `bg-[var(--ctp-base)] text-[var(--ctp-maroon)] font-bold`
                : 'bg-[var(--ctp-mantle)] text-[var(--ctp-text)]'
              }
            `}
          >
            <Icon name={
              section === 'Blog' ? 'fas fa-rss' :
              section === 'About Me' ? 'fas fa-user' :
              section === 'Experience' ? 'fas fa-briefcase' :
              section === 'Publications' ? 'fas fa-book' :
              section === 'Random Play' ? 'fas fa-music' :
              'fas fa-file-lines'
            } className="mr-2 w-4" />
            {section}
            {isActive && (
              <Icon name="fas fa-circle" className="ml-2 text-[var(--ctp-green)] text-xs" />
            )}
          </button>
        );
      })}
    </div>
  );
};
