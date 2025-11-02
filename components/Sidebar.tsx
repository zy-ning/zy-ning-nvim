
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
      w-48 flex-shrink-0 p-2 
      border-r-2 border-double
      border-r-[var(--ctp-surface2)]
      bg-[var(--ctp-mantle)]
    `}>
      <div className="flex items-center mb-4">
        <Icon name="fas fa-folder-open" className={`text-[var(--ctp-yellow)] mr-2`} />
        <span className="font-bold">SECTIONS</span>
      </div>
      <ul>
        {sections.map((section) => (
          <li key={section}>
            <button
              onClick={() => onSelectSection(section)}
              className={`
                w-full text-left px-2 py-1 flex items-center
                hover:bg-[var(--ctp-surface0)]
                transition-colors duration-150
                ${activeSection === section 
                  ? `bg-[var(--ctp-surface1)] font-bold text-[var(--ctp-blue)]`
                  : ''
                }
              `}
            >
              <Icon name={section === 'Blog' ? 'fas fa-rss' : 'fas fa-file-lines'} className="mr-2 w-4" />
              {section}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
};
