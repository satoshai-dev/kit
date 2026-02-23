import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  outDir: 'dist',
  external: ['react', 'react-dom', '@stacks/transactions', '@stacks/connect'],
  banner: {
    js: '"use client";',
  },
});
