const fs = require('fs');
const { parseForm, sendPdf, sendError, setCors, PDFDocument } = require('./_utils');

const L=parseInt(process.env.FREE_DAILY_LIMIT||3), F='/tmp/pdfly-usage.json';
function ck(i) { try { const s=fs.existsSync(F)?JSON.parse(fs.readFileSync(F,'utf-8')):{_date:''}; const t=new Date().toISOString().slice(0,10); if(s._date!==t) return 1; return (s[i]||0)<L; } catch { return 1; } }
function rc(i) { try { const s=fs.existsSync(F)?JSON.parse(fs.readFileSync(F,'utf-8')):{_date:''}; const t=new Date().toISOString().slice(0,10); s._date=t; s[i]=(s[i]||0)+1; fs.writeFileSync(F,JSON.stringify(s)); } catch {} }

module.exports = async (req, res) => {
  setCors(res);
  if (req.method==='OPTIONS') return res.status(200).end();
  if (req.method!=='POST') return sendError(res,405);

  try {
    const cid = req.headers['x-forwarded-for']?.split(',')[0]?.trim()||'unknown';
    if (!ck(cid)) return sendError(res,402,'免费次数已用完');

    const {fields,files} = await parseForm(req);
    if (!files.length) return sendError(res,400,'请上传 PDF');
    const pw = fields.password;
    if (!pw) return sendError(res,400,'请输入密码');

    const doc = await PDFDocument.load(files[0].buffer, {ignoreEncryption:true});
    doc.setOwnerPassword(pw);
    doc.setUserPassword(pw);
    doc.setPermissions({printing:'lowResolution',modifying:false,copying:false});

    record(cid);
    sendPdf(res, Buffer.from(await doc.save()), 'protected.pdf');
  } catch (err) {
    console.error('Protect error:', err);
    sendError(res,500,'处理失败: '+err.message);
  }
};
