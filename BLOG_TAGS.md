# Blog Tags System Documentation

## Overview

The blog now includes an elegant tags system that allows you to categorize and filter blog posts by topics.

## How to Add Tags to Blog Posts

### In the Blog Index (`public/content/blog/index.md`)

Add tags to your blog posts using this format:

```markdown
- YYYY-MM-DD | [Post Title](./post-slug.md) | tags: tag1, tag2, tag3
```

### Example

```markdown
- 2025-11-03 | [Building with React](./building-with-react.md) | tags: react, typescript, web-dev
- 2025-11-02 | [My Neovim Setup](./neovim-setup.md) | tags: neovim, terminal, productivity
```

## Features

### Tag Filtering
- Click on any tag button to filter posts by that tag
- Click "All" to show all posts
- Each tag button shows the count of posts with that tag

### Visual Design
- Tags appear as elegant pills with rounded corners
- Active filters are highlighted in lavender
- Tags use the Catppuccin color scheme for consistency
- Smooth transitions and hover effects

### In Blog Posts
- Tags are displayed at the top of each blog post
- Tags use an icon prefix for visual clarity
- Clicking tags in the post view could navigate to filtered index (future enhancement)

## Tag Best Practices

1. **Use lowercase**: Keep tags in lowercase for consistency (e.g., `web-dev` not `Web-Dev`)
2. **Use hyphens**: For multi-word tags, use hyphens (e.g., `web-dev`, `machine-learning`)
3. **Be specific**: Use specific tags like `react` rather than generic ones like `programming`
4. **Limit tags**: Use 2-5 tags per post to keep it focused
5. **Consistent naming**: Maintain consistent tag names across posts

## Common Tag Suggestions

### Technology
- `react`, `typescript`, `javascript`, `python`, `rust`
- `web-dev`, `backend`, `frontend`, `fullstack`
- `neovim`, `vim`, `terminal`, `cli`

### Topics
- `tutorial`, `guide`, `tips`, `best-practices`
- `productivity`, `workflow`, `tools`
- `design`, `ui`, `ux`

### Categories
- `beginner`, `intermediate`, `advanced`
- `project`, `showcase`, `thoughts`

## Future Enhancements

Potential improvements to consider:
- Tag search/autocomplete
- Related posts by tag
- Tag cloud visualization
- Tag-based RSS feeds
- Tag analytics (most popular tags)
