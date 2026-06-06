/**
 * PDFly 本地开发服务器
 * 手动模拟 Vercel 路由，按请求路径调用对应的 api/*.js
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 把原始请求转发给 Vercel 风格的函数
// 需要在 Express 里拿到 raw body
app.use('/api', express.raw({ type: '*/*', limit: '100mb' }));

// API 路由映射
const apiRoutes = {
  'GET /api/usage': require('./api/usage'),
  'POST /api/merge': require('./api/merge'),
  'POST /api/split': require('./api/split'),
  'POST /api/rotate': require('./api/rotate'),
  'POST /api/protect': require('./api/protect'),
  'POST /api/unlock': require('./api/unlock'),
  'POST /api/create-checkout': require('./api/create-checkout'),
};

app.all('/api/:name', (req, res) => {
  const key = `${req.method} /api/${req.params.name}`;
  const handler = apiRoutes[key];
  if (handler) {
    return handler(req, res);
  }
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`📄 PDFly running at http://localhost:${PORT}`);
});
