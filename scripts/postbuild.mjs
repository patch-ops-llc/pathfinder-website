// Runs after `astro build`:
//  1. precompresses text assets with brotli and gzip so the server never
//     compresses on the fly;
//  2. collects sha256 hashes of every inline script in the built pages for
//     the Content-Security-Policy header.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const clientDir = join(root, 'dist', 'client');
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.xml', '.txt', '.webmanifest', '.ico']);

const hashes = new Set();
let count = 0;
let before = 0;
let after = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    const ext = extname(entry.name).toLowerCase();
    if (!COMPRESSIBLE.has(ext)) continue;
    const source = readFileSync(full);

    if (ext === '.html') {
      const html = source.toString('utf8');
      for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        const [, attrs, body] = match;
        if (/\bsrc\s*=/.test(attrs) || /type\s*=\s*["']?application\/(ld\+)?json/i.test(attrs) || body === '') continue;
        hashes.add(`sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`);
      }
    }

    if (source.length < 512) continue;
    const br = brotliCompressSync(source, {
      params: { [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY, [constants.BROTLI_PARAM_SIZE_HINT]: source.length },
    });
    const gz = gzipSync(source, { level: 9 });
    if (br.length < source.length) writeFileSync(`${full}.br`, br);
    if (gz.length < source.length) writeFileSync(`${full}.gz`, gz);
    count++;
    before += source.length;
    after += Math.min(br.length, source.length);
  }
}

walk(clientDir);
writeFileSync(join(root, 'dist', 'csp-hashes.json'), JSON.stringify([...hashes].sort(), null, 2));

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`[postbuild] precompressed ${count} files: ${kb(before)} -> ${kb(after)} (brotli)`);
console.log(`[postbuild] ${hashes.size} inline script hashes written to dist/csp-hashes.json`);
