import { NextResponse } from "next/server";

// Store last known trending video IDs in memory (survives warm invocations)
const lastTrendingIds = new Set<string>();

export async function GET() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!webhookUrl || !apiKey) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  try {
    // Fetch current TW trending
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&part=snippet,statistics&chart=mostPopular&regionCode=TW&maxResults=50`
    );
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
    const data = await res.json();
    const currentIds = new Set<string>((data.items || []).map((i: { id: string }) => i.id));

    // Find new videos not in last run
    const newIds = [...currentIds].filter((id) => !lastTrendingIds.has(id));

    if (newIds.length > 0) {
      const newVideos = (data.items || [])
        .filter((i: { id: string }) => newIds.includes(i.id))
        .map((v: {
          id: string;
          snippet: {
            title: string;
            channelTitle: string;
            publishedAt: string;
            thumbnails: { high: { url: string } };
          };
          statistics?: { viewCount: string; likeCount: string };
        }) => ({
          id: v.id,
          title: v.snippet.title,
          channel: v.snippet.channelTitle,
          thumbnail: v.snippet.thumbnails.high?.url || "",
          views: v.statistics?.viewCount || "0",
          likes: v.statistics?.likeCount || "0",
          publishedAt: v.snippet.publishedAt,
        }));

      // Notify Discord
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🆕 偵測到 ${newVideos.length} 部新進熱門影片！`,
          embeds: [
            {
              title: "📈 新進 YouTube 熱門",
              color: 0xff0000,
              fields: newVideos.slice(0, 10).map((v: { title: string; channel: string; views: string; id: string }) => ({
                name: v.title.slice(0, 100),
                value: `👤 ${v.channel} | 👁️ ${Number(v.views).toLocaleString()} views\nhttps://youtube.com/watch?v=${v.id}`,
                inline: false,
              })),
              footer: { text: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) },
            },
          ],
        }),
      });
    }

    // Update cache
    lastTrendingIds.clear();
    currentIds.forEach((id) => lastTrendingIds.add(id));

    return NextResponse.json({
      success: true,
      totalTrending: currentIds.size,
      newVideos: newIds.length,
    });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
