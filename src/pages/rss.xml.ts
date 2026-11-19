import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { isPostPublished } from '@components/postVisibility';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog', (post) => isPostPublished(post))).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    title: 'Hristiyan Hristov — Technical Blog & DevSec Advent',
    description:
      'Articles on JavaScript architecture, frontend engineering, and application security by Hristiyan Hristov.',
    site: context.site ?? 'https://hristov.dev',
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.slug}/`,
      categories: post.data.tags,
    })),
    customData: `<language>en-us</language>`,
  });
}
