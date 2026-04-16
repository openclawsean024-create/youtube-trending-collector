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

function parseViewCount(text: string): string {
  if (!text) return "0";
  return text.replace(/[^0-9,]/g, "").replace(/,/g, "") || "0";
}

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

function extractJsonObject(html: string, startMarker: string): string | null {
  const idx = html.indexOf(startMarker);
  if (idx === -1) return null;
  const start = idx + startMarker.length;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return html.slice(start, i + 1); }
  }
  return null;
}

async function scrapeTrendingIds(region: string): Promise<{ ids: string[]; html: string }> {
  const regionLang = region === "TW" ? "zh-TW" : "en-US";
  const sp = "EgQIAhAB";
  const url = `https://www.youtube.com/results?sp=${sp}&search_query=`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": `${regionLang},zh;q=0.9,en;q=0.8`,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`Scrape error: ${res.status}`);
  const html = await res.text();

  const jsonStr = extractJsonObject(html, "ytInitialData = ");
  if (!jsonStr) throw new Error("ytInitialData not found");

  const data = JSON.parse(jsonStr);
  const ids: string[] = [];
  const seenIds = new Set<string>();

  try {
    const sections = (
      data.contents as Record<string, unknown>
    )?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    for (const section of sections as Array<Record<string, unknown>>) {
      if (!section.itemSectionRenderer) continue;
      const items = (section.itemSectionRenderer as Record<string, unknown>).contents || [];
      for (const item of items as Array<Record<string, unknown>>) {
        const v = item.videoRenderer as Record<string, unknown> | undefined;
        if (!v?.videoId || seenIds.has(v.videoId as string)) continue;
        seenIds.add(v.videoId as string);
        ids.push(v.videoId as string);
        if (ids.length >= 50) break;
      }
      if (ids.length >= 50) break;
    }
  } catch (err) {
    console.error("Parse error:", err);
  }

  return { ids, html };
}

export async function GET() {
  const config = await loadConfig();

  if (!config.notifyOnNewVideos) {
    return NextResponse.json({ success: true, message: "Notifications disabled", newVideos: 0 });
  }

  try {
    const { ids, html } = await scrapeTrendingIds("TW");
    const currentIds = ids;

    const lastIds = await loadLastIds();
    const lastIdSet = new Set(lastIds);
    const newIds = currentIds.filter((id: string) => !lastIdSet.has(id));

    if (newIds.length > 0) {
      const data = JSON.parse(extractJsonObject(html, "ytInitialData = ") || "{}");
      const newVideos: Array<{
        id: string;
        title: string;
        channel: string;
        thumbnail: string;
        views: string;
        likes: string;
        publishedAt: string;
        trendingRank: number;
      }> = [];

      try {
        const sections = (
          data.contents as Record<string, unknown>
        )?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

        for (const section of sections as Array<Record<string, unknown>>) {
          if (!section.itemSectionRenderer) continue;
          const items = (section.itemSectionRenderer as Record<string, unknown>).contents || [];
          for (const item of items as Array<Record<string, unknown>>) {
            const v = item.videoRenderer as Record<string, unknown> | undefined;
            if (!v?.videoId || !newIds.includes(v.videoId as string)) continue;
            const titleRuns = (v.title as Record<string, unknown>)?.runs as Array<Record<string, unknown>> || [];
            const channelRuns = (v.longBylineText as Record<string, unknown>)?.runs as Array<Record<string, unknown>> || [];
            const thumbnails = (v.thumbnail as Record<string, unknown>)?.thumbnails as Array<Record<string, unknown>> || [];
            newVideos.push({
              id: v.videoId as string,
              title: (titleRuns[0]?.text as string) || "",
              channel: (channelRuns[0]?.text as string) || "",
              thumbnail: (thumbnails[0]?.url as string) || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
              views: parseViewCount((v.viewCountText as Record<string, unknown>)?.simpleText as string || ""),
              likes: "0",
              publishedAt: parseRelativeTime((v.publishedTimeText as Record<string, unknown>)?.simpleText as string || ""),
              trendingRank: newVideos.length + 1,
            });
          }
        }
      } catch (err) {
        console.error("Metadata parse error:", err);
      }

      if (config.telegramBotToken && config.telegramChatId) {
        await sendTelegram(config.telegramBotToken, config.telegramChatId, newVideos);
      }

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
