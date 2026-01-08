# InsureInsight AI - 保险需求分析专家

专业保险领域需求分析平台，基于 Google Gemini 3.0 全模态模型构建。

## 🛠 部署指南 (针对 GitHub Pages)

### 1. 准备工作
- 确保你在正确的项目文件夹内（不要在电脑主目录运行 Git）。
- 确保你的 GitHub 仓库 `bxxqfx` 已经创建。

### 2. 推送代码
```bash
git init
git add .
git commit -m "Initial release"
git branch -M main
git remote add origin https://github.com/moonxing99/bxxqfx.git
git push -u origin main -f
```

### 3. 配置 API Key (必须)
1. 进入 GitHub 仓库 -> **Settings** -> **Secrets and variables** -> **Actions**。
2. 点击 **New repository secret**。
3. Name 填 `API_KEY`，Value 填你的 Gemini API Key。

### 4. 开启网页
- 推送成功后，点击仓库顶部的 **Actions** 观察进度。
- 待任务变绿后，进入 **Settings** -> **Pages**。
- 将 **Branch** 设置为 `gh-pages` 分支并点击 **Save**。

## ❓ 常见问题排查

### 报错：`error: src refspec main does not match any`
- **原因**：本地没有任何提交记录，或者你在一个错误的目录（如系统根目录）操作。
- **解决方法**：
  1. 运行 `git status` 检查是否有文件待提交。
  2. 确保运行了 `git add .` 和 `git commit -m "message"`。
  3. 确认当前分支名是否为 `main` (通过 `git branch` 查看)。

### 网页打开是白屏？
- 检查 `vite.config.ts` 中的 `base` 路径是否与仓库名一致。
- 检查浏览器控制台是否有 404 错误。
