import { NextResponse } from "next/server";
import { VercelKV } from "@vercel/kv";

const kv = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new VercelKV({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
  : null;

const CONFIG_KEY = "yt-collector:config";
const LAST_IDS_KEY = "yt-collector:last-trending-ids";

interface Config {
  telegramBotToken: string;
  telegramChatId: string;
  discordWebhook: string;
  notifyOnNewVideos: boolean;
}

async function loadConfig(): Promise<Config> {
  if (!kv) return { telegramBotToken: "", telegramChatId: "", discordWebhook: "", notifyOnNewVideos: true };
  try {
    const stored = await kv.get<Config>(CONFIG_KEY);
    return stored || { telegramBotToken: "", telegramChatId: "", discordWebhook: "", notifyOnNewVideos: true };
  } catch {
    return { telegramBotToken: "", telegramChatId: "", discordWebhook: "", notifyOnNewVideos: true };
  }
}

async function loadLastIds(): Promise<string[]> {
  if (!kv) return [];
  try {
    const ids = await kv.get<string[]>(LAST_IDS_KEY);
    return ids || [];
  } catch {
    return [];
  }
}

async function saveLastIds(ids: string[]): Promise<void> {
  if (!kv) return;
  await kv.set(LAST_IDS_KEY, ids);
}

const API_KEY = process.env.YOUTUBE_API_KEY;

async function sendTelegram(botToken: string, chatId: string, videos: Array<{
  title: string;
  channel: string;
  views: string;
  trendingRank: number;
  id: string;
}>) {
  const lines = [`🎬 *YouTube 熱門更新*`, ""];
  videos.slice(0, 10).forEach((v) => {
    lines.push(`#${v.trendingRank} ${v.title.slice(0, 80)}`);
    lines.push(`👤 ${v.channel} | 👁️ ${Number(v.views).toLocaleString()} views`);
    lines.push(`▶️ https://youtube.com/watch?v=${v.id}`);
    lines.push("");
  });
  const text = lines.join("\n");
  const encoded = encodeURIComponent(text);
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encoded}&parse_mode=Markdown`);
}

async function sendDiscord(webhookUrl: string, videos: Array<{
  title: string;
  channel: string;
  views: string;
  trendingRank: number;
  id: string;
}>) {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `🆕 偵測到 ${videos.length} 部新進熱門影片！`,
      embeds: [{
        title: "📈 新進 YouTube 熱門",
        color: 0xff0000,
        fields: videos.slice(0, 10).map((v) => ({
          name: v.title.slice(0, 100),
          value: `👤 ${v.channel} | 👁️ ${Number(v.views).toLocaleString()} views\nhttps://youtube.com/watch?v=${v.id}`,
          inline: false,
        })),
        footer: { text: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) },
      }],
    }),
  });
}

export async function GET() {
  const config = await loadConfig();
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing YOUTUBE_API_KEY" }, { status: 500 });
  }

  if (!config.notifyOnNewVideos) {
    return NextResponse.json({ success: true, message: "Notifications disabled", newVideos: 0 });
  }

  try {
    // Fetch TW trending
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&part=snippet,statistics&chart=mostPopular&regionCode=TW&maxResults=50`
    );
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
    const data = await res.json();
    const currentIds = (data.items || []).map((i: { id: string }) => i.id);

    const lastIds = await loadLastIds();
    const lastIdSet = new Set(lastIds);
    const newIds = currentIds.filter((id: string) => !lastIdSet.has(id));

    if (newIds.length > 0) {
      const newVideos = (data.items || [])
        .filter((i: { id: string }) => newIds.includes(i.id))
        .map((v: {
          id: string;
          snippet: { title: string; channelTitle: string; publishedAt: string; thumbnails: { high: { url: string } } };
          statistics?: { viewCount: string; likeCount: string };
        }, idx: number) => ({
          id: v.id,
          title: v.snippet.title,
          channel: v.snippet.channelTitle,
          thumbnail: v.snippet.thumbnails.high?.url || "",
          views: v.statistics?.viewCount || "0",
          likes: v.statistics?.likeCount || "0",
          publishedAt: v.snippet.publishedAt,
          trendingRank: idx + 1,
        }));

      // Send Telegram if configured
      if (config.telegramBotToken && config.telegramChatId) {
        await sendTelegram(config.telegramBotToken, config.telegramChatId, newVideos);
      }

      // Send Discord if configured
      if (config.discordWebhook) {
        await sendDiscord(config.discordWebhook, newVideos);
      }
    }

    await saveLastIds(currentIds);

    return NextResponse.json({
      success: true,
      totalTrending: currentIds.length,
      newVideos: newIds.length,
    });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
