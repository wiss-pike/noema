# Noema · 诺埃玛

[打开站点](https://wiss-pike.github.io/noema/) · [设置 Today 每日发布](TODAY.md)

Noema 收录 AI 论文精读、每日简报和每周回顾。首页展示最近收录的论文和最新日报。论文支持按方向和关键词查找，月页提供分节目录、阅读进度、原文和 PDF。

## 内容与发布

| 栏目 | 编辑位置 | 公开入口 |
| --- | --- | --- |
| 日报 | 每天一个 `_data/editions/YYYY-MM-DD.json` | `daily.html?d=YYYY-MM-DD` |
| 周报 | `data/weekly.json` | `weekly.html?w=YYYY-MM-DD` |
| 精读 | `data/papers.json`，原件放在 `assets/papers/` | `month.html?m=YYYY-MM#p-论文ID` |

在 `main` 分支提交后，GitHub Pages 的 Jekyll 构建会将单期日报汇总到 `data/daily.json`。保留根目录分支发布模式和 Jekyll 处理。日报题名、事实和来源的格式可参考任一期文件。周报和论文沿用各自 JSON 中的既有格式。

## 本地预览

在仓库根目录运行 `python preview.py`，打开 <http://127.0.0.1:8000>。预览服务器会生成与线上相同字段的日报索引。页面使用系统字体、本地插图和原生 JavaScript。

## 发布一份日报

先运行 `python publish_daily.py edition.json --check` 检查日期、正文结构与来源链接。已通过 GitHub CLI 登录且拥有本仓库写权限的环境，可运行 `python publish_daily.py edition.json`。同日期相同内容会跳过提交，修订使用 GitHub 返回的文件版本核对并发写入。
