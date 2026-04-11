import { NextResponse } from 'next/server'
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

// Sample data for demo/preview mode (when API key unavailable)
const SAMPLE_VIDEOS: Video[] = [
  { rank: 1, id: 'dQw4w9WgXcQ', video_id: 'dQw4w9WgXcQ', title: '🎵 熱門音樂 MV - 永遠經典', channel: '官方頻道', views: 12500000, views_formatted: '12.5M', likes: 890000, likes_formatted: '890K', comments: 45000, comments_formatted: '45K', duration: '3:04', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg', hot_score: 15670, collected_at: new Date().toISOString() },
  { rank: 2, id: 'sample2', video_id: 'sample2', title: '🔥 遊戲實況 - 最新熱門影片', channel: '遊戲達人', views: 8900000, views_formatted: '8.9M', likes: 560000, likes_formatted: '560K', comments: 32000, comments_formatted: '32K', duration: '45:30', url: 'https://www.youtube.com/watch?v=sample2', thumbnail: 'https://img.youtube.com/vi/sample2/hqdefault.jpg', hot_score: 9860, collected_at: new Date().toISOString() },
  { rank: 3, id: 'sample3', video_id: 'sample3', title: '📱 科技評測 - 新品開箱', channel: '科技先生', views: 5600000, views_formatted: '5.6M', likes: 340000, likes_formatted: '340K', comments: 18000, comments_formatted: '18K', duration: '18:22', url: 'https://www.youtube.com/watch?v=sample3', thumbnail: 'https://img.youtube.com/vi/sample3/hqdefault.jpg', hot_score: 6140, collected_at: new Date().toISOString() },
  { rank: 4, id: 'sample4', video_id: 'sample4', title: '🍜 美食探店 - 在地推薦', channel: '吃貨世界', views: 3200000, views_formatted: '3.2M', likes: 210000, likes_formatted: '210K', comments: 12000, comments_formatted: '12K', duration: '12:45', url: 'https://www.youtube.com/watch?v=sample4', thumbnail: 'https://img.youtube.com/vi/sample4/hqdefault.jpg', hot_score: 3680, collected_at: new Date().toISOString() },
  { rank: 5, id: 'sample5', video_id: 'sample5', title: '📚 知識分享 - 必學技巧', channel: '學習頻道', views: 2100000, views_formatted: '2.1M', likes: 180000, likes_formatted: '180K', comments: 9500, comments_formatted: '9.5K', duration: '22:10', url: 'https://www.youtube.com/watch?v=sample5', thumbnail: 'https://img.youtube.com/vi/sample5/hqdefault.jpg', hot_score: 2610, collected_at: new Date().toISOString() },
]

function getDemoTrending(region: string): Video[] {
  return SAMPLE_VIDEOS.map((v, i) => ({
    ...v,
    collected_at: new Date().toISOString(),
    rank: i + 1,
  }))
}

export async function GET() {
  try {
    if (!YOUTUBE_API_KEY) {
      // Return demo data instead of empty state
      const demoTrending = getDemoTrending(REGION)
      return NextResponse.json({
        success: true,
        trending: demoTrending,
        total: demoTrending.length,
        last_update: new Date().toISOString(),
        demo: true,
      })
    }

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
    // Fall back to demo data on error
    const demoTrending = getDemoTrending(REGION)
    return NextResponse.json({
      success: true,
      trending: demoTrending,
      total: demoTrending.length,
      last_update: new Date().toISOString(),
      demo: true,
      api_error: error.message,
    })
  }
}
