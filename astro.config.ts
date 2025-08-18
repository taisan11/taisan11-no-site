// Astro
import { defineConfig } from 'astro/config';
import UnoCSS from 'unocss/astro'
import sitemap from '@astrojs/sitemap';
import playformCompress from '@playform/compress';
import aaa from "@taisan11/vite-plugin-budoux-build/astro"
import robotsTxt from "astro-robots-txt";
import mdx from "@astrojs/mdx";
//markdown
import remarkbreaks from "remark-breaks"
import rehypeexternallinks from "rehype-external-links"
import slug from "rehype-slug"
import autolink from "rehype-autolink-headings"
import {remarkEmbed,oEmbedTransformer,youTubeTransformer,googleSlidesTransformer, type RemarkEmbedOptions} from "./src/lib/remarkEmbed.ts";
import remarkLinkCard from "remark-link-card-plus";
//other
import type {AstroIntegration} from "astro"
import {getLastCommit} from "git-last-commit"
import type {Commit} from "git-last-commit"
import fs from "node:fs";
import path from "node:path";

function getDirectorySize(dirPath:string) {
  let totalSize = 0;
  function calculateSize(directory:string) {
    try {
      const files = fs.readdirSync(directory);
      for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        calculateSize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
    } catch (error) {
      console.error(`Error reading directory: ${directory}`, error);
    }
  }
  calculateSize(dirPath);
  return totalSize;
}

function buildSizeLogger():AstroIntegration {
    return {
        name: "build-size-logger",
        hooks: {
            "astro:build:done": async ({ dir }) => {
                const size = getDirectorySize(new URL(dir.href).pathname);
                console.log(`\n📦 Build Size: ${size / 1024 / 1024} MB\n${size} Bite\n`);
            },
        },
    };
}

const lastCommit = await new Promise<Commit>((resolve, reject) => {
  getLastCommit((err: Error | undefined, commit) => {
      if (err) reject(err)
      else resolve(commit)
  })
})

// const commitDate = new Date(+lastCommit.committedOn * 1000)
//toLocaleString("ja-JP", {timeZone: "Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})

// https://astro.build/config
export default defineConfig({
    site:"https://taisan11.f5.si",
    integrations:[UnoCSS(), sitemap(), playformCompress(), aaa(), robotsTxt({policy:[{userAgent:"*",disallow:"/kakusi/*"}]}), buildSizeLogger(), mdx()],
    markdown: {
      remarkPlugins: [
        remarkbreaks,
        [
          remarkEmbed,
          {
            transformers: [youTubeTransformer, googleSlidesTransformer, oEmbedTransformer],
          } satisfies RemarkEmbedOptions,
        ],
        remarkLinkCard
      ],
      rehypePlugins: [rehypeexternallinks, slug, autolink({behavior: 'wrap'})],
    },
    vite:{
        css:{
            transformer:import.meta.env.DEV?undefined:"lightningcss",
            // lightningcss:{
            //     targets:""
            // }
        },
        plugins: [
            {
              name: 'replace-text',
              transform(code) {
                    return code.replace(/AcommitIDA/g, lastCommit.hash.substring(0, 6)).replace(/AcommitAuthorNameA/g, lastCommit.author.name);
              }
            }
        ],
        build:{
            // cssCodeSplit:true,
            cssMinify:import.meta.env.DEV?undefined:"lightningcss"
        }
    },
    prefetch:true
});