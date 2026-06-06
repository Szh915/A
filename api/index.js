/**
 * Vercel Serverless 入口
 * 包装 Express 应用，兼容 Vercel 无服务器环境
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processPdf } = require('../lib/pdf');
const { checkLimit, recordUsage } = require('../lib/limiter');

const app = express();
const MAX_SIZE = (process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024;

// 判断运行环境
const isVercel = !!process.env.VERCEL;
const UPLOAD_DIR = isVercel ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads');

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- File upload ---
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    cb(null, unique + '-' + file.originalname);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE }
});

// --- Helper ---
function getClientId(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.ip
    || 'unknown';
}

function cleanup(files) {
  if (!files) return;
  const list = Array.isArray(files) ? files : [files];
  list.forEach(f => {
    if (f && f.path) {
      try { fs.unlinkSync(f.path); } catch {}
    }
  });
}

// --- PDF Tool Routes (same as server.js) ---

app.post('/api/merge', upload.array('files', 10), async (req, res) => {
  try {
    const clientId = getClientId(req);
    if (!checkLimit(clientId)) {
      return res.status(402).json({ error: 'free_limit_reached', message: '今日免费次数已用完，升级 Pro 无限使用' });
    }
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: '请上传至少 2 个 PDF 文件' });
    }
    const buffers = req.files.map(f => fs.readFileSync(f.path));
    const result = await processPdf.merge(buffers);
    recordUsage(clientId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="merged.pdf"'
    });
    res.send(result);
  } catch (err) {
    console.error('Merge error:', err);
    res.status(500).json({ error: '处理失败: ' + err.message });
  } finally {
    cleanup(req.files);
  }
});

app.post('/api/split', upload.single('file'), async (req, res) => {
  try {
    const clientId = getClientId(req);
    if (!checkLimit(clientId)) {
      return res.status(402).json({ error: 'free_limit_reached', message: '今日免费次数已用完' });
    }
    if (!req.file) return res.status(400).json({ error: '请上传 PDF 文件' });
    const ranges = req.body.ranges;
    const buffer = fs.readFileSync(req.file.path);
    const result = await processPdf.split(buffer, ranges);
    recordUsage(clientId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="split.pdf"'
    });
    res.send(result);
  } catch (err) {
    console.error('Split error:', err);
    res.status(500).json({ error: '处理失败: ' + err.message });
  } finally {
    cleanup(req.file);
  }
});

app.post('/api/rotate', upload.single('file'), async (req, res) => {
  try {
    const clientId = getClientId(req);
    if (!checkLimit(clientId)) {
      return res.status(402).json({ error: 'free_limit_reached', message: '今日免费次数已用完' });
    }
    if (!req.file) return res.status(400).json({ error: '请上传 PDF 文件' });
    const degrees = parseInt(req.body.degrees) || 90;
    const pageSpec = req.body.pages || 'all';
    const buffer = fs.readFileSync(req.file.path);
    const result = await processPdf.rotate(buffer, degrees, pageSpec);
    recordUsage(clientId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="rotated.pdf"'
    });
    res.send(result);
  } catch (err) {
    console.error('Rotate error:', err);
    res.status(500).json({ error: '处理失败: ' + err.message });
  } finally {
    cleanup(req.file);
  }
});

app.post('/api/protect', upload.single('file'), async (req, res) => {
  try {
    const clientId = getClientId(req);
    if (!checkLimit(clientId)) {
      return res.status(402).json({ error: 'free_limit_reached', message: '今日免费次数已用完' });
    }
    if (!req.file) return res.status(400).json({ error: '请上传 PDF 文件' });
    const password = req.body.password;
    if (!password) return res.status(400).json({ error: '请输入密码' });
    const buffer = fs.readFileSync(req.file.path);
    const result = await processPdf.protect(buffer, password);
    recordUsage(clientId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="protected.pdf"'
    });
    res.send(result);
  } catch (err) {
    console.error('Protect error:', err);
    res.status(500).json({ error: '处理失败: ' + err.message });
  } finally {
    cleanup(req.file);
  }
});

app.post('/api/unlock', upload.single('file'), async (req, res) => {
  try {
    const clientId = getClientId(req);
    if (!checkLimit(clientId)) {
      return res.status(402).json({ error: 'free_limit_reached', message: '今日免费次数已用完' });
    }
    if (!req.file) return res.status(400).json({ error: '请上传 PDF 文件' });
    const password = req.body.password;
    if (!password) return res.status(400).json({ error: '请输入密码' });
    const buffer = fs.readFileSync(req.file.path);
    const result = await processPdf.unlock(buffer, password);
    recordUsage(clientId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="unlocked.pdf"'
    });
    res.send(result);
  } catch (err) {
    console.error('Unlock error:', err);
    res.status(500).json({ error: '处理失败: ' + err.message });
  } finally {
    cleanup(req.file);
  }
});

app.get('/api/usage', (req, res) => {
  const clientId = getClientId(req);
  const { PDFlyStore } = require('../lib/limiter');
  const used = PDFlyStore[clientId] || 0;
  const limit = parseInt(process.env.FREE_DAILY_LIMIT || 3);
  res.json({ used, limit, remaining: Math.max(0, limit - used), isPro: false });
});

// Stripe checkout (Vercel 上需要设置环境变量)
app.post('/api/create-checkout', async (req, res) => {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return res.status(500).json({ error: '支付未配置' });
    const stripe = require('stripe')(stripeKey);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.SITE_URL || 'https://' + req.headers.host}/success.html`,
      cancel_url: `${process.env.SITE_URL || 'https://' + req.headers.host}/pricing.html`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: '支付服务暂不可用' });
  }
});

// SPA fallback — 所有未匹配的 GET 返回 index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// 导出给 Vercel
module.exports = app;
