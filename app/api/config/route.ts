import { NextRequest, NextResponse } from "next/server";

// Use Vercel KV for persistent config storage
// Falls back to in-memory if KV is not configured
let kvStore: Record<string, string> = {};
let kvAvailable = false;

async function initKV() {
  if (kvAvailable) return;
  try {
    const { createClient } = await import("@vercel/kv");
    const kv = createClient({
      url: process.env.KV_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
    // Test connectivity
    await kv.get("config");
    kvAvailable = true;
    console.log("[config] Vercel KV connected");
  } catch {
    kvAvailable = false;
    console.log("[config] Vercel KV not available, using in-memory store");
  }
}

const CONFIG_KEY = "app:config";

interface StoredConfig {
  telegramBotToken?: string;
  telegramChatId?: string;
  defaultRegion?: string;
  defaultCategory?: string;
  notifyOnNewVideos?: boolean;
  discordWebhook?: string;
  updatedAt?: string;
}

async function loadConfig(): Promise<StoredConfig> {
  await initKV();
  if (!kvAvailable) return {};

  try {
    const { createClient } = await import("@vercel/kv");
    const kv = createClient({
      url: process.env.KV_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
    const raw = await kv.get<string>(CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw) as StoredConfig;
    }
  } catch (e) {
    console.error("[config] Failed to load from KV:", e);
  }
  return {};
}

async function saveConfig(data: StoredConfig): Promise<StoredConfig> {
  await initKV();
  const merged = { ...data, updatedAt: new Date().toISOString() };

  if (kvAvailable) {
    try {
      const { createClient } = await import("@vercel/kv");
      const kv = createClient({
        url: process.env.KV_URL!,
        token: process.env.KV_REST_API_TOKEN!,
      });
      await kv.set(CONFIG_KEY, JSON.stringify(merged));
    } catch (e) {
      console.error("[config] Failed to save to KV:", e);
    }
  }

  // Also persist to local file as fallback (for local dev)
  try {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "youtube_config.json");
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2));
  } catch {
    // ignore
  }

  return merged;
}

function maskConfig(config: StoredConfig): StoredConfig {
  const token = config.telegramBotToken || "";
  const masked = token.length > 12
    ? token.substring(0, 6) + "..." + token.substring(token.length - 6)
    : token;
  return {
    ...config,
    telegramBotToken: masked,
    telegramBotTokenSet: !!token,
  };
}

export async function GET() {
  try {
    const config = await loadConfig();
    return NextResponse.json({
      success: true,
      ...maskConfig(config),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const config: StoredConfig = {};
    if (typeof body.telegramBotToken === "string") config.telegramBotToken = body.telegramBotToken;
    if (typeof body.telegramChatId === "string") config.telegramChatId = body.telegramChatId;
    if (typeof body.defaultRegion === "string") config.defaultRegion = body.defaultRegion;
    if (typeof body.defaultCategory === "string") config.defaultCategory = body.defaultCategory;
    if (typeof body.notifyOnNewVideos === "boolean") config.notifyOnNewVideos = body.notifyOnNewVideos;
    if (typeof body.discordWebhook === "string") config.discordWebhook = body.discordWebhook;

    const saved = await saveConfig(config);
    return NextResponse.json({ success: true, ...maskConfig(saved) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
