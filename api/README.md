# WONLY 背调 · 静态查询接口

由 crawler/leads.json 生成的静态数据接口（GitHub Pages 托管，无后端、无鉴权）。

- 单个公司（按域名）：`GET https://business.foreverdoodle.com/api/company/<域名>.json`
  例：`/api/company/htamba.com.json`
- 全量索引：`GET https://business.foreverdoodle.com/api/index.json`
  用 `companies[]` 里的 `normName` 做公司名模糊匹配，`domain`/`file` 定位单公司文件。

字段说明见《WONLY 背调 API 对接说明》。数据每日更新；本目录由 `node crawler/gen-api.mjs` 生成，请勿手改。
生成时间：2026-07-28 ｜ 域名文件数：1518 ｜ 线索总数：2382
