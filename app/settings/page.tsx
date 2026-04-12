"use client";

import { useState, useEffect } from "react";

const REGIONS = [
  { code: "TW", label: "🇹🇼 台灣" },
  { code: "US", label: "🇺🇸 美國" },
  { code: "JP", label: "🇯🇵 日本" },
  { code: "KR", label: "🇰🇷 南韓" },
  { code: "HK", label: "🇭🇰 香港" },
  { code: "GB", label: "🇬🇧 英國" },
  { code: "DE", label: "🇩🇪 德國" },
  { code: "FR", label: "🇫🇷 法國" },
  { code: "BR", label: "🇧🇷 巴西" },
  { code: "IN", label: "🇮🇳 印度" },
];

const CATEGORIES = [
  { id: "", label: "所有類別" },
  { id: "10", label: "🎵 音樂" },
  { id: "20", label: "🎮 遊戲" },
  { id: "22", label: "🏌️ 戶外活動" },
  { id: "23", label: "🎬 喜劇" },
  { id: "24", label: "🎬 娛樂" },
  { id: "25", label: "📺 新聞" },
  { id: "27", label: "🦸 寵物" },
  { id: "28", label: "🔧 科學科技" },
  { id: "17", label: "⚽ 體育" },
];

interface Config {
  discordWebhook: string;
  telegramBotToken: string;
  telegramChatId: string;
  defaultRegion: string;
  defaultCategory: string;
  notifyOnNewVideos: boolean;
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#374151]">
        <h2 className="text-sm font-bold text-[#F9FAFB]">{title}</h2>
      </div>
      <div className="p-5 space-y-5">
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-[#F9FAFB] mb-1.5">{children}</label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-[#9CA3AF]">{children}</p>;
}

export default function SettingsPage() {
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [defaultRegion, setDefaultRegion] = useState("TW");
  const [defaultCategory, setDefaultCategory] = useState("");
  const [notifyOnNewVideos, setNotifyOnNewVideos] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [apiStatus, setApiStatus] = useState<{ hasApiKey: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: Config) => {
        setDiscordWebhook(data.discordWebhook || "");
        setTelegramBotToken(data.telegramBotToken || "");
        setTelegramChatId(data.telegramChatId || "");
        setDefaultRegion(data.defaultRegion || "TW");
        setDefaultCategory(data.defaultCategory || "");
        setNotifyOnNewVideos(data.notifyOnNewVideos ?? true);
      })
      .catch(() => {});
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setApiStatus(d))
      .catch(() => setApiStatus({ hasApiKey: false }));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordWebhook,
          telegramBotToken,
          telegramChatId,
          defaultRegion,
          defaultCategory,
          notifyOnNewVideos,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: "✅ 設定已儲存", type: "success" });
      } else {
        setToast({ message: `⚠️ ${data.error || "儲存失敗"}`, type: "error" });
      }
    } catch {
      setToast({ message: "⚠️ 儲存失敗，請稍後再試", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1F2937] border-b border-[#374151] h-14 flex items-center px-4 gap-4">
        <a href="/" className="p-2 hover:bg-[#374151] rounded-full transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#9CA3AF">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </a>
        <div className="flex items-center gap-2">
          <svg width="28" height="20" viewBox="0 0 24 24" fill="#FF0000">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          <h1 className="text-base font-bold text-[#F9FAFB]">設定</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Default filters */}
        <SectionCard title="📌 預設篩選條件">
          <div>
            <FieldLabel>預設地區</FieldLabel>
            <select
              value={defaultRegion}
              onChange={(e) => setDefaultRegion(e.target.value)}
              className="w-full border border-[#4B5563] rounded-lg px-3 py-2.5 text-sm bg-[#0F172A] focus:outline-none focus:border-[#FF0000] cursor-pointer text-[#F9FAFB]"
            >
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
            <FieldHint>頁面載入時的預設地區設定</FieldHint>
          </div>
          <div>
            <FieldLabel>預設分類</FieldLabel>
            <select
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value)}
              className="w-full border border-[#4B5563] rounded-lg px-3 py-2.5 text-sm bg-[#0F172A] focus:outline-none focus:border-[#FF0000] cursor-pointer text-[#F9FAFB]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <FieldHint>留空表示所有類別</FieldHint>
          </div>
        </SectionCard>

        {/* Telegram */}
        <SectionCard title="📨 Telegram 推播通知">
          <div>
            <FieldLabel>Bot Token</FieldLabel>
            <input
              type="text"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder="123456:ABC-DEF1234GhIkl5xyz6"
              className="w-full border border-[#4B5563] rounded-lg px-3 py-2.5 text-sm bg-[#0F172A] focus:outline-none focus:border-[#FF0000] placeholder-[#6B7280] text-[#F9FAFB]"
            />
            <FieldHint>在 Telegram 找 @BotFather 申請，格式如 123456:ABC-DEF...</FieldHint>
          </div>
          <div>
            <FieldLabel>Chat ID</FieldLabel>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="your_chat_id 或 -1001234567890"
              className="w-full border border-[#4B5563] rounded-lg px-3 py-2.5 text-sm bg-[#0F172A] focus:outline-none focus:border-[#FF0000] placeholder-[#6B7280] text-[#F9FAFB]"
            />
            <FieldHint>接收訊息的 Telegram 帳號 ID 或群組 ID</FieldHint>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#F9FAFB]">新影片自動推播</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">Cron Job 偵測到新進熱門時自動發送通知</p>
            </div>
            <button
              onClick={() => setNotifyOnNewVideos((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF0000] focus:ring-offset-2 focus:ring-offset-[#0B0F19] ${notifyOnNewVideos ? "bg-[#FF0000]" : "bg-[#4B5563]"}`}
              aria-label="切換自動推播"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${notifyOnNewVideos ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </SectionCard>

        {/* Discord (legacy) */}
        <SectionCard title="💬 Discord Webhook（Legacy）">
          <div>
            <FieldLabel>Discord Webhook URL</FieldLabel>
            <input
              type="url"
              value={discordWebhook}
              onChange={(e) => setDiscordWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full border border-[#4B5563] rounded-lg px-3 py-2.5 text-sm bg-[#0F172A] focus:outline-none focus:border-[#FF0000] placeholder-[#6B7280] text-[#F9FAFB]"
            />
            <FieldHint>目前以 Telegram 為主，Discord 仍可使用</FieldHint>
          </div>
        </SectionCard>

        {/* API Key status */}
        <SectionCard title="🔑 API 狀態">
          <div className="flex items-center gap-3 text-sm">
            <span className={`w-3 h-3 rounded-full ${apiStatus?.hasApiKey ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-[#9CA3AF]">
              {apiStatus?.hasApiKey ? "✅ YOUTUBE_API_KEY 已設定" : "❌ YOUTUBE_API_KEY 未設定"}
            </span>
          </div>
          <FieldHint>請在 Vercel 環境變數中設定 YOUTUBE_API_KEY</FieldHint>
        </SectionCard>

        {/* Save button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-[#FF0000] hover:bg-[#CC0000] disabled:opacity-50 text-white rounded-full px-8 py-2.5 text-sm font-medium transition-colors"
          >
            {loading ? "儲存中..." : "💾 儲存設定"}
          </button>
        </div>
      </main>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
