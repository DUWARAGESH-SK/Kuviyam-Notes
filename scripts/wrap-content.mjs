/**
 * scripts/wrap-content.mjs
 * 
 * Wraps the built content script in an IIFE to make it self-contained.
 * Run after `vite build`.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentPath = path.join(__dirname, '..', 'dist', 'src', 'content.js');

if (!fs.existsSync(contentPath)) {
  console.error(`❌ Content script not found at: ${contentPath}`);
  console.error('   Run `npm run build` first.');
  process.exit(1);
}

// Read the generated content.js
let content = fs.readFileSync(contentPath, 'utf-8');

// Wrap in IIFE to make it self-contained
const wrapped = `(function() {
  'use strict';
  ${content}
})();`;

// Write back
fs.writeFileSync(contentPath, wrapped);

console.log('✅ Content script wrapped successfully');
