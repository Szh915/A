/**
 * PDFly — 前端工具函数
 */

// 获取今日使用量
async function fetchUsage() {
  try {
    const res = await fetch('/api/usage');
    const data = await res.json();
    return data;
  } catch {
    return { used: 0, limit: 3, remaining: 3, isPro: false };
  }
}

// 显示使用量横幅
async function showUsageBanner() {
  const el = document.getElementById('usage-banner');
  if (!el) return;
  const usage = await fetchUsage();
  el.innerHTML = `
    <span>📊 今日已使用 <span class="count">${usage.used}</span> / ${usage.limit} 次</span>
    <a href="/pricing.html" class="btn btn-primary" style="padding:6px 16px;font-size:.8rem;">
      升级 Pro →
    </a>
  `;
  if (usage.remaining === 0) {
    el.innerHTML = `
      <span>⚠️ 今日免费次数已用完</span>
      <a href="/pricing.html" class="btn btn-primary" style="padding:6px 16px;font-size:.8rem;">
        升级 Pro 无限使用 →
      </a>
    `;
  }
}

// 文件上传通用函数
function setupUploadZone(zoneId, inputId, filesContainerId, maxFiles = 10) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  const container = document.getElementById(filesContainerId);
  if (!zone || !input) return;

  let files = [];

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  input.addEventListener('change', () => handleFiles(input.files));

  function handleFiles(newFiles) {
    for (const f of newFiles) {
      if (f.type !== 'application/pdf' && !f.name.endsWith('.pdf')) {
        showAlert('只支持 PDF 文件: ' + f.name);
        continue;
      }
      if (files.length >= maxFiles) {
        showAlert('最多上传 ' + maxFiles + ' 个文件');
        break;
      }
      files.push(f);
    }
    renderFiles();
  }

  function renderFiles() {
    if (!container) return;
    if (files.length === 0) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = files.map((f, i) => `
      <div class="file-item" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--gray-50);border-radius:8px;margin-bottom:8px;border:1px solid var(--gray-200);">
        <span>📄 ${f.name} (${(f.size / 1024).toFixed(0)} KB)</span>
        <button onclick="removeFile(${i})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:1.2rem;">×</button>
      </div>
    `).join('');
  }

  window.removeFile = (index) => {
    files.splice(index, 1);
    renderFiles();
    // Rebuild FileList for the form
    const dt = new DataTransfer();
    files.forEach(f => dt.items.add(f));
    input.files = dt.files;
  };

  return {
    getFiles: () => files,
    getFormData: () => {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      return fd;
    }
  };
}

// 单文件上传
function setupSingleUpload(zoneId, inputId) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      input.files = e.dataTransfer.files;
      updateSingleFileDisplay(e.dataTransfer.files[0]);
    }
  });
  input.addEventListener('change', () => {
    if (input.files.length > 0) updateSingleFileDisplay(input.files[0]);
  });

  function updateSingleFileDisplay(file) {
    const existing = zone.querySelector('.file-selected');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'file-selected';
    div.style.cssText = 'margin-top:12px;padding:12px;background:var(--gray-50);border-radius:8px;border:1px solid var(--gray-200);';
    div.innerHTML = `📄 ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
    zone.appendChild(div);
    zone.querySelector('p').textContent = '点击更换文件';
  }

  return {
    getFile: () => input.files[0]
  };
}

// 显示消息
function showAlert(msg, type = 'error') {
  const el = document.getElementById('alert');
  if (!el) { alert(msg); return; }
  el.textContent = msg;
  el.className = 'alert alert-' + type;
}

// 显示进度条
function showProgress(pct) {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  bar.style.display = 'block';
  bar.querySelector('.fill').style.width = pct + '%';
}

// 隐藏进度条
function hideProgress() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  bar.style.display = 'none';
  bar.querySelector('.fill').style.width = '0%';
}

// 表单提交通用函数
async function submitForm(formId, endpoint, options = {}) {
  const form = document.getElementById(formId);
  if (!form) return;
  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showAlert('', 'success'); // clear
    btn.disabled = true;
    btn.innerHTML = '⏳ 处理中...';

    try {
      const formData = new FormData(form);
      // Add extra fields from options
      if (options.extraFields) {
        Object.entries(options.extraFields).forEach(([k, v]) => formData.append(k, v));
      }

      showProgress(30);

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      showProgress(80);

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 402) {
          showAlert(err.message || '免费次数已用完，请升级 Pro', 'error');
          return;
        }
        throw new Error(err.error || '处理失败');
      }

      showProgress(100);

      // Download the PDF
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = options.filename || 'output.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showAlert('✅ 处理完成！文件已下载', 'success');
    } catch (err) {
      showAlert('❌ ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
      setTimeout(hideProgress, 1000);
    }
  });
}

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
  showUsageBanner();
});
