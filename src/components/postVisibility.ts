import type { CollectionEntry } from 'astro:content';

/**
 * Determines whether a blog post is genuinely published (ignoring local DEV draft preview).
 * Used for RSS feeds and Advent calendar progress bars so locked/future posts never leak.
 */
export function isPostPublished(post: CollectionEntry<'blog'>): boolean {
  if (post.data.draft) {
    return false;
  }
  const enforceDateGate =
    typeof process !== 'undefined' && process.env?.ENFORCE_PUBDATE_GATE === 'true';
  if (enforceDateGate && post.data.adventDay !== 1) {
    return post.data.pubDate.valueOf() <= Date.now();
  }
  return true;
}

/**
 * Determines whether a blog post should be visible in listings and static routes.
 * - In local dev (`import.meta.env.DEV === true`), all posts (including `draft: true`)
 *   are visible so you can preview and proofread every Advent article locally.
 * - In production builds, `draft: true` posts are excluded.
 * - If `ENFORCE_PUBDATE_GATE=true` is set in CI, non-draft posts with a future `pubDate`
 *   (except Day 01 seed) remain locked until their scheduled date arrives.
 */
export function isPostVisible(post: CollectionEntry<'blog'>): boolean {
  if (import.meta.env.DEV) {
    return true;
  }
  return isPostPublished(post);
}

/**
 * Extracts the ready-to-share X & LinkedIn social summary from frontmatter
 * (falling back to a Markdown section or title + description).
 * Keeps outbound URLs out of the main post body to avoid social platform link throttling.
 */
export function extractSocialSummary(post: CollectionEntry<'blog'>): string {
  if (post.data.socialSummary && post.data.socialSummary.trim().length > 0) {
    return post.data.socialSummary.trim();
  }
  const match = post.body.match(/##\s+Social Summary[^\n]*\n+```(?:text)?\n([\s\S]*?)```/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return `${post.data.title}\n\n${post.data.description}`;
}
