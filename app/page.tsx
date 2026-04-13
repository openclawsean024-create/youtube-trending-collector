"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
  { code: "TW", label: "台灣" },
  { code: "US", label: "美國" },
  { code: "JP", label: "日本" },
  { code: "KR", label: "南韓" },
  { code: "HK", label: "香港" },
];

const CATEGORIES = [
  { id: "", label: "所有類別" },
  { id: "10", label: "音樂" },
  { id: "20", label: "遊戲" },
  { id: "22", label: "戶外活動" },
  { id: "23", label: "喜劇" },
  { id: "24", label: "娛樂" },
  { id: "25", label: "新聞" },
  { id: "27", label: "寵物與動物" },
  { id: "28", label: "科學與技術" },
  { id: "17", label: "體育" },
  { id: "19", label: "電影與動畫" },
  { id: "43", label: "節目" },
];

function formatViews(n: string) {
  const num = Number(n);
  if (isNaN(num)) return "0";
  if (num >= 10_000_000) return (num / 10_000_000).toFixed(1) + "億次觀看";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M次觀看";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K次觀看";
  return num.toLocaleString() + "次觀看";
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff} 秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} 個月前`;
  return `${Math.floor(diff / 31536000)} 年前`;
}

function SkeletonCard() {
  return (
    <div className="bg-[#1F2937] rounded-xl overflow-hidden border border-[#374151]">
      <div className="skeleton w-full aspect-video bg-[#374151]" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-4 bg-[#374151] rounded w-3/4" />
        <div className="skeleton h-3 bg-[#374151] rounded w-1/2" />
        <div className="skeleton h-3 bg-[#374151] rounded w-2/3" />
      </div>
    </div>
  );
}

function VideoCard({ video, index }: { video: VideoItem; index: number }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`https://youtube.com/watch?v=${video.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group">
      {/* Thumbnail */}
      <div className="relative">
        <a
          href={`https://youtube.com/watch?v=${video.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full aspect-video object-cover rounded-xl bg-[#374151] group-hover:rounded-none transition-all duration-200"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9' fill='%23374151'%3E%3Crect width='16' height='9' fill='%23374151'/%3E%3C/svg%3E";
            }}
          />
        </a>
        <span className="absolute bottom-1.5 right-1.5 bg-[#0F172A] text-[#F9FAFB] text-xs px-1.5 py-0.5 rounded font-medium">
          #{index + 1}
        </span>
      </div>

      {/* Info */}
      <div className="flex gap-2 mt-2 px-1">
        <div className="flex-1 min-w-0">
          <a
            href={`https://youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <h3 className="text-sm font-medium text-[#F9FAFB] leading-snug line-clamp-2 group-hover:text-[#FF0000] transition-colors">
              {video.title}
            </h3>
          </a>
          <p className="text-xs text-[#9CA3AF] mt-1 truncate">{video.channel}</p>
          <p className="text-xs text-[#9CA3AF]">
            {formatViews(video.views)} · {timeAgo(video.publishedAt)}
          </p>

          {/* Expandable description */}
          {expanded && video.description && (
            <p className="text-xs text-[#9CA3AF] mt-2 leading-relaxed border-t border-[#374151] pt-2">
              {video.description.slice(0, 300)}
              {video.description.length > 300 ? "..." : ""}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleCopyLink}
              className="text-xs text-[#9CA3AF] hover:text-[#FF0000] transition-colors flex items-center gap-1"
            >
              {copied ? "✅ 已複製" : "🔗 複製連結"}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-[#9CA3AF] hover:text-[#FF0000] transition-colors"
            >
              {expanded ? "▲ 收起" : "▼ 詳情"}
            </button>
            <a
              href={`https://youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#9CA3AF] hover:text-[#FF0000] transition-colors flex items-center gap-1 ml-auto"
            >
              ▶ YouTube
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type === "success" ? "bg-[#0F172A]" : "bg-red-600"} toast-enter`}>
      {message}
    </div>
  );
}

const HomeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);
const TrendingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.55 11.2c-.23-.3-.5-.56-.76-.82-.65-.6-1.4-1.03-2.03-1.66-1.46-1.46-1.78-3.87-.85-5.72-.9.23-1.75.75-2.45 1.32C8.9 6.4 7.9 10.07 9.1 13.22c.04.1.08.2.08.33 0 .22-.15.42-.35.5-.22.1-.46.04-.64-.12-.06-.05-.1-.1-.15-.17-1.1-1.43-1.28-3.48-.53-5.12C5.89 10 5 12.3 5.14 14.47c.04.5.1 1 .27 1.5.14.6.4 1.2.72 1.73 1.04 1.73 2.87 2.97 4.84 3.22 2.1.27 4.35-.12 5.96-1.6 1.8-1.66 2.45-4.32 1.5-6.6l-.13-.26c-.2-.46-.47-.87-.8-1.25z" />
  </svg>
);
const SettingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.37 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
  </svg>
);

export default function HomePage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("TW");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("trendingRank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load settings from localStorage first, then from /api/config
  useEffect(() => {
    try {
      const stored = localStorage.getItem("youtube-trending-settings");
      if (stored) {
        const saved = JSON.parse(stored);
        if (saved.region) setRegion(saved.region);
        if (saved.category !== undefined) setCategory(saved.category);
      }
    } catch {}
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: {
        defaultRegion?: string;
        defaultCategory?: string;
        telegramBotToken?: string;
        telegramChatId?: string;
      }) => {
        // Only apply API defaults if localStorage didn't have values
        const hasStored = () => {
          try { return !!localStorage.getItem("youtube-trending-settings"); } catch { return false; }
        };
        if (!hasStored()) {
          if (data.defaultRegion) setRegion(data.defaultRegion);
          if (data.defaultCategory !== undefined) setCategory(data.defaultCategory);
        }
        if (data.telegramBotToken) setTelegramBotToken(data.telegramBotToken);
        if (data.telegramChatId) setTelegramChatId(data.telegramChatId);
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, []);

  // Persist region/category to localStorage when they change
  useEffect(() => {
    if (!settingsLoaded) return;
    try {
      const stored = localStorage.getItem("youtube-trending-settings");
      const current = stored ? JSON.parse(stored) : {};
      localStorage.setItem("youtube-trending-settings", JSON.stringify({
        ...current,
        region,
        category,
      }));
    } catch {}
  }, [region, category, settingsLoaded]);

  const fetchVideos = useCallback(async (overrideSearch?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ region });
      if (category) params.set("category", category);
      const q = overrideSearch !== undefined ? overrideSearch : search;
      if (q) params.set("search", q);
      const res = await fetch(`/api/trending?${params}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch {
      setToast({ message: "⚠️ 無法載入影片，請確認 API Key 已設定", type: "error" });
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [region, category, search]);

  useEffect(() => {
    if (!settingsLoaded) return;
    fetchVideos();
  }, [settingsLoaded, fetchVideos]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(val);
    }, 600);
  };

  const handleRegionChange = (r: string) => {
    setRegion(r);
    setSearch("");
    setSearchInput("");
  };

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
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
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
    a.download = `youtube-trending.${format === "xlsx" ? "xlsx" : "csv"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendTelegram = async () => {
    if (!telegramBotToken || !telegramChatId) {
      setToast({ message: "⚠️ 請先在設定頁填入 Telegram Bot Token 和 Chat ID", type: "error" });
      return;
    }
    setNotifyLoading(true);
    try {
      const res = await fetch("/api/telegram-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: telegramBotToken, chatId: telegramChatId, videos: sortedVideos }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: `✅ 已發送 ${data.notified} 部影片到 Telegram！`, type: "success" });
      } else {
        setToast({ message: `⚠️ ${data.error}`, type: "error" });
      }
    } catch {
      setToast({ message: "⚠️ 發送失敗", type: "error" });
    } finally {
      setNotifyLoading(false);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const sortButtons: { key: SortKey; label: string }[] = [
    { key: "trendingRank", label: "排名" },
    { key: "views", label: "觀看" },
    { key: "likes", label: "按讚" },
    { key: "publishedAt", label: "發布" },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F9FAFB] flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f] border-b border-[#374151] h-14 flex items-center px-4 gap-4">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[#374151] rounded-full transition-colors"
            aria-label="切換側邊欄"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#9CA3AF">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>
          <a href="/" className="flex items-center gap-1 flex-shrink-0">
            <svg width="28" height="20" viewBox="0 0 24 24" fill="#FF0000">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            <span className="font-bold text-base tracking-tight text-[#F9FAFB]">YouTube 熱門蒐集器</span>
          </a>
        </div>

        {/* Center: search bar */}
        <div className="flex-1 flex justify-center max-w-2xl mx-auto">
          <div className="flex w-full max-w-[600px]">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="搜尋影片..."
              className="flex-1 border border-[#4B5563] rounded-l-full px-4 py-1.5 text-sm focus:outline-none focus:border-[#FF0000] bg-[#0F172A] text-[#F9FAFB] placeholder-[#6B7280]"
            />
            <button
              onClick={() => setSearch(searchInput)}
              className="border border-[#4B5563] border-l-0 rounded-r-full px-5 py-1.5 bg-[#1F2937] hover:bg-[#374151] transition-colors flex-shrink-0"
              aria-label="搜尋"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#9CA3AF">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right: settings */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <a
            href="/settings"
            className="p-2 hover:bg-[#374151] rounded-full transition-colors"
            aria-label="設定"
          >
            <SettingsIcon />
          </a>
        </div>
      </header>

      <div className="flex flex-1">
        {/* ===== SIDEBAR ===== */}
        <aside className={`bg-[#0f0f0f] border-r border-[#374151] flex-shrink-0 transition-all duration-200 overflow-hidden ${sidebarOpen ? "w-52" : "w-0"}`}>
          <nav className="pt-2">
            <a href="/" className="sidebar-item flex items-center gap-6 px-6 py-2.5 text-sm text-[#F9FAFB] font-medium">
              <HomeIcon />
              <span>首頁</span>
            </a>
            <div className="sidebar-item flex items-center gap-6 px-6 py-2.5 text-sm text-[#F9FAFB] font-medium">
              <TrendingIcon />
              <span>熱門</span>
            </div>
            <hr className="my-2 border-[#374151]" />
            <div className="px-6 py-1.5 text-xs text-[#6B7280] font-semibold uppercase tracking-wider">地區</div>
            {REGIONS.map((r) => (
              <button
                key={r.code}
                onClick={() => handleRegionChange(r.code)}
                className={`w-full sidebar-item flex items-center gap-6 px-6 py-2 text-sm transition-colors ${region === r.code ? "font-medium text-[#F9FAFB]" : "text-[#9CA3AF]"}`}
              >
                <span className="w-6 text-center">📍</span>
                <span>{r.label}</span>
              </button>
            ))}
            <hr className="my-2 border-[#374151]" />
            <a
              href="/settings"
              className="sidebar-item flex items-center gap-6 px-6 py-2.5 text-sm text-[#9CA3AF]"
            >
              <SettingsIcon />
              <span>設定</span>
            </a>
          </nav>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 min-w-0">
          {/* Filter bar */}
          <div className="bg-[#0f0f0f] border-b border-[#374151] px-6 py-3 flex flex-wrap gap-3 items-center">
            <button
              onClick={() => fetchVideos()}
              className="bg-[#FF0000] hover:bg-[#CC0000] text-white rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
              立即更新
            </button>
            <select
              value={region}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="border border-[#4B5563] rounded-full px-3 py-1.5 text-sm bg-[#0F172A] focus:outline-none focus:border-[#FF0000] cursor-pointer text-[#F9FAFB]"
            >
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-[#4B5563] rounded-full px-3 py-1.5 text-sm bg-[#0F172A] focus:outline-none focus:border-[#FF0000] cursor-pointer text-[#F9FAFB]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <div className="ml-auto flex items-center gap-2 text-xs text-[#9CA3AF]">
              {search && <span>🔍 搜尋：{search}</span>}
              <span>{sortedVideos.length} 部影片</span>
            </div>
          </div>

          {/* Sort buttons */}
          <div className="bg-[#0f0f0f] border-b border-[#374151] px-6 py-2 flex flex-wrap gap-2">
            {sortButtons.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSort(key)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${sortKey === key ? "border-[#FF0000] text-[#FF0000] font-medium" : "border-[#4B5563] text-[#9CA3AF] hover:border-[#6B7280]"}`}
              >
                {label}<SortIcon col={key} />
              </button>
            ))}

            {/* Export + Telegram */}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => downloadFile("csv")}
                className="text-xs px-3 py-1 rounded-full border border-[#4B5563] text-[#9CA3AF] hover:bg-[#374151] transition-colors"
              >
                📄 CSV
              </button>
              <button
                onClick={() => downloadFile("xlsx")}
                className="text-xs px-3 py-1 rounded-full border border-[#4B5563] text-[#9CA3AF] hover:bg-[#374151] transition-colors"
              >
                📊 Excel
              </button>
              <button
                onClick={sendTelegram}
                disabled={notifyLoading}
                className="text-xs px-3 py-1 rounded-full border border-[#4B5563] text-[#9CA3AF] hover:bg-[#374151] transition-colors disabled:opacity-50"
              >
                {notifyLoading ? "📤 傳送中..." : "📨 Telegram"}
              </button>
            </div>
          </div>

          {/* Video grid */}
          <div className="p-6">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                {Array.from({ length: 12 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : sortedVideos.length === 0 ? (
              <div className="text-center py-24 text-[#9CA3AF]">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-base font-medium text-[#F9FAFB] mb-2">尚無收集記錄</p>
                <p className="text-sm">選擇地區或類別後點擊「更新」以抓取熱門影片</p>
                <p className="text-xs mt-1 text-[#6B7280]">請確認 YOUTUBE_API_KEY 環境變數已設定</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                {sortedVideos.map((video, i) => (
                  <VideoCard key={video.id} video={video} index={i} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
