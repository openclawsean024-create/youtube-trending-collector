import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videos = [], format = "csv" } = body;

    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: "No videos to export" }, { status: 400 });
    }

    const headers = [
      "Trending Rank",
      "Video ID",
      "Title",
      "Channel",
      "Views",
      "Likes",
      "Comments",
      "Published At",
      "Category ID",
      "Description",
    ];

    if (format === "xlsx") {
      const wsData = [
        headers,
        ...videos.map((v: {
          trendingRank: number;
          id: string;
          title: string;
          channel: string;
          views: string;
          likes: string;
          comments: string;
          publishedAt: string;
          categoryId: string;
          description: string;
        }) => [
          v.trendingRank,
          v.id,
          v.title,
          v.channel,
          v.views,
          v.likes,
          v.comments,
          v.publishedAt,
          v.categoryId,
          v.description,
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Trending Videos");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="trending-videos.xlsx"',
        },
      });
    }

    // CSV
    const escape = (val: string | number) => {
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };
    const rows = [
      headers.join(","),
      ...videos.map((v: {
        trendingRank: number;
        id: string;
        title: string;
        channel: string;
        views: string;
        likes: string;
        comments: string;
        publishedAt: string;
        categoryId: string;
        description: string;
      }) =>
        [
          v.trendingRank,
          escape(v.id),
          escape(v.title),
          escape(v.channel),
          escape(v.views),
          escape(v.likes),
          escape(v.comments),
          escape(v.publishedAt),
          escape(v.categoryId),
          escape(v.description),
        ].join(",")
      ),
    ];
    const csv = rows.join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="trending-videos.csv"',
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
