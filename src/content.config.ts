import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const blog = defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/blog" }),
    schema: z.object({
        title: z.string().min(2).max(100).optional(),
        date: z.string().transform((str) => new Date(str)).optional(),
        description: z.string().max(300).optional(),
    }),
});

export const collections = { blog };