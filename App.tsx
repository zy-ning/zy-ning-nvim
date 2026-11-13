import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useProfileData, useBlogIndex } from './hooks/useMarkdownContent';
import { useTheme } from './hooks/useTheme';
import { ReiPortrait } from './components/ReiPortrait';
import { ContactIcon } from './components/UiIcon';
import { BlogFigure } from './components/BlogFigure';
import { PaperFigure } from './components/PaperFigure';
import { KeyboardHelp, type KeyboardCommand } from './components/KeyboardHelp';
import { BlogIndexView } from './components/BlogIndexView';
import { BlogPostView } from './components/BlogPostView';
import { Arrow, News, Publications, readProfile, SectionLabel, Timeline } from './components/ProfileSections';
import './styles.css';

const pages = [
  { label: 'About Me', href: '/', section: 'About Me', file: 'profile.md', icon: '◈' },
  { label: 'Publications', href: '/?section=Publications', section: 'Publications', file: 'papers.bib', icon: '▤' },
  { label: 'Experience', href: '/?section=Experience', section: 'Experience', file: 'experience.md', icon: '⌘' },
  { label: 'Blog', href: '/?section=Blog', section: 'Blog', file: 'notes/', icon: '▧' },
  { label: 'Random Play', href: '/?section=Random%20Play', section: 'Random Play', file: 'random.play', icon: '♫' },
];
interface SearchItem { label: string; href: string; kind: string; }

function SearchDialog({ items, onClose }: { items: SearchItem[]; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const filtered = items.filter(item => `${item.label} ${item.kind}`.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    input.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const handleKeys = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected(i => Math.max(0, Math.min(filtered.length - 1, i + (event.key === 'ArrowDown' ? 1 : -1))));
    }
    if (event.key === 'Enter' && document.activeElement === input.current) {
      event.preventDefault();
      dialog.current?.querySelectorAll<HTMLAnchorElement>('.search-result')[selected]?.click();
    }
    if (event.key === 'Tab') {
      const focusable = dialog.current?.querySelectorAll<HTMLElement>('input, button, a');
      if (!focusable?.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };
  useEffect(() => { dialog.current?.querySelectorAll('.search-result')[selected]?.scrollIntoView({ block: 'nearest' }); }, [selected]);
  return <div className="search-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="search-dialog" role="dialog" aria-modal="true" aria-labelledby="search-title" ref={dialog} onKeyDown={handleKeys}>
      <div className="search-title"><span id="search-title" className="micro">Find a file or paper</span><button onClick={onClose} aria-label="Close search">Esc <span aria-hidden="true">×</span></button></div>
      <label className="sr-only" htmlFor="site-search">Search pages, papers and writing</label>
      <input id="site-search" ref={input} value={query} onChange={event => { setQuery(event.target.value); setSelected(0); }} placeholder="Search pages, papers, and notes…" type="search" autoComplete="off" />
      <div className="search-results">{filtered.map((item, i) => {
        const content = <><span className="micro">{item.kind}</span><span>{item.label}</span><Arrow diagonal={item.href.startsWith('http')} /></>;
        const props = { className: `search-result ${selected === i ? 'selected' : ''}`, onClick: onClose, onMouseEnter: () => setSelected(i) };
        return item.href.startsWith('http') ? <a key={item.href} href={item.href} target="_blank" rel="noreferrer" {...props}>{content}</a> : <Link key={item.href} to={item.href} {...props}>{content}</Link>;
      })}{filtered.length === 0 && <p className="search-empty">No matches. Try “MoE”, “writing”, or “experience”.</p>}</div>
      <div className="search-help micro">↑ ↓ to select <span>↵ to open</span></div>
    </div>
  </div>;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, toggleTheme] = useTheme();
  const profile = useProfileData('/content/profile.md', theme);
  const posts = useBlogIndex('/content/blog/index.md');
  const data = useMemo(() => profile ? readProfile(profile) : null, [profile]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const consumedSpace = useRef(false);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeCommands = useCallback(() => setCommandsOpen(false), []);
  const isPost = location.pathname.startsWith('/blog/');
  const slug = isPost ? location.pathname.slice(6) : '';
  const section = isPost ? 'Blog' : new URLSearchParams(location.search).get('section') || 'About Me';
  const currentPost = posts.find(post => post.slug === slug);
  const activePage = pages.find(page => page.section === section);
  const validPage = location.pathname === '/' && !!activePage;
  const searchItems = useMemo<SearchItem[]>(() => [
    ...pages.map(page => ({ label: page.label, href: page.href, kind: 'Page' })),
    ...(data?.papers || []).map(paper => ({ label: paper.title, href: paper.links[0]?.href || '/?section=Publications', kind: 'Paper' })),
    ...[...posts].sort((a, b) => Number(b.language === 'en' || b.slug.endsWith('_en')) - Number(a.language === 'en' || a.slug.endsWith('_en'))).map(post => ({ label: post.title, href: `/blog/${post.slug}`, kind: 'Note' })),
  ], [data, posts]);
  const randomPlay = profile?.sections.find(item => item.title === 'Random Play')?.content || '';
  const commands = useMemo<KeyboardCommand[]>(() => [
    ...pages.map((page, index) => ({ key: ['h', 'r', 'e', 'p', 'm'][index], label: page.label, group: 'Navigate' as const, run: () => { setCommandsOpen(false); navigate(page.href); } })),
    { key: 'f', label: 'Find a page or paper', group: 'Tools', run: () => { setCommandsOpen(false); setSearchOpen(true); } },
    { key: 't', label: 'Toggle theme', group: 'Tools', run: () => { setCommandsOpen(false); toggleTheme(); } },
    { key: 'z', label: 'Toggle zen mode', group: 'Tools', run: () => { setCommandsOpen(false); setZenMode(value => !value); } },
  ], [navigate, toggleTheme]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      const isSpace = event.code === 'Space' || event.key === ' ';
      if (event.repeat) { if (isSpace && consumedSpace.current) event.preventDefault(); return; }
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const editing = !!target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]');
      if ((event.metaKey || event.ctrlKey) && !event.altKey && (key === 'k' || key === 'p')) {
        event.preventDefault(); setCommandsOpen(false); setSearchOpen(open => !open); return;
      }
      if (event.key === 'Escape') { setMenuOpen(false); setCommandsOpen(false); return; }
      if (editing || event.metaKey || event.ctrlKey || event.altKey || searchOpen) return;
      if (commandsOpen) {
        const command = commands.find(item => item.key === key || (key === 'a' && item.key === 'h'));
        if (command) { event.preventDefault(); command.run(); }
        return;
      }
      // Links keep focus after navigation. Space on a link normally scrolls;
      // intercept it too, while preserving native button and disclosure actions.
      if (target?.closest('button, summary, [role="button"]')) return;
      if (isSpace || event.key === '?') {
        event.preventDefault();
        consumedSpace.current = isSpace;
        setCommandsOpen(true);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if ((event.code === 'Space' || event.key === ' ') && consumedSpace.current) {
        // The guide moves focus; do not let the opening key activate its button.
        event.preventDefault(); event.stopPropagation(); consumedSpace.current = false;
      }
    };
    const onBlur = () => { consumedSpace.current = false; };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [commandsOpen, searchOpen, commands]);
  useEffect(() => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname, location.search]);
  useEffect(() => {
    document.title = `${currentPost?.title || activePage?.label || 'Page not found'} · Zhiyuan Ning`;
  }, [activePage, currentPost]);
  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingSlow(true), 10000);
    return () => window.clearTimeout(timer);
  }, []);

  const email = data?.contacts.find(contact => contact.label === 'Email')?.href;
  const fileName = isPost ? `${slug}.md` : validPage ? activePage.file : 'not-found';
  return <div className={`editor-shell ${zenMode ? 'zen-mode' : ''}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    {menuOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <aside className={`editor-sidebar ${menuOpen ? 'is-open' : ''}`}>
      <Link className="sidebar-identity" to="/"><span className="identity-name">Zhiyuan Ning</span><span className="micro">Personal research notebook</span></Link>
      <div className="explorer-label micro"><span>Explorer</span><span aria-hidden="true">⌄</span></div>
      <div className="workspace-label"><span aria-hidden="true">⌄</span> ~/zhiyuan</div>
      <nav className="file-nav" aria-label="Main navigation">{pages.map(page => <Link key={page.label} to={page.href} aria-current={section === page.section ? 'page' : undefined}><span className={`file-icon file-${page.section.replaceAll(' ', '-').toLowerCase()}`} aria-hidden="true">{page.icon}</span><span>{page.label}<small>{page.file}</small></span>{section === page.section && <span className="active-dot" aria-hidden="true">●</span>}</Link>)}</nav>
      <div className="sidebar-bottom"><span className="micro">Elsewhere</span>{data?.contacts.map(contact => <a key={contact.href} href={contact.href} target={contact.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"><span className="contact-label"><ContactIcon label={contact.label} />{contact.label}</span><Arrow diagonal /></a>)}</div>
    </aside>
    <div className="editor-main">
      <header className="buffer-bar"><button className="menu-toggle" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>☰</button><div className="buffer-tab"><span aria-hidden="true">{activePage?.icon || '▧'}</span><span>{fileName}</span><span className="buffer-dot" aria-hidden="true">○</span></div><button className="search-trigger" onClick={() => { setCommandsOpen(false); setSearchOpen(true); }} aria-label="Search site (Command or Control P or K)"><span>⌕</span><span className="search-label">Find</span><kbd>⌘ P</kbd></button></header>
      <main id="main-content" className="site-main" tabIndex={-1}>
        {!data ? <div className="loading-state"><p>{loadingSlow ? 'The profile is taking longer than expected.' : 'Loading profile…'}</p>{loadingSlow && <button className="text-link" onClick={() => window.location.reload()}>Try again <Arrow /></button>}</div> : isPost ? <div className="writing-page">{currentPost ? <BlogPostView key={slug} slug={slug} post={currentPost} blogPosts={posts} onWordCountChange={setWordCount} onBack={() => navigate('/?section=Blog')} /> : <div className="empty-page"><h1>Note not found</h1><Link className="text-link" to="/?section=Blog">Back to Blog <Arrow /></Link></div>}</div> : validPage ? <>
          {section === 'About Me' && <>
            <section className="profile-panel window-panel"><PanelTitle file="profile.md" label="About Me" /><div className="profile-summary"><div className="portrait-wrap"><ReiPortrait ascii={data.portrait} theme={theme} /></div><div className="profile-intro"><div className="profile-name"><h1>{profile?.name}</h1><span className="eva-type" lang="zh">宁致远</span></div><p className="profile-role">PhD Student <span>·</span> Fudan NLP & SII</p><div className="research-interests"><span>Model architectures</span><span>Efficient AI</span><span>Multimodal models</span></div><div className="bio-prose prose-content" dangerouslySetInnerHTML={{ __html: data.bio }} /><div className="social-links">{data.contacts.map(contact => <a key={contact.href} href={contact.href} target={contact.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"><span className="contact-label"><ContactIcon label={contact.label} />{contact.label}</span><Arrow diagonal /></a>)}</div></div></div></section>
            <div className="overview-grid research-writing-grid">
              <section className="window-panel">
                <PanelTitle file="papers.bib" label="Selected publications" href="/?section=Publications" />
                <div className="selected-papers">{data.papers.slice(0, 3).map(paper => <article className="selected-paper" key={paper.title}>
                  <PaperFigure name={paper.name} /><div className="selected-paper-copy"><span className="paper-venue">{paper.venue}</span><h3><a href={paper.links[0]?.href} target="_blank" rel="noreferrer">{paper.title}<Arrow diagonal /></a></h3></div>
                </article>)}</div>
              </section>
              <section className="window-panel">
                <PanelTitle file="notes/" label="Recent writing" href="/?section=Blog" />
                <div className="recent-posts">{posts.filter(post => post.language === 'en' || !posts.some(other => other.originalSlug === post.originalSlug && other.language === 'en')).slice(0, 3).map(post => <Link key={post.slug} to={`/blog/${post.slug}`}>
                  <BlogFigure slug={post.slug} /><div className="recent-post-copy"><time className="micro" dateTime={post.date}>{post.date}</time><h3>{post.title.replace(/ \(English\)$/, '')}</h3><span className="micro">English / 中文 <Arrow diagonal /></span></div>
                </Link>)}</div>
              </section>
            </div>
            <section className="window-panel news-overview"><PanelTitle file="news.log" label="News" /><News items={data.news} compact /></section>
          </>}
          {section === 'Publications' && <><PageTitle title="Publications" detail={`${data.papers.length} papers & technical reports`} /><Publications papers={data.papers} /></>}
          {section === 'Blog' && <><PageTitle title="Blog" detail="Research notes, experiments, and things I've learned." /><BlogIndexView posts={posts} onSelectPost={postSlug => navigate(`/blog/${postSlug}`)} /></>}
          {section === 'Experience' && <><PageTitle title="Experience" /><div className="experience-layout"><section><SectionLabel number="01">Education</SectionLabel><Timeline items={data.education} /></section><section><SectionLabel number="02">Internships</SectionLabel><Timeline items={data.internships} /></section></div></>}
          {section === 'Random Play' && <><PageTitle title="Random Play" /><div className="random-composition" lang="ja" dangerouslySetInnerHTML={{ __html: randomPlay }} /></>}
        </> : <div className="empty-page"><h1>Page not found</h1><Link to="/" className="text-link">Back to profile <Arrow /></Link></div>}
        <footer className="page-footer">{email && <a href={email}>Get in touch <Arrow diagonal /></a>}<button onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}>↑ Top</button></footer>
      </main>
    </div>
    <footer className="editor-status"><span className="status-mode">NORMAL</span><span className="status-branch">⑂ main</span><span className="status-file">{fileName}</span><button className="status-commands" onClick={() => { setSearchOpen(false); setCommandsOpen(true); }} aria-keyshortcuts="Space" aria-label="Open keyboard navigation"><kbd>Space</kbd> commands</button><span className="status-encoding">{isPost ? `${wordCount.toLocaleString()} words` : 'utf-8'}</span><button onClick={toggleTheme} aria-label={`Switch to ${theme === 'mocha' ? 'light' : 'dark'} theme`}>{theme === 'mocha' ? '☾' : '☼'} {theme}</button><button onClick={() => { setZenMode(value => !value); setMenuOpen(false); }} aria-pressed={zenMode}>zen</button><span className="status-vim">nvim</span></footer>
    {commandsOpen && <KeyboardHelp commands={commands} onClose={closeCommands} />}
    {searchOpen && <SearchDialog items={searchItems} onClose={closeSearch} />}
  </div>;
}

function PanelTitle({ file, label, href }: { file: string; label: string; href?: string }) {
  return <header className="panel-title"><span className="panel-file">{file}</span><h2>{label}</h2>{href && <Link to={href} aria-label={`View all ${label.toLowerCase()}`}><Arrow diagonal /></Link>}</header>;
}
function PageTitle({ title, detail }: { title: string; detail?: string }) {
  return <header className="page-title"><span className="heading-hash" aria-hidden="true">#</span><div><h1>{title}</h1>{detail && <p>{detail}</p>}</div></header>;
}
export default App;
