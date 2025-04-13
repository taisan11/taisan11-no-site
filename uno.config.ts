import { defineConfig } from 'unocss'
import {presetWind3,presetIcons,presetWebFonts} from "unocss"

export default defineConfig({
  presets:[presetWind3(),presetIcons({autoInstall:true}),presetWebFonts()],
  // content:{
  //   pipeline:{
  //     // exclude:["**/index.astro"]
  //   }
  // }
})