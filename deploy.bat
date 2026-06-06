@echo off
chcp 65001 >nul
title PDFly 一键部署助手

echo ========================================
echo   📄 PDFly — 一键部署到 GitHub
echo ========================================
echo.
echo 第一步：打开 https://github.com/new
echo   - Repository name: pdfly
echo   - 不要选任何模板，直接点 Create
echo.
echo 创建后你会看到一个 URL 如：
echo   https://github.com/你的用户名/pdfly.git
echo.
echo ========================================
set /p GITURL="粘贴那个 URL 然后回车: "

if "%GITURL%"=="" (
  echo 没有输入 URL，取消部署
  pause
  exit /b
)

echo.
echo 正在推送到 GitHub...
"C:\Program Files\Git\cmd\git.exe" -C "%~dp0" remote add origin %GITURL%
"C:\Program Files\Git\cmd\git.exe" -C "%~dp0" branch -M main
"C:\Program Files\Git\cmd\git.exe" -C "%~dp0" push -u origin main

if %ERRORLEVEL% neq 0 (
  echo.
  echo ❌ 推送失败。可能原因：
  echo   1. GitHub 还没登录（会弹登录窗口）
  echo   2. URL 不对
  echo   3. 仓库已存在同名内容
  pause
  exit /b
)

echo.
echo ✅ 推送成功！
echo.
echo ========================================
echo   下一步：部署到 Railway
echo ========================================
echo.
echo 1. 打开 https://railway.app 注册账号
echo 2. 点 "New Project" → "Deploy from GitHub repo"
echo 3. 选择你刚创建的 pdfly 仓库
echo 4. Railway 会自动检测 Node.js 并部署
echo 5. 部署成功后设置环境变量：
echo    STRIPE_SECRET_KEY=sk_live_xxx
echo    STRIPE_PRICE_ID=price_xxx
echo    SITE_URL=https://你的域名.com
echo.
echo ========================================
echo   赚钱步骤
echo ========================================
echo.
echo 1. 注册 Stripe → 创建一个订阅产品（¥19/月）
echo 2. 买个域名指向 Railway（可选但推荐）
echo 3. 发到 V2EX、掘金、Reddit r/SideProject
echo 4. SEO 优化：在 README 的基础上加博客文章
echo.
echo 你的项目在：%~dp0
echo.
pause
