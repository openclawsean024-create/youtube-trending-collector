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
    lines.push(`👤 ${v.channel} | 👁️ ${v.views} views`);
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
          value: `👤 ${v.channel} | 👁️ ${v.views} views\nhttps://youtube.com/watch?v=${v.id}`,
          inline: false,
        })),
        footer: { text: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) },
      }],
    }),
  });
}

function extractVideoIds(html: string): string[] {
  const ids: string[] = [];
  const re = /"videoId":"([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

function extractMetadata(html: string, ids: string[]): Map<string, { title: string; channel: string; channelId: string; thumbnail: string; views: string; publishedAt: string; description: string }> {
  const map = new Map();
  for (const id of ids) {
    const blockRe = new RegExp(`"videoId":"${id}"[\\s\\S]*?(?="videoId"|$)`, 'g');
    const blockMatch = blockRe.exec(html);
    let title = "", channel = "", channelId = "", thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`, views = "", publishedAt = "", description = "";

    if (blockMatch) {
      const block = blockMatch[0];
      const titleMatch = block.match(/"title":\s*\{?"simpleText":\s*"([^"]+)"/) || block.match(/"title":\s*"([^"]+)"/);
      if (titleMatch) title = titleMatch[1];
      const channelMatch = block.match(/"(?:owner|longByline)Text":\s*\{?"simpleText":\s*"([^"]+)"/);
      if (channelMatch) channel = channelMatch[1];
      const channelIdMatch = block.match(/"(ownerVideoId|channelId)":\s*"([^"]+)"/);
      if (channelIdMatch) channelId = channelIdMatch[2];
      const thumbMatch = block.match(/"thumbnails":\s*\[\{"url":\s*"([^"]+)"/);
      if (thumbMatch) thumbnail = thumbMatch[1];
      const pubMatch = block.match(/"publishedTimeText":\s*\{?"simpleText":\s*"([^"]+)"/);
      if (pubMatch) publishedAt = pubMatch[1];
      const viewMatch = block.match(/"viewCountText":\s*\{?"simpleText":\s*"([^"]+)"/) || block.match(/"viewCountText":\s*"([^"]+)"/);
      if (viewMatch) views = viewMatch[1];
      const descMatch = block.match(/"descriptionSnippet":\s*\{?"simpleText":\s*"([^"]+)"/);
      if (descMatch) description = descMatch[1];
    }
    map.set(id, { title, channel, channelId, thumbnail, views, publishedAt, description });
  }
  return map;
}

async function scrapeTrendingIds(region: string): Promise<string[]> {
  const url = `https://www.youtube.com/feed/trending?hl=${region === "TW" ? "zh-TW" : "en-US"}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Accept-Language": region === "TW" ? "zh-TW,zh;q=0.9" : "en-US;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`Scrape error: ${res.status}`);
  const html = await res.text();
  return [...new Set(extractVideoIds(html))].slice(0, 50);
}

export async function GET() {
  const config = await loadConfig();

  if (!config.notifyOnNewVideos) {
    return NextResponse.json({ success: true, message: "Notifications disabled", newVideos: 0 });
  }

  try {
    // Scrape TW trending page HTML (no API key needed)
    const currentIds = await scrapeTrendingIds("TW");
    const lastIds = await loadLastIds();
    const lastIdSet = new Set(lastIds);
    const newIds = currentIds.filter((id: string) => !lastIdSet.has(id));

    if (newIds.length > 0) {
      // Scrape full metadata for new videos
      const url = `https://www.youtube.com/feed/trending?hl=zh-TW`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
          "Accept-Language": "zh-TW,zh;q=0.9",
        },
      });
      const html = await res.text();
      const metaMap = extractMetadata(html, newIds);

      const newVideos = newIds.slice(0, 20).map((id, idx) => {
        const meta = metaMap.get(id) || { title: "", channel: "", channelId: "", thumbnail: "", views: "", publishedAt: "", description: "" };
        return {
          id,
          title: meta.title || `Video ${id}`,
          channel: meta.channel || "Unknown",
          thumbnail: meta.thumbnail || `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
          views: meta.views || "0",
          likes: "0",
          publishedAt: meta.publishedAt || "",
          trendingRank: idx + 1,
        };
      });

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
