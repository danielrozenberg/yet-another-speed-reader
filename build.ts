import * as esbuild from 'esbuild';

const cssTextPlugin: esbuild.Plugin = {
  name: 'css-text',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const result = await esbuild.build({
        entryPoints: [args.path],
        bundle: true,
        write: false,
      });
      return {
        contents: `export default ${JSON.stringify(result.outputFiles[0].text)}`,
        loader: 'js',
      };
    });
  },
};

await esbuild.build({
  entryPoints: ['src/*.ts', 'src/*.tsx'],
  bundle: true,
  format: 'esm',
  sourcemap: true,
  outdir: 'dist/',
  outExtension: { '.js': '.mjs' },
  plugins: [cssTextPlugin],
});
