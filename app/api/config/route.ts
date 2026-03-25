import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const CONFIG_FILE = path.join(process.cwd(), 'youtube_config.json')

export async function GET() {
  try {
    let config = {
      telegram_bot_token: '',
      telegram_chat_id: '',
      region: 'TW',
      category: 'All',
      max_videos: 20,
      min_views: 100000,
      post_time: '20:00',
    }

    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8')
        config = { ...config, ...JSON.parse(raw) }
      } catch (e) {
        // use defaults
      }
    }

    // Mask token
    const token = config.telegram_bot_token || ''
    const maskedToken = token.length > 15 
      ? token.substring(0, 8) + '...' + token.substring(token.length - 5)
      : token

    return NextResponse.json({
      success: true,
      config: {
        telegram_bot_token: maskedToken,
        telegram_bot_token_set: !!token,
        telegram_chat_id: config.telegram_chat_id || '未設定',
        telegram_chat_id_set: !!config.telegram_chat_id,
        region: config.region,
        category: config.category,
        max_videos: config.max_videos,
        min_views: config.min_views,
        post_time: config.post_time,
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
