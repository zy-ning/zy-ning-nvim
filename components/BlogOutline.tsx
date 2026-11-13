import React, { useEffect, useState } from 'react';
import { type OutlineHeading } from '../types';
import './writing.css';

interface BlogOutlineProps {
  headings: OutlineHeading[];
  scrollRef?: React.RefObject<HTMLElement | null>;
}

export const BlogOutline: React.FC<BlogOutlineProps> = ({ headings, scrollRef }) => {
  const [activeId, setActiveId] = useState(headings[0]?.id || '');

  useEffect(() => {
    let frame = 0;
    const scroller = scrollRef?.current;
    const update = () => {
      frame = 0;
      const fold = (scroller?.getBoundingClientRect().top || 0) + 140;
      let active = headings[0]?.id || '';
      headings.forEach(heading => {
        const element = document.getElementById(heading.id);
        if (element && element.getBoundingClientRect().top <= fold) active = heading.id;
      });
      setActiveId(active);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const target = scroller || window;
    target.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
    return () => {
      target.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, [headings, scrollRef]);

  if (!headings.length) return null;
  const minLevel = Math.min(...headings.map(heading => heading.level));
  const jump = (event: React.MouseEvent<HTMLAnchorElement>, heading: OutlineHeading) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const element = document.getElementById(heading.id);
    if (!element) return;
    event.preventDefault();
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    if (scrollRef?.current) {
      const scroller = scrollRef.current;
      scroller.scrollTo({ top: element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 112, behavior });
    } else element.scrollIntoView({ behavior, block: 'start' });
    window.history.replaceState(window.history.state, '', `#${encodeURIComponent(heading.id)}`);
    element.tabIndex = -1;
    element.focus({ preventScroll: true });
    setActiveId(heading.id);
  };

  return <nav className="article-outline" aria-label="On this page">
    <div className="article-outline-label">On this page <span>{String(headings.length).padStart(2, '0')}</span></div>
    <ol>{headings.map(heading => <li key={heading.id} style={{ paddingLeft: `${Math.min(heading.level - minLevel, 2) * .8}rem` }}>
      <a href={`#${encodeURIComponent(heading.id)}`} onClick={event => jump(event, heading)} className={activeId === heading.id ? 'is-active' : ''} aria-current={activeId === heading.id ? 'location' : undefined}>{heading.text}</a>
    </li>)}</ol>
  </nav>;
};
