import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'Live data mode active — /api/trending fetches directly from YouTube Data API v3 on each request. No local collection needed.',
    mode: 'live_api',
  })
}
