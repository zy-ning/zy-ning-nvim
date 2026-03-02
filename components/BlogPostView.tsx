import React, { useEffect } from 'react';
import { useMarkdownFile } from '../hooks/useMarkdownContent';
import { Icon } from './Icon';
import { type BlogPostIndexItem } from '../types';

interface BlogPostViewProps {
    slug: string;
    onBack: () => void;
    post?: BlogPostIndexItem;
    onWordCountChange?: (count: number) => void;
}

export const BlogPostView: React.FC<BlogPostViewProps> = ({ slug, onBack, post, onWordCountChange }) => {
    const content = useMarkdownFile(`/content/blog/${slug}.md`);

    useEffect(() => {
        if (content && onWordCountChange) {
            const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            const count = text ? text.split(' ').length : 0;
            onWordCountChange(count);
        }
    }, [content, onWordCountChange]);

    return (
        <article className="animate-fadeIn">
            {/* Back Button */}
            <button
                onClick={onBack}
                className="
                    group inline-flex items-center mb-6 px-3 py-1.5 rounded-lg
                    text-[var(--ctp-subtext0)] text-sm font-medium
                    bg-[var(--ctp-surface0)]/30 hover:bg-[var(--ctp-surface0)]
                    transition-all duration-200 ease-out
                    hover:-translate-x-0.5
                "
            >
                <Icon name="fas fa-arrow-left" className="mr-2 text-xs transition-transform duration-200 group-hover:-translate-x-0.5" />
                Back to Blog Index
            </button>

            {/* Post Header */}
            <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-[var(--ctp-mauve)] mb-4 leading-tight">
                    {post?.title || 'Loading...'}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--ctp-subtext0)]">
                    {post?.date && (
                        <div className="flex items-center gap-1.5">
                            <Icon name="fas fa-calendar-alt" className="text-[var(--ctp-overlay0)]" />
                            <time>{post.date}</time>
                        </div>
                    )}
                    
                    {post?.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {post.tags.map(tag => (
                                <span
                                    key={tag}
                                    className="
                                        px-2.5 py-0.5 rounded-md
                                        bg-[var(--ctp-surface0)] text-[var(--ctp-teal)]
                                        text-xs font-medium
                                    "
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* Post Content */}
            {content ? (
                <div 
                    className="prose-content"
                    dangerouslySetInnerHTML={{ __html: content }} 
                />
            ) : (
                <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3 text-[var(--ctp-subtext0)]">
                        <div className="w-5 h-5 border-2 border-[var(--ctp-surface1)] border-t-[var(--ctp-mauve)] rounded-full animate-spin" />
                        <span>Loading post...</span>
                    </div>
                </div>
            )}
        </article>
    );
};
