// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// Fonts are downloaded at build time and self-hosted (BUILD_PLAN §2.1).
// Each `cssVariable` is the token name used throughout the CSS.
const fontsource = fontProviders.fontsource();

// https://astro.build/config
export default defineConfig({
  site: 'https://anantsingh.dev',
  fonts: [
    {
      provider: fontsource,
      name: 'Instrument Serif',
      cssVariable: '--font-serif-cover',
      weights: [400],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['serif'],
    },
    {
      provider: fontsource,
      name: 'La Belle Aurore',
      cssVariable: '--font-hand',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['cursive'],
    },
    {
      provider: fontsource,
      name: 'Geist',
      cssVariable: '--font-sans',
      weights: [300, 400, 500],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
    {
      provider: fontsource,
      name: 'Geist Mono',
      cssVariable: '--font-mono',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['monospace'],
    },
    {
      provider: fontsource,
      name: 'Barlow Condensed',
      cssVariable: '--font-condensed',
      weights: [500, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
    {
      provider: fontsource,
      name: 'Libre Caslon Text',
      cssVariable: '--font-ledger',
      // §2.1 lists 700 too, but no Accounting text uses bold and there is no
      // 700 italic face (the API requests every weight x style), so it is omitted.
      weights: [400],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['serif'],
    },
  ],
});
