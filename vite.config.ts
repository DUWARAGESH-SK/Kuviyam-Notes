import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Pick manifest based on BROWSER env var (default: chrome)
const browser = (process.env.BROWSER as 'chrome' | 'firefox') || 'chrome';
import fs from 'fs';

const platform = browser === 'firefox' ? 'firefox' : 'chromium';
const manifestPath = path.resolve(__dirname, `platform/${platform}/manifest.json`);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

console.log(`🌐 Building for: ${browser} → ${manifestPath}`);

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, `dist/${platform}`),
    emptyOutDir: true,
    minify: 'esbuild',      // esbuild avoids eval/new Function patterns that AMO flags
    sourcemap: false,       // no source maps in production build
  },
  plugins: [
    react(),
    crx({ manifest }),
  ],
});
