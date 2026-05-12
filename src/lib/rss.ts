import { useEffect, useState } from 'react';
import { useRssFeeds, useGlobalSettings } from './hooks';

export interface RssTickerItem {
  source: string;
  title: string;
  link: string;
  pubDate: string;
}

/**
 * Hook: fetches headlines from /api/rss using active feeds from Firestore.
 * Re-fetches on settings.rssRefreshIntervalMin schedule.
 */
export function useRssTicker(limit: number = 50): RssTickerItem[] {
  const feeds = useRssFeeds();
  const [settings] = useGlobalSettings();
  const [items, setItems] = useState<RssTickerItem[]>([]);

  useEffect(() => {
    if (!settings.rssEnabled) {
      setItems([]);
      return;
    }
    const activeFeeds = feeds.filter(f => f.active);
    if (activeFeeds.length === 0) {
      setItems([]);
      return;
    }

    let cancelled = false;

    const fetchRss = async () => {
      try {
        const res = await fetch('/api/rss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            urls: activeFeeds.map(f => ({ label: f.label, url: f.url })),
          }),
        });
        if (!res.ok) {
          console.error('RSS fetch failed:', res.status);
          return;
        }
        const data = await res.json();
        if (!cancelled && Array.isArray(data.items)) {
          setItems(data.items.slice(0, limit));
        }
      } catch (err) {
        console.error('RSS fetch error:', err);
      }
    };

    fetchRss();
    const intervalMs = Math.max(1, settings.rssRefreshIntervalMin) * 60_000;
    const id = setInterval(fetchRss, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [feeds, settings.rssEnabled, settings.rssRefreshIntervalMin, limit]);

  return items;
}
