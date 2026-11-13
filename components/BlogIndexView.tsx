import React, { useMemo, useState } from 'react';
import { BlogFigure } from './BlogFigure';
import { Link } from 'react-router-dom';
import { type BlogPostIndexItem } from '../types';
import './writing.css';

interface BlogIndexViewProps {
  posts: BlogPostIndexItem[];
  onSelectPost: (slug: string) => void;
}

const cleanTitle = (title: string) => title.replace(/\s*\((?:中文|English)\)$/, '');
const languageName = (post: BlogPostIndexItem) => post.language === 'en' || post.slug.endsWith('_en') ? 'English' : '中文';

export const BlogIndexView: React.FC<BlogIndexViewProps> = ({ posts, onSelectPost }) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const groups = useMemo(() => {
    const byArticle = new Map<string, BlogPostIndexItem[]>();
    posts.forEach(post => {
      const key = post.originalSlug || post.slug.replace(/_en$/, '');
      byArticle.set(key, [...(byArticle.get(key) || []), post]);
    });
    return Array.from(byArticle, ([key, variants]) => {
      const sorted = [...variants].sort((a, b) => Number(languageName(b) === 'English') - Number(languageName(a) === 'English'));
      return { key, primary: sorted[0], variants: sorted, tags: Array.from(new Set(variants.flatMap(p => p.tags || []))) };
    }).sort((a, b) => b.primary.date.localeCompare(a.primary.date));
  }, [posts]);
  const tags = useMemo(() => Array.from(new Set(groups.flatMap(group => group.tags))).sort(), [groups]);
  const filtered = selectedTag ? groups.filter(group => group.tags.includes(selectedTag)) : groups;

  // Preserve native link behavior for new tabs, copy-link, and modified clicks.
  const selectPost = (event: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onSelectPost(slug);
  };

  return <div className="writing-index">
    {tags.length > 0 && <div className="writing-filters" aria-label="Filter writing by topic">
      <span className="writing-filter-label">Explore by topic</span>
      <div className="writing-filter-options">
        {[null, ...tags].map(tag => <button type="button" key={tag || 'all'} className={`writing-filter ${selectedTag === tag ? 'is-selected' : ''}`} aria-pressed={selectedTag === tag} onClick={() => setSelectedTag(tag)}>
          {tag || 'All notes'}<span>{tag ? groups.filter(group => group.tags.includes(tag)).length : groups.length}</span>
        </button>)}
      </div>
    </div>}
    <p className="writing-result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'essay' : 'essays'}{selectedTag ? ` / ${selectedTag}` : ' / experiments, questions & observations'}</p>
    <div className="writing-list">
      {filtered.map(({ key, primary, variants, tags: articleTags }, index) => {
        return <article className="writing-row" key={key}>
          <div className="writing-row-date"><span className="writing-row-number">{String(index + 1).padStart(2, '0')}</span><time dateTime={primary.date}>{primary.date.replaceAll('-', '.')}</time></div>
          <div className="writing-row-main">
            <h2 lang={languageName(primary) === 'English' ? 'en' : 'zh'}><Link to={`/blog/${primary.slug}`} onClick={e => selectPost(e, primary.slug)}>{cleanTitle(primary.title)}</Link></h2>
            <div className="writing-tags">{articleTags.map(tag => <span key={tag}>{tag}</span>)}</div>
            <div className="writing-languages" aria-label={`Read ${cleanTitle(primary.title)}`}>
              {variants.map(variant => <Link key={variant.slug} to={`/blog/${variant.slug}`} onClick={e => selectPost(e, variant.slug)} lang={languageName(variant) === 'English' ? 'en' : 'zh'}>{languageName(variant)}<span aria-hidden="true">↗</span></Link>)}
            </div>
          </div>
          <Link className="writing-row-figure" to={`/blog/${primary.slug}`} onClick={e => selectPost(e, primary.slug)} aria-label={`Read ${cleanTitle(primary.title)}`}><BlogFigure slug={primary.slug} /><span className="figure-read-label">Read note <span aria-hidden="true">↗</span></span></Link>
        </article>;
      })}
    </div>
    {filtered.length === 0 && <div className="writing-empty"><p>{selectedTag ? `No essays on “${selectedTag}” yet.` : 'The notebook is quiet for now.'}</p>{selectedTag && <button type="button" onClick={() => setSelectedTag(null)}>Browse all notes <span aria-hidden="true">↗</span></button>}</div>}
  </div>;
};
