import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkdownFile } from '../hooks/useMarkdownContent';
import { Icon } from './Icon';
import { type BlogPostIndexItem } from '../types';

interface BlogPostViewProps {
    slug: string;
    onBack: () => void;
    post?: BlogPostIndexItem;
    onWordCountChange?: (count: number) => void;
    blogPosts: BlogPostIndexItem[];
}

export const BlogPostView: React.FC<BlogPostViewProps> = ({ 
    slug, 
    onBack, 
    post, 
    onWordCountChange,
    blogPosts 
}) => {
    const content = useMarkdownFile(`/content/blog/${slug}.md`);
    const navigate = useNavigate();

    useEffect(() => {
        if (content && onWordCountChange) {
            const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            const count = text ? text.split(' ').length : 0;
            onWordCountChange(count);
        }
    }, [content, onWordCountChange]);

    // Find language variant
    const currentPost = blogPosts.find(p => p.slug === slug);
    const originalSlug = currentPost?.originalSlug || slug.replace(/_en$/, '');
    const isEnglish = slug.endsWith('_en');
    
    // Find the other language version
    const otherLanguageSlug = isEnglish 
        ? originalSlug 
        : blogPosts.find(p => p.originalSlug === originalSlug && p.language === 'en')?.slug;

    const handleLanguageSwitch = () => {
        if (otherLanguageSlug) {
            navigate(`/blog/${otherLanguageSlug}`);
        }
    };

    return (
        <article className="animate-fadeIn">
            {/* Back Button and Language Switch */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onBack}
                    className="
                        group inline-flex items-center px-3 py-1.5 rounded-lg
                        text-[var(--ctp-subtext0)] text-sm font-medium
                        bg-[var(--ctp-surface0)]/30 hover:bg-[var(--ctp-surface0)]
                        transition-all duration-200 ease-out
                        hover:-translate-x-0.5
                    "
                >
                    <Icon name="fas fa-arrow-left" className="mr-2 text-xs transition-transform duration-200 group-hover:-translate-x-0.5" />
                    Back to Blog Index
                </button>

                {otherLanguageSlug && (
                    <button
                        onClick={handleLanguageSwitch}
                        className="
                            inline-flex items-center px-3 py-1.5 rounded-lg
                            text-[var(--ctp-text)] text-sm font-medium
                            bg-[var(--ctp-surface0)] hover:bg-[var(--ctp-surface1)]
                            border border-[var(--ctp-surface1)]
                            transition-all duration-200 ease-out
                        "
                    >
                        <Icon name="fas fa-language" className="mr-2 text-xs" />
                        {isEnglish ? '中文' : 'English'}
                    </button>
                )}
            </div>

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
