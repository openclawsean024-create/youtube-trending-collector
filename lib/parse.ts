// 純函式解析工具（從 app/api/trending/route.ts 抽出以利測試）

// 解析觀看次數字串，例如 "觀看次數：109,126次" → "109126"
export function parseViewCount(text: string): string {
  if (!text) return "0";
  const cleaned = text.replace(/[^0-9,]/g, "").replace(/,/g, "");
  return cleaned || "0";
}

// 解析中文相對時間，例如 "13 小時前" → 對應的過去 ISO 時間
export function parseRelativeTime(text: string): string {
  if (!text) return new Date(0).toISOString();
  const match = text.match(/(\d+)\s*(秒|分|小時|天|月|年)前/);
  if (!match) return new Date(0).toISOString();
  const val = parseInt(match[1], 10);
  const unit = match[2];
  const now = new Date("2026-01-01T00:00:00Z");
  if (unit === "秒") now.setSeconds(now.getSeconds() - val);
  else if (unit === "分") now.setMinutes(now.getMinutes() - val);
  else if (unit === "小時") now.setHours(now.getHours() - val);
  else if (unit === "天") now.setDate(now.getDate() - val);
  else if (unit === "月") now.setMonth(now.getMonth() - val);
  else if (unit === "年") now.setFullYear(now.getFullYear() - val);
  return now.toISOString();
}
