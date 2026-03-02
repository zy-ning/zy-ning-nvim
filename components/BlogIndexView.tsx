import React, { useState, useMemo } from 'react';
import { type BlogPostIndexItem } from '../types';
import { Icon } from './Icon';

interface BlogIndexViewProps {
    posts: BlogPostIndexItem[];
    onSelectPost: (slug: string) => void;
}

export const BlogIndexView: React.FC<BlogIndexViewProps> = ({ posts, onSelectPost }) => {
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        posts.forEach(post => {
            post.tags?.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }, [posts]);

    const filteredPosts = useMemo(() => {
        if (!selectedTag) return posts;
        return posts.filter(post => post.tags?.includes(selectedTag));
    }, [posts, selectedTag]);

    if (posts.length === 0) {
        return (
            <div className="text-center py-12">
                <Icon name="fas fa-inbox" className="text-4xl text-[var(--ctp-surface0)] mb-3" />
                <p className="text-[var(--ctp-subtext0)]">No blog posts found</p>
            </div>
        );
    }

    return (
        <div className="mt-8">
            {allTags.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-[var(--ctp-surface0)] flex items-center justify-center">
                            <Icon name="fas fa-tags" className="text-[var(--ctp-subtext0)] text-sm" />
                        </div>
                        <span className="text-[var(--ctp-subtext0)] text-sm font-medium">Filter by tag</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <TagButton
                            label="All"
                            count={posts.length}
                            isActive={selectedTag === null}
                            onClick={() => setSelectedTag(null)}
                        />
                        {allTags.map(tag => (
                            <TagButton
                                key={tag}
                                label={tag}
                                count={posts.filter(post => post.tags?.includes(tag)).length}
                                isActive={selectedTag === tag}
                                onClick={() => setSelectedTag(tag)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {filteredPosts.map((post, index) => (
                    <article
                        key={post.slug}
                        onClick={() => onSelectPost(post.slug)}
                        className="group cursor-pointer"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <div className="
                            relative p-4 rounded-xl
                            bg-[var(--ctp-surface0)]/30
                            border border-[var(--ctp-surface0)]
                            transition-all duration-300 ease-out
                            hover:bg-[var(--ctp-surface0)]/60
                            hover:border-[var(--ctp-surface1)]
                            hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]
                            hover:-translate-y-0.5
                        ">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 pt-1">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--ctp-mauve)]/20 to-[var(--ctp-pink)]/20 flex items-center justify-center group-hover:from-[var(--ctp-mauve)]/30 group-hover:to-[var(--ctp-pink)]/30 transition-all duration-300">
                                        <Icon name="fas fa-file-alt" className="text-[var(--ctp-mauve)] text-sm" />
                                    </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <time className="text-xs font-medium text-[var(--ctp-subtext0)] bg-[var(--ctp-surface0)] px-2 py-0.5 rounded">
                                            {post.date}
                                        </time>
                                    </div>
                                    
                                    <h3 className="text-lg font-semibold text-[var(--ctp-text)] group-hover:text-[var(--ctp-mauve)] transition-colors duration-200 mb-2 line-clamp-2">
                                        {post.title}
                                    </h3>
                                    
                                    {post.excerpt && (
                                        <p className="text-sm text-[var(--ctp-subtext0)] line-clamp-2 mb-3">
                                            {post.excerpt}
                                        </p>
                                    )}
                                    
                                    {post.tags && post.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {post.tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className="text-xs px-2 py-0.5 rounded-md bg-[var(--ctp-surface1)]/50 text-[var(--ctp-teal)] font-medium"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <Icon name="fas fa-arrow-right" className="text-[var(--ctp-mauve)]" />
                                </div>
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            {filteredPosts.length === 0 && selectedTag && (
                <div className="text-center py-12">
                    <Icon name="fas fa-search" className="text-3xl text-[var(--ctp-surface0)] mb-3" />
                    <p className="text-[var(--ctp-subtext0)]">
                        No posts found with tag "{selectedTag}"
                    </p>
                </div>
            )}
        </div>
    );
};

interface TagButtonProps {
    label: string;
    count: number;
    isActive: boolean;
    onClick: () => void;
}

const TagButton: React.FC<TagButtonProps> = ({ label, count, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`
            px-3 py-1.5 rounded-lg text-sm font-medium
            transition-all duration-200 ease-out
            ${isActive
                ? 'bg-[var(--ctp-lavender)] text-[var(--ctp-base)] shadow-md'
                : 'bg-[var(--ctp-surface0)]/50 text-[var(--ctp-subtext0)] hover:bg-[var(--ctp-surface0)] hover:text-[var(--ctp-text)]'
            }
        `}
    >
        {label} <span className="opacity-60 text-xs">({count})</span>
    </button>
);
