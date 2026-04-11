#!/usr/bin/env python3
"""
YouTube Trending Video Collector
自動收集 YouTube 熱門影片並發送到 Telegram / Notion
"""

import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import requests

DATA_FILE = "youtube_data.json"
CONFIG_FILE = "youtube_config.json"
NOTION_PAGE_ID = os.environ.get("NOTION_PAGE_ID", "329449ca-65d8-81c6-9a6f-e1197bcbce42")
NOTION_VERSION = os.environ.get("NOTION_VERSION", "2025-09-03")


class YouTubeTrendingCollector:
    def __init__(self):
        self.data = self.load_data()
        self.config = self.load_config()

    def load_data(self):
        """載入資料"""
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass
        return {"videos": [], "last_update": None}

    def save_data(self):
        """儲存資料"""
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)

    def load_config(self):
        """載入配置（環境變數優先）"""
        file_config = {}
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    file_config = json.load(f)
            except Exception:
                pass

        default_config = {
            "telegram_bot_token": os.environ.get("TELEGRAM_BOT_TOKEN") or file_config.get("telegram_bot_token", ""),
            "telegram_chat_id": os.environ.get("TELEGRAM_CHAT_ID") or file_config.get("telegram_chat_id", ""),
            "region": file_config.get("region", "TW"),
            "category": file_config.get("category", "All"),
            "max_videos": file_config.get("max_videos", 20),
            "min_views": file_config.get("min_views", 100000),
            "post_time": file_config.get("post_time", "20:00"),
            "include_stats": file_config.get("include_stats", True),
        }
        return default_config

    def generate_video_id(self, video_id):
        return hashlib.md5(video_id.encode()).hexdigest()[:12]

    def format_view_count(self, views):
        if views >= 1000000:
            return f"{views/1000000:.1f}M"
        if views >= 1000:
            return f"{views/1000:.1f}K"
        return str(views)

    def format_duration(self, duration_str):
        if not duration_str:
            return "未知"
        duration_str = duration_str.replace("PT", "").replace("M", "分").replace("S", "秒").replace("H", "小時")
        if "小時" in duration_str and "分" in duration_str:
            return duration_str
        if "小時" in duration_str:
            return duration_str.replace("分", ":00")
        if "分" in duration_str:
            return "0:" + duration_str.replace("分", "")
        if "秒" in duration_str:
            return "0:0" + duration_str.replace("秒", "")
        return duration_str

    def add_video(self, video_info):
        video_id = video_info.get("video_id", "")
        if not video_id:
            return False

        for existing in self.data["videos"]:
            if existing.get("video_id") == video_id:
                return False

        views = video_info.get("views", 0)
        likes = video_info.get("likes", 0)
        comments = video_info.get("comments", 0)
        hot_score = (views * 1 + likes * 3 + comments * 5) // 1000

        video = {
            "id": self.generate_video_id(video_id),
            "video_id": video_id,
            "title": video_info.get("title", "無標題"),
            "channel": video_info.get("channel", "未知頻道"),
            "channel_id": video_info.get("channel_id", ""),
            "views": views,
            "likes": likes,
            "comments": comments,
            "duration": video_info.get("duration", ""),
            "published": video_info.get("published", ""),
            "thumbnail": video_info.get("thumbnail", ""),
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "hot_score": hot_score,
            "collected_at": datetime.now().isoformat(),
        }

        self.data["videos"].insert(0, video)
        self.data["videos"] = self.data["videos"][:200]
        self.data["last_update"] = datetime.now().isoformat()
        self.save_data()
        return True

    def get_trending(self, limit=20, min_views=0):
        trending = [v for v in self.data["videos"] if v.get("views", 0) >= min_views]
        trending.sort(key=lambda x: x.get("hot_score", 0), reverse=True)
        return trending[:limit]

    def get_24h_videos(self, limit=20):
        cutoff = datetime.now() - timedelta(hours=24)
        recent = []
        for video in self.data["videos"]:
            try:
                collected = datetime.fromisoformat(video["collected_at"])
                if collected > cutoff:
                    recent.append(video)
            except Exception:
                pass
        recent.sort(key=lambda x: x.get("hot_score", 0), reverse=True)
        return recent[:limit]

    def format_telegram_message(self, videos):
        if not videos:
            return "📺 過去 24 小時暂无熱門影片"

        message = "🔥 *YouTube 熱門影片 TOP 20*\n"
        message += "⏰ 過去 24 小時\n"
        message += "=" * 35 + "\n\n"

        for i, video in enumerate(videos[:20], 1):
            rank_emoji = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"{i:2d}."
            message += f"{rank_emoji} *{video['title']}*\n"
            message += f"   📺 {video['channel']}\n"
            views = self.format_view_count(video.get("views", 0))
            likes = self.format_view_count(video.get("likes", 0))
            comments = self.format_view_count(video.get("comments", 0))
            message += f"   👀 {views} | 👍 {likes} | 💬 {comments}\n"
            duration = self.format_duration(video.get("duration", ""))
            if duration != "未知":
                message += f"   ⏱️ {duration}\n"
            message += f"   🔗 [觀看]({video['url']})\n\n"

        total_views = sum(v.get("views", 0) for v in videos[:20])
        total_views_str = self.format_view_count(total_views)
        message += "=" * 35 + "\n"
        message += f"📊 總觀看: *{total_views_str}*\n"
        message += f"📝 影片數: *{len(videos[:20])}* 部\n"
        message += f"⏰ 更新時間: {datetime.now().strftime('%H:%M')}\n"
        return message

    def sync_notion_sean(self, videos: Optional[List[Dict[str, Any]]] = None) -> bool:
        notion_token = os.environ.get("NOTION_TOKEN") or os.environ.get("NOTION_API_KEY")
        if not notion_token:
            print("⚠️ 未設定 NOTION_TOKEN，略過 Notion 同步")
            return False

        videos = videos or self.get_24h_videos(limit=20)
        sean_value = str(len(videos))
        url = f"https://api.notion.com/v1/pages/{NOTION_PAGE_ID}"
        headers = {
            "Authorization": f"Bearer {notion_token}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
        }
        payload = {
            "properties": {
                "Sean": {
                    "rich_text": [{"text": {"content": sean_value}}]
                }
            }
        }

        try:
            response = requests.patch(url, headers=headers, json=payload, timeout=30)
            if response.ok:
                print(f"✅ Notion Sean 欄位已更新為 {sean_value}")
                return True
            print(f"❌ Notion 更新失敗: {response.status_code} {response.text}")
            return False
        except Exception as e:
            print(f"❌ Notion 同步錯誤: {e}")
            return False

    def simulate_collection(self):
        sample_videos = [
            {"video_id": "dQw4w9WgXcQ", "title": "【最新影片】2026年趨勢分析", "channel": "科技趨勢", "views": 5200000, "likes": 350000, "comments": 28000, "duration": "PT15M30S", "published": "2026-03-03T12:00:00Z"},
            {"video_id": "abc123456789", "title": "AI 人工智慧完整教學", "channel": "程式教學", "views": 3800000, "likes": 220000, "comments": 15000, "duration": "PT45M", "published": "2026-03-03T10:30:00Z"},
            {"video_id": "def456789012", "title": "2026 必看電影推薦", "channel": "電影頻道", "views": 2900000, "likes": 180000, "comments": 12000, "duration": "PT20M15S", "published": "2026-03-03T08:00:00Z"},
            {"video_id": "ghi789012345", "title": "如何學好英文 - 有效方法", "channel": "語言學習", "views": 2100000, "likes": 150000, "comments": 8000, "duration": "PT12M", "published": "2026-03-03T06:00:00Z"},
            {"video_id": "jkl012345678", "title": "iPhone 18 完整評測", "channel": "3C達人", "views": 4500000, "likes": 310000, "comments": 25000, "duration": "PT25M45S", "published": "2026-03-03T14:00:00Z"},
            {"video_id": "mno345678901", "title": "料理教學 - 簡易家常菜", "channel": "美食頻道", "views": 1800000, "likes": 120000, "comments": 6500, "duration": "PT18M30S", "published": "2026-03-03T07:00:00Z"},
            {"video_id": "pqr678901234", "title": "健身訓練 - 完整攻略", "channel": "運動健身", "views": 2300000, "likes": 160000, "comments": 9000, "duration": "PT30M", "published": "2026-03-03T09:00:00Z"},
            {"video_id": "stu901234567", "title": "投資理財 - 新手入門", "channel": "財經頻道", "views": 3100000, "likes": 200000, "comments": 11000, "duration": "PT22M", "published": "2026-03-03T11:00:00Z"},
            {"video_id": "vwx234567890", "title": "PS6 發表會完整報導", "channel": "遊戲頻道", "views": 5600000, "likes": 380000, "comments": 32000, "duration": "PT1H15M", "published": "2026-03-03T13:00:00Z"},
            {"video_id": "yza567890123", "title": "居家裝潢設計靈感", "channel": "生活頻道", "views": 1500000, "likes": 95000, "comments": 4500, "duration": "PT14M", "published": "2026-03-03T05:00:00Z"},
        ]

        added = 0
        for video in sample_videos:
            if self.add_video(video):
                added += 1

        return added


def main():
    collector = YouTubeTrendingCollector()

    print("📺 開始收集 YouTube 熱門影片...")
    added = collector.simulate_collection()
    print(f"✅ 新增 {added} 部影片")

    trending = collector.get_24h_videos(limit=20)
    print(f"\n🔥 熱門影片 ({len(trending)}部):")
    for i, video in enumerate(trending[:5], 1):
        views = collector.format_view_count(video.get("views", 0))
        print(f"  {i}. {video['title'][:40]}... ({views} views)")

    collector.sync_notion_sean(trending)
    message = collector.format_telegram_message(trending)
    print("\n" + "=" * 50)
    print(message[:500] + "...")


if __name__ == "__main__":
    main()
