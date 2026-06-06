const fs = require('fs');
const { parseForm, sendPdf, sendError, setCors, PDFDocument } = require('./_utils');

const LIMIT = parseInt(process.env.FREE_DAILY_LIMIT||3), UF='/tmp/pdfly-usage.json';
function ck(id) { try { const s=fs.existsSync(UF)?JSON.parse(fs.readFileSync(UF,'utf-8')):{_date:''}; const t=new Date().toISOString().slice(0,10); if(s._date!==t) return true; return (s[id]||0)<LIMIT; } catch { return true; } }
function rc(id) { try { const s=fs.existsSync(UF)?JSON.parse(fs.readFileSync(UF,'utf-8')):{_date:''}; const t=new Date().toISOString().slice(0,10); s._date=t; s[id]=(s[id]||0)+1; fs.writeFileSync(UF,JSON.stringify(s)); } catch {} }

module.exports = async (req, res) => {
  setCors(res);
  if (req.method==='OPTIONS') return res.status(200).end();
  if (req.method!=='POST') return sendError(res,405,'Method not allowed');

  try {
    const cid = req.headers['x-forwarded-for']?.split(',')[0]?.trim()||'unknown';
    if (!ck(cid)) return sendError(res,402,'今日免费次数已用完');

    const {fields,files} = await parseForm(req);
    if (!files.length) return sendError(res,400,'请上传 PDF 文件');

    const doc = await PDFDocument.load(files[0].buffer, {ignoreEncryption:true});
    const degrees = parseInt(fields.degrees)||90;
    const pageSpec = fields.pages||'all';
    const total = doc.getPageCount();

    let indices;
    if (pageSpec==='all') indices = Array.from({length:total},(_,i)=>i);
    else indices = pageSpec.split(',').map(s=>{const n=parseInt(s.trim()); return (n>=1&&n<=total)?n-1:null}).filter(n=>n!==null);

    indices.forEach(i => {
      const p = doc.getPage(i);
      const cur = p.getRotation().angle;
      p.setRotation({angle: (cur+degrees)%360});
    });

    record(cid);
    sendPdf(res, Buffer.from(await doc.save()), 'rotated.pdf');
  } catch (err) {
    console.error('Rotate error:', err);
    sendError(res,500,'处理失败: '+err.message);
  }
};
