import { defineConfig } from 'unocss'
import {presetWind3,presetIcons,presetWebFonts,presetTypography} from "unocss"

export default defineConfig({
  presets:[presetWind3(),presetIcons({autoInstall:true}),presetWebFonts(),presetTypography()],
  // content:{
  //   pipeline:{
  //     // exclude:["**/index.astro"]
  //   }
  // }
})