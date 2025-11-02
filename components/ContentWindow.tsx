import React from 'react';
import { type Section, type BlogPostIndexItem } from '../types';
import { BlogIndexView } from './BlogIndexView';
import { BlogPostView } from './BlogPostView';

interface ContentWindowProps {
  section: Section | undefined;
  activePostSlug: string | null;
  onSelectPost: (slug: string) => void;
  onBackToBlogIndex: () => void;
  blogPosts: BlogPostIndexItem[];
}

export const ContentWindow: React.FC<ContentWindowProps> = ({ section, activePostSlug, onSelectPost, onBackToBlogIndex, blogPosts }) => {
  if (!section) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <p>Select a section to view content.</p>
      </div>
    );
  }

  const isBlogSection = section.title === 'Blog';
  const activePost = blogPosts.find(p => p.slug === activePostSlug);
  const title = isBlogSection && activePost ? activePost.title : section.title;

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <style>{`
        .prose-styles h1, .prose-styles h2, .prose-styles h3 {
          font-weight: bold;
          margin-bottom: 0.5em;
          margin-top: 1em;
        }
        .prose-styles h1 { font-size: 1.875rem; color: var(--ctp-red); }
        .prose-styles h2 { font-size: 1.5rem; color: var(--ctp-peach); }
        .prose-styles h3 { font-size: 1.25rem; color: var(--ctp-yellow); }
        .prose-styles p { margin-bottom: 1em; line-height: 1.6; }
        .prose-styles a { color: var(--ctp-blue); text-decoration: underline; }
        .prose-styles ul:not(.contact-list):not(.blog-index-list) { list-style-type: '» '; padding-left: 1.5rem; margin-bottom: 1em; }
        .prose-styles li { padding-left: 0.5rem; margin-bottom: 0.25em; }
        .prose-styles strong { color: var(--ctp-green); font-weight: bold; }
        .prose-styles code { 
            background-color: var(--ctp-surface0);
            color: var(--ctp-mauve);
            padding: 0.2em 0.4em;
            border-radius: 0.25rem;
        }
        .prose-styles pre {
            background-color: var(--ctp-mantle);
            color: var(--ctp-subtext0);
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto; /* Enable horizontal scrolling for wide code blocks */
            font-size: 0.75rem;   /* Make font smaller to fit more of the art */
            line-height: 1.1;     /* Slightly increased line height for readability */
            margin-bottom: 1em;
        }
        .prose-styles pre code {
            background-color: transparent; /* Avoid double background */
            color: inherit;
            padding: 0;
        }
        .prose-styles .contact-list { list-style-type: none; padding-left: 0; }
        .prose-styles .contact-list li { display: flex; align-items: center; margin-bottom: 0.5rem; }
      `}</style>
      <h2 className={`
        text-2xl font-bold mb-4 pb-2 
        border-b border-dashed 
        border-b-[var(--ctp-overlay0)]
        text-[var(--ctp-sapphire)]
      `}>
        {title}
      </h2>
      
      {isBlogSection ? (
        activePostSlug ? (
          <BlogPostView slug={activePostSlug} onBack={onBackToBlogIndex} />
        ) : (
          <>
            <div className="prose-styles" dangerouslySetInnerHTML={{ __html: section.content }} />
            <BlogIndexView posts={blogPosts} onSelectPost={onSelectPost} />
          </>
        )
      ) : (
        <div className="prose-styles" dangerouslySetInnerHTML={{ __html: section.content }} />
      )}
    </main>
  );
};