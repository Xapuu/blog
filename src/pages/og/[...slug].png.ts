import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { renderOgCardPng } from '@components/ogCardSvg';
import { formatDate, getReadingTime } from '@components/readingTime';
import { isPostVisible } from '@components/postVisibility';

export async function getStaticPaths() {
  const posts = await getCollection('blog', (post) => isPostVisible(post));
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as { post: CollectionEntry<'blog'> };
  const { title, description, pubDate, tags, series, adventDay } = post.data;

  const badge =
    series === 'advent-2026'
      ? `2026 DEVSEC ADVENT • DAY ${String(adventDay ?? 1).padStart(2, '0')}/24`
      : 'HRISTOV.DEV • TECHNICAL ARTICLE';

  const dateStr = `${formatDate(pubDate)} • ${getReadingTime(post.body)}`;

  const png = await renderOgCardPng({
    title,
    subtitle: description,
    badge,
    tags,
    dateStr,
  });

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
