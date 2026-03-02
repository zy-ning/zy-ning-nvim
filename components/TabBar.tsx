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
      flex items-center h-11
      bg-[var(--ctp-mantle)]/90 backdrop-blur-sm
      border-b border-[var(--ctp-surface0)]
      overflow-x-auto scrollbar-hide
      shadow-[0_2px_8px_rgba(0,0,0,0.05)]
    `}
    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {sections.map((section) => {
        const isActive = activeSection === section;
        const iconName =
          section === 'Blog' ? 'fas fa-rss' :
          section === 'About Me' ? 'fas fa-user' :
          section === 'Experience' ? 'fas fa-briefcase' :
          section === 'Publications' ? 'fas fa-book' :
          section === 'Random Play' ? 'fas fa-music' :
          'fas fa-file-lines';
        
        return (
          <button
            key={section}
            onClick={() => onSelectSection(section)}
            className={`
              relative flex items-center px-4 h-full
              transition-all duration-200 ease-out group
              whitespace-nowrap
              ${isActive
                ? 'bg-[var(--ctp-base)] text-[var(--ctp-maroon)]'
                : 'text-[var(--ctp-subtext0)] hover:text-[var(--ctp-text)] hover:bg-[var(--ctp-surface0)]/30'
              }
            `}
          >
            {/* Bottom active indicator */}
            <div className={`
              absolute bottom-0 left-0 right-0 h-0.5
              transition-all duration-300 ease-out
              ${isActive 
                ? 'bg-[var(--ctp-maroon)]' 
                : 'bg-transparent group-hover:bg-[var(--ctp-surface1)]'
              }
            `} />
            
            <Icon 
              name={iconName} 
              className={`
                mr-2 w-4 transition-all duration-200
                ${isActive 
                  ? 'text-[var(--ctp-maroon)]' 
                  : 'text-[var(--ctp-overlay0)] group-hover:text-[var(--ctp-subtext0)]'
                }
              `} 
            />
            <span className="text-sm font-medium tracking-wide">{section}</span>
            
            {isActive && (
              <div className="ml-2 flex items-center">
                <div className="w-2 h-2 rounded-full bg-[var(--ctp-green)] shadow-[0_0_6px_rgba(166,227,161,0.6)]" />
              </div>
            )}
            
            {/* Close button (decorative for tab aesthetic) */}
            <div className={`
              ml-2 w-4 h-4 rounded flex items-center justify-center
              transition-all duration-200
              ${isActive 
                ? 'text-[var(--ctp-overlay0)] hover:text-[var(--ctp-text)] hover:bg-[var(--ctp-surface1)]' 
                : 'text-transparent'
              }
            `}>
              <span className="text-xs">×</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
