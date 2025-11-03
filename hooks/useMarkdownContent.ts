import { useState, useEffect } from 'react';
import { type ProfileData, type Section, type ContactInfo, type BlogPostIndexItem } from '../types';
import { ICON_MAP, COLORS } from '../constants';

// Make marked available globally
declare global {
  interface Window {
    marked: {
      parse: (markdown: string) => string;
    };
  }
}

// Helper function to get the current theme's teal color
const getCurrentTealColor = (): string => {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? COLORS.teal.mocha : COLORS.teal.latte;
};

const parseProfileMarkdown = (markdown: string): ProfileData | null => {
  if (!window.marked) {
    console.error('Marked.js not loaded');
    return null;
  }

  // Pre-process icons
  let processedMarkdown = markdown;
  Object.entries(ICON_MAP).forEach(([key, value]) => {
    const regex = new RegExp(`\\[${key}\\]`, 'g');
    processedMarkdown = processedMarkdown.replace(regex, `<i class="${value}"></i>`);
  });

  // Replace color codes in typing SVG URLs with theme-appropriate colors
  const tealColor = getCurrentTealColor();
  processedMarkdown = processedMarkdown.replace(
    /color=(94E2D5|04A5E5)/g,
    `color=${tealColor}`
  );

  const blocks = processedMarkdown.split('\n---\n');
  if (blocks.length < 2) return null;

  const headerBlock = blocks.shift()!;
  const sections: Section[] = [];

  // Parse Header
  const name = headerBlock.split('\n')[0].replace('# ', '').trim() || 'No Name';

  // Parse Sections
  blocks.forEach(block => {
    const lines = block.split('\n');

    // Find the first non-empty line for the title
    let titleIndex = 0;
    while (titleIndex < lines.length && lines[titleIndex].trim() === '') {
      titleIndex++;
    }

    if (titleIndex >= lines.length) return;

    const title = lines[titleIndex].replace('## ', '').trim();
    if (!title) return;

    // Keep all lines after the title, INCLUDING blank lines (crucial for Markdown parsing)
    const content = lines.slice(titleIndex + 1).join('\n');
    let parsedContent = window.marked.parse(content);

    // Add a class to the first list in "About Me" for styling contacts
    if (title === 'About Me') {
      parsedContent = parsedContent.replace('<ul>', '<ul class="contact-list">');
    }

    sections.push({ title, content: parsedContent });
  });

  return { name, contactInfo: [], sections };
};

const parseBlogIndex = (markdown: string): BlogPostIndexItem[] => {
    const posts: BlogPostIndexItem[] = [];
    const lines = markdown.split('\n').filter(line => line.startsWith('- '));

    lines.forEach(line => {
        // - YYYY-MM-DD | [Title](./slug.md) | tags: tag1, tag2, tag3
        const match = line.match(/- (.*?)\s*\|\s*\[(.*?)\]\(\.\/(.*?)\.md\)(?:\s*\|\s*tags:\s*(.+))?/);
        if (match) {
            const tags = match[4]
                ? match[4].split(',').map(tag => tag.trim()).filter(Boolean)
                : [];
            posts.push({
                date: match[1].trim(),
                title: match[2].trim(),
                slug: match[3].trim(),
                tags,
            });
        }
    });

    return posts;
}

export const useProfileData = (filePath: string, theme?: string): ProfileData | null => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  useEffect(() => {
    const fetchAndParse = async () => {
      try {
        console.log('Fetching profile from:', filePath);
        const response = await fetch(filePath);
        console.log('Response status:', response.status, response.statusText);
        if (!response.ok) {
          throw new Error(`Failed to fetch markdown file: ${response.statusText} (${response.status})`);
        }
        const markdownText = await response.text();
        console.log('Markdown loaded, length:', markdownText.length);
        const data = parseProfileMarkdown(markdownText);
        console.log('Profile parsed:', data ? 'success' : 'failed');
        setProfileData(data);
      } catch (error) {
        console.error('Error loading profile data:', error);
        console.error('Attempted path:', filePath);
      }
    };

    fetchAndParse();
  }, [filePath, theme]);

  return profileData;
};

export const useBlogIndex = (indexPath: string): BlogPostIndexItem[] => {
    const [posts, setPosts] = useState<BlogPostIndexItem[]>([]);

    useEffect(() => {
        const fetchAndParse = async () => {
            try {
                const response = await fetch(indexPath);
                if(!response.ok) throw new Error("Failed to fetch blog index");
                const markdownText = await response.text();
                const parsedPosts = parseBlogIndex(markdownText);
                setPosts(parsedPosts);
            } catch (error) {
                console.error("Error loading blog index:", error);
            }
        };
        fetchAndParse();
    }, [indexPath]);

    return posts;
};

export const useMarkdownFile = (filePath: string): string | null => {
    const [content, setContent] = useState<string | null>(null);

    useEffect(() => {
        if (!filePath) {
            setContent(null);
            return;
        }
        const fetchAndParse = async () => {
            try {
                const response = await fetch(filePath);
                if (!response.ok) throw new Error("Failed to fetch markdown file");
                const markdownText = await response.text();
                if (!window.marked) {
                    console.error('Marked.js not loaded');
                    setContent(markdownText); // fallback
                    return;
                }
                setContent(window.marked.parse(markdownText));
            } catch (error) {
                console.error(`Error loading markdown file: ${filePath}`, error);
                setContent("Failed to load content.");
            }
        };
        fetchAndParse();
    }, [filePath]);

    return content;
};
