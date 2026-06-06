const { PDFDocument } = require('pdf-lib');

/**
 * PDF 处理核心函数
 * 所有函数接收 Buffer，返回 Buffer
 */
const processPdf = {
  /**
   * 合并多个 PDF
   * @param {Buffer[]} buffers
   * @returns {Promise<Buffer>}
   */
  async merge(buffers) {
    const mergedPdf = await PDFDocument.create();
    for (const buf of buffers) {
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = await mergedPdf.copyPages(doc, doc.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }
    return Buffer.from(await mergedPdf.save());
  },

  /**
   * 按页面范围拆分 PDF
   * range 格式: "1-3,5,7-9"（1-indexed）
   * @param {Buffer} buffer
   * @param {string} rangeStr
   * @returns {Promise<Buffer>}
   */
  async split(buffer, rangeStr) {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = doc.getPageCount();
    const indices = parseRange(rangeStr, totalPages);

    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(doc, indices);
    pages.forEach(page => newPdf.addPage(page));
    return Buffer.from(await newPdf.save());
  },

  /**
   * 旋转页面
   * @param {Buffer} buffer
   * @param {number} degrees - 90 | 180 | 270
   * @param {string} pageSpec - "all" or "1,3,5"
   * @returns {Promise<Buffer>}
   */
  async rotate(buffer, degrees, pageSpec = 'all') {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = doc.getPageCount();

    let indices;
    if (pageSpec === 'all') {
      indices = Array.from({ length: totalPages }, (_, i) => i);
    } else {
      indices = parsePageList(pageSpec, totalPages);
    }

    indices.forEach(i => {
      const page = doc.getPage(i);
      const current = page.getRotation().angle;
      page.setRotation({ angle: (current + degrees) % 360 });
    });

    return Buffer.from(await doc.save());
  },

  /**
   * 添加密码保护
   * @param {Buffer} buffer
   * @param {string} password
   * @returns {Promise<Buffer>}
   */
  async protect(buffer, password) {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    doc.setOwnerPassword(password);
    doc.setUserPassword(password);
    // 限制打印/修改权限
    doc.setPermissions({ printing: 'lowResolution', modifying: false, copying: false });
    return Buffer.from(await doc.save());
  },

  /**
   * 移除密码保护
   * @param {Buffer} buffer
   * @param {string} password
   * @returns {Promise<Buffer>}
   */
  async unlock(buffer, password) {
    const doc = await PDFDocument.load(buffer, { password });
    // 用密码加载后再保存出来就没了加密
    return Buffer.from(await doc.save());
  }
};

/**
 * 解析范围字符串如 "1-3,5,7-9" → [0,1,2,4,6,7,8]（0-indexed）
 */
function parseRange(rangeStr, totalPages) {
  const parts = rangeStr.split(',').map(s => s.trim()).filter(Boolean);
  const indices = new Set();
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n));
      const from = Math.max(1, start);
      const to = Math.min(totalPages, end || start);
      for (let i = from; i <= to; i++) indices.add(i - 1);
    } else {
      const n = parseInt(part);
      if (n >= 1 && n <= totalPages) indices.add(n - 1);
    }
  }
  return [...indices].sort((a, b) => a - b);
}

/**
 * 解析页码列表 "1,3,5" → [0,2,4]（0-indexed）
 */
function parsePageList(pageSpec, totalPages) {
  return pageSpec.split(',').map(s => {
    const n = parseInt(s.trim());
    if (isNaN(n) || n < 1 || n > totalPages) return null;
    return n - 1;
  }).filter(n => n !== null);
}

module.exports = { processPdf };
