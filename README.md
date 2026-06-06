# 📄 PDFly — 在线 PDF 工具箱

![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

**零注册、免安装、隐私优先的 PDF 在线工具。** 免费用户每天 3 次，Pro 订阅 ($5/月) 无限使用。

### 功能
- 📑 **合并 PDF** — 多个 PDF 合成一个
- ✂️ **拆分 PDF** — 按页码范围提取页面
- 🔄 **旋转 PDF** — 90°/180°/270° 旋转
- 🔒 **加密 PDF** — 添加密码保护
- 🔓 **解密 PDF** — 移除密码保护

---

## 🚀 一键部署（推荐）

### Railway （最简单，免费额度够用）

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template)

或手动：
1. 注册 [Railway](https://railway.app)
2. 点击 **New Project → Deploy from GitHub repo**
3. 把本项目推到你自己的 GitHub 仓库
4. Railway 自动检测 Node.js，自动 `npm install && npm start`
5. 在 Railway Dashboard 设置环境变量

### Fly.io

```bash
fly launch
fly deploy
```

### Render

1. 注册 [Render](https://render.com)
2. **New Web Service** → 连接 GitHub
3. 设置：
   - Build Command: `npm install`
   - Start Command: `node server.js`

---

## ⚙️ 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `PORT` | 否 | 端口号（默认 3000） |
| `STRIPE_SECRET_KEY` | 付费需要 | Stripe 密钥 `sk_test_...` |
| `STRIPE_PRICE_ID` | 付费需要 | Stripe 订阅价格 ID `price_...` |
| `SITE_URL` | 否 | 网站地址（用于 Stripe 回调） |
| `MAX_FILE_SIZE_MB` | 否 | 文件大小限制（默认 50） |
| `FREE_DAILY_LIMIT` | 否 | 免费用户每天次数（默认 3） |

---

## 💳 配置 Stripe 支付

1. 注册 [Stripe](https://stripe.com)
2. 创建 **Products → 订阅** 定价（建议 $5/月 或 ¥19/月）
3. 把 `sk_test_xxx` 和 `price_xxx` 填入环境变量

---

## 🛠 本地开发

```bash
# 克隆项目
git clone https://github.com/yourname/pdfly.git
cd pdfly

# 安装依赖
npm install

# 复制环境变量
cp .env.example .env
# 编辑 .env 填入你的配置

# 启动
npm start
# 访问 http://localhost:3000
```

---

## 📁 项目结构

```
pdfly/
├── server.js            # Express 主入口 + 路由
├── package.json
├── .env.example
├── lib/
│   ├── pdf.js           # PDF 处理（pdf-lib）
│   └── limiter.js       # 免费用户限频
├── public/
│   ├── index.html       # 首页
│   ├── merge.html       # 合并
│   ├── split.html       # 拆分
│   ├── rotate.html      # 旋转
│   ├── protect.html     # 加密
│   ├── unlock.html      # 解密
│   ├── pricing.html     # 定价页
│   ├── success.html     # 支付成功
│   ├── css/style.css
│   └── js/app.js
└── uploads/             # 临时文件（自动清理）
```

---

## 📈 盈利策略

| 阶段 | 动作 | 预计收入 |
|------|------|----------|
| 上线第 1 周 | 发 V2EX、Reddit r/SideProject、Product Hunt | 0-50 用户 |
| 第 1 个月 | SEO 优化（"在线合并PDF"、"PDF加密工具" 等长尾词） | $50-200/mo |
| 第 2-3 个月 | 加压缩 / Word互转 / 图片转PDF 等新工具提客单价 | $200-500/mo |
| 第 6 个月+ | 批量处理、API 接口（按量计费） | $500-2000/mo |

**关键 SEO 关键词**（搜索量大）：在线合并PDF、PDF合并工具免费、PDF加密、PDF拆分、PDF解密、PDF在线处理

---

## 🔒 隐私说明

- 文件仅在内存和服务器的临时目录处理
- **处理完成后立即清理**（定时任务每 15 分钟清理一次）
- 不上传到任何第三方
- 不记录文件内容

---

MIT License
