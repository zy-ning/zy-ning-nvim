import React from 'react';
import { useMarkdownFile } from '../hooks/useMarkdownContent';
import { Icon } from './Icon';

interface BlogPostViewProps {
    slug: string;
    onBack: () => void;
}

export const BlogPostView: React.FC<BlogPostViewProps> = ({ slug, onBack }) => {
    const content = useMarkdownFile(`/content/blog/${slug}.md`);

    return (
        <div>
            <button
                onClick={onBack}
                className="flex items-center mb-6 text-[var(--ctp-subtext0)] hover:underline"
            >
                <Icon name="fas fa-arrow-left" className="mr-2" />
                Back to Blog Index
            </button>

            {content ? (
                 <div className="prose-styles" dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
                <p>Loading post...</p>
            )}
        </div>
    );
};
