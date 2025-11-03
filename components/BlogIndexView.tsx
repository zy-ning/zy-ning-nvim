import React, { useState, useMemo } from 'react';
import { type BlogPostIndexItem } from '../types';
import { Icon } from './Icon';

interface BlogIndexViewProps {
    posts: BlogPostIndexItem[];
    onSelectPost: (slug: string) => void;
}

export const BlogIndexView: React.FC<BlogIndexViewProps> = ({ posts, onSelectPost }) => {
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    // Get all unique tags from all posts
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        posts.forEach(post => {
            post.tags?.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }, [posts]);

    // Filter posts by selected tag
    const filteredPosts = useMemo(() => {
        if (!selectedTag) return posts;
        return posts.filter(post => post.tags?.includes(selectedTag));
    }, [posts, selectedTag]);

    if (posts.length === 0) {
        return <p>No blog posts found.</p>;
    }

    return (
        <div>
            {/* Tag Filter Section */}
            {allTags.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Icon name="fas fa-tags" className="text-[var(--ctp-subtext0)]" />
                        <span className="text-[var(--ctp-subtext0)] text-sm">Filter by tag:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedTag(null)}
                            className={`px-3 py-1 rounded-full text-sm transition-all duration-200 ${
                                selectedTag === null
                                    ? 'bg-[var(--ctp-lavender)] text-[var(--ctp-base)] font-semibold'
                                    : 'bg-[var(--ctp-surface0)] text-[var(--ctp-subtext0)] hover:bg-[var(--ctp-surface1)]'
                            }`}
                        >
                            All ({posts.length})
                        </button>
                        {allTags.map(tag => {
                            const count = posts.filter(post => post.tags?.includes(tag)).length;
                            return (
                                <button
                                    key={tag}
                                    onClick={() => setSelectedTag(tag)}
                                    className={`px-3 py-1 rounded-full text-sm transition-all duration-200 ${
                                        selectedTag === tag
                                            ? 'bg-[var(--ctp-lavender)] text-[var(--ctp-base)] font-semibold'
                                            : 'bg-[var(--ctp-surface0)] text-[var(--ctp-subtext0)] hover:bg-[var(--ctp-surface1)]'
                                    }`}
                                >
                                    {tag} ({count})
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Posts List */}
            <ul className="blog-index-list list-none p-0 mt-6">
                {filteredPosts.map(post => (
                    <li key={post.slug} className="mb-3">
                        <button
                            onClick={() => onSelectPost(post.slug)}
                            className="w-full text-left p-3 hover:bg-[var(--ctp-surface0)] transition-colors duration-150 rounded-md group"
                        >
                            <div className="flex items-start gap-4">
                                <span className="text-[var(--ctp-subtext0)] text-sm flex-shrink-0">{post.date}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[var(--ctp-lavender)] group-hover:text-[var(--ctp-mauve)] font-bold transition-colors mb-1">
                                        {post.title}
                                    </div>
                                    {post.tags && post.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {post.tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-0.5 rounded text-xs bg-[var(--ctp-surface0)] text-[var(--ctp-teal)]"
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </button>
                    </li>
                ))}
            </ul>

            {filteredPosts.length === 0 && selectedTag && (
                <p className="text-[var(--ctp-subtext0)] text-center mt-8">
                    No posts found with tag "{selectedTag}"
                </p>
            )}
        </div>
    );
};
