import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/*.ts', 'src/*.tsx'],
  bundle: true,
  format: 'esm',
  sourcemap: true,
  outdir: 'dist/',
  outExtension: { '.js': '.mjs' },
});
