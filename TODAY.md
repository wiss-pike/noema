# 用 Today 发布 Noema 日报

在 Today 的连接器中启用可写的 GitHub 连接。如果需要添加自定义 MCP，服务地址为 `https://api.githubcopilot.com/mcp/`。按连接器提供的授权方式登录。若使用细粒度令牌，选择仓库 `wiss-pike/noema`，授予 Contents 读写权限，仅在连接器的鉴权字段填写。

已能运行本机 GitHub CLI 的 Today 也可以使用仓库内的 `publish_daily.py`。手机端定时运行优先使用云端可用的 GitHub 连接。

## 交给 Today 的任务

> 每天北京时间 08:00，整理过去 24 小时与 AI 研究、产品及重要科技事件有关的公开信息，编写 Noema 中文日报。每条写清发生的事实、日期和可直接打开的原始来源。只使用公开资料。缺乏可靠来源时跳过该条，当天无可核实条目时向我说明并跳过发布。
>
> 向 GitHub 仓库 wiss-pike/noema 的 main 分支提交单个文件 _data/editions/YYYY-MM-DD.json，日期按北京时间。格式参见 _data/editions/2026-11-22.json。每期写 date、lead、entries；每条写 title、category、points（字符串数组）、sources（含 label 和 HTTPS url 的对象数组）。全部使用纯文本。提交前先检查当日文件，已发布则跳过。核对新闻与来源后提交。等待 Pages 构建，打开 https://wiss-pike.github.io/noema/daily.html?d=YYYY-MM-DD 确认新标题可见，再把链接发给我。若提交或发布失败，报告具体原因。

可用一份既有日报校验连接器的读取权限。首次测试写入时用真实、已核实的当期材料，避免测试内容进入公开归档。

[GitHub 官方 MCP 服务](https://github.com/github/github-mcp-server) · [Today](https://today.ai/)
