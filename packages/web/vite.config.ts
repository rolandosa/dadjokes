import { defineConfig } from 'vite';

// `pnpm dev`: the site on 5175, /api proxied to the local fn-api (local/dev-server.ts). In AWS,
// CloudFront serves both from one origin, so the page always calls a relative /api.
export default defineConfig({
  server: {
    port: 5175,
    strictPort: true,
    proxy: { '/api': `http://localhost:${process.env.API_PORT ?? 8807}` },
  },
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
