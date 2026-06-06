const fs = require('fs');
const path = require('path');
const { setCors } = require('./_utils');

const LIMIT = parseInt(process.env.FREE_DAILY_LIMIT || 3);
const USAGE_FILE = '/tmp/pdfly-usage.json';

function getUsage() {
  try {
    if (fs.existsSync(USAGE_FILE)) {
      return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveUsage(store) {
  try {
    fs.writeFileSync(USAGE_FILE, JSON.stringify(store));
  } catch {}
}

// 按天重置：每天第一次请求时清理旧数据
function getToday() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const clientId = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown';

  let store = getUsage();
  const today = getToday();

  // 如果日期变了，清空
  if (store._date !== today) {
    store = { _date: today };
  }

  const used = store[clientId] || 0;
  const remaining = Math.max(0, LIMIT - used);

  res.json({ used, limit: LIMIT, remaining, isPro: false });
};
