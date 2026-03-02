# 视频信息源推荐与执行清单

## 1. 目标与约束

- 目标：在现有信号看板中增加视频型内容，覆盖 Build / News / Launch 风格。
- 约束：保持 0 成本优先，不新增视频存储/转码/CDN 付费链路。
- 合规：不提供任何绕过平台封禁/地域限制的能力。
- 降级：外嵌不可用时，必须保留原平台观看链接。

## 2. 推荐视频源（首批）

### 2.1 News / Insight

- TED（YouTube）
  - 频道：`UCAuUUnT6oDeKwE6v1NGQxug`
  - 理由：多语字幕覆盖较好，内容密度和质量稳定。

### 2.2 Build / Developer

- Google for Developers（YouTube）
  - 频道：`UC_x5XG1OV2P6uZZ5FSM9Ttw`
- Microsoft Developer（YouTube）
  - 频道：`UCsMica-v34Irf9KVTh6xx-g`
- AWS（YouTube）
  - 频道：`UCd6MoB9NC6uYN2grvUNT-Zg`

### 2.3 Launch / Startup

- Y Combinator（YouTube）
  - 频道：`UCcefcZRL2oaA_uBNeo5UOWg`
- a16z（YouTube）
  - 频道：`UC9cn0TuPq4dnbTY-CBsm8XA`

### 2.4 CN 区域补充

- Bilibili（通过 RSSHub 路由抓取）
  - 示例：`/bilibili/user/video/:uid`
  - 说明：公共 RSSHub 实例常有限流，建议自建 RSSHub。

## 3. 区域与字幕策略

- `GLOBAL`：至少满足英文字幕（`en`）。
- `CN`：至少满足中文字幕（`zh-Hans` / `zh-Hant` / `zh`）。
- `ALL`：至少满足英文或中文字幕之一。
- 默认开启字幕门禁：不满足字幕策略的视频不进入信号流。

## 4. 抓取策略（GitHub Actions）

- 频率：每小时（可按配额改为 15-30 分钟）。
- YouTube：通过官方频道 RSS 拉取最新视频。
- Bilibili：通过 RSSHub 路由拉取（建议自建实例）。
- 入库前处理：
  - 提取视频 ID、播放地址、原链路地址。
  - 检测可用字幕语言。
  - 通过字幕门禁后写入 `Signal.metadata`。

## 5. 数据结构约定（写入 Signal.metadata）

```json
{
  "contentType": "video",
  "videoPlatform": "youtube|bilibili",
  "videoId": "string",
  "embedUrl": "string",
  "watchUrl": "string",
  "subtitleLangs": ["en", "zh-hans"],
  "subtitleGateRequired": ["en"],
  "regionHint": "GLOBAL|CN|ALL",
  "publishedAt": "ISO datetime string"
}
```

## 6. 上线步骤

1. 运行 `prisma/seed.ts` 同步内置视频源。
2. 观察 cron 抓取结果中的视频条目数与失败率。
3. 确认字幕门禁命中率后，再逐步扩大频道清单。
4. 若启用 Bilibili，先替换为自建 RSSHub 地址，再将该源设为 `isActive=true`。

## 7. 运营指标（建议）

- 视频新增量（每次抓取）。
- 字幕达标率（入库数 / 原始抓取数）。
- 外嵌失败回退率（前端事件上报）。
- 区域可用性（GLOBAL/CN 分开统计）。
