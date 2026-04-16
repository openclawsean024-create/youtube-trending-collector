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

// Parse view count string like "觀看次數：109,126次" → "109126"
function parseViewCount(text: string): string {
  if (!text) return "0";
  const cleaned = text.replace(/[^0-9,]/g, "").replace(/,/g, "");
  return cleaned || "0";
}

// Parse Chinese relative time like "13 小時前" → ISO date
function parseRelativeTime(text: string): string {
  if (!text) return new Date().toISOString();
  const match = text.match(/(\d+)\s*(秒|分|小時|天|月|年)前/);
  if (!match) return new Date().toISOString();
  const val = parseInt(match[1]);
  const unit = match[2];
  const now = new Date();
  if (unit === "秒") now.setSeconds(now.getSeconds() - val);
  else if (unit === "分") now.setMinutes(now.getMinutes() - val);
  else if (unit === "小時") now.setHours(now.getHours() - val);
  else if (unit === "天") now.setDate(now.getDate() - val);
  else if (unit === "月") now.setMonth(now.getMonth() - val);
  else if (unit === "年") now.setFullYear(now.getFullYear() - val);
  return now.toISOString();
}

interface ExtractedVideo {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  thumbnail: string;
  views: string;
  publishedAt: string;
  description: string;
}

// Extract JSON object from a JavaScript object literal using a simple brace-counting parser
function extractJsonObject(html: string, startMarker: string): string | null {
  const idx = html.indexOf(startMarker);
  if (idx === -1) return null;
  const start = idx + startMarker.length;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

async function scrapeYouTubeTrending(region: string, category: string): Promise<VideoItem[]> {
  const regionLang = region === "TW" ? "zh-TW" : region === "HK" ? "zh-HK" : region === "JP" ? "ja-JP" : region === "KR" ? "ko-KR" : "en-US";

  const categoryKeywords: Record<string, string> = {
    "10": "音樂",
    "20": "遊戲",
    "22": "戶外活動",
    "23": "喜劇",
    "24": "娛樂",
    "25": "新聞",
    "27": "寵物",
    "28": "科學科技",
    "17": "體育",
  };
  const searchQuery = category && categoryKeywords[category]
    ? encodeURIComponent(categoryKeywords[category])
    : "";

  const sp = "EgQIAhAB"; // This week filter
  const url = `https://www.youtube.com/results?sp=${sp}&search_query=${searchQuery}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": `${regionLang},zh;q=0.9,en;q=0.8`,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) throw new Error(`YouTube scrape failed: ${res.status}`);
  const html = await res.text();

  const jsonStr = extractJsonObject(html, "ytInitialData = ");
  if (!jsonStr) throw new Error("ytInitialData not found in page");

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error("Failed to parse ytInitialData JSON: " + err);
  }

  const videos: VideoItem[] = [];
  const seenIds = new Set<string>();

  try {
    const sections = (
      data.contents as Record<string, unknown>
    )?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    for (const section of sections as Array<Record<string, unknown>>) {
      if (!section.itemSectionRenderer) continue;
      const items = (section.itemSectionRenderer as Record<string, unknown>).contents || [];
      for (const item of items as Array<Record<string, unknown>>) {
        const v = item.videoRenderer as Record<string, unknown> | undefined;
        if (!v?.videoId) continue;
        const vid = v.videoId as string;
        if (seenIds.has(vid)) continue;
        seenIds.add(vid);

        const titleRuns = (v.title as Record<string, unknown>)?.runs as Array<Record<string, unknown>> || [];
        const title = (titleRuns[0]?.text as string) || "";
        const channelRuns = (v.longBylineText as Record<string, unknown>)?.runs as Array<Record<string, unknown>> || [];
        const channel = (channelRuns[0]?.text as string) || "";
        const channelNav = channelRuns[0]?.navigationEndpoint as Record<string, unknown>;
        const channelBrowse = channelNav?.browseEndpoint as Record<string, unknown>;
        const channelId = (channelBrowse?.browseId as string) || "";
        const viewText = (v.viewCountText as Record<string, unknown>)?.simpleText as string || "";
        const publishedText = (v.publishedTimeText as Record<string, unknown>)?.simpleText as string || "";
        const descRuns = (v.descriptionSnippet as Record<string, unknown>)?.runs as Array<Record<string, unknown>> || [];
        const description = descRuns.map((r) => r.text as string).join("");
        const thumbnails = (v.thumbnail as Record<string, unknown>)?.thumbnails as Array<Record<string, unknown>> || [];
        const thumb = (thumbnails[0]?.url as string) || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;

        videos.push({
          id: vid,
          title,
          channel,
          channelId,
          thumbnail: thumb,
          views: parseViewCount(viewText),
          likes: "0",
          comments: "0",
          publishedAt: parseRelativeTime(publishedText),
          trendingRank: videos.length + 1,
          categoryId: category || "",
          description,
        });

        if (videos.length >= 30) break;
      }
      if (videos.length >= 30) break;
    }
  } catch (err) {
    console.error("Error parsing ytInitialData:", err);
  }

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
    const videos = await scrapeYouTubeTrending(region, category);
    setCache(cacheKey, videos);
    return NextResponse.json(videos);
  } catch (err) {
    console.error("Trending scrape error:", err);
    return NextResponse.json({ error: "Failed to fetch trending videos" }, { status: 500 });
  }
}
