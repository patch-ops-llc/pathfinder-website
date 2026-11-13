// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

const site = process.env.SITE_URL || 'https://www.pathfinderlld.com';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  adapter: node({ mode: 'middleware' }),
  integrations: [preact()],
  build: {
    format: 'directory',
    inlineStylesheets: 'always',
  },
  compressHTML: true,
  // The form endpoints do their own origin check (src/server/security.ts) so they
  // work behind proxies that rewrite the host or scheme.
  security: { checkOrigin: false },
  image: {
    responsiveStyles: false,
  },
  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 0 },
  },
});
