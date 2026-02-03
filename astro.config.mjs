// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import clerk from '@clerk/astro';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Required for Clerk middleware
  integrations: [
    react(),
    clerk({
      afterSignInUrl: '/',
      afterSignUpUrl: '/',
      signInUrl: '/sign-in',
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['convex'],
    },
  },
});
