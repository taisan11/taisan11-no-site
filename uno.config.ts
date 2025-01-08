import { defineConfig } from 'unocss'
import {presetUno,presetIcons,presetWebFonts} from "unocss"

export default defineConfig({
  // ...UnoCSS options
  presets:[presetUno(),presetIcons({autoInstall:true}),presetWebFonts()]
})