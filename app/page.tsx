'use client'

import { useState, useEffect, useCallback } from 'react'

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

interface Config {
  telegram_bot_token: string
  telegram_bot_token_set: boolean
  telegram_chat_id: string
  telegram_chat_id_set: boolean
  region: string
  category: string
  max_videos: number
  min_views: number
  post_time: string
}

interface TrendingResponse {
  success: boolean
  trending: Video[]
  total: number
  last_update: string | null
  error?: string
}

interface ConfigResponse {
  success: boolean
  config: Config
}

export default function Dashboard() {
  const [videos, setVideos] = useState<Video[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [collecting, setCollecting] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [totalVideos, setTotalVideos] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'trending' | 'config'>('trending')
  const [notification, setNotification] = useState<string | null>(null)
  const [editCategory, setEditCategory] = useState('All')
  const [editMinViews, setEditMinViews] = useState(100000)
  const [editRegion, setEditRegion] = useState('TW')
  const [editMaxVideos, setEditMaxVideos] = useState(20)
  const [editPostTime, setEditPostTime] = useState('20:00')
  const [editTelegramBotToken, setEditTelegramBotToken] = useState('')
  const [editTelegramChatId, setEditTelegramChatId] = useState('')

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  const saveConfig = async () => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_bot_token: editTelegramBotToken,
          telegram_chat_id: editTelegramChatId,
          region: editRegion,
          category: editCategory,
          max_videos: Number(editMaxVideos),
          min_views: Number(editMinViews),
          post_time: editPostTime,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setConfig(data.config)
        showNotification('設定已儲存 ✅')
      } else {
        showNotification('儲存失敗：' + (data.error || '未知錯誤'))
      }
    } catch {
      showNotification('儲存失敗，請稍後再試')
    }
  }

  const fetchTrending = useCallback(async () => {
    try {
      const res = await fetch('/api/trending')
      const data: TrendingResponse = await res.json()
      if (data.success) {
        setVideos(data.trending)
        setLastUpdate(data.last_update)
        setTotalVideos(data.total)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch trending')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config')
      const data: ConfigResponse = await res.json()
      if (data.success) {
        setConfig(data.config)
        setEditCategory(data.config.category)
        setEditMinViews(data.config.min_views)
        setEditRegion(data.config.region)
        setEditMaxVideos(data.config.max_videos)
        setEditPostTime(data.config.post_time)
        setEditTelegramChatId(data.config.telegram_chat_id_set ? data.config.telegram_chat_id : '')
      }
    } catch {
      // ignore
    }
  }, [])

  const handleCollect = async () => {
    setCollecting(true)
    try {
      const res = await fetch('/api/collect', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        showNotification(data.message || '收集完成！')
        await fetchTrending()
      } else {
        showNotification(`收集失敗: ${data.error}`)
      }
    } catch (e: any) {
      showNotification(`收集失敗: ${e.message}`)
    } finally {
      setCollecting(false)
    }
  }

  useEffect(() => {
    fetchTrending()
    fetchConfig()
    const interval = setInterval(fetchTrending, 60000)
    return () => clearInterval(interval)
  }, [fetchTrending, fetchConfig])

  const formatTime = (iso: string | null) => {
    if (!iso) return '從未'
    const d = new Date(iso)
    return d.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
  }

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return <span className="text-gray-500 font-bold">#{rank}</span>
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {notification && <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-pulse">{notification}</div>}
      <header className="bg-[#1a1a1a] border-b border-[#333] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">YouTube 熱門收集器</h1>
                <p className="text-xs text-gray-400">自動收集 · Telegram 發送</p>
              </div>
            </div>
            <button onClick={handleCollect} disabled={collecting} className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">{collecting ? <>收集中...</> : <>立即收集</>}</button>
          </div>
          <div className="flex gap-1 mt-4">
            <button onClick={() => setActiveTab('trending')} className={`px-4 py-2 text-sm font-medium rounded-lg ${activeTab === 'trending' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#272727]'}`}>📊 熱門排行</button>
            <button onClick={() => setActiveTab('config')} className={`px-4 py-2 text-sm font-medium rounded-lg ${activeTab === 'config' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#272727]'}`}>⚙️ 配置狀態</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm">⚠️ {error}</div>}
        {activeTab === 'trending' && <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="stat-card rounded-xl p-4"><p className="text-gray-400 text-xs mb-1">總影片數</p><p className="text-2xl font-bold text-white">{totalVideos}</p></div>
            <div className="stat-card rounded-xl p-4"><p className="text-gray-400 text-xs mb-1">顯示熱門</p><p className="text-2xl font-bold text-white">{videos.length}</p></div>
            <div className="stat-card rounded-xl p-4"><p className="text-gray-400 text-xs mb-1">最後更新</p><p className="text-sm font-medium text-white">{formatTime(lastUpdate)}</p></div>
            <div className="stat-card rounded-xl p-4"><p className="text-gray-400 text-xs mb-1">地區</p><p className="text-2xl font-bold text-white">{config?.region || 'TW'}</p></div>
          </div>
          {loading ? <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full"/><span className="ml-3 text-gray-400">載入中...</span></div> : videos.length === 0 ? <div className="text-center py-20"><p className="text-gray-400 mb-4">目前沒有熱門影片</p><button onClick={handleCollect} disabled={collecting} className="btn-primary">點擊收集</button></div> : <div className="space-y-3">{videos.map((video) => <div key={video.id} className="video-card bg-[#1a1a1a] border border-[#272727] rounded-xl p-4 flex gap-4"><div className="flex items-center justify-center w-8 shrink-0"><span className="text-xl">{getRankEmoji(video.rank)}</span></div><div className="shrink-0"><a href={video.url} target="_blank" rel="noopener noreferrer"><img src={video.thumbnail} alt={video.title} className="w-36 h-20 object-cover rounded-lg bg-[#272727]" onError={(e) => {(e.target as HTMLImageElement).style.display = 'none'}} /></a></div><div className="flex-1 min-w-0"><a href={video.url} target="_blank" rel="noopener noreferrer" className="text-white font-semibold text-sm hover:text-red-500 transition-colors line-clamp-2">{video.title}</a><p className="text-gray-400 text-xs mt-1">{video.channel}</p><div className="flex items-center gap-4 mt-2 text-xs text-gray-400"><span>👀 {video.views_formatted}</span><span>👍 {video.likes_formatted}</span><span>💬 {video.comments_formatted}</span><span>⏱️ {video.duration}</span><span className="bg-red-900/30 text-red-400 px-2 py-0.5 rounded text-xs font-semibold">🔥 {video.hot_score}K</span></div></div><div className="shrink-0 flex items-center"><a href={video.url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-red-500 transition-colors" title="在 YouTube 開啟">↗</a></div></div>)}</div>}
        </>}
        {activeTab === 'config' && <div className="max-w-2xl"><div className="bg-[#1a1a1a] border border-[#272727] rounded-xl p-6"><h2 className="text-lg font-bold text-white mb-6">⚙️ 配置狀態</h2><div className="space-y-4"><div className="flex items-center justify-between py-3 border-b border-[#272727]"><div><p className="text-white font-medium">地區</p><p className="text-xs text-gray-500 mt-0.5">YouTube 熱門的地區</p></div><input className="bg-[#272727] text-white text-sm border border-[#3a3a3a] rounded-lg px-3 py-1.5 w-32" value={editRegion} onChange={e => setEditRegion(e.target.value)} /></div><div className="flex items-center justify-between py-3 border-b border-[#272727]"><div><p className="text-white font-medium">分類</p><p className="text-xs text-gray-500 mt-0.5">影片分類（影響收集範圍）</p></div><select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="bg-[#272727] text-white text-sm border border-[#3a3a3a] rounded-lg px-3 py-1.5"><option value="All">All</option><option value="Music">音樂</option><option value="Gaming">遊戲</option><option value="News">新聞</option><option value="Movies">電影</option><option value="Sports">體育</option><option value="Comedy">喜劇</option><option value="Entertainment">娛樂</option><option value="Science">科學</option><option value="Technology">科技</option><option value="Education">教育</option></select></div><div className="flex items-center justify-between py-3 border-b border-[#272727]"><div><p className="text-white font-medium">最少觀看次數</p><p className="text-xs text-gray-500 mt-0.5">只收集超過此觀看數的影片</p></div><input type="number" value={editMinViews} onChange={e => setEditMinViews(Number(e.target.value))} min={0} className="w-36 bg-[#272727] text-white text-sm border border-[#3a3a3a] rounded-lg px-3 py-1.5" /></div><div className="flex items-center justify-between py-3 border-b border-[#272727]"><div><p className="text-white font-medium">最大影片數</p><p className="text-xs text-gray-500 mt-0.5">每次收集的影片上限</p></div><input type="number" value={editMaxVideos} onChange={e => setEditMaxVideos(Number(e.target.value))} min={1} className="w-36 bg-[#272727] text-white text-sm border border-[#3a3a3a] rounded-lg px-3 py-1.5" /></div><div className="flex items-center justify-between py-3 border-b border-[#272727]"><div><p className="text-white font-medium">Telegram Bot Token</p><p className="text-xs text-gray-500 mt-0.5">用於發送訊息到 Telegram 群組</p></div><input className="bg-[#272727] text-white text-sm border border-[#3a3a3a] rounded-lg px-3 py-1.5 w-64" value={editTelegramBotToken} onChange={e => setEditTelegramBotToken(e.target.value)} placeholder="保持空白代表不修改" /></div><div className="flex items-center justify-between py-3 border-b border-[#272727]"><div><p className="text-white font-medium">Telegram Chat ID</p><p className="text-xs text-gray-500 mt-0.5">目標群組或頻道的 ID</p></div><input className="bg-[#272727] text-white text-sm border border-[#3a3a3a] rounded-lg px-3 py-1.5 w-64" value={editTelegramChatId} onChange={e => setEditTelegramChatId(e.target.value)} placeholder="例如 -1001234567890" /></div><div className="flex items-center justify-between py-3"><div><p className="text-white font-medium">每日發送時間</p><p className="text-xs text-gray-500 mt-0.5">自動發送到 Telegram 的時間</p></div><input className="bg-[#272727] text-white text-sm border border-[#3a3a3a] rounded-lg px-3 py-1.5 w-32" value={editPostTime} onChange={e => setEditPostTime(e.target.value)} /></div><button onClick={saveConfig} className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg transition-colors">儲存設定</button></div></div></div>}
      </main>
      <footer className="border-t border-[#272727] mt-8 py-6"><div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-xs"><p>YouTube Trending Collector · 自動收集 · Telegram 發送</p><p className="mt-1">更新時間：{formatTime(lastUpdate)}</p></div></footer>
    </div>
  )
}
