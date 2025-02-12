import { defineConfig } from 'astro/config';
import UnoCSS from 'unocss/astro'
import sitemap from '@astrojs/sitemap';
import playformCompress from '@playform/compress';
import aaa from "@taisan11/vite-plugin-budoux-build/astro"

// https://astro.build/config
export default defineConfig({
    site:"https://taisan11.f5.si",
    integrations:[
        UnoCSS(),
        sitemap(),
        playformCompress(),
        aaa()
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