import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// --- 1. Import Node.js helpers to create the path ---
import { fileURLToPath, URL } from 'url';

// --- This is the updated file ---
export default defineConfig({
  site: 'https://www.whereinindia.online', // Make sure this is your correct URL
  integrations: [sitemap()],

  // --- 2. Add this entire 'vite' block ---
  vite: {
    resolve: {
      alias: {
        // This tells the build process that '~/' means 'src/'
        '~': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
});