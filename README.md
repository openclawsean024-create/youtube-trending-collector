# YouTube 熱門影片收集器

自動收集 YouTube 熱門影片並發送到 Telegram 群組。

## 功能

### 📺 影片收集
- 自動收集 YouTube 熱門影片
- 24 小時內熱門排行
- 觀看次數、、按讚數、留言數

### 🔥 熱度計算
- 觀看次數 × 1
- 按讚數 × 3
- 留言數 × 5

### 📤 Telegram 發送
- 自動發送到指定群組
- Markdown 格式
- 精美排版

## 安裝

```bash
pip install requests
```

## 使用方法

### 收集影片
```bash
python cli.py collect
```

### 查看熱門排行
```bash
python cli.py trending
```

### 發送到 Telegram
```bash
python cli.py post
```

### 測試發送
```bash
python cli.py test
```

## 配置

編輯 `youtube_config.json`：

```json
{
  "telegram_bot_token": "你的BOT_TOKEN",
  "telegram_chat_id": "你的群組ID",
  "region": "TW",
  "post_time": "20:00"
}
```

## 熱度排行

| 排名 | 因素 |
|------|------|
| 🥇 | 觀看次數最高 |
| 🥈 | 按讚數最高 |
| 🥉 | 討論度最高 |

## 定時執行

```bash
# 每天 20:00 執行
python cli.py collect && python cli.py post
```

## 訊息格式

```
🔥 YouTube 熱門影片 TOP 20
⏰ 過去 24 小時
===================================

1. 【影片標題】
   📺 頻道名稱
   👀 5.2M | 👍 350K | 💬 28K
   ⏱️ 15:30
   🔗 [觀看連結]

...
===================================
📊 總觀看: 52M
📝 影片數: 20 部
⏰ 更新時間: 20:00
```
