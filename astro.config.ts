// Astro
import { defineConfig } from 'astro/config';
import cloudflare from "@astrojs/cloudflare";
import sitemap from '@astrojs/sitemap';
import playformCompress from '@playform/compress';
import aaa from "@taisan11/vite-plugin-budoux-build/astro"
import robotsTxt from "astro-robots-txt";
import mdx from "@astrojs/mdx";
//markdown
import { satteri, satteriHeadingIdsPlugin } from '@astrojs/markdown-satteri';
import { remarkEmbed, youTubeTransformer, googleSlidesTransformer, oEmbedTransformer, type RemarkEmbedOptions } from "./src/lib/satteri-plugins.ts";
import { satteriRemarkBreaks } from "./src/lib/satteri-plugins.ts";
//other
import {getLastCommit} from "git-last-commit"
import type {Commit} from "git-last-commit"
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
  site:"https://taisan11.dev",
  integrations:[sitemap({filter: (page) => !page.includes("/kakusi/") && !page.includes("/cdn-cgi/")}), playformCompress(), aaa(), robotsTxt({policy:[{userAgent:"*",disallow:["/kakusi/*","/cdn-cgi/*"]}],sitemap:"https://taisan11.dev/sitemap-index.xml"}),
  mdx()],

  output:"static",

  markdown: {
    processor: satteri({
      mdastPlugins: [
        satteriRemarkBreaks,
        remarkEmbed({
          transformers: [youTubeTransformer, googleSlidesTransformer, oEmbedTransformer],
        } satisfies RemarkEmbedOptions),
      ],
      hastPlugins: [
        {
          name: "rehype-external-links",
          element: {
            filter: ["a"],
            visit(node, ctx) {
              const href = node.properties.href;
              if (typeof href === "string" && href.startsWith("http")) {
                ctx.setProperty(node, "target", "_blank");
                ctx.setProperty(node, "rel", "noopener noreferrer");
              }
            },
          },
        },
        satteriHeadingIdsPlugin()
      ],
    }),
  },

  vite:{
      css:{
          transformer:"lightningcss",
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
          // cssMinify:"lightningcss"
      }
  },

  prefetch:true,
  adapter: cloudflare({
    imageService:"compile"
  }),
});
