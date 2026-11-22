# Today 每日发布

Today 已有的「每日 AI 与时事热点简报」在北京时间 08:00 运行。在 Today 的「任务 → 定时任务」中可以查看执行时间、发布指令及运行记录。

## 发布流程

1. 根据原任务的来源和选题要求写好手机简报，取其中可公开的内容写入 `_data/editions/YYYY-MM-DD.json`。格式可以参考同目录下的历史稿件。
2. 在仓库工作区运行 `python3 publish_daily.py _data/editions/YYYY-MM-DD.json --check`。每条新闻需附可查阅的 HTTPS 来源。当期确认没有重要进展时，可以将 `lead` 写成「今天平静」，`entries` 写成空数组。
3. 使用云端专用 SSH 部署密钥，将该日文件提交到 `wiss-pike/noema` 的 `main` 分支。内容相同则跳过。与他人同时修改时，先重新读取远端再核对，避免覆盖已有修订。
4. GitHub Pages 构建完成后，核对公开汇总 `data/daily.json` 中的日期和正文，再在手机简报中附当天的阅读链接。

## 管理授权

GitHub 仓库 Settings → Deploy keys 中的 `Today Cloud - Noema daily editions` 对此仓库拥有写权限。删除该项会立即撤销此密钥的后续 GitHub 访问。私钥保存在 Today 云端，公开仓库不保存凭据。

[公开日报](https://wiss-pike.github.io/noema/daily.html) · [部署密钥设置](https://github.com/wiss-pike/noema/settings/keys)
