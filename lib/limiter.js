/**
 * 免费用户频率限制器
 * 内存存储，重启重置。生产环境可换成 Redis。
 */
const LIMIT = parseInt(process.env.FREE_DAILY_LIMIT || 3);

// In-memory store: { [clientId]: count }
const PDFlyStore = {};

// Reset daily counter (if installed as cron or can be called)
function resetAll() {
  Object.keys(PDFlyStore).forEach(k => delete PDFlyStore[k]);
}

function checkLimit(clientId) {
  const current = PDFlyStore[clientId] || 0;
  return current < LIMIT;
}

function recordUsage(clientId) {
  if (!PDFlyStore[clientId]) {
    PDFlyStore[clientId] = 1;
  } else {
    PDFlyStore[clientId]++;
  }
}

module.exports = { checkLimit, recordUsage, resetAll, PDFlyStore };
