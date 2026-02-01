// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import clerk from '@clerk/astro';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Enable SSR for Clerk middleware
  adapter: node({ mode: 'standalone' }),
  integrations: [clerk()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['convex'],
    },
  },
});
