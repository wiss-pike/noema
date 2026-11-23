# Noema 自动简报

这套代码使用 Cloudflare 的定时 Worker 收集过去 24 小时的公开 RSS，由 Workers AI 生成中文稿，并写入 D1。Pages 通过服务绑定读取已发布日报。生产页面已接入此接口。抓取、存储和网页读取都由 Cloudflare 提供。

每天北京时间 08:00 对应 Cron `0 0 * * *`。每期最多 8 条，其中至少一半是 AI 条目，至少三分之二以外媒或海外一手来源为主，至少一半以外媒为主。新闻链接从 RSS 记录保留，模型只返回候选条目编号和中文文案。缺少足够来源时少发，无法生成合规一期时保留既有日报。内容仍需要实际运行后评估摘要质量。

每周一北京时间 18:00 对应 Cron `0 10 * * MON`。论文任务从 arXiv 分类和 Hugging Face Papers 发现近 92 天的 AI 核心技术候选，在 arXiv 核对元数据和全文。作者项目页须由论文链接并能核对身份与主题。精读面向大一读者，正文 1500–2500 字，保留原标题，逐字核对摘要和结论引文，并验证实验数字。通过校验后写入独立的 `weekly_papers` 表。月度归档和首页通过只读 `/api/papers` 加载，失败时回退到静态归档。再分发许可因论文而异，网页链接到官方 PDF 或 HTML 全文。当前自动来源覆盖 arXiv 原文，扩展到其他数据库需要单独增加来源适配。

## 测试

在本目录运行 `npm ci` 和 `npm test`。测试覆盖日期窗口、链接与来源比例、重复运行不重复写稿、日报接口。模拟模型回复用于验证数据与程序行为。

## 接入现有 Pages 项目

1. 用已获授权的 Wrangler 创建 D1 数据库 `noema-editions`。把返回的 `database_id` 填入本目录的 `wrangler.toml`，运行 `wrangler d1 migrations apply noema-editions --remote`。
2. 从本目录运行 `wrangler deploy`。这是用于内部服务调用和定时发布的 Worker。
3. 从仓库根目录运行 `python build_static.py automation/pages/public --with-briefing`，生成供首次发布的全新输出目录。若目录已存在，可先备份后另建输出目录，同步修改 Pages 配置中的构建目录。
4. 从 `automation/pages` 运行 `wrangler pages deploy --project-name noema-wiss --branch main`。Pages 会在站内路径 `/api/daily` 和 `/api/papers` 读取 Worker 的发布结果。
5. 确认真实运行能获得 RSS、生成通过校验的中文日报、写入 D1，并在公开首页和日报详情中读到。测试通过后再调整 Today 的在用任务。

生产接口已验证能读取 D1。首个 08:00 定时结果需待触发后查看。接口超时或失败时，页面仍能读取随站点发布的历史档案。静态档案里的同日旧稿保留原内容。
