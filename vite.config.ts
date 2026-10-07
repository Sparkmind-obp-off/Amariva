import { defineConfig } from 'vite'
// Explicit single Hono entry avoids legacy multi-entry plugin notFound API mismatch.
export default defineConfig({
 ssr: { target: 'webworker', noExternal: true },
 build: { ssr: './src/index.ts', outDir: 'dist', emptyOutDir: true, minify: true,
  rollupOptions: { output: { entryFileNames: '_worker.js' } } }
})
