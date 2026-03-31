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
    thumbnails: { high: { url: string } };
    categoryId: string;
    description: string;
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") || "TW";
  const category = searchParams.get("category") || "";
  const search = (searchParams.get("search") || "").toLowerCase();

  const cacheKey = `trending:${region}:${category}:${search}`;
  const cached = getCached<VideoItem[]>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  if (!API_KEY) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Fetch videos
    const fetchVideos = async (pageToken?: string): Promise<YouTubeVideo[]> => {
      const params = new URLSearchParams({
        key: API_KEY!,
        part: "snippet,statistics",
        chart: "mostPopular",
        regionCode: region,
        maxResults: "50",
      });
      if (category) params.set("videoCategoryId", category);
      if (pageToken) params.set("pageToken", pageToken);

      const res = await fetch(`${BASE_URL}/videos?${params}`);
      if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
      const data = await res.json();
      return data.items || [];
    };

    // Fetch up to 200 videos (4 pages)
    let allVideos: YouTubeVideo[] = [];
    let pageToken: string | undefined;
    for (let i = 0; i < 4; i++) {
      const items = await fetchVideos(pageToken);
      allVideos = allVideos.concat(items);
      const data = await fetch(`${BASE_URL}/videos?key=${API_KEY}&part=snippet,statistics&chart=mostPopular&regionCode=${region}${category ? `&videoCategoryId=${category}` : ""}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ""}`).then(r => r.json());
      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }

    // Build VideoItem array
    let videos: VideoItem[] = allVideos.map((v, idx) => ({
      id: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      channelId: v.snippet.channelId,
      thumbnail: v.snippet.thumbnails.high?.url || "",
      views: v.statistics?.viewCount || "0",
      likes: v.statistics?.likeCount || "0",
      comments: v.statistics?.commentCount || "0",
      publishedAt: v.snippet.publishedAt,
      trendingRank: idx + 1,
      categoryId: v.snippet.categoryId,
      description: v.snippet.description,
    }));

    // Text search filter
    if (search) {
      videos = videos.filter((v) => v.title.toLowerCase().includes(search));
    }

    setCache(cacheKey, videos);
    return NextResponse.json(videos);
  } catch (err) {
    console.error("Trending API error:", err);
    return NextResponse.json({ error: "Failed to fetch trending videos" }, { status: 500 });
  }
}
