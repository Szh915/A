const fs = require('fs');
const { parseForm, sendPdf, sendError, setCors, PDFDocument } = require('./_utils');

const LIMIT = parseInt(process.env.FREE_DAILY_LIMIT || 3);
const USAGE_FILE = '/tmp/pdfly-usage.json';

function checkLimit(clientId) {
  try {
    const store = fs.existsSync(USAGE_FILE) ? JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8')) : { _date: '' };
    const today = new Date().toISOString().slice(0, 10);
    if (store._date !== today) return true;
    return (store[clientId] || 0) < LIMIT;
  } catch { return true; }
}

function recordUsage(clientId) {
  try {
    const store = fs.existsSync(USAGE_FILE) ? JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8')) : { _date: '' };
    const today = new Date().toISOString().slice(0, 10);
    store._date = today;
    store[clientId] = (store[clientId] || 0) + 1;
    fs.writeFileSync(USAGE_FILE, JSON.stringify(store));
  } catch {}
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  try {
    const clientId = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    if (!checkLimit(clientId)) {
      return sendError(res, 402, '今日免费次数已用完，升级 Pro 无限使用');
    }

    const { fields, files } = await parseForm(req);
    if (files.length < 2) {
      return sendError(res, 400, '请上传至少 2 个 PDF 文件');
    }

    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
      const doc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
      const pages = await mergedPdf.copyPages(doc, doc.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }

    const result = Buffer.from(await mergedPdf.save());
    recordUsage(clientId);
    sendPdf(res, result, 'merged.pdf');
  } catch (err) {
    console.error('Merge error:', err);
    sendError(res, 500, '处理失败: ' + err.message);
  }
};
