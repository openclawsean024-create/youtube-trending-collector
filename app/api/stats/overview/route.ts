import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    stats: {
      total_videos: 0,
      total_appearances: 0,
      last_24h: { new_videos: 0, appearances: 0, viral_videos: 0, shorts: 0 },
      last_7d: { appearances: 0 },
      by_niche: {},
      by_region: {},
    },
  })
}
