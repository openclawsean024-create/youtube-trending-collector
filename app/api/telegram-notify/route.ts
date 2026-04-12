import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botToken, chatId, videos = [] } = body;

    if (!botToken || !chatId) {
      return NextResponse.json({ error: "botToken and chatId are required" }, { status: 400 });
    }

    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: "No videos to notify" }, { status: 400 });
    }

    // Build Telegram message
    const lines = [`🎬 *YouTube 熱門 TOP ${videos.length} 影片*`, ""];
    videos.slice(0, 10).forEach((v: {
      title: string;
      channel: string;
      views: string;
      trendingRank: number;
      id: string;
    }) => {
      const rank = v.trendingRank;
      const title = v.title.slice(0, 80);
      const channel = v.channel;
      const views = Number(v.views).toLocaleString();
      lines.push(`#${rank} ${title}`);
      lines.push(`👤 ${channel} | 👁️ ${views} views`);
      lines.push(`▶️ https://youtube.com/watch?v=${v.id}`);
      lines.push("");
    });

    const text = lines.join("\n");
    const encoded = encodeURIComponent(text);

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encoded}&parse_mode=Markdown`, {
      method: "GET",
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Telegram API error: ${err}` }, { status: 502 });
    }

    return NextResponse.json({ success: true, notified: videos.length });
  } catch (err) {
    console.error("Telegram notify error:", err);
    return NextResponse.json({ error: "Notification failed" }, { status: 500 });
  }
}
