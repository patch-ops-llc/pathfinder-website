// Production server. Serves the prebuilt static site from dist/client with
// long-lived caching and precompressed assets, and hands /api/* to the Astro
// request handler. No framework and no runtime dependencies beyond the build
// output, so it runs anywhere Node 22 does (Railway, Docker, a plain VM).

import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const CLIENT_DIR = join(ROOT, 'dist', 'client');
const SERVER_ENTRY = join(ROOT, 'dist', 'server', 'entry.mjs');

if (process.env.NODE_ENV !== 'production' || process.env.LOAD_DOTENV) {
  try {
    if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));
  } catch {
    /* ignore a malformed .env */
  }
}

if (!existsSync(CLIENT_DIR) || !existsSync(SERVER_ENTRY)) {
  console.error('Build output not found. Run "npm run build" first.');
  process.exit(1);
}

const PORT = Number.parseInt(process.env.PORT ?? '', 10) || 4321;
const HOST = process.env.HOST || '0.0.0.0';
const IS_PROD = process.env.NODE_ENV === 'production';
const CANONICAL_HOST = (process.env.CANONICAL_HOST || '').toLowerCase();
const FORCE_HTTPS = IS_PROD && !/^(0|false|no|off)$/i.test(process.env.FORCE_HTTPS ?? '');
const MAX_BODY_BYTES = 24 * 1024 * 1024;

const { handler: astroHandler } = await import(SERVER_ENTRY);

// ---------------------------------------------------------------------------
// Static file index, built once at startup.

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
};

/** @type {Map<string, { file: string, size: number, type: string, etag: string, br?: string, gz?: string, brSize?: number, gzSize?: number }>} */
const files = new Map();

(function index(dir, prefix) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      index(full, `${prefix}${entry.name}/`);
      continue;
    }
    if (entry.name.endsWith('.br') || entry.name.endsWith('.gz')) continue;
    const stat = statSync(full);
    const record = {
      file: full,
      size: stat.size,
      type: TYPES[extname(entry.name).toLowerCase()] ?? 'application/octet-stream',
      etag: `"${stat.size.toString(36)}-${Math.floor(stat.mtimeMs).toString(36)}"`,
    };
    for (const [ext, key] of [
      ['.br', 'br'],
      ['.gz', 'gz'],
    ]) {
      if (existsSync(full + ext)) {
        record[key] = full + ext;
        record[`${key}Size`] = statSync(full + ext).size;
      }
    }
    files.set(`/${prefix}${entry.name}`, record);
  }
})(CLIENT_DIR, '');

// ---------------------------------------------------------------------------
// Security headers. Inline scripts are allowed by hash only; the hashes are
// collected from the built pages by scripts/postbuild.mjs.

let scriptHashes = [];
try {
  scriptHashes = JSON.parse(readFileSync(join(ROOT, 'dist', 'csp-hashes.json'), 'utf8'));
} catch {
  console.warn('[server] dist/csp-hashes.json missing; inline scripts will be blocked. Run "npm run build".');
}
const turnstile = process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY ? ' https://challenges.cloudflare.com' : '';
const CSP = [
  "default-src 'self'",
  `script-src 'self'${scriptHashes.map((h) => ` '${h}'`).join('')}${turnstile}`,
  // Astro inlines the page stylesheet and components set CSS variables through style attributes.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self'",
  "connect-src 'self'",
  `frame-src${turnstile || " 'none'"}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(IS_PROD ? ['upgrade-insecure-requests'] : []),
].join('; ');

function setSecurityHeaders(res, isHtml) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  if (IS_PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (isHtml) res.setHeader('Content-Security-Policy', CSP);
}

// ---------------------------------------------------------------------------
// Redirects carried over from the previous site (all permanent).

const REDIRECTS = new Map(
  Object.entries({
    '/preview/': '/',
    '/trainer/': '/',
    '/dashboard/': '/',
    '/home/': '/',
    '/index.html': '/',
    '/feed/': '/',
    '/start-a-quote.html': '/get-a-quote/',
    '/phone/start-a-quote.html': '/get-a-quote/',
    '/remote-desktop-access.html': '/remote-desktop-access/',
    '/make-a-payment.html': '/make-a-payment/',
    '/phone/make-a-payment.html': '/make-a-payment/',
    '/auto-quote.html': '/auto-quote/',
    '/phone/': '/',
    '/phone/index.html': '/',
    '/phone/energy.html': '/energy-insurance/',
    '/phone/real-estate.html': '/real-estate-insurance/',
    '/phone/contractors.html': '/contractors-insurance/',
    '/phone/professional-services.html': '/professional-services-insurance/',
    '/phone/non-profits.html': '/non-profit-insurance/',
    '/phone/high-value-personal.html': '/home-and-auto-insurance/',
    '/phone/collections.html': '/collections-insurance/',
    '/phone/transportation.html': '/businesses/',
    '/schlumberger/': '/resources/',
    '/wp-sitemap.xml': '/sitemap.xml',
    '/sitemap-index.xml': '/sitemap.xml',
    '/sitemap_index.xml': '/sitemap.xml',
    '/thank-you/': '/',
    '/home-quote/': '/home-insurance-quote/',
    '/quote/': '/get-a-quote/',
    '/team/': '/our-team/',
    '/contact-us/': '/contact/',
  }),
);

function redirect(res, location, status = 301) {
  setSecurityHeaders(res, false);
  res.writeHead(status, { Location: location, 'Cache-Control': status === 301 ? 'public, max-age=3600' : 'no-store', 'Content-Length': '0' });
  res.end();
}

// ---------------------------------------------------------------------------
// Static responses.

function cacheControl(pathname, type) {
  if (pathname.startsWith('/_astro/')) return 'public, max-age=31536000, immutable';
  if (type.startsWith('text/html')) return 'public, max-age=0, must-revalidate';
  if (pathname.startsWith('/media/') || type.startsWith('image/') || type.startsWith('font/')) return 'public, max-age=604800, stale-while-revalidate=86400';
  return 'public, max-age=3600';
}

function sendFile(req, res, pathname, record, status = 200) {
  const isHtml = record.type.startsWith('text/html');
  setSecurityHeaders(res, isHtml);
  res.setHeader('Content-Type', record.type);
  res.setHeader('Cache-Control', status === 404 ? 'no-store' : cacheControl(pathname, record.type));
  res.setHeader('ETag', record.etag);

  if (status === 200 && req.headers['if-none-match'] === record.etag) {
    res.writeHead(304);
    return res.end();
  }

  const accept = String(req.headers['accept-encoding'] ?? '');
  let file = record.file;
  let size = record.size;
  if (record.br || record.gz) {
    res.setHeader('Vary', 'Accept-Encoding');
    if (record.br && /\bbr\b/.test(accept)) {
      file = record.br;
      size = record.brSize;
      res.setHeader('Content-Encoding', 'br');
    } else if (record.gz && /\bgzip\b/.test(accept)) {
      file = record.gz;
      size = record.gzSize;
      res.setHeader('Content-Encoding', 'gzip');
    }
  }

  // Byte ranges, needed for video seeking. Only offered for uncompressed files.
  let start = 0;
  let end = size - 1;
  if (file === record.file) {
    res.setHeader('Accept-Ranges', 'bytes');
    const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ''));
    if (range && status === 200 && (range[1] !== '' || range[2] !== '')) {
      if (range[1] === '') {
        start = Math.max(0, size - Number(range[2]));
      } else {
        start = Number(range[1]);
        if (range[2] !== '') end = Math.min(end, Number(range[2]));
      }
      if (start > end || start >= size) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` });
        return res.end();
      }
      status = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    }
  }

  res.setHeader('Content-Length', String(end - start + 1));
  res.writeHead(status);
  if (req.method === 'HEAD') return res.end();
  const stream = createReadStream(file, { start, end });
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}

function notFound(req, res) {
  const page = files.get('/404.html');
  if (page) return sendFile(req, res, '/404.html', page, 404);
  setSecurityHeaders(res, false);
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end('Not found');
}

function plain(res, status, body, headers = {}) {
  setSecurityHeaders(res, false);
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

// ---------------------------------------------------------------------------
// Request handling.

function handle(req, res) {
  let url;
  try {
    url = new URL(req.url ?? '/', 'http://localhost');
  } catch {
    return plain(res, 400, 'Bad request');
  }
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return plain(res, 400, 'Bad request');
  }
  if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').includes('..')) return plain(res, 400, 'Bad request');
  pathname = pathname.replace(/\/{2,}/g, '/');

  // Health checks are answered before any redirect so platform probes over
  // plain HTTP on an internal host name always succeed.
  const isHealth = pathname === '/api/health' || pathname === '/api/health/' || pathname === '/healthz';

  if (!isHealth) {
    const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '')
      .split(',')[0]
      .trim()
      .toLowerCase();
    const proto = String(req.headers['x-forwarded-proto'] ?? '')
      .split(',')[0]
      .trim();
    const wrongHost = CANONICAL_HOST && host && host !== CANONICAL_HOST && host.replace(/^www\./, '') === CANONICAL_HOST.replace(/^www\./, '');
    if (wrongHost || (FORCE_HTTPS && proto === 'http')) {
      return redirect(res, `https://${wrongHost ? CANONICAL_HOST : host}${url.pathname}${url.search}`);
    }
  }

  if (pathname.startsWith('/api/')) {
    if (!pathname.endsWith('/')) {
      // The site uses trailing slashes; rewrite rather than redirect so POST bodies survive.
      req.url = `${url.pathname}/${url.search}`;
    }
    const length = Number(req.headers['content-length'] ?? 0);
    if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
      res.setHeader('Connection', 'close');
      setSecurityHeaders(res, false);
      res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, message: 'Your attachments are too large. Attachments are limited to 20 MB in total.' }));
    }
    setSecurityHeaders(res, false);
    res.setHeader('X-Robots-Tag', 'noindex');
    return astroHandler(req, res, () => {
      if (isHealth) return plain(res, 200, 'ok');
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: false, message: 'Not found.' }));
    });
  }
  if (pathname === '/healthz') return plain(res, 200, 'ok');

  if (req.method !== 'GET' && req.method !== 'HEAD') return plain(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });

  const target = REDIRECTS.get(pathname) ?? REDIRECTS.get(`${pathname}/`);
  if (target) return redirect(res, target + url.search);

  const exact = files.get(pathname);
  if (exact && !pathname.endsWith('/index.html')) return sendFile(req, res, pathname, exact);

  if (pathname.endsWith('/')) {
    const page = files.get(`${pathname}index.html`);
    if (page) return sendFile(req, res, pathname, page);
  } else if (files.has(`${pathname}/index.html`)) {
    return redirect(res, `${url.pathname}/${url.search}`);
  } else if (pathname.endsWith('/index.html') && exact) {
    return redirect(res, url.pathname.slice(0, -'index.html'.length) + url.search);
  }

  return notFound(req, res);
}

const server = createServer((req, res) => {
  try {
    handle(req, res);
  } catch (err) {
    console.error(`[server] unhandled error type=${err instanceof Error ? err.name : 'unknown'}`);
    if (!res.headersSent) plain(res, 500, 'Internal server error');
    else res.destroy();
  }
});

server.requestTimeout = 120_000;
server.headersTimeout = 30_000;
server.keepAliveTimeout = 65_000;

server.listen(PORT, HOST, () => {
  const digest = createHash('sha256').update([...files.keys()].join('\n')).digest('hex').slice(0, 8);
  console.log(`[server] listening on http://${HOST}:${PORT} (${files.size} static files, build ${digest}, ${IS_PROD ? 'production' : 'development'} mode)`);
  // Warm the request handler so configuration warnings appear in the startup log.
  fetch(`http://127.0.0.1:${PORT}/api/health/`).catch(() => {});
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10_000).unref();
  });
}
