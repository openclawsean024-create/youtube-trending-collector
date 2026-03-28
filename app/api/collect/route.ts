import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// POST /api/collect — Trigger a re-fetch of trending data
// Since we now fetch live from YouTube API v3 on each /api/trending request,
// this endpoint simply confirms the system is ready.
// In a future iteration, this could trigger a Vercel KV write for caching.
export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    message: 'Live data mode active — /api/trending fetches directly from YouTube Data API v3 on each request. No local collection needed.',
    mode: 'live_api',
  })
}
