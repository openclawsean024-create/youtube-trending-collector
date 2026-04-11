import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Cron endpoint is available. This build uses live YouTube fetch on /api/trending.',
  })
}

export async function POST() {
  return GET()
}
