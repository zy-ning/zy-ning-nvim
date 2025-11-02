
import React from 'react';

interface HeaderProps {
  name: string;
}

export const Header: React.FC<HeaderProps> = ({ name }) => {
  return (
    <header className={`
      flex items-center justify-center p-1 
      border-b-2 border-double
      border-b-[var(--ctp-surface2)]
      bg-[var(--ctp-mantle)]
    `}>
      <h1 className={`
        font-bold text-lg
        text-[var(--ctp-mauve)]
      `}>
        {name}
      </h1>
    </header>
  );
};
