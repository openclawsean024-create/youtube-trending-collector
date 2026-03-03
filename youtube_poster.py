#!/usr/bin/env python3
"""
YouTube Telegram Poster
發送 YouTube 熱門影片到 Telegram
"""

import os
import json
import requests
from datetime import datetime

CONFIG_FILE = "youtube_config.json"
DATA_FILE = "youtube_data.json"

class YouTubeTelegramPoster:
    def __init__(self):
        self.config = self.load_config()
        self.bot_token = self.config.get("telegram_bot_token", "")
        self.chat_id = self.config.get("telegram_chat_id", "")
        
    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def send_message(self, text, parse_mode="Markdown"):
        if not self.bot_token or not self.chat_id:
            print("❌ 尚未設定 Telegram Bot Token 或 Chat ID")
            return False
        
        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        
        data = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": parse_mode
        }
        
        try:
            response = requests.post(url, json=data, timeout=30)
            result = response.json()
            
            if result.get("ok"):
                print(f"✅ 訊息發送成功！")
                return True
            else:
                print(f"❌ 發送失敗: {result.get('description')}")
                return False
                
        except Exception as e:
            print(f"❌ 發送錯誤: {str(e)}")
            return False
    
    def post_trending(self):
        """發送熱門影片"""
        from youtube_collector import YouTubeTrendingCollector
        
        collector = YouTubeTrendingCollector()
        collector.simulate_collection()
        
        trending = collector.get_24h_videos(limit=20)
        message = collector.format_telegram_message(trending)
        
        return self.send_message(message)


def main():
    poster = YouTubeTelegramPoster()
    
    test_message = """
🔥 *YouTube 熱門影片測試*

✅ 系統運作正常！

每日自動收集：
- 過去 24 小時熱門影片
- 觀看次數排行
- 按讚數排行
- 留言數排行
    """
    
    print("📤 正在發送到 Telegram...")
    poster.send_message(test_message)


if __name__ == "__main__":
    main()
