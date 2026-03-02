import React from 'react';
import { Icon } from './Icon';

interface SidebarProps {
  sections: string[];
  activeSection: string;
  onSelectSection: (section: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ sections, activeSection, onSelectSection }) => {
  return (
    <aside className={`
      w-full md:w-52 flex-shrink-0
      border-b md:border-b-0 md:border-r border-[var(--ctp-surface0)]
      bg-[var(--ctp-mantle)]
      max-h-32 md:max-h-none overflow-y-auto scrollbar-hide
    `}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--ctp-surface0)]">
        <span className="text-xs font-bold text-[var(--ctp-subtext0)] tracking-widest uppercase">Explorer</span>
        <div className="flex gap-1">
          <button className="p-1 rounded hover:bg-[var(--ctp-surface0)] transition-colors">
            <Icon name="fas fa-folder-plus" className="text-[10px] text-[var(--ctp-subtext0)]" />
          </button>
          <button className="p-1 rounded hover:bg-[var(--ctp-surface0)] transition-colors">
            <Icon name="fas fa-sync-alt" className="text-[10px] text-[var(--ctp-subtext0)]" />
          </button>
        </div>
      </div>
      
      <nav className="py-2">
        <div className="px-3 py-1.5 text-xs text-[var(--ctp-overlay0)]">
          <Icon name="fas fa-chevron-down" className="mr-1.5 text-[10px]" />
          SECTIONS
        </div>
        
        {sections.map((section) => {
          const isActive = activeSection === section;
          const iconName =
            section === 'Blog' ? 'fab fa-readme' :
            section === 'About Me' ? 'fas fa-user' :
            section === 'Experience' ? 'fas fa-briefcase' :
            section === 'Publications' ? 'fas fa-book' :
            section === 'Random Play' ? 'fas fa-music' :
            'fas fa-file';
          
          return (
            <button
              key={section}
              onClick={() => onSelectSection(section)}
              className={`
                w-full text-left px-3 py-1.5 flex items-center
                transition-colors duration-150 group
                ${isActive
                  ? 'bg-[var(--ctp-surface0)] text-[var(--ctp-text)]'
                  : 'text-[var(--ctp-subtext0)] hover:bg-[var(--ctp-surface0)]/50 hover:text-[var(--ctp-text)]'
                }
              `}
            >
              <Icon 
                name={iconName} 
                className={`
                  mr-2.5 w-4 text-center
                  ${isActive 
                    ? 'text-[var(--ctp-yellow)]' 
                    : 'text-[var(--ctp-blue)]'
                  }
                `} 
              />
              <span className="text-sm">{section}</span>
              
              {isActive && (
                <span className="ml-auto text-[var(--ctp-green)] text-xs">●</span>
              )}
            </button>
          );
        })}
      </nav>
      
      <div className="hidden md:block px-3 py-2 border-t border-[var(--ctp-surface0)] text-xs text-[var(--ctp-overlay0)]">
        <div className="flex justify-between">
          <span>{sections.length} items</span>
          <span>readonly</span>
        </div>
      </div>
    </aside>
  );
};
