import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: true,
  treeshake: true,
  target: 'node16',
  outDir: 'dist',
  banner: {
    js: '// Token Memory TTL - High-performance in-memory token store\n// https://github.com/jwcbmat/token-memory-ttl',
  },
});