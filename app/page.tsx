"use client";

import { useState, useEffect, useCallback } from "react";

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

type SortKey = "trendingRank" | "views" | "likes" | "publishedAt";
type SortDir = "asc" | "desc";

const REGIONS = [
  { code: "TW", label: "🇹🇼 台灣" },
  { code: "US", label: "🇺🇸 美國" },
  { code: "JP", label: "🇯🇵 日本" },
  { code: "KR", label: "🇰🇷 韓國" },
  { code: "GB", label: "🇬🇧 英國" },
  { code: "DE", label: "🇩🇪 德國" },
  { code: "FR", label: "🇫🇷 法國" },
  { code: "BR", label: "🇧🇷 巴西" },
  { code: "IN", label: "🇮🇳 印度" },
];

const CATEGORIES = [
  { id: "", label: "全部類別" },
  { id: "10", label: "🎵 音樂" },
  { id: "20", label: "🎮 遊戲" },
  { id: "22", label: "🏌️ 戶外活動" },
  { id: "23", label: "🎬 喜劇" },
  { id: "24", label: "🎬 娛樂" },
  { id: "25", label: "📺 新聞" },
  { id: "27", label: "🦸 寵物" },
  { id: "28", label: "🔧 科學科技" },
  { id: "29", label: "🎙️ 非營利" },
  { id: "17", label: "⚽ 體育" },
];

function formatNum(n: string) {
  const num = Number(n);
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${mo}/${day} ${h}:${mi}`;
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小時前`;
  return `${Math.floor(diff / 86400)}天前`;
}

export default function HomePage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState("TW");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("trendingRank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [discordUrl, setDiscordUrl] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load defaults from /api/config on mount
  useEffect(() => {
    if (settingsLoaded) return;
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: { discordWebhook?: string; defaultRegion?: string; defaultCategory?: string }) => {
        if (data.discordWebhook) setDiscordUrl(data.discordWebhook);
        if (data.defaultRegion) setRegion(data.defaultRegion);
        if (data.defaultCategory !== undefined) setCategory(data.defaultCategory);
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, [settingsLoaded]);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ region });
      if (category) params.set("category", category);
      if (search) params.set("search", search);
      const res = await fetch(`/api/trending?${params}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [region, category, search]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const sortedVideos = [...videos].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;
    if (sortKey === "trendingRank") { aVal = a.trendingRank; bVal = b.trendingRank; }
    else if (sortKey === "views") { aVal = Number(a.views); bVal = Number(b.views); }
    else if (sortKey === "likes") { aVal = Number(a.likes); bVal = Number(b.likes); }
    else { aVal = new Date(a.publishedAt).getTime(); bVal = new Date(b.publishedAt).getTime(); }
    return sortDir === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const downloadFile = async (format: "csv" | "xlsx") => {
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videos: sortedVideos, format }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trending-videos.${format === "xlsx" ? "xlsx" : "csv"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendDiscord = async () => {
    if (!discordUrl) { setNotifyMsg("⚠️ 請輸入 Discord Webhook URL"); return; }
    setNotifyLoading(true);
    setNotifyMsg("");
    try {
      const res = await fetch("/api/discord-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: discordUrl, videos: sortedVideos }),
      });
      const data = await res.json();
      if (res.ok) setNotifyMsg(`✅ 已發送 ${data.notified} 部影片到 Discord！`);
      else setNotifyMsg(`⚠️ ${data.error}`);
    } catch {
      setNotifyMsg("⚠️ 發送失敗");
    } finally {
      setNotifyLoading(false);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#FF0000">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <h1 className="text-xl font-bold tracking-tight flex-1">
              YouTube <span className="text-red-600">熱門蒐集器</span>
            </h1>
            <a
              href="/settings"
              className="text-zinc-400 hover:text-zinc-200 text-sm transition-colors border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-1.5"
            >
              ⚙️ 設定
            </a>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">地區</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 cursor-pointer"
              >
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">分類</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-zinc-400 mb-1">搜尋標題</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜尋影片標題..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 placeholder-zinc-500"
              />
            </div>
            <button
              onClick={fetchVideos}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {loading ? "載入中..." : "🔄 更新"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span>共 <span className="text-zinc-100 font-medium">{sortedVideos.length}</span> 部影片</span>
            <span>·</span>
            <span>{REGIONS.find((r) => r.code === region)?.label}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSort("trendingRank")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${sortKey === "trendingRank" ? "border-red-500 text-red-400" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
            >
              熱門排名<SortIcon col="trendingRank" />
            </button>
            <button
              onClick={() => handleSort("views")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${sortKey === "views" ? "border-red-500 text-red-400" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
            >
              觀看次數<SortIcon col="views" />
            </button>
            <button
              onClick={() => handleSort("likes")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${sortKey === "likes" ? "border-red-500 text-red-400" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
            >
              喜歡數<SortIcon col="likes" />
            </button>
            <button
              onClick={() => handleSort("publishedAt")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${sortKey === "publishedAt" ? "border-red-500 text-red-400" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
            >
              發布時間<SortIcon col="publishedAt" />
            </button>
          </div>
        </div>

        {/* Video Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-zinc-400 text-sm">載入 YouTube 熱門中...</span>
            </div>
          </div>
        ) : sortedVideos.length === 0 ? (
          <div className="text-center py-24 text-zinc-500">
            <p className="text-4xl mb-3">📭</p>
            <p>找不到熱門影片，請確認 YOUTUBE_API_KEY 已設定</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedVideos.map((video) => (
              <a
                key={video.id}
                href={`https://youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-black/50"
              >
                {/* Thumbnail */}
                <div className="relative">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full aspect-video object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9' fill='%23333'><rect width='16' height='9' fill='%23333'/></svg>"; }}
                  />
                  <span className="absolute top-2 left-2 bg-black/80 text-white text-xs font-bold px-2 py-0.5 rounded">
                    #{video.trendingRank}
                  </span>
                </div>
                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-zinc-100 line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 truncate">{video.channel}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                    <span>👁️ {formatNum(video.views)}</span>
                    <span>👍 {formatNum(video.likes)}</span>
                    <span>💬 {formatNum(video.comments)}</span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">
                    {timeAgo(video.publishedAt)} · {formatDateTime(video.publishedAt)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Export & Discord section */}
        {!loading && sortedVideos.length > 0 && (
          <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-base font-semibold mb-4 text-zinc-200">📤 匯出 & 通知</h2>
            <div className="flex flex-wrap gap-3 items-end">
              <button
                onClick={() => downloadFile("csv")}
                className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-lg px-4 py-2 text-sm transition-colors"
              >
                📄 下載 CSV
              </button>
              <button
                onClick={() => downloadFile("xlsx")}
                className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-lg px-4 py-2 text-sm transition-colors"
              >
                📊 下載 Excel
              </button>
              <div className="flex-1 min-w-60">
                <input
                  type="url"
                  value={discordUrl}
                  onChange={(e) => setDiscordUrl(e.target.value)}
                  placeholder="Discord Webhook URL"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 placeholder-zinc-500"
                />
              </div>
              <button
                onClick={sendDiscord}
                disabled={notifyLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm transition-colors"
              >
                {notifyLoading ? "傳送中..." : "📨 發送到 Discord"}
              </button>
            </div>
            {notifyMsg && (
              <p className={`mt-3 text-sm ${notifyMsg.startsWith("✅") ? "text-green-400" : "text-yellow-400"}`}>
                {notifyMsg}
              </p>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-zinc-600">
          YouTube Trending Collector · 使用 YouTube Data API v3
        </div>
      </footer>
    </div>
  );
}
