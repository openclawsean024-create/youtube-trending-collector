import { NextRequest, NextResponse } from "next/server";

// In-memory cache with 5 min TTL
interface CacheEntry {
  data: unknown;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface VideoItem {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  thumbnail: string;
  views: string;
  likes: string;
  comments: string;
  publishedAt: string;
  trendingRank: number;
  categoryId: string;
  description: string;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

function extractVideoIds(html: string): string[] {
  const ids: string[] = [];
  // Match shortVideoRenderer or videoRenderer from trending page
  const re = /"videoId":"([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

function extractMetadata(html: string, ids: string[]): Map<string, { title: string; channel: string; channelId: string; thumbnail: string; views: string; publishedAt: string; description: string }> {
  const map = new Map();
  // Try to extract richMetadata from each video
  // Pattern: "videoId":"ID","title":{"simpleText":"TITLE...
  for (const id of ids) {
    // Find the block containing this videoId
    const blockRe = new RegExp(`"videoId":"${id}"[\\s\\S]*?(?="videoId"|$)`, 'g');
    const blockMatch = blockRe.exec(html);
    let title = "", channel = "", channelId = "", thumbnail = "", views = "", publishedAt = "", description = "";

    if (blockMatch) {
      const block = blockMatch[0];
      // Title: "title":{"simpleText":"..."} or "title":"..."
      const titleMatch = block.match(/"title":\s*\{?"simpleText":\s*"([^"]+)"/) || block.match(/"title":\s*"([^"]+)"/);
      if (titleMatch) title = titleMatch[1];

      // Channel: "ownerText":{"simpleText":"..."} or "longBylineText":...
      const channelMatch = block.match(/"(?:owner|longByline)Text":\s*\{?"simpleText":\s*"([^"]+)"/);
      if (channelMatch) channel = channelMatch[1];

      // Channel ID: "ownerVideoId" or "channelId"
      const channelIdMatch = block.match(/"(ownerVideoId|channelId)":\s*"([^"]+)"/);
      if (channelIdMatch) channelId = channelIdMatch[2];

      // Thumbnail: "thumbnails":[{"url":"..."
      const thumbMatch = block.match(/"thumbnails":\s*\[\{"url":\s*"([^"]+)"/);
      if (thumbMatch) thumbnail = thumbMatch[1];

      // Published time: "publishedTimeText":{"simpleText":"..."
      const pubMatch = block.match(/"publishedTimeText":\s*\{?"simpleText":\s*"([^"]+)"/);
      if (pubMatch) publishedAt = pubMatch[1];

      // View count: "viewCountText":{"simpleText":"..."} or "viewCountText":"..."
      const viewMatch = block.match(/"viewCountText":\s*\{?"simpleText":\s*"([^"]+)"/) || block.match(/"viewCountText":\s*"([^"]+)"/);
      if (viewMatch) views = viewMatch[1];

      // Description snippet
      const descMatch = block.match(/"descriptionSnippet":\s*\{?"simpleText":\s*"([^"]+)"/);
      if (descMatch) description = descMatch[1];
    }

    // Fallback: extract from ytInitialData JSON in script tags
    if (!title) {
      const titleAlt = html.match(new RegExp(`"videoId":"${id}"[\\s\\S]{0,500}"title":\\s*\\{?"simpleText":\\s*"([^"]+)"`));
      if (titleAlt) title = titleAlt[1];
    }
    if (!thumbnail) {
      thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }

    map.set(id, { title, channel, channelId, thumbnail, views, publishedAt, description });
  }
  return map;
}

async function scrapeTrendingPage(region: string, category: string): Promise<VideoItem[]> {
  // Build trending URL
  let url = `https://www.youtube.com/feed/trending?hl=${region === "TW" ? "zh-TW" : "en-US"}`;
  if (category) {
    // Map category id to URL param
    url += `&category=${category}`;
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Accept-Language": region === "TW" ? "zh-TW,zh;q=0.9" : "en-US;q=0.9",
    },
  });

  if (!res.ok) throw new Error(`YouTube trending scrape failed: ${res.status}`);

  const html = await res.text();

  // Extract video IDs from HTML
  const ids = extractVideoIds(html);
  
  // Deduplicate
  const uniqueIds = [...new Set(ids)].slice(0, 30);

  // Extract metadata
  const metaMap = extractMetadata(html, uniqueIds);

  // Build VideoItem array — for trending, rank is position
  const videos: VideoItem[] = uniqueIds.map((id, idx) => {
    const meta = metaMap.get(id) || { title: "", channel: "", channelId: "", thumbnail: "", views: "", publishedAt: "", description: "" };
    return {
      id,
      title: meta.title || `YouTube Video ${id}`,
      channel: meta.channel || "Unknown",
      channelId: meta.channelId || "",
      thumbnail: meta.thumbnail || `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      views: meta.views || "0",
      likes: "0",
      comments: "0",
      publishedAt: meta.publishedAt || "",
      trendingRank: idx + 1,
      categoryId: category,
      description: meta.description || "",
    };
  });

  return videos;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") || "TW";
  const category = searchParams.get("category") || "";
  const pageToken = searchParams.get("pageToken") || undefined;

  const cacheKey = `trending:${region}:${category}:${pageToken || "first"}`;
  const cached = getCached<VideoItem[]>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const videos = await scrapeTrendingPage(region, category);
    setCache(cacheKey, videos);
    return NextResponse.json(videos);
  } catch (err) {
    console.error("Trending scrape error:", err);
    return NextResponse.json({ error: "Failed to fetch trending videos" }, { status: 500 });
  }
}
