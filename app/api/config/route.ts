import { NextRequest, NextResponse } from "next/server";

// In-memory config store (resets on cold start — for Vercel use env vars or a DB)
interface Config {
  discordWebhook: string;
  defaultRegion: string;
  defaultCategory: string;
  notifyOnNewVideos: boolean;
}

const defaultConfig: Config = {
  discordWebhook: "",
  defaultRegion: "TW",
  defaultCategory: "",
  notifyOnNewVideos: true,
};

let config: Config = { ...defaultConfig };

export async function GET() {
  return NextResponse.json(config);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      discordWebhook,
      defaultRegion,
      defaultCategory,
      notifyOnNewVideos,
    } = body;

    // Validate region
    const validRegions = ["TW", "US", "JP", "KR", "GB", "DE", "FR", "BR", "IN"];
    if (defaultRegion && !validRegions.includes(defaultRegion)) {
      return NextResponse.json(
        { error: `Invalid region. Must be one of: ${validRegions.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate webhook URL format if provided
    if (discordWebhook && !discordWebhook.startsWith("http")) {
      return NextResponse.json(
        { error: "Discord webhook URL must start with http or https" },
        { status: 400 }
      );
    }

    // Merge and save
    config = {
      discordWebhook: discordWebhook ?? config.discordWebhook,
      defaultRegion: defaultRegion ?? config.defaultRegion,
      defaultCategory: defaultCategory ?? config.defaultCategory,
      notifyOnNewVideos: notifyOnNewVideos ?? config.notifyOnNewVideos,
    };

    return NextResponse.json({ success: true, config });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
