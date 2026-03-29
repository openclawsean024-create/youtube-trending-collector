import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

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
