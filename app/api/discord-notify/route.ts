import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookUrl, videos = [] } = body;

    if (!webhookUrl) {
      return NextResponse.json({ error: "webhookUrl required" }, { status: 400 });
    }

    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: "No videos to notify" }, { status: 400 });
    }

    // Build Discord embed
    const embed = {
      title: "📈 YouTube 熱門影片更新",
      color: 0xff0000,
      fields: videos.slice(0, 10).map((v: {
        title: string;
        channel: string;
        views: string;
        trendingRank: number;
        id: string;
      }) => ({
        name: `#${v.trendingRank} ${v.title.slice(0, 100)}`,
        value: `👤 ${v.channel} | 👁️ ${Number(v.views).toLocaleString()} views\nhttps://youtube.com/watch?v=${v.id}`,
        inline: false,
      })),
      footer: {
        text: `共 ${videos.length} 部熱門影片 | ${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`,
      },
    };

    const discordBody = {
      content: `🎬 YouTube 熱門 TOP ${videos.length} 影片來了！`,
      embeds: [embed],
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordBody),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Discord webhook error: ${text}` }, { status: 502 });
    }

    return NextResponse.json({ success: true, notified: videos.length });
  } catch (err) {
    console.error("Discord notify error:", err);
    return NextResponse.json({ error: "Notification failed" }, { status: 500 });
  }
}
