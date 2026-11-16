import type { APIRoute } from 'astro';
import { routes } from '../lib/routes.ts';

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://www.pathfinderlld.com');
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = routes
    .map(
      (r) =>
        `  <url>\n    <loc>${escapeXml(new URL(r.path, base).toString())}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority.toFixed(1)}</priority>\n  </url>`,
    )
    .join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
