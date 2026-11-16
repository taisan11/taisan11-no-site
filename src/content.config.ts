import { defineCollection } from 'astro:content';
import {z} from "astro/zod"
import { glob } from 'astro/loaders';
import { feedLoader } from '@ascorbic/feed-loader';

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/blog" }),
  schema: z.object({
    title: z.string().min(2).max(100).optional(),
    date: z
      .preprocess((arg) => (typeof arg === "string" ? new Date(arg) : arg), z.date())
      .optional(),
    description: z.string().max(300).optional(),
    isListed:z.boolean().default(true)
  }),
});

const zennFeedLoader = feedLoader({
  url: "https://zenn.dev/taisan11/feed",
});

const zenn = defineCollection({
  loader: {
    ...zennFeedLoader,
    async load(context) {
      const hasCache = context.store.values().length > 0
        || context.meta.get("feed-cached") === "true";

      if (import.meta.env.DEV && hasCache) {
        context.logger.info("Using cached Zenn feed");
        return;
      }

      await zennFeedLoader.load(context);
      context.meta.set("feed-cached", "true");
    },
  },
});

export const collections = { blog,zenn };
