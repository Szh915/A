const fs = require('fs');
const { parseForm, sendPdf, sendError, setCors, PDFDocument } = require('./_utils');

const LIMIT = parseInt(process.env.FREE_DAILY_LIMIT || 3);
const USAGE_FILE = '/tmp/pdfly-usage.json';

function check(clientId) {
  try {
    const s = fs.existsSync(USAGE_FILE) ? JSON.parse(fs.readFileSync(USAGE_FILE,'utf-8')) : {_date:''};
    const t = new Date().toISOString().slice(0,10);
    if (s._date !== t) return true;
    return (s[clientId]||0) < LIMIT;
  } catch { return true; }
}
function record(clientId) {
  try {
    const s = fs.existsSync(USAGE_FILE) ? JSON.parse(fs.readFileSync(USAGE_FILE,'utf-8')) : {_date:''};
    const t = new Date().toISOString().slice(0,10);
    s._date = t; s[clientId] = (s[clientId]||0) + 1;
    fs.writeFileSync(USAGE_FILE, JSON.stringify(s));
  } catch {}
}

function parseRange(r, total) {
  const parts = r.split(',').map(s=>s.trim()).filter(Boolean);
  const set = new Set();
  for (const p of parts) {
    if (p.includes('-')) {
      const [a,b] = p.split('-').map(n=>parseInt(n));
      const from = Math.max(1,a), to = Math.min(total, b||a);
      for (let i=from; i<=to; i++) set.add(i-1);
    } else {
      const n = parseInt(p);
      if (n>=1 && n<=total) set.add(n-1);
    }
  }
  return [...set].sort((a,b)=>a-b);
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res,405,'Method not allowed');

  try {
    const cid = req.headers['x-forwarded-for']?.split(',')[0]?.trim()||'unknown';
    if (!check(cid)) return sendError(res,402,'今日免费次数已用完');

    const {fields,files} = await parseForm(req);
    if (!files.length) return sendError(res,400,'请上传 PDF 文件');

    const doc = await PDFDocument.load(files[0].buffer, {ignoreEncryption:true});
    const ranges = fields.ranges || '1';
    const indices = parseRange(ranges, doc.getPageCount());

    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(doc, indices);
    pages.forEach(p => newPdf.addPage(p));

    record(cid);
    sendPdf(res, Buffer.from(await newPdf.save()), 'split.pdf');
  } catch (err) {
    console.error('Split error:', err);
    sendError(res,500,'处理失败: '+err.message);
  }
};
