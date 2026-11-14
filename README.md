# Personal Blog & Portfolio

A terminal-inspired blog and portfolio site built with React, TypeScript, and Vite.

The interface uses a Neovim-style explorer, buffer bar, and status line with
Catppuccin-inspired Mocha and Latte themes. The original blue Rei portrait reveals
its braille characters, diffuses into noise, reforms, and fades over approximately
22 seconds per loop. Reduced-motion preferences keep the complete portrait still. The original
HouZunSongTi font and arrangement are retained on the Random Play page.

Profile content lives in `public/content/profile.md`; blog entries and language
variants are listed in `public/content/blog/index.md`. Use `Cmd/Ctrl + P`
(or `Cmd/Ctrl + K`) to search pages, papers, and posts. The status line includes theme and zen-mode controls;
articles also provide a contents outline, language switching, and focus mode.

## Keyboard navigation

Press `Space` (or `?`) while not typing to open the shortcut guide, then:

| Key | Action |
| --- | --- |
| `h` / `a` | About Me |
| `r` | Publications |
| `e` | Experience |
| `p` | Blog |
| `m` | Random Play |
| `f` | Search |
| `t` | Toggle theme |
| `z` | Toggle zen mode |
| `Esc` | Close the guide |

The same guide is available from the status line. Space opens the guide without
scrolling, including when a navigation link retains focus. Shortcuts leave text fields,
IME composition, and native keyboard activation of buttons alone. Links still open with Enter.

English text uses Inter and Source Serif 4 with FiraCode Nerd Font for editor chrome and code blocks.
The existing Chinese/Japanese display font is served from `public/fonts/houzun/`
with its license; those subsets cover the current name and song titles.

Papers and writing appear side by side on the profile, followed by News. The
SVG thumbnails illustrate each paper or article topic; they are conceptual
illustrations, not experimental plots. Experience marks use the same line style.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
3. Build for production:
   `npm run build`

The built static files will be in the `dist` folder.
