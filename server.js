require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { processPdf } = require('./lib/pdf');
const { checkLimit, recordUsage } = require('./lib/limiter');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_SIZE = (process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- File upload ---
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    cb(null, unique + '-' + file.originalname);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE }
});

// --- Helper: get client ID (IP + cookie fallback) ---
function getClientId(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.ip
    || 'unknown';
}

// --- PDF Tool Routes ---

// Merge PDFs
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
    sendPdf(res, result, 'merged.pdf');
  } catch (err) {
    console.error('Merge error:', err);
    res.status(500).json({ error: '处理失败: ' + err.message });
  } finally {
    cleanup(req.files);
  }
});

// Split PDF by page ranges
app.post('/api/split', upload.single('file'), async (req, res) => {
  try {
    const clientId = getClientId(req);
    if (!checkLimit(clientId)) {
      return res.status(402).json({ error: 'free_limit_reached', message: '今日免费次数已用完' });
    }
    if (!req.file) return res.status(400).json({ error: '请上传 PDF 文件' });
    const ranges = req.body.ranges; // "1-3,5,7-9"
    const buffer = fs.readFileSync(req.file.path);
    const result = await processPdf.split(buffer, ranges);
    recordUsage(clientId);
    sendPdf(res, result, 'split.pdf');
  } catch (err) {
    console.error('Split error:', err);
    res.status(500).json({ error: '处理失败: ' + err.message });
  } finally {
    cleanup(req.file);
  }
});

// Rotate pages
app.post('/api/rotate', upload.single('file'), async (req, res) => {
  try {
    const clientId = getClientId(req);
    if (!checkLimit(clientId)) {
      return res.status(402).json({ error: 'free_limit_reached', message: '今日免费次数已用完' });
    }
    if (!req.file) return res.status(400).json({ error: '请上传 PDF 文件' });
    const degrees = parseInt(req.body.degrees) || 90;
    const pageSpec = req.body.pages || 'all'; // "all" or "1,3,5"
    const buffer = fs.readFileSync(req.file.path);
    const result = await processPdf.rotate(buffer, degrees, pageSpec);
    recordUsage(clientId);
    sendPdf(res, result, 'rotated.pdf');
  } catch (err) {
    console.error('Rotate error:', err);
    res.status(500).json({ error: '处理失败: ' + err.message });
  } finally {
    cleanup(req.file);
  }
});

// Protect (add password)
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
    sendPdf(res, result, 'protected.pdf');
  } catch (err) {
    console.error('Protect error:', err);
    res.status(500).json({ error: '处理失败: ' + err.message });
  } finally {
    cleanup(req.file);
  }
});

// Unlock (remove password)
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
    sendPdf(res, result, 'unlocked.pdf');
  } catch (err) {
    console.error('Unlock error:', err);
    res.status(500).json({ error: '处理失败: ' + err.message });
  } finally {
    cleanup(req.file);
  }
});

// Get usage info
app.get('/api/usage', (req, res) => {
  const clientId = getClientId(req);
  const { PDFlyStore } = require('./lib/limiter');
  const used = PDFlyStore[clientId] || 0;
  const limit = parseInt(process.env.FREE_DAILY_LIMIT || 3);
  res.json({ used, limit, remaining: Math.max(0, limit - used), isPro: false });
});

// --- Helpers ---
function sendPdf(res, buffer, filename) {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': buffer.length
  });
  res.send(buffer);
}

function cleanup(files) {
  if (!files) return;
  const list = Array.isArray(files) ? files : [files];
  list.forEach(f => {
    if (f && f.path) {
      fs.unlink(f.path, () => {});
    }
  });
}

// --- Periodic cleanup of uploads (every 15 min) ---
setInterval(() => {
  const uploadDir = path.join(__dirname, 'uploads');
  fs.readdir(uploadDir, (err, files) => {
    if (err) return;
    const now = Date.now();
    files.forEach(file => {
      const fp = path.join(uploadDir, file);
      fs.stat(fp, (err, stat) => {
        if (err) return;
        if (now - stat.mtimeMs > 30 * 60 * 1000) { // older than 30 min
          fs.unlink(fp, () => {});
        }
      });
    });
  });
}, 15 * 60 * 1000);

// --- Stripe checkout (placeholder, wire up when you have a Stripe account) ---
app.post('/api/create-checkout', async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.SITE_URL || 'http://localhost:3000'}/success.html`,
      cancel_url: `${process.env.SITE_URL || 'http://localhost:3000'}/pricing.html`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: '支付服务暂不可用' });
  }
});

app.listen(PORT, () => {
  console.log(`📄 PDFly running at http://localhost:${PORT}`);
});
