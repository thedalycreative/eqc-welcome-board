import Parser from 'rss-parser';

/**
 * RSS aggregator serverless function.
 *
 * POST /api/rss
 * Body: { urls: [{ label: string, url: string }] }
 * Returns: { items: [{ source, title, link, pubDate }] }
 *
 * Fetches each feed in parallel, parses with rss-parser, returns the
 * combined list sorted by pubDate desc, capped at 50 items.
 *
 * This is a Vercel serverless function (Node runtime). The client polls
 * it on a configurable interval and broadcasts to subscribers via the
 * useRssTicker hook.
 */

interface FeedSource {
  label: string;
  url: string;
}

interface TickerItem {
  source: string;
  title: string;
  link: string;
  pubDate: string;
}

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'campus-lobby-rss/1.0' },
});

export default async function handler(req: any, res: any) {
  // CORS so the client can call this from any origin (Vercel + dev)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const sources: FeedSource[] = body?.urls || [];

  if (!Array.isArray(sources) || sources.length === 0) {
    return res.status(200).json({ items: [] });
  }

  const results = await Promise.allSettled(
    sources.map(async (s) => {
      const feed = await parser.parseURL(s.url);
      return (feed.items || []).slice(0, 10).map((item: any) => ({
        source: s.label || feed.title || 'Source',
        title: (item.title || '').trim(),
        link: item.link || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
      })) as TickerItem[];
    })
  );

  const items: TickerItem[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      items.push(...result.value);
    }
  }

  items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  // Cache at the edge for 5 minutes to keep upstream feeds happy.
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).json({ items: items.slice(0, 50) });
}
