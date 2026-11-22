# Noema

诺埃玛 · 论文精读归档。每周一篇 AI 核心技术方向的论文精读，按月归档的静态站点。

纯 HTML / CSS / JavaScript，没有构建步骤、没有外部字体与依赖，所有路径都是相对路径，可以直接放在 GitHub Pages 仓库根目录。

## 页面

- 首页 `index.html`：整幅衬线字标开场，右侧是档案栏（已归档篇数、月份数）；下面的「归档」区按月份倒序列出，每月一行，行内直接列出当月论文标题与方向。顶部是文字索引式的方向筛选（全部 · 架构 · 训练方法 · Agent · 评测）和一条底线搜索框。
- 月页 `month.html?m=2026-11`：当月每篇论文一块，含方向、精读日期、中英文标题、作者与发表处、一句话结论、完整中文解读、原文／论文原件／作者博客／代码链接。右侧是粘性目录，按论文分组列出小节，滚动时高亮当前小节；顶部一条细进度线，目录底部显示阅读百分比。窄屏目录收成可折叠的一条。

## 目录结构

```
.
├── index.html                 首页：开场 + 归档索引 + 方向筛选 + 搜索
├── month.html                 月页模板：读取 ?m=YYYY-MM 渲染当月论文与目录
├── assets/
│   ├── css/style.css          全站样式（纸色底、衬线标题、发丝线、响应式）
│   ├── js/app.js              读取 data/papers.json，渲染页面、目录与阅读进度
│   └── papers/                论文原件 PDF，下载链接指向这里
├── data/
│   └── papers.json            唯一数据源：所有论文条目
├── README.md
└── .nojekyll                  告诉 GitHub Pages 不要用 Jekyll 处理
```

页面本身不含论文内容，全部由 `assets/js/app.js` 读取 `data/papers.json` 后渲染。因此每月更新只需要改一个 JSON 文件。

## 怎么新增一篇论文

在 `data/papers.json` 的 `papers` 数组里加一个对象（放数组开头或结尾都行，页面会自动按 `month` 倒序、同月按 `date` 倒序）：

```json
{
  "id": "2026-11-23-xxxx",
  "date": "2026-11-23",
  "month": "2026-11",
  "direction": "架构",
  "titleZh": "中文标题",
  "titleEn": "English Title",
  "authors": "作者、机构",
  "venue": "arXiv:xxxx.xxxxx；作者博客 YYYY-MM-DD",
  "tags": ["关键词一", "关键词二"],
  "readTime": "约 2 小时",
  "oneLine": "一句话结论。",
  "links": {
    "paper": "https://arxiv.org/abs/xxxx.xxxxx",
    "pdf": "assets/papers/xxxx.pdf",
    "blog": "https://……",
    "code": "https://github.com/……"
  },
  "body": [
    { "t": "h", "text": "小标题" },
    { "t": "p", "text": "段落。" },
    { "t": "quote", "text": "作者的英文原话", "note": "中文解释" },
    { "t": "ul", "items": ["要点一", "要点二"] },
    { "t": "callout", "text": "单独成块的一段。" }
  ]
}
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 唯一标识，建议 `日期-短名`；月页锚点 `#p-<id>` 与目录都用它 |
| `date` | 是 | 精读日期，`YYYY-MM-DD` |
| `month` | 是 | 归档月份，`YYYY-MM`；首页分组与月页 `?m=` 都认这个字段 |
| `direction` | 是 | 只能是 `架构`、`训练方法`、`Agent`、`评测` 四者之一 |
| `titleZh` / `titleEn` | 是 / 建议 | 中英文标题；英文标题以斜体衬线显示 |
| `authors` | 建议 | 作者与机构；搜索会匹配这里 |
| `venue` | 否 | 发表处、日期、博客等说明 |
| `tags` | 否 | 关键词数组，参与搜索（首页不显示） |
| `readTime` | 否 | 预留字段，当前页面不显示 |
| `oneLine` | 是 | 一句话结论，显示为引用块 |
| `links` | 是 | `paper`（原文）、`pdf`（原件，放 `assets/papers/`）、`blog`、`code`；缺哪个就不显示哪个链接 |
| `body` | 是 | 正文块数组，支持 `h` / `p` / `quote` / `ul` / `callout` 五种；`h` 会自动编号并进入右侧目录 |

注意事项：

1. `direction` 必须是四个固定方向之一，否则筛选按钮选不到它。
2. 新增 PDF 时放进 `assets/papers/`，`links.pdf` 写成 `assets/papers/文件名.pdf`（相对路径，不要以 `/` 开头）。
3. 改完可以用 `python3 -m json.tool data/papers.json > /dev/null` 检查 JSON 是否合法。
4. 每月定时任务会产出 `data/papers_YYYY-MM.json`，字段与本文件一致；把它里面的对象追加到 `papers` 数组即可，页面不用改。
5. 站点标题等信息在 `data/papers.json` 的 `site` 字段里（`title`、`subtitle`），改文案不用动 HTML。

## 本地预览

页面通过 `fetch` 读取 JSON，直接双击 `index.html`（`file://`）会被浏览器拦下，需要起一个本地服务：

```bash
cd 论文归档站
python3 -m http.server 8000
# 打开 http://localhost:8000
```

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库（公开仓库才能用免费的 Pages）。
2. 把本目录下的全部文件（`index.html`、`month.html`、`assets/`、`data/`、`README.md`、`.nojekyll`）放在仓库根目录：

   ```bash
   git init
   git add .
   git commit -m "Noema: 论文精读归档"
   git branch -M main
   git remote add origin https://github.com/<用户名>/<仓库名>.git
   git push -u origin main
   ```

3. 仓库页面 Settings → Pages，Source 选 `Deploy from a branch`，Branch 选 `main`、目录选 `/ (root)`，保存。
4. 一两分钟后访问 `https://<用户名>.github.io/<仓库名>/`；仓库名若是 `<用户名>.github.io`，地址就是 `https://<用户名>.github.io/`。
5. 以后每月只改 `data/papers.json`（和新增 PDF），提交推送后 Pages 会自动重新发布。

补充：

- 所有路径都是相对路径，放在仓库根目录或子目录都能打开。
- `.nojekyll` 是空文件，用来跳过 Jekyll 处理。
- 绑定自定义域名：Settings → Pages 填 Custom domain，并在仓库根目录加 `CNAME` 文件。

## 排版说明

字体全部用系统自带：标题走衬线栈（Iowan Old Style / Palatino / Georgia，中文落到 Songti SC、思源宋体），正文走系统无衬线（PingFang SC、思源黑体、微软雅黑）。颜色、字号、间距都集中在 `assets/css/style.css` 顶部的 `:root` 变量里：纸色底 `--paper`、墨色 `--ink`、发丝线 `--rule`、唯一强调色 `--accent`，四个方向色 `--d-arch`、`--d-train`、`--d-agent`、`--d-eval`。改主题只改这一段。

## 日报与周报（2026-11-22 新增）

站内三个板块并列：论文归档（index.html / month.html）、日报（daily.html）、周报（weekly.html）。三者共用 assets/css/style.css，各自读自己的 JSON，互不影响。

### data/daily.json

一天一个对象，字段：

- date：YYYY-MM-DD，唯一键，也是 daily.html?d=2026-11-21 的深链参数
- window：可选，覆盖时段说明
- lead：可选，一句话概述
- entries[]：当天的条目，按重要性排序
  - title：条目标题
  - category：分类（AI / 时事，可自由增加，样式自动回落为灰色）
  - points[]：两三条事实要点，一条一个字符串
  - sources[]：{ label, url }，url 为空时只显示来源名

新增一天：在 items 数组里加一个对象，date 写新日期即可；页面按日期倒序排列，不需要改任何代码。没有入库的日期直接访问会显示空状态，不会虚构内容。

### data/weekly.json

一周一个对象：

- id：周起始日（周一），如 2026-11-16，也是 weekly.html?w=2026-11-16 的深链参数
- start / end：该周首尾日期
- lead：本周主线概述
- highlights[]：本周要点，{ title, text }
- review[]：日报回顾索引，{ date, title, takeaway }，点击跳到对应日报
- reviewNote：可选，说明日报缺口
- gaps[]：遗漏热点，{ title, why, source:{ label, url } }，why 是「为什么值得关注」的一句话判断
- gapNote：可选，说明遗漏热点来源的限制
- trends[]：趋势判断，{ title, text }

新增一周：加一个对象，id 用该周周一日期。周报不复用日报正文，只保留索引与判断，缺日报的日期要在 reviewNote 里写明，不要用摘要顶替。

两份文件都支持直接手写；服务器只需要托管静态文件，没有构建步骤。
