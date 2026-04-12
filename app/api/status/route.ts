import { NextResponse } from "next/server";

export async function GET() {
  const hasApiKey = !!process.env.YOUTUBE_API_KEY;
  return NextResponse.json({ hasApiKey });
}
