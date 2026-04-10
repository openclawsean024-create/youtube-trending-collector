import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const CONFIG_FILE = path.join(process.cwd(), 'youtube_config.json')

interface Config {
  telegram_bot_token: string
  telegram_chat_id: string
  region: string
  category: string
  max_videos: number
  min_views: number
  post_time: string
}

function loadConfig(): Config {
  const defaults: Config = {
    telegram_bot_token: '',
    telegram_chat_id: '',
    region: 'TW',
    category: 'All',
    max_videos: 20,
    min_views: 100000,
    post_time: '20:00',
  }
  if (!fs.existsSync(CONFIG_FILE)) return defaults
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) }
  } catch { return defaults }
}

function maskConfig(config: Config) {
  const token = config.telegram_bot_token || ''
  const masked = token.length > 15
    ? token.substring(0, 8) + '...' + token.substring(token.length - 5)
    : token
  return {
    ...config,
    telegram_bot_token: masked,
    telegram_bot_token_set: !!token,
    telegram_chat_id: config.telegram_chat_id || '未設定',
    telegram_chat_id_set: !!config.telegram_chat_id,
  }
}

export async function GET() {
  try {
    const config = loadConfig()
    return NextResponse.json({ success: true, config: maskConfig(config) })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const config = loadConfig()

    if (typeof body.category === 'string') config.category = body.category
    if (typeof body.min_views === 'number') config.min_views = body.min_views

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
    return NextResponse.json({ success: true, config: maskConfig(config) })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
