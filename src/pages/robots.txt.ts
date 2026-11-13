import type { APIRoute } from 'astro';

// Search and answer-engine crawlers are welcome everywhere except the form
// API and the staff help page.
const AI_AGENTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Amazonbot', 'meta-externalagent', 'Bytespider', 'DuckAssistBot', 'MistralAI-User'];

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://www.pathfinderlld.com');
  const rules = ['Allow: /', 'Disallow: /api/', 'Disallow: /remote-desktop-access/'];
  const body = [
    'User-agent: *',
    ...rules,
    '',
    ...AI_AGENTS.map((a) => `User-agent: ${a}`),
    ...rules,
    '',
    `Sitemap: ${new URL('/sitemap.xml', base).toString()}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
