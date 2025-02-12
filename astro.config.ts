import { defineConfig } from 'astro/config';
import type {AstroIntegration} from "astro"
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
        build:{
            // cssCodeSplit:true,
            cssMinify:"lightningcss"
        }
    },
    prefetch:true
});