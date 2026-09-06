# youtube-trending-collector · PRD 變更日誌

> 對應 SPEC v3.0.x — 9 章結構（產品概述 / 使用者場景 / 功能需求 / NFR / 技術架構 / DoD / 部署契約 / Out of Scope / 變更日誌）

---

## v3.0.2 — 2026-09-06 · Fleet Patch (Sean 10-repo-fleet)

> v3.0.2 完成於 2026-09-06 by Sean 10-repo-fleet

### 補完（Patch 對齊 SPEC v3.0 契約 §1–§19）
- ✅ **套用 SPEC v3.0 契約**：補齊 9 章標準化結構章節
- ✅ **CHANGELOG.md 建立**：本檔
- ✅ **SPEC.md header 升級 v3.0 → v3.0.2**：patch 註記

### 開發基礎建設
- ➕ `lib/parse.ts` — 抽出 `parseViewCount` / `parseRelativeTime` 純函式
- ➕ `tests/parse.test.ts` — Vitest 11 個單元測試（parseViewCount × 5、parseRelativeTime × 6）
- ➕ `vitest.config.ts` — Vitest 設定（含 `@/*` path alias）
- ➕ `.eslintrc.json` — `next/core-web-vitals` preset
- 🔧 `app/api/trending/route.ts` — 內部 `parseViewCount` / `parseRelativeTime` 改 import 自 `lib/parse`
- 🔧 `app/api/cron/route.ts` — 同上（單一 source of truth）
- 🔧 `package.json` — 加 `test` / `test:watch` scripts + devDeps（vitest、eslint、eslint-config-next）

### CI/CD
- ➕ `.github/workflows/ci.yml` — 4-job GHA（lint / test / build / deploy-to-Vercel）

### 驗證結果
| 項目 | 結果 |
|---|---|
| `npm run build` | ✅ 12 routes 編譯成功 |
| `npm run lint` | ✅ 0 error（3 warnings — `<img>` 與 useEffect deps，已知 non-blocking） |
| `npm test` | ✅ 11/11 passed |

---

## v3.0 — 2026-07-19 · Sweet Spot 全面轉向 (Sophia CPO + Alan CTO)

### 重大決策
- 🎯 **重新定位**：從「YouTube 熱門影片蒐集/排行」 → 「中文 YouTuber 一站式自動化工作流」
- 🎯 **避免正面競爭**：YouTube Studio / TubeBuddy / vidIQ / Social Blade
- 🎯 **切入 niche**：腳本生成 + 縮圖建議 + SEO 標題 + Hashtag + 觀眾留言草稿

### 規格重點（摘要）
- 9 頁 / 1 dashboard / 6 API routes
- Python CLI 工具（`cli.py` / `youtube_collector.py` / `youtube_poster.py`）
- Vercel KV 儲存 config 與 last-trending-ids
- 支援 Telegram / Discord / Notion 三通道通知

---

## v2.2.1 — earlier · 原始 YouTube 熱門蒐集器定位

- 提供 YouTube 熱門影片 24h 排行
- 觀看次數 × 1 + 按讚 × 3 + 留言 × 5 = 熱度分數
- Markdown 格式發送到 Telegram
- Notion 同步 Page ID `329449ca-65d8-81c6-9a6f-e1197bcbce42`
