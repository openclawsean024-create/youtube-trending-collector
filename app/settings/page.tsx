"use client";

import { useState, useEffect } from "react";

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

interface Config {
  discordWebhook: string;
  defaultRegion: string;
  defaultCategory: string;
  notifyOnNewVideos: boolean;
}

export default function SettingsPage() {
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [defaultRegion, setDefaultRegion] = useState("TW");
  const [defaultCategory, setDefaultCategory] = useState("");
  const [notifyOnNewVideos, setNotifyOnNewVideos] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load current config on mount
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: Config) => {
        setDiscordWebhook(data.discordWebhook || "");
        setDefaultRegion(data.defaultRegion || "TW");
        setDefaultCategory(data.defaultCategory || "");
        setNotifyOnNewVideos(data.notifyOnNewVideos ?? true);
      })
      .catch(() => {
        // Silently ignore — use defaults
      });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordWebhook,
          defaultRegion,
          defaultCategory,
          notifyOnNewVideos,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveMsg({ type: "success", text: "✅ 設定已儲存！" });
      } else {
        setSaveMsg({ type: "error", text: `⚠️ ${data.error || "儲存失敗"}` });
      }
    } catch {
      setSaveMsg({ type: "error", text: "⚠️ 儲存失敗，請稍後再試" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <a href="/" className="text-zinc-400 hover:text-zinc-200 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </a>
            <h1 className="text-lg font-bold tracking-tight">
              ⚙️ <span className="text-zinc-100">設定</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">

          {/* Discord Webhook */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Discord Webhook URL
            </label>
            <input
              type="url"
              value={discordWebhook}
              onChange={(e) => setDiscordWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              用於接收新進熱門影片通知。留空則不發送通知。
            </p>
          </div>

          {/* Default Region */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              預設地區
            </label>
            <select
              value={defaultRegion}
              onChange={(e) => setDefaultRegion(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500 cursor-pointer w-full"
            >
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Default Category */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              預設分類
            </label>
            <select
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500 cursor-pointer w-full"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Notify on new videos */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNotifyOnNewVideos((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${notifyOnNewVideos ? "bg-red-600" : "bg-zinc-700"}`}
              aria-label="切換新影片通知"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${notifyOnNewVideos ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
            <div>
              <p className="text-sm font-medium text-zinc-300">新影片通知</p>
              <p className="text-xs text-zinc-500">Cron job 偵測到新進熱門時自動發送 Discord 通知</p>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
            >
              {loading ? "儲存中..." : "💾 儲存設定"}
            </button>
            {saveMsg && (
              <p className={`mt-3 text-sm ${saveMsg.type === "success" ? "text-green-400" : "text-yellow-400"}`}>
                {saveMsg.text}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
