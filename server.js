/**
 * PDFly 本地启动入口
 * 实际逻辑在 api/index.js（兼容 Vercel 和本地）
 */
require('dotenv').config();
const app = require('./api/index');

const PORT = process.env.PORT || 3000;

// Vercel 环境下不自己启动（由平台管理）
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`📄 PDFly running at http://localhost:${PORT}`);
  });
}
