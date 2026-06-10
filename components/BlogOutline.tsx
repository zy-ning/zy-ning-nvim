import React, { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { type OutlineHeading } from "../types";

interface BlogOutlineProps {
  headings: OutlineHeading[];
  /** The scroll container the headings live in (the <main> content area). */
  scrollRef?: React.RefObject<HTMLElement | null>;
}

/**
 * nvim "aerial"-style symbol outline, rendered inline inside the Explorer
 * sidebar (below the SECTIONS list) when viewing a blog post.
 *
 * Interaction works off the LIVE DOM (queried by index at click/scroll time)
 * rather than captured element refs or assigned ids: the markdown is injected
 * via dangerouslySetInnerHTML and React/StrictMode can recreate those nodes,
 * which would leave stale refs and id-less headings behind.
 */
export const BlogOutline: React.FC<BlogOutlineProps> = ({ headings, scrollRef }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    setActiveIdx(0);
  }, [headings]);

  // The nearest scrollable ancestor of the headings. Prefer the provided ref,
  // but fall back to discovering it from a live heading.
  const getScroller = (): HTMLElement | null => {
    const ref = scrollRef?.current;
    if (ref && ref.scrollHeight > ref.clientHeight) return ref;
    let node: HTMLElement | null =
      (document.querySelector("main h1, main h2, main h3, main h4") as HTMLElement | null)
        ?.parentElement ?? null;
    while (node && node !== document.body) {
      const oy = getComputedStyle(node).overflowY;
      if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) return node;
      node = node.parentElement;
    }
    return ref ?? null;
  };

  // Live heading elements, in document order (matches `headings` order).
  const liveHeadings = (): HTMLElement[] => {
    const scope: ParentNode = scrollRef?.current ?? document;
    return Array.from(scope.querySelectorAll("h1, h2, h3, h4")) as HTMLElement[];
  };

  // Track the current section while scrolling: the active heading is the last
  // one scrolled past the fold line (robust for sections taller than the view).
  useEffect(() => {
    if (headings.length === 0) return;
    const container = getScroller();
    if (!container) return;

    const FOLD = 96;
    let raf = 0;

    const update = () => {
      raf = 0;
      const top = container.getBoundingClientRect().top;
      const live = liveHeadings();
      let idx = 0;
      for (let i = 0; i < live.length; i++) {
        if (live[i].getBoundingClientRect().top - top <= FOLD) idx = i;
        else break;
      }
      setActiveIdx(idx);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headings, scrollRef]);

  const handleClick = (index: number) => {
    const live = liveHeadings();
    const el = live[index];
    if (!el) return;
    setActiveIdx(index);

    const container = getScroller();
    if (container) {
      const top =
        el.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop -
        16;
      container.scrollTo({ top, behavior: "smooth" });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (headings.length === 0) return null;

  const minLevel = headings.reduce((m, h) => Math.min(m, h.level), 6);

  return (
    <div className="border-t border-[var(--ctp-surface0)]">
      <div className="px-3 py-1.5 mt-1 text-xs text-[var(--ctp-overlay0)] flex items-center justify-between">
        <span className="flex items-center tracking-wide">
          <Icon name="fas fa-chevron-down" className="mr-1.5 text-[10px]" />
          OUTLINE
        </span>
        <span>{headings.length}</span>
      </div>

      <nav className="pb-2">
        {headings.map((h, i) => {
          const isActive = activeIdx === i;
          const indent = h.level - minLevel;
          const levelColor =
            h.level <= 1
              ? "var(--ctp-mauve)"
              : h.level === 2
              ? "var(--ctp-maroon)"
              : h.level === 3
              ? "var(--ctp-flamingo)"
              : "var(--ctp-rosewater)";

          return (
            <button
              key={i}
              onClick={() => handleClick(i)}
              title={h.text}
              style={{ paddingLeft: `${0.75 + indent * 0.8}rem` }}
              className={`
                w-full text-left pr-3 py-1 flex items-center gap-2
                border-l-2 transition-colors duration-150
                ${
                  isActive
                    ? "bg-[var(--ctp-surface0)] border-[var(--ctp-mauve)] text-[var(--ctp-text)]"
                    : "border-transparent text-[var(--ctp-subtext0)] hover:bg-[var(--ctp-surface0)]/50 hover:text-[var(--ctp-text)]"
                }
              `}
            >
              <span
                className="text-[10px] font-bold flex-shrink-0"
                style={{ color: levelColor }}
              >
                {"#".repeat(Math.min(h.level, 4))}
              </span>
              <span className="text-xs truncate">{h.text}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
