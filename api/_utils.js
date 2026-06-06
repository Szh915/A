/**
 * 通用工具函数 — 供 Vercel serverless functions 使用
 */
const { PDFDocument } = require('pdf-lib');
const Busboy = require('busboy');
const { Writable } = require('stream');

/**
 * 从 Vercel 请求中解析 multipart/form-data
 * @param {import('http').IncomingMessage} req - Vercel 会注入 rawBody
 * @returns {Promise<{fields: Object, files: Array<{fieldName, originalName, buffer, mimeType}>}>}
 */
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = [];
    let bb;

    try {
      bb = Busboy({ headers: req.headers });
    } catch (e) {
      // 如果解析不了，从 rawBody 读取
      return resolve({ fields: req.body || {}, files: [] });
    }

    bb.on('field', (name, val) => { fields[name] = val; });

    bb.on('file', (fieldName, stream, { filename, encoding, mimeType }) => {
      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => {
        files.push({ fieldName, originalName: filename, buffer: Buffer.concat(chunks), mimeType });
      });
    });

    bb.on('finish', () => resolve({ fields, files }));
    bb.on('error', reject);

    // Vercel serverless: rawBody 是 Buffer
    if (req.rawBody) {
      bb.end(req.rawBody);
    } else {
      // fallback: 收集 request stream
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        bb.end(Buffer.concat(chunks));
      });
    }
  });
}

/**
 * 返回 PDF 响应
 */
function sendPdf(res, buffer, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(buffer);
}

/**
 * 返回 JSON 错误
 */
function sendError(res, status, message) {
  res.status(status).json({ error: message });
}

/**
 * 允许跨域
 */
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = { parseForm, sendPdf, sendError, setCors, PDFDocument };
