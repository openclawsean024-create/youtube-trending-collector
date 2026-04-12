import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

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

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    thumbnails: { high?: { url: string }; medium?: { url: string } };
    categoryId: string;
    description: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
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

async function fetchVideoDetails(ids: string[]): Promise<YouTubeVideo[]> {
  if (!ids.length) return [];
  const results: YouTubeVideo[] = [];
  // Batch in groups of 50 (YouTube API limit)
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const params = new URLSearchParams({
      key: API_KEY!,
      part: "snippet,statistics,contentDetails",
      id: batch.join(","),
    });
    const res = await fetch(`${BASE_URL}/videos?${params}`);
    if (!res.ok) continue;
    const data = await res.json();
    results.push(...(data.items || []));
  }
  return results;
}

async function fetchTrendingVideos(region: string, category: string, pageToken?: string): Promise<{ items: YouTubeVideo[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    key: API_KEY!,
    part: "snippet,statistics",
    chart: "mostPopular",
    regionCode: region,
    maxResults: "20",
  });
  if (category) params.set("videoCategoryId", category);
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(`${BASE_URL}/videos?${params}`);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  const data = await res.json();
  return { items: data.items || [], nextPageToken: data.nextPageToken };
}

async function searchVideos(query: string, region: string, pageToken?: string): Promise<{ items: YouTubeVideo[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    key: API_KEY!,
    part: "snippet",
    type: "video",
    q: query,
    regionCode: region,
    maxResults: "20",
    relevanceLanguage: region === "TW" ? "zh" : "en",
  });
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(`${BASE_URL}/search?${params}`);
  if (!res.ok) throw new Error(`YouTube Search API error: ${res.status}`);
  const data = await res.json();

  // Fetch video details for statistics
  const videoIds = (data.items || []).map((item: { id: { videoId: string } }) => item.id.videoId).filter(Boolean);
  const details = await fetchVideoDetails(videoIds);

  return { items: details, nextPageToken: data.nextPageToken };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") || "TW";
  const category = searchParams.get("category") || "";
  const search = (searchParams.get("search") || "").trim();
  const pageToken = searchParams.get("pageToken") || undefined;

  const cacheKey = `trending:${region}:${category}:${search}:${pageToken || "first"}`;
  const cached = getCached<VideoItem[]>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  if (!API_KEY) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY not configured" }, { status: 500 });
  }

  try {
    let rawVideos: YouTubeVideo[] = [];
    let nextPageToken: string | undefined;

    if (search) {
      // Keyword search via YouTube Search API
      const result = await searchVideos(search, region, pageToken);
      rawVideos = result.items;
      nextPageToken = result.nextPageToken;
    } else {
      // Trending videos via mostPopular endpoint
      const result = await fetchTrendingVideos(region, category, pageToken);
      rawVideos = result.items;
      nextPageToken = result.nextPageToken;
    }

    // Build VideoItem array
    let videos: VideoItem[] = rawVideos.map((v, idx) => ({
      id: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      channelId: v.snippet.channelId,
      thumbnail: v.snippet.thumbnails.high?.url || v.snippet.thumbnails.medium?.url || "",
      views: v.statistics?.viewCount || "0",
      likes: v.statistics?.likeCount || "0",
      comments: v.statistics?.commentCount || "0",
      publishedAt: v.snippet.publishedAt,
      trendingRank: idx + 1,
      categoryId: v.snippet.categoryId,
      description: v.snippet.description,
    }));

    setCache(cacheKey, videos);

    return NextResponse.json(videos);
  } catch (err) {
    console.error("Trending API error:", err);
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}
