// @ts-check
import { defineConfig } from 'astro/config';
import UnoCSS from 'unocss/astro'

import sitemap from '@astrojs/sitemap';

import playformCompress from '@playform/compress';

// https://astro.build/config
export default defineConfig({
    integrations:[UnoCSS(), sitemap(), playformCompress()],
    prefetch:true
});