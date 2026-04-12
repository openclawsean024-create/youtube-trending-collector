import { NextRequest, NextResponse } from 'next/server'
import { VercelKV } from '@vercel/kv'

const kv = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new VercelKV({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
  : null

const CONFIG_KEY = 'yt-collector:config'

interface Config {
  telegramBotToken: string
  telegramChatId: string
  discordWebhook: string
  notifyOnNewVideos: boolean
  defaultRegion: string
  defaultCategory: string
}

function defaults(): Config & Record<string, unknown> {
  return {
    telegramBotToken: '',
    telegramChatId: '',
    discordWebhook: '',
    notifyOnNewVideos: true,
    defaultRegion: 'TW',
    defaultCategory: '',
    maxVideos: 20,
    minViews: 100000,
    postTime: '20:00',
  }
}

async function loadConfig(): Promise<Record<string, unknown>> {
  const base = defaults()
  if (!kv) return base
  try {
    const stored = await kv.get<Record<string, unknown>>(CONFIG_KEY)
    return stored ? { ...base, ...stored } : base
  } catch {
    return base
  }
}

async function saveConfig(cfg: Record<string, unknown>): Promise<void> {
  if (!kv) return
  await kv.set(CONFIG_KEY, cfg)
}

function maskConfig(config: Record<string, unknown>) {
  const token = (config.telegramBotToken as string) || ''
  const masked = token.length > 15
    ? token.substring(0, 8) + '...' + token.substring(token.length - 5)
    : token
  return {
    ...config,
    telegramBotToken: masked,
    telegramBotTokenSet: !!token,
    telegramChatId: config.telegramChatId || '未設定',
    telegramChatIdSet: !!config.telegramChatId,
  }
}

export async function GET() {
  try {
    const config = await loadConfig()
    return NextResponse.json({ success: true, ...maskConfig(config) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const config = await loadConfig()

    if (typeof body.telegramBotToken === 'string') config.telegramBotToken = body.telegramBotToken
    if (typeof body.telegramChatId === 'string') config.telegramChatId = body.telegramChatId
    if (typeof body.discordWebhook === 'string') config.discordWebhook = body.discordWebhook
    if (typeof body.notifyOnNewVideos === 'boolean') config.notifyOnNewVideos = body.notifyOnNewVideos
    if (typeof body.defaultRegion === 'string') config.defaultRegion = body.defaultRegion
    if (typeof body.defaultCategory === 'string') config.defaultCategory = body.defaultCategory
    if (typeof body.maxVideos === 'number') config.maxVideos = body.maxVideos
    if (typeof body.minViews === 'number') config.minViews = body.minViews
    if (typeof body.postTime === 'string') config.postTime = body.postTime

    await saveConfig(config)
    return NextResponse.json({ success: true, ...maskConfig(config) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
