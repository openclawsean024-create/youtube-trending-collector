#!/usr/bin/env python3
"""
YouTube Trending Collector CLI
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from youtube_collector import YouTubeTrendingCollector
from youtube_poster import YouTubeTelegramPoster

def main():
    if len(sys.argv) < 2:
        print("""
📺 YouTube 熱門影片收集器

用法:
  python cli.py collect     - 收集熱門影片
  python cli.py trending   - 查看熱門排行
  python cli.py post       - 發送到 Telegram
  python cli.py test       - 測試發送
  python cli.py config     - 顯示配置
        """)
        return
    
    command = sys.argv[1]
    
    if command == "collect":
        collector = YouTubeTrendingCollector()
        added = collector.simulate_collection()
        print(f"✅ 完成！新增 {added} 部影片")
        
    elif command == "trending":
        collector = YouTubeTrendingCollector()
        trending = collector.get_trending(limit=20)
        
        print("\n🔥 YouTube 熱門影片 TOP 20")
        print("=" * 50)
        
        for i, video in enumerate(trending[:10], 1):
            views = collector.format_view_count(video.get("views", 0))
            print(f"\n{i}. {video['title']}")
            print(f"   📺 {video['channel']}")
            print(f"   👀 {views} | ⭐ {video['hot_score']}K")
    
    elif command == "post":
        poster = YouTubeTelegramPoster()
        result = poster.post_trending()
        if result:
            print("✅ 熱門影片發送成功！")
        else:
            print("❌ 發送失敗")
    
    elif command == "test":
        poster = YouTubeTelegramPoster()
        test_msg = "🔥 *YouTube 熱門影片*\n\n✅ 測試訊息\n\n系統運作正常！"
        poster.send_message(test_msg)
    
    elif command == "config":
        collector = YouTubeTrendingCollector()
        config = collector.config
        
        print("\n⚙️ 配置資訊")
        print("=" * 50)
        
        token = config.get("telegram_bot_token", "")
        if token:
            token = token[:10] + "..." + token[-5:]
        
        print(f"Telegram Bot: {token}")
        print(f"Chat ID: {config.get('telegram_chat_id', '未設定')}")
        print(f"地區: {config.get('region', 'TW')}")
        print(f"每日發送時間: {config.get('post_time', '20:00')}")
    
    else:
        print(f"❌ 未知指令: {command}")


if __name__ == "__main__":
    main()
