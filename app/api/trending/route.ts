import { NextRequest, NextResponse } from "next/server";
import { load } from "cheerio";

// In-memory cache with 10 min TTL
interface CacheEntry {
  data: unknown;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

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

interface VideoItem {
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

// Extract JSON from ytInitialData without using /s regex flag
function extractYtInitialData(html: string): any {
  const startMarker = "ytInitialData";
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return null;

  const braceIdx = html.indexOf("{", startIdx);
  if (braceIdx === -1) return null;

  let depth = 0;
  let endIdx = braceIdx;
  for (let i = braceIdx; i < html.length; i++) {
    const ch = html[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }

  const jsonStr = html.slice(braceIdx, endIdx);
  return JSON.parse(jsonStr);
}

// Region → YouTube trending URL mapping
function getTrendingUrl(region: string, category: string): string {
  const regionMap: Record<string, string> = {
    TW: "TW",
    US: "US",
    JP: "JP",
    KR: "KR",
    HK: "HK",
  };
  const r = regionMap[region] || "TW";

  const categoryMap: Record<string, string> = {
    "10": "Gaming",
    "20": "Gaming",
    "22": "Sports",
    "23": "Comedy",
    "24": "Entertainment",
    "25": "News",
    "27": "Pets",
    "28": "ScienceTech",
    "17": "Sports",
    "19": "Film",
    "43": "Shows",
  };

  let url = `https://www.youtube.com/${r}/feed/trending`;
  if (category && categoryMap[category]) {
    url += `?hl=${categoryMap[category]}`;
  }
  return url;
}

async function scrapeTrendingVideos(region: string, category: string): Promise<VideoItem[]> {
  const url = getTrendingUrl(region, category);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch trending page: ${response.status}`);
  }

  const html = await response.text();

  const data = extractYtInitialData(html);
  if (!data) {
    throw new Error("Could not find ytInitialData in page");
  }

  const videos: VideoItem[] = [];

  // Navigate the YouTube DOM structure
  const sectionLists = data.contents?.twoColumnBrowseResultsRenderer?.tabs;
  if (!sectionLists) {
    throw new Error("Invalid YouTube data structure");
  }

  // Find the "Trending" tab
  let trendingTab = sectionLists.find((tab: any) =>
    (tab.tabRenderer?.title || "").toLowerCase().includes("trending") ||
    tab.tabRenderer?.title === "熱門"
  );

  if (!trendingTab) trendingTab = sectionLists[0];

  const tabContent = trendingTab?.tabRenderer?.content?.sectionListRenderer?.contents || [];

  for (const section of tabContent) {
    const shelfRenderer =
      section.shelfRenderer ||
      section.itemSectionRenderer?.contents?.[0]?.shelfRenderer;
    if (!shelfRenderer) continue;

    const shelfItems =
      shelfRenderer.content?.horizontalListRenderer?.items ||
      shelfRenderer.content?.expandedShelfContentsRenderer?.items ||
      [];

    for (const shelfItem of shelfItems) {
      const item =
        shelfItem.richItemRenderer?.content?.videoRenderer ||
        shelfItem.videoRenderer;
      if (!item || !item.videoId) continue;

      const title =
        item.title?.runs?.[0]?.text || item.title?.simpleText || "";
      const channel =
        item.shortBylineText?.runs?.[0]?.text ||
        item.longBylineText?.runs?.[0]?.text ||
        "";
      const channelId =
        item.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || "";

      let thumbnail =
        item.thumbnail?.thumbnails?.find((t: any) => t.url?.includes("ytimg"))?.url ||
        item.thumbnail?.thumbnails?.[0]?.url ||
        "";
      if (thumbnail.startsWith("//")) thumbnail = "https:" + thumbnail;

      const viewText =
        item.viewCountText?.simpleText ||
        item.metadataRowRenderer?.text?.simpleText ||
        "";

      videos.push({
        id: item.videoId,
        title,
        channel,
        channelId,
        thumbnail,
        views: viewText.replace(/[^0-9KM億萬]/g, "") || "0",
        likes: "0",
        comments: item.commentCountText?.simpleText || "0",
        publishedAt: new Date().toISOString(),
        trendingRank: videos.length + 1,
        categoryId: category,
        description: item.descriptionText?.runs?.map((r: any) => r.text).join("") || "",
      });
    }
  }

  return videos;
}

// Search via YouTube search page scraping
async function scrapeSearchVideos(query: string, region: string): Promise<VideoItem[]> {
  const lang = region === "TW" ? "zh-TW" : "en";
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=${lang}&gl=${region}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": `${lang},en;q=0.9`,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Search fetch failed: ${response.status}`);
  }

  const html = await response.text();

  const data = extractYtInitialData(html);
  if (!data) {
    throw new Error("Could not find ytInitialData in search page");
  }

  const videos: VideoItem[] = [];

  const items =
    data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

  for (const section of items) {
    const videoRendererArr = section.itemSectionRenderer?.contents || [];
    for (const content of videoRendererArr) {
      const v = content.videoRenderer;
      if (!v || !v.videoId) continue;

      let thumbnail =
        (v.thumbnail?.thumbnails?.[0]?.url || "").replace(/^\/\//, "https://");

      videos.push({
        id: v.videoId,
        title: v.title?.runs?.[0]?.text || v.title?.simpleText || "",
        channel: v.shortBylineText?.runs?.[0]?.text || "",
        channelId:
          v.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || "",
        thumbnail,
        views: (v.viewCountText?.simpleText || "").replace(/[^0-9KM億萬]/g, "") || "0",
        likes: "0",
        comments: v.commentCountText?.simpleText || "0",
        publishedAt: new Date().toISOString(),
        trendingRank: videos.length + 1,
        categoryId: "",
        description: "",
      });

      if (videos.length >= 20) break;
    }
    if (videos.length >= 20) break;
  }

  return videos;
}

function getSampleVideos(): VideoItem[] {
  return [
    {
      id: "dQw4w9WgXcQ",
      title: "【範例】點擊播放按鈕觀看此影片",
      channel: "YouTube",
      channelId: "UC",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      views: "1.2M",
      likes: "45K",
      comments: "3.2K",
      publishedAt: new Date().toISOString(),
      trendingRank: 1,
      categoryId: "",
      description:
        "YouTube 熱門蒐集器已啟動！點擊任一影片的播放按鈕即可在頁面內觀看。",
    },
    {
      id: "jNQXAC9IVRw",
      title: "Sample Video - No API Key Required",
      channel: "Demo Channel",
      channelId: "UCdemo",
      thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/mqdefault.jpg",
      views: "890K",
      likes: "32K",
      comments: "1.5K",
      publishedAt: new Date().toISOString(),
      trendingRank: 2,
      categoryId: "",
      description: "本專案使用網頁爬蟲方式取得 YouTube 熱門影片，無需 API Key。",
    },
  ];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") || "TW";
  const category = searchParams.get("category") || "";
  const search = (searchParams.get("search") || "").trim();

  const cacheKey = `scrape:${region}:${category}:${search}`;
  const cached = getCached<VideoItem[]>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    let videos: VideoItem[];

    if (search) {
      videos = await scrapeSearchVideos(search, region);
    } else {
      videos = await scrapeTrendingVideos(region, category);
    }

    if (videos.length === 0) {
      videos = getSampleVideos();
    }

    setCache(cacheKey, videos);
    return NextResponse.json(videos);
  } catch (err) {
    console.error("Scraper error:", err);
    // Fallback: return sample data so UI still works
    return NextResponse.json(getSampleVideos());
  }
}
