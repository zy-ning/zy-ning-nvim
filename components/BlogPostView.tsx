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
            <header className="mb-6 pb-4 border-b border-[var(--ctp-surface0)]">
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ctp-subtext0)] mb-2">
                    {post?.date && (
                        <span className="font-mono">{post.date}</span>
                    )}
                    
                    {post?.tags && post.tags.length > 0 && (
                        <>
                            <span className="text-[var(--ctp-surface0)]">|</span>
                            {post.tags.map(tag => (
                                <span key={tag} className="text-[var(--ctp-teal)]">
                                    #{tag}
                                </span>
                            ))}
                        </>
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
