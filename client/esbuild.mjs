import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: { 'dad-jokes': 'src/index.js' },
  bundle: true,
  sourcemap: true,
  minify: true,
  outdir: 'dist',
  format: 'esm',
  loader: { '.css': 'text' },
});
