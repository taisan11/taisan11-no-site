import { defineConfig } from 'unocss'
import {presetUno,presetIcons,presetWebFonts} from "unocss"

export default defineConfig({
  presets:[presetUno(),presetIcons({autoInstall:true}),presetWebFonts()]
})