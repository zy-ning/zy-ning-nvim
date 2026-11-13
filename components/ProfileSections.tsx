import React from 'react';
import { UiIcon } from './UiIcon';
import { PaperFigure } from './PaperFigure';
import type { ProfileData } from '../types';

export const Arrow = ({ diagonal = false, className = '' }: { diagonal?: boolean; className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {diagonal ? <path d="M6 18 18 6M6 6h12v12" /> : <path d="M4 12h15m-6-6 6 6-6 6" />}
  </svg>
);

export interface Paper {
  title: string;
  name: string;
  description: string;
  authors: string;
  venue: string;
  links: { label: string; href: string }[];
}
export interface Experience { title: string; detail: string; points: string[]; }

export function readProfile(profile: ProfileData) {
  const parse = (title: string) => new DOMParser().parseFromString(profile.sections.find(s => s.title === title)?.content || '', 'text/html');
  const about = parse('About Me');
  const afterHeading = (doc: Document, label: string) => {
    const elements: Element[] = [];
    let current = Array.from(doc.querySelectorAll('h3')).find(h => h.textContent === label)?.nextElementSibling;
    while (current && !/^H[1-3]$/.test(current.tagName)) { elements.push(current); current = current.nextElementSibling; }
    return elements;
  };
  const publications = parse('Publications');
  const papers: Paper[] = Array.from(publications.querySelectorAll('h4')).map(heading => {
    const title = heading.textContent || '';
    const authorLine = heading.nextElementSibling;
    const authors = authorLine?.querySelector('em')?.innerHTML || '';
    const venue = authorLine?.querySelector('strong')?.textContent || 'Technical report';
    const links: Paper['links'] = [];
    let current = authorLine;
    while (current && current.tagName !== 'H4') {
      current.querySelectorAll('a').forEach(a => links.push({ label: a.textContent || 'Paper', href: a.getAttribute('href') || '#' }));
      current = current.nextElementSibling;
    }
    const colon = title.indexOf(':');
    return { title, name: colon < 0 ? title : title.slice(0, colon), description: colon < 0 ? '' : title.slice(colon + 1).trim(), authors, venue, links };
  });
  const experience = parse('Experience');
  const entries = (label: string): Experience[] => {
    const nodes = afterHeading(experience, label);
    return nodes.filter(n => n.tagName === 'H4').map(heading => {
      const detail = heading.nextElementSibling;
      const list = detail?.nextElementSibling;
      return { title: heading.textContent || '', detail: detail?.innerHTML || '', points: list?.tagName === 'UL' ? Array.from(list.children).map(li => li.innerHTML) : [] };
    });
  };
  const contacts = Array.from(about.querySelectorAll('a')).filter(a => /^(mailto:|https:\/\/(github.com|scholar.google.com|www.linkedin.com)\/)/.test(a.getAttribute('href') || '')).map(a => {
    const href = a.getAttribute('href') || '';
    return { href, label: href.startsWith('mailto:') ? 'Email' : href.includes('github.com') ? 'GitHub' : href.includes('scholar.google.com') ? 'Scholar' : 'LinkedIn' };
  });
  return {
    portrait: about.querySelector('pre')?.textContent || '',
    bio: afterHeading(about, 'Bio').map(el => el.outerHTML).join(''),
    news: afterHeading(about, 'News').filter(el => el.tagName === 'P').map(el => el.innerHTML),
    papers, education: entries('Education'), internships: entries('Internships'),
    contacts: contacts.filter((contact, i) => contacts.findIndex(c => c.label === contact.label) === i),
  };
}

export type ProfileContent = ReturnType<typeof readProfile>;

export function SectionLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return <div className="section-label"><span>{number}</span><span>{children}</span></div>;
}

export function News({ items, compact = false }: { items: string[]; compact?: boolean }) {
  return <div className={`news-list ${compact ? 'compact' : ''}`}>{items.map((html, i) => <div className="news-item" key={i}><span className="news-dot" /><div dangerouslySetInnerHTML={{ __html: html }} /></div>)}</div>;
}

export function Publications({ papers }: { papers: Paper[] }) {
  return <div className="publication-list">{papers.map((paper, i) => <article className="publication has-figure" key={paper.title}>
    <span className="publication-index micro">{String(i + 1).padStart(2, '0')}</span>
    <div><div className="publication-meta micro">{paper.venue}</div><h2><a href={paper.links[0]?.href} target="_blank" rel="noreferrer">{paper.title}</a></h2><p className="publication-authors" dangerouslySetInnerHTML={{ __html: paper.authors }} /><div className="paper-links">{paper.links.map(link => <a key={link.href} href={link.href} target="_blank" rel="noreferrer">{link.label}<Arrow diagonal /></a>)}</div></div><PaperFigure name={paper.name} />
  </article>)}</div>;
}

function ExperienceIcon({ item }: { item: Experience }) {
  const description = `${item.title} ${item.detail}`;
  if (/Xiaohongshu|dots Pretraining/i.test(description)) {
    return <a className="experience-icon experience-dots" href="https://huggingface.co/dots-studio" target="_blank" rel="noreferrer" aria-label="dots studio on Hugging Face" title="dots studio"><UiIcon name="dots" /></a>;
  }
  const name = /University|Institute.*PhD/i.test(description) ? 'university'
    : /High School/.test(description) ? 'school'
    : /TeleAI|China Telecom/.test(description) ? 'teleai'
    : /ABB/.test(description) ? 'abb'
    : /Shanghai Artificial Intelligence/.test(description) ? 'ai-lab' : 'lab';
  return <span className={`experience-icon experience-${name}`}><UiIcon name={name} /></span>;
}

export function Timeline({ items }: { items: Experience[] }) {
  return <div className="timeline">{items.map(item => <article className="timeline-entry" key={item.title}>
    <span className="timeline-marker" /><div className="timeline-heading"><ExperienceIcon item={item} /><div><h3>{item.title}</h3><p className="timeline-detail" dangerouslySetInnerHTML={{ __html: item.detail }} /></div></div>
    {item.points.length > 0 && <ul>{item.points.map((point, i) => <li key={i} dangerouslySetInnerHTML={{ __html: point }} />)}</ul>}
  </article>)}</div>;
}
