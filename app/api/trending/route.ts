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

async function scrapeYouTubeTrending(region: string, category: string): Promise<VideoItem[]> {
  // Build the YouTube search URL with "This week" filter
  // sp=EgQIAhAB = "This week" filter (trending videos)
  const regionLang = region === "TW" ? "zh-TW" : region === "HK" ? "zh-HK" : region === "JP" ? "ja-JP" : region === "KR" ? "ko-KR" : "en-US";
  
  // For category-specific trending, use category keyword search
  let searchQuery = "";
  const categoryKeywords: Record<string, string> = {
    "10": "音樂+热门+music+trending",
    "20": "游戏+gaming+trending",
    "22": "户外+outdoor+trending",
    "23": "喜剧+comedy+trending",
    "24": "娱乐+entertainment+trending",
    "25": "新闻+news+trending",
    "27": "宠物+animals+trending",
    "28": "科技+science+technology+trending",
    "17": "体育+sports+trending",
  };
  if (category && categoryKeywords[category]) {
    searchQuery = encodeURIComponent(categoryKeywords[category].split("+")[0]);
  }

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

  // Extract ytInitialData JSON from HTML
  const jsonMatch = html.match(/ytInitialData\s*=\s*({.*?});/s);
  if (!jsonMatch) throw new Error("ytInitialData not found in page");

  const data = JSON.parse(jsonMatch[1]);
  const videos: VideoItem[] = [];
  const seenIds = new Set<string>();

  try {
    const sections = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    for (const section of sections) {
      if (!section.itemSectionRenderer) continue;
      for (const item of section.itemSectionRenderer.contents) {
        const v = item.videoRenderer;
        if (!v?.videoId) continue;
        if (seenIds.has(v.videoId)) continue;
        seenIds.add(v.videoId);

        const titleRuns = v.title?.runs || [];
        const title = titleRuns[0]?.text || "";
        const channelRuns = v.longBylineText?.runs || [];
        const channel = channelRuns[0]?.text || "";
        const channelId = channelRuns[0]?.navigationEndpoint?.browseEndpoint?.browseId || "";
        const viewText = v.viewCountText?.simpleText || "";
        const publishedText = v.publishedTimeText?.simpleText || "";
        const descRuns = v.descriptionSnippet?.runs || [];
        const description = descRuns.map((r: { text: string }) => r.text).join("");
        const thumbnails = v.thumbnail?.thumbnails || [];
        const thumb = thumbnails[0]?.url || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`;

        videos.push({
          id: v.videoId,
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
