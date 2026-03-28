import React, { useEffect } from "react";
import { type Section, type BlogPostIndexItem } from "../types";
import { BlogIndexView } from "./BlogIndexView";
import { BlogPostView } from "./BlogPostView";

interface ContentWindowProps {
  section: Section | undefined;
  activePostSlug: string | null;
  onSelectPost: (slug: string) => void;
  onBackToBlogIndex: () => void;
  blogPosts: BlogPostIndexItem[];
  zenMode?: boolean;
  onWordCountChange?: (count: number) => void;
}

export const ContentWindow: React.FC<ContentWindowProps> = ({
  section,
  activePostSlug,
  onSelectPost,
  onBackToBlogIndex,
  blogPosts,
  zenMode = false,
  onWordCountChange,
}) => {
  useEffect(() => {
    if (section && onWordCountChange) {
      const text = section.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const count = text ? text.split(' ').length : 0;
      onWordCountChange(count);
    }
  }, [section, onWordCountChange]);

  if (!section) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--ctp-surface0)] flex items-center justify-center">
            <i className="fas fa-hand-pointer text-2xl text-[var(--ctp-overlay0)]" />
          </div>
          <p className="text-[var(--ctp-subtext0)]">Select a section to view content</p>
        </div>
      </div>
    );
  }

  const isBlogSection = section.title === "Blog";
  const activePost = blogPosts.find((p) => p.slug === activePostSlug);
  const title = isBlogSection && activePost ? activePost.title : section.title;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--ctp-base)]">
      <main className={`flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden ${zenMode ? 'flex justify-center' : ''}`}>
        <div className={zenMode ? 'w-full max-w-3xl' : 'w-full max-w-4xl mx-auto'}>
          <style>{`
            .prose-content {
              animation: fadeIn 0.4s ease-out;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .prose-content h1, .prose-content h2, .prose-content h3 {
              font-weight: 700;
              margin-bottom: 0.75em;
              margin-top: 1.25em;
              line-height: 1.2;
              letter-spacing: -0.02em;
            }
            .prose-content h1 { 
              font-size: clamp(1.75rem, 5vw, 2.25rem); 
              color: var(--ctp-mauve); 
              margin-top: 0;
              padding-bottom: 0.5em;
              border-bottom: 1px solid var(--ctp-surface0);
            }
            .prose-content h2 { 
              font-size: clamp(1.375rem, 4vw, 1.75rem); 
              color: var(--ctp-maroon);
              position: relative;
              padding-left: 0.75em;
            }
            .prose-content h2::before {
              content: '#';
              position: absolute;
              left: 0;
              color: var(--ctp-surface1);
              font-weight: 400;
            }
            .prose-content h3 { 
              font-size: clamp(1.125rem, 3vw, 1.375rem); 
              color: var(--ctp-flamingo); 
            }
            .prose-content h4 { 
              font-size: clamp(1rem, 2.5vw, 1.125rem); 
              color: var(--ctp-rosewater); 
              font-weight: 600;
              margin-top: 1.5em;
              margin-bottom: 0.5em;
            }
            .prose-content p { 
              margin-bottom: 1.25em; 
              line-height: 1.8; 
              word-wrap: break-word; 
              overflow-wrap: break-word;
              color: var(--ctp-text);
            }
            .prose-content a { 
              color: var(--ctp-sapphire); 
              text-decoration: none;
              border-bottom: 1px solid transparent;
              transition: all 0.2s ease;
              word-break: break-all;
            }
            .prose-content a:hover {
              border-bottom-color: var(--ctp-sapphire);
              background: var(--ctp-sapphire)/5;
            }
            .prose-content ul:not(.contact-list):not(.blog-index-list) { 
              list-style: none;
              padding-left: 0;
              margin-bottom: 1.25em;
            }
            .prose-content ul:not(.contact-list):not(.blog-index-list) li {
              position: relative;
              padding-left: 1.25em;
              margin-bottom: 0.5em;
            }
            .prose-content ul:not(.contact-list):not(.blog-index-list) li::before {
              content: '›';
              position: absolute;
              left: 0;
              color: var(--ctp-mauve);
              font-weight: bold;
            }
            .prose-content li { 
              line-height: 1.7;
            }
            .prose-content strong { 
              color: var(--ctp-lavender); 
              font-weight: 700;
            }
            .prose-content em { 
              color: var(--ctp-pink); 
              font-style: italic; 
            }
            .prose-content code {
              background-color: var(--ctp-surface0);
              color: var(--ctp-mauve);
              padding: 0.2em 0.5em;
              border-radius: 0.375rem;
              font-size: 0.875em;
              word-break: break-all;
              font-weight: 500;
            }
            .prose-content pre {
              background: var(--ctp-mantle);
              color: var(--ctp-subtext0);
              padding: 1rem;
              border-radius: 0;
              overflow-x: auto;
              font-size: 0.8125rem;
              line-height: 1.6;
              margin-bottom: 1.25em;
              margin-top: 1em;
              border: 1px solid var(--ctp-surface0);
            }
            .prose-content img { 
              max-width: 100%; 
              height: auto; 
              border-radius: 0;
              margin: 1.5em 0;
              border: 1px solid var(--ctp-surface0);
            }
            .prose-content img[src*="typing-svg"] {
              border: none;
              box-shadow: none;
            }
            .prose-content blockquote {
              border-left: 2px solid var(--ctp-mauve);
              padding: 0.5rem 1rem;
              margin: 1.25em 0;
              background: var(--ctp-surface0);
              font-style: italic;
              color: var(--ctp-subtext1);
            }
            .prose-content hr {
              border: none;
              height: 1px;
              background: var(--ctp-surface0);
              margin: 2em 0;
            }
            .prose-content pre code {
              background-color: transparent;
              color: inherit;
              padding: 0;
              font-size: inherit;
              word-break: normal;
            }
            .prose-content .contact-list { 
              list-style-type: none; 
              padding-left: 0; 
            }
            .prose-content .contact-list li { 
              display: flex; 
              align-items: center; 
              margin-bottom: 0.75rem;
              padding: 0.5rem 0;
              border-bottom: 1px solid var(--ctp-surface0);
            }
            .prose-content .contact-list li:last-child {
              border-bottom: none;
            }
            .prose-content img { 
              max-width: 100%; 
              height: auto; 
              margin: 1em 0;
            }
            .prose-content img[src*="typing-svg"] {
              margin: 0;
            }
            .prose-content blockquote {
              border-left: 3px solid var(--ctp-mauve);
              padding: 0.75rem 1.25rem;
              margin: 1.5em 0;
              background: var(--ctp-surface0)/50;
              border-radius: 0 0.5rem 0.5rem 0;
              font-style: italic;
              color: var(--ctp-subtext1);
            }
            .prose-content hr {
              border: none;
              height: 1px;
              background: linear-gradient(to right, transparent, var(--ctp-surface1), transparent);
              margin: 2em 0;
            }
            .prose-content .profile-header {
              display: flex;
              gap: 2rem;
              align-items: flex-start;
            }
            @media (max-width: 768px) {
              .prose-content .profile-header {
                flex-direction: column;
                gap: 1.5rem;
              }
              .prose-content .profile-header > div {
                width: 100% !important;
                flex: none !important;
              }
            }
          `}</style>

          <div className="prose-content">
            {isBlogSection ? (
              activePostSlug ? (
                <BlogPostView slug={activePostSlug} onBack={onBackToBlogIndex} post={activePost} onWordCountChange={onWordCountChange} blogPosts={blogPosts} />
              ) : (
                <>
                  <h1>{title}</h1>
                  <div dangerouslySetInnerHTML={{ __html: section.content }} />
                  <BlogIndexView posts={blogPosts} onSelectPost={onSelectPost} />
                </>
              )
            ) : (
              <>
                <h1>{title}</h1>
                <div dangerouslySetInnerHTML={{ __html: section.content }} />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
