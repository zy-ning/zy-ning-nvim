import React from 'react';
import { type BlogPostIndexItem } from '../types';
import { Icon } from './Icon';

interface BlogIndexViewProps {
    posts: BlogPostIndexItem[];
    onSelectPost: (slug: string) => void;
}

export const BlogIndexView: React.FC<BlogIndexViewProps> = ({ posts, onSelectPost }) => {
    if (posts.length === 0) {
        return <p>No blog posts found.</p>;
    }

    return (
        <ul className="blog-index-list list-none p-0 mt-6">
            {posts.map(post => (
                <li key={post.slug} className="mb-2">
                    <button
                        onClick={() => onSelectPost(post.slug)}
                        className="w-full text-left p-2 flex items-center hover:bg-[var(--ctp-surface0)] transition-colors duration-150 rounded-md"
                    >
                        <span className="text-[var(--ctp-subtext0)] mr-4">{post.date}</span>
                        <span className="text-[var(--ctp-lavender)] font-bold">{post.title}</span>
                    </button>
                </li>
            ))}
        </ul>
    );
};
