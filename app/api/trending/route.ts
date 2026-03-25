import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const DATA_FILE = path.join(process.cwd(), 'youtube_data.json')

interface Video {
  id: string
  video_id: string
  title: string
  channel: string
  channel_id: string
  views: number
  likes: number
  comments: number
  duration: string
  published: string
  thumbnail: string
  url: string
  hot_score: number
  collected_at: string
}

interface TrendingData {
  videos: Video[]
  last_update: string | null
  total: number
}

function formatViewCount(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
  return views.toString()
}

function formatDuration(duration: string): string {
  if (!duration) return '未知'
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return duration
  const hours = match[1] ? parseInt(match[1]) : 0
  const minutes = match[2] ? parseInt(match[2]) : 0
  const seconds = match[3] ? parseInt(match[3]) : 0
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export async function GET() {
  try {
    // Try to run the Python collector to get latest data
    let data: TrendingData = {
      videos: [],
      last_update: null,
      total: 0
    }

    // Check if data file exists
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8')
        const parsed = JSON.parse(raw)
        data.videos = parsed.videos || []
        data.last_update = parsed.last_update || null
        data.total = data.videos.length
      } catch (e) {
        console.error('Failed to parse data file:', e)
      }
    }

    // If no data, run the collector
    if (data.videos.length === 0) {
      try {
        execSync('python3 cli.py collect', { cwd: process.cwd(), timeout: 15000 })
        if (fs.existsSync(DATA_FILE)) {
          const raw = fs.readFileSync(DATA_FILE, 'utf-8')
          const parsed = JSON.parse(raw)
          data.videos = parsed.videos || []
          data.last_update = parsed.last_update || null
          data.total = data.videos.length
        }
      } catch (e) {
        console.error('Failed to run collector:', e)
      }
    }

    // Sort by hot_score and take top 20
    const trending = [...data.videos]
      .sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0))
      .slice(0, 20)
      .map((v, i) => ({
        rank: i + 1,
        id: v.id,
        video_id: v.video_id,
        title: v.title,
        channel: v.channel,
        views: v.views,
        views_formatted: formatViewCount(v.views),
        likes: v.likes,
        likes_formatted: formatViewCount(v.likes),
        comments: v.comments,
        comments_formatted: formatViewCount(v.comments),
        duration: formatDuration(v.duration),
        url: v.url,
        thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg`,
        hot_score: v.hot_score,
        collected_at: v.collected_at,
      }))

    return NextResponse.json({
      success: true,
      trending,
      total: data.total,
      last_update: data.last_update,
    })
  } catch (error: any) {
    console.error('Trending API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch trending' },
      { status: 500 }
    )
  }
}
