// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import clerk from '@clerk/astro';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Enable SSR for Clerk middleware
  adapter: vercel({
    webAnalytics: { enabled: true }, // Enable Vercel Web Analytics
  }),
  integrations: [clerk()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['convex'],
    },
  },
});
