import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    series: z.enum(['general', 'advent-2026']).default('general'),
    adventDay: z.number().min(1).max(24).optional(),
    draft: z.boolean().default(false),
    socialSummary: z.string().optional(),
  }),
});

export const collections = { blog };
