import { defineConfig } from 'unocss'
import {presetWind4,presetIcons,presetWebFonts} from "unocss"

export default defineConfig({
  presets:[presetWind4(),presetIcons({autoInstall:true}),presetWebFonts()],
  content:{
    pipeline:{
      // exclude:["**/index.astro"]
    }
  }
})