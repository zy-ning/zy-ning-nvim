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

    // Calculate word count when content changes
    useEffect(() => {
        if (content && onWordCountChange) {
            const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            const count = text ? text.split(' ').length : 0;
            onWordCountChange(count);
        }
    }, [content, onWordCountChange]);

    return (
        <div>
            <button
                onClick={onBack}
                className="flex items-center mb-6 text-[var(--ctp-subtext0)] hover:underline"
            >
                <Icon name="fas fa-arrow-left" className="mr-2" />
                Back to Blog Index
            </button>

            {post?.tags && post.tags.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                    {post.tags.map(tag => (
                        <span
                            key={tag}
                            className="px-3 py-1.5 rounded-full text-sm bg-[var(--ctp-surface0)] text-[var(--ctp-teal)] border border-[var(--ctp-surface1)]"
                        >
                            <Icon name="fas fa-tag" className="mr-1.5 text-xs" />
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {content ? (
                 <div className="prose-styles" dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
                <p>Loading post...</p>
            )}
        </div>
    );
};
