import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMarkdownFile } from '../hooks/useMarkdownContent';
import { BlogFigure } from './BlogFigure';
import { BlogOutline } from './BlogOutline';
import { type BlogPostIndexItem, type OutlineHeading } from '../types';
import './writing.css';

interface BlogPostViewProps {
  slug: string;
  onBack: () => void;
  post?: BlogPostIndexItem;
  onWordCountChange?: (count: number) => void;
  onHeadingsChange?: (headings: OutlineHeading[]) => void;
  blogPosts: BlogPostIndexItem[];
}

export const BlogPostView: React.FC<BlogPostViewProps> = ({ slug, onBack, post, onWordCountChange, onHeadingsChange, blogPosts }) => {
  const content = useMarkdownFile(`/content/blog/${slug}.md`);
  const contentRef = useRef<HTMLDivElement>(null);
  const [headings, setHeadings] = useState<OutlineHeading[]>([]);
  const [readProgress, setReadProgress] = useState(0);
  const [readingMinutes, setReadingMinutes] = useState<number | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const currentPost = post || blogPosts.find(p => p.slug === slug);
  const originalSlug = currentPost?.originalSlug || slug.replace(/_en$/, '');
  const isEnglish = currentPost?.language === 'en' || slug.endsWith('_en');
  const otherLanguage = blogPosts.find(p => p.slug !== slug && (p.originalSlug || p.slug.replace(/_en$/, '')) === originalSlug && (p.language === 'en' || p.slug.endsWith('_en')) !== isEnglish);
  const tags = currentPost?.tags?.length ? currentPost.tags : otherLanguage?.tags;

  // Build stable anchors in the HTML itself, so rerenders cannot remove IDs.
  const article = useMemo(() => {
    if (!content) return null;
    const doc = new DOMParser().parseFromString(content, 'text/html');
    const used = new Set<string>();
    doc.querySelectorAll('h1, h2, h3, h4').forEach(heading => {
      const base = heading.id || (heading.textContent || '').toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'section';
      let id = base;
      let suffix = 1;
      while (used.has(id)) id = `${base}-${suffix++}`;
      used.add(id);
      heading.id = id;
    });
    // Wide research tables scroll locally without widening the article viewport.
    doc.querySelectorAll('table').forEach(table => {
      const wrapper = doc.createElement('div');
      wrapper.className = 'article-table-scroll';
      wrapper.tabIndex = 0;
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-label', 'Scrollable data table');
      table.replaceWith(wrapper);
      wrapper.append(table);
    });
    doc.querySelectorAll('iframe').forEach((frame, index) => {
      if (!frame.title) frame.title = `Interactive research figure ${index + 1}`;
      frame.loading = 'lazy';
    });
    return doc.body.innerHTML;
  }, [content]);

  // Keep the DOM (including focused headings and embedded figures) intact when
  // reading progress updates. React treats a new innerHTML object as a new value.
  const articleMarkup = useMemo(() => ({ __html: article || '' }), [article]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container || !article) return;
    const text = container.textContent || '';
    const chinese = (text.match(/[\u3400-\u9fff]/g) || []).length;
    const words = text.replace(/[\u3400-\u9fff]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    onWordCountChange?.(words + chinese);
    setReadingMinutes(Math.max(1, Math.ceil(words / 220 + chinese / 400)));
    const nextHeadings = (Array.from(container.querySelectorAll('h2, h3, h4')) as HTMLElement[]).map(el => ({ id: el.id, text: el.textContent?.trim() || '', level: Number(el.tagName[1]) }));
    setHeadings(nextHeadings);
    onHeadingsChange?.(nextHeadings);
    const hash = window.location.hash.slice(1);
    if (hash) {
      try { document.getElementById(decodeURIComponent(hash))?.scrollIntoView({ block: 'start', behavior: 'instant' }); } catch { /* Ignore malformed incoming fragment identifiers. */ }
    }
  }, [article, onWordCountChange, onHeadingsChange]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const container = contentRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const distance = Math.max(1, rect.height - window.innerHeight + 130);
      setReadProgress(Math.max(0, Math.min(1, (130 - rect.top) / distance)));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule);
    if (contentRef.current) observer.observe(contentRef.current);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [article]);

  return <article className={`article-view ${focusMode ? 'article-focus-mode' : ''}`} lang={isEnglish ? 'en' : 'zh'}>
    <div className="article-progress" aria-hidden="true"><div style={{ transform: `scaleX(${readProgress})` }} /></div>
    <div className="article-toolbar">
      <Link className="article-back" to="/?section=Blog" onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onBack(); } }}><span aria-hidden="true">←</span> All writing</Link>
      <div className="article-tools">
        {otherLanguage && <Link to={`/blog/${otherLanguage.slug}`} lang={isEnglish ? 'zh' : 'en'} className="article-language">{isEnglish ? '中文' : 'English'} <span aria-hidden="true">↗</span></Link>}
        <button type="button" className="article-focus-toggle" aria-pressed={focusMode} onClick={() => setFocusMode(value => !value)}>{focusMode ? 'Show contents' : 'Focus mode'}</button>
      </div>
    </div>
    <div className="article-lead"><div><header className="article-metadata"><span className="article-kind">Field notes</span>{currentPost?.date && <time dateTime={currentPost.date}>{currentPost.date.replaceAll('-', '.')}</time>}{readingMinutes !== null && <span>{readingMinutes} min read</span>}</header>
    {tags && tags.length > 0 && <div className="article-topic-list">{tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
    </div><BlogFigure slug={slug} /></div>
    {article ? <>
      {headings.length > 0 && <details className="article-mobile-outline"><summary>On this page <span aria-hidden="true">+</span></summary><BlogOutline headings={headings} /></details>}
      <div className="article-layout">
        <div className="article-body prose-content" ref={contentRef} dangerouslySetInnerHTML={articleMarkup} />
        {!focusMode && headings.length > 0 && <aside className="article-sidebar"><BlogOutline headings={headings} /></aside>}
      </div>
      <footer className="article-end"><span className="article-end-mark" aria-hidden="true">✳</span><p>Thanks for reading.</p><Link to="/?section=Blog">Back to the notebook <span aria-hidden="true">↗</span></Link></footer>
    </> : <div className="article-loading" role="status"><span className="article-loading-mark" aria-hidden="true">✳</span> Opening the notebook…</div>}
  </article>;
};
