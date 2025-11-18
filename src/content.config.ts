import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { feedLoader } from '@ascorbic/feed-loader';

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/blog" }),
  schema: z.object({
    title: z.string().min(2).max(100).optional(),
    date: z
      .preprocess((arg) => (typeof arg === "string" ? new Date(arg) : arg), z.date())
      .optional(),
    description: z.string().max(300).optional(),
  }),
});

const zenn = defineCollection({
  loader: feedLoader({
    url: "https://zenn.dev/taisan11/feed",
  }),
});

export const collections = { blog,zenn };