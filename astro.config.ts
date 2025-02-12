import { defineConfig } from 'astro/config';
import type {AstroIntegration} from "astro"
import {getLastCommit} from "git-last-commit"
import type {Commit} from "git-last-commit"
import UnoCSS from 'unocss/astro'
import sitemap from '@astrojs/sitemap';
import playformCompress from '@playform/compress';
import aaa from "@taisan11/vite-plugin-budoux-build/astro"
import fs from "fs";
import path from "path";

function getDirectorySize(dirPath:string) {
  const aaa = path.format({dir:dirPath})
  let totalSize = 0;
  function calculateSize(directory:string) {
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
  }
  calculateSize(aaa);
  return totalSize;
}

function buildSizeLogger():AstroIntegration {
    return {
        name: "build-size-logger",
        hooks: {
            "astro:build:done": async ({ dir }) => {
                const size = getDirectorySize(new URL(dir.href).pathname);
                console.log(`\n📦 Build Size: ${(size / 1024 / 1024).toFixed(2)} MB\n`);
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

const commitDate = new Date(+lastCommit.committedOn * 1000)
//toLocaleString("ja-JP", {timeZone: "Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})

// https://astro.build/config
export default defineConfig({
    site:"https://taisan11.f5.si",
    integrations:[
        UnoCSS(),
        sitemap(),
        playformCompress(),
        aaa(),
        buildSizeLogger()
    ],
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
                  return code.replace(/AcommitIDA/g, lastCommit.hash).replace(/AcommitBranchA/g,lastCommit.branch);
              }
            }
        ],
        build:{
            // cssCodeSplit:true,
            cssMinify:"lightningcss"
        }
    },
    prefetch:true
});