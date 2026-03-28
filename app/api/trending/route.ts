import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import axios from 'axios'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const REGION = process.env.YOUTUBE_REGION || 'TW'

interface Video {
  rank: number
  id: string
  video_id: string
  title: string
  channel: string
  views: number
  views_formatted: string
  likes: number
  likes_formatted: string
  comments: number
  comments_formatted: string
  duration: string
  url: string
  thumbnail: string
  hot_score: number
  collected_at: string
}

function formatViewCount(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
  return views.toString()
}

function formatDuration(iso: string): string {
  if (!iso) return '未知'
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return iso
  const h = match[1] ? parseInt(match[1]) : 0
  const m = match[2] ? parseInt(match[2]) : 0
  const s = match[3] ? parseInt(match[3]) : 0
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // No API key = return graceful empty state
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'YOUTUBE_API_KEY not configured',
        trending: [],
        total: 0,
        last_update: null,
      })
    }

    // Fetch trending videos from YouTube Data API v3
    const trendingRes = await axios.get(
      'https://www.googleapis.com/youtube/v3/videos',
      {
        params: {
          part: 'snippet,statistics,contentDetails',
          chart: 'mostPopular',
          regionCode: REGION,
          maxResults: 20,
          key: YOUTUBE_API_KEY,
        },
        timeout: 10000,
      }
    )

    const items = trendingRes.data.items || []
    const now = new Date().toISOString()

    const trending: Video[] = items.map((item: any, i: number) => {
      const stats = item.statistics || {}
      const snippet = item.snippet || {}
      const details = item.contentDetails || {}

      const views = parseInt(stats.viewCount || '0')
      const likes = parseInt(stats.likeCount || '0')
      const comments = parseInt(stats.commentCount || '0')

      // Hot score formula: views*1 + likes*3 + comments*5 / 1000
      const hot_score = Math.round((views * 1 + likes * 3 + comments * 5) / 1000)

      return {
        rank: i + 1,
        id: item.id,
        video_id: item.id,
        title: snippet.title || '無標題',
        channel: snippet.channelTitle || '未知頻道',
        views,
        views_formatted: formatViewCount(views),
        likes,
        likes_formatted: formatViewCount(likes),
        comments,
        comments_formatted: formatViewCount(comments),
        duration: formatDuration(details.duration || ''),
        url: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnail: snippet.thumbnails?.high?.url
          || snippet.thumbnails?.medium?.url
          || snippet.thumbnails?.default?.url
          || `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`,
        hot_score,
        collected_at: now,
      }
    })

    // Sort by hot_score descending
    trending.sort((a, b) => b.hot_score - a.hot_score)
    trending.forEach((v, i) => { v.rank = i + 1 })

    return NextResponse.json({
      success: true,
      trending,
      total: trending.length,
      last_update: now,
    })
  } catch (error: any) {
    console.error('YouTube API error:', error?.response?.data || error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch from YouTube API',
      trending: [],
      total: 0,
      last_update: null,
    })
  }
}
