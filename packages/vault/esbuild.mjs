import * as esbuild from 'esbuild';
import { dirname, resolve } from 'node:path';

// The shared UI imports its CSS as `./styles.css?inline` (Vite's syntax for "as a string");
// here that is the plain file with the text loader.
const inlineQuery = {
  name: 'inline-query',
  setup(build) {
    build.onResolve({ filter: /\?inline$/ }, (args) => ({
      path: resolve(dirname(args.importer), args.path.replace(/\?inline$/, '')),
    }));
  },
};

await esbuild.build({
  entryPoints: { 'dad-jokes': 'src/index.js' },
  bundle: true,
  sourcemap: true,
  minify: true,
  outdir: 'dist',
  format: 'esm',
  loader: { '.css': 'text', '.webp': 'dataurl' },
  plugins: [inlineQuery],
});
