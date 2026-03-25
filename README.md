# YouTube 熱門影片收集器

自動收集 YouTube 熱門影片並發送到 Telegram 群組。

## 🌐 前端儀表板

訪問 https://youtube-trending-collector.vercel.app 查看即時熱門排行

功能：
- 📊 即時熱門影片排行（熱度分數計算）
- 📺 影片詳細資訊（觀看、按讚、留言）
- ⚙️ 配置狀態查看
- 🔄 一鍵收集新影片

## 功能

### 📺 影片收集
- 自動收集 YouTube 熱門影片
- 24 小時內熱門排行
- 觀看次數、按讚數、留言數

### 🔥 熱度計算
- 觀看次數 × 1
- 按讚數 × 3
- 留言數 × 5

### 📤 Telegram 發送
- 自動發送到指定群組
- Markdown 格式
- 精美排版

## 開發

### 前端（Next.js）
```bash
npm install
npm run dev
```

### 後端（Python CLI）
```bash
python cli.py collect   # 收集影片
python cli.py trending  # 查看熱門排行
python cli.py post     # 發送到 Telegram
python cli.py config   # 顯示配置
```

### 部署到 Vercel
```bash
vercel --prod
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
