(function () {
  const IS_HOME = /\/home\/?$/.test(location.pathname);
  const IS_ABOUT = /\/aboutPage/.test(location.pathname);
  if (!IS_HOME && !IS_ABOUT) return;

  const ROOT_ID = 'iflyrec-exporter-root';
  if (document.getElementById(ROOT_ID)) return;

  const VERSION = chrome.runtime.getManifest().version;

  const DB_NAME = 'iflyrec-exporter';
  const STORE_NAME = 'handles';
  const KEY = 'targetDir';

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveHandle(handle) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function loadHandle() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function getTargetDir() {
    let handle = await loadHandle();
    if (handle) {
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') return handle;
      const reqPerm = await handle.requestPermission({ mode: 'readwrite' });
      if (reqPerm === 'granted') return handle;
      console.warn('[iflyrec-exporter] 已保存的文件夹权限被拒绝,重新选择');
      handle = null;
    }
    handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await saveHandle(handle);
    return handle;
  }

  function sanitizeFilename(name) {
    return (name || 'transcript').replace(/[\\/:*?"<>|\n\r]/g, '').trim().slice(0, 80);
  }

  function formatDate(ms) {
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }

  function extractText(transcript) {
    const roleMap = {};
    (transcript.roles || []).forEach(r => { roleMap[r.role] = r.name; });
    const lines = [];
    (transcript.ps || []).forEach(seg => {
      const speaker = roleMap[seg.role] || `说话人${seg.role}`;
      const text = (seg.words || []).map(w => w.text || '').join('');
      if (text.trim()) lines.push(`**${speaker}**：${text}`);
    });
    return lines.join('\n\n');
  }

  async function writeFile(dirHandle, filename, content) {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async function fetchTranscriptMarkdown(orderId, fileSource, originAudioId) {
    const apiUrl = `https://www.iflyrec.com/XFTJWebAdaptService/v1/hyjy/${orderId}/transcriptResults/16?fileSource=${fileSource}&originAudioId=${originAudioId}`;
    const res = await fetch(apiUrl, { credentials: 'include' });
    const data = await res.json();
    if (data.code !== '000000' || !data.biz || !data.biz.transcriptResult) {
      throw new Error('接口返回异常: ' + (data.desc || '未知错误'));
    }
    const transcript = JSON.parse(data.biz.transcriptResult);
    const md = extractText(transcript);
    if (!md) throw new Error('解析出的正文为空');
    return { md, saveTime: data.biz.saveTime };
  }

  function findRecordsArray(obj) {
    if (Array.isArray(obj)) {
      if (obj.length > 0 && obj[0] && typeof obj[0] === 'object' && 'orderId' in obj[0]) return obj;
      return null;
    }
    if (obj && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        const found = findRecordsArray(obj[key]);
        if (found) return found;
      }
    }
    return null;
  }

  // returns {parent, key} where parent[key] is the records array, for pagination diagnostics
  function findRecordsArrayContainer(obj) {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (Array.isArray(val) && val.length > 0 && val[0] && typeof val[0] === 'object' && 'orderId' in val[0]) {
          return { parent: obj, key };
        }
        if (val && typeof val === 'object') {
          const found = findRecordsArrayContainer(val);
          if (found) return found;
        }
      }
    }
    return null;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ---------- aboutPage: single export ----------
  function initAboutPage() {
    const wrapper = document.createElement('div');
    wrapper.id = ROOT_ID;
    Object.assign(wrapper.style, {
      position: 'fixed', top: '16px', right: '90px', zIndex: 999999,
      display: 'flex', alignItems: 'center', gap: '8px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'
    });
    document.body.appendChild(wrapper);

    const changeBtn = document.createElement('button');
    changeBtn.textContent = '📁 存放位置';
    changeBtn.title = '设置/更换导出目标文件夹(不会触发导出)';
    Object.assign(changeBtn.style, {
      padding: '8px 12px', background: '#fff', color: '#475569',
      border: '1px solid #cbd5e1', borderRadius: '999px', fontSize: '12px',
      cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.12)'
    });
    wrapper.appendChild(changeBtn);

    const btn = document.createElement('button');
    btn.textContent = `⬇ 导出转写 v${VERSION}`;
    Object.assign(btn.style, {
      padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none',
      borderRadius: '999px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(37,99,235,0.35)', transition: 'opacity 0.15s'
    });
    btn.addEventListener('mouseenter', () => { btn.style.opacity = '0.85'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '1'; });
    wrapper.appendChild(btn);

    function guessMeetingTitle() {
      const el = document.getElementById('m2OrderShowName');
      return el ? (el.textContent || '').trim() : null;
    }

    async function pickFolderOnly() {
      changeBtn.disabled = true;
      const originalText = changeBtn.textContent;
      try {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        await saveHandle(handle);
        changeBtn.textContent = '✓ 已设置: ' + handle.name;
        setTimeout(() => { changeBtn.textContent = originalText; }, 2500);
      } catch (err) {
        if (err.name !== 'AbortError') alert('选择文件夹失败: ' + err.message);
      } finally {
        changeBtn.disabled = false;
      }
    }

    async function exportTranscript() {
      const params = new URLSearchParams(location.search);
      const orderId = params.get('orderId');
      const fileSource = params.get('fileSource') || 'hj';
      const originAudioId = params.get('originAudioId');

      if (!orderId || !originAudioId) {
        alert('URL 参数不全,无法导出。请确认当前页面是转写详情页。');
        return;
      }

      btn.textContent = '导出中…';
      btn.disabled = true;
      changeBtn.disabled = true;

      try {
        const dirHandle = await getTargetDir();
        const { md, saveTime } = await fetchTranscriptMarkdown(orderId, fileSource, originAudioId);
        const dateStr = formatDate(saveTime || Date.now());
        const namePart = sanitizeFilename(guessMeetingTitle()) || orderId;
        const filename = `${dateStr}_${namePart}.md`;
        await writeFile(dirHandle, filename, md);
        alert(`已存入所选文件夹: ${filename}`);
      } catch (err) {
        if (err.name !== 'AbortError') alert('导出失败: ' + err.message);
      } finally {
        btn.textContent = `⬇ 导出转写 v${VERSION}`;
        btn.disabled = false;
        changeBtn.disabled = false;
      }
    }

    btn.addEventListener('click', exportTranscript);
    changeBtn.addEventListener('click', pickFolderOnly);
  }

  // ---------- home: batch export ----------
  function initHomePage() {
    const wrapper = document.createElement('div');
    wrapper.id = ROOT_ID;
    Object.assign(wrapper.style, {
      position: 'fixed', top: '16px', right: '24px', zIndex: 999999,
      display: 'flex', alignItems: 'center', gap: '8px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'
    });
    document.body.appendChild(wrapper);

    const folderBtn = document.createElement('button');
    folderBtn.textContent = '📁 存放位置';
    folderBtn.title = '设置/更换导出目标文件夹(不会触发导出)';
    Object.assign(folderBtn.style, {
      padding: '8px 12px', background: '#fff', color: '#475569',
      border: '1px solid #cbd5e1', borderRadius: '999px', fontSize: '12px',
      cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.12)'
    });
    wrapper.appendChild(folderBtn);

    async function pickFolderOnly() {
      folderBtn.disabled = true;
      const originalText = folderBtn.textContent;
      try {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        await saveHandle(handle);
        folderBtn.textContent = '✓ 已设置: ' + handle.name;
        setTimeout(() => { folderBtn.textContent = originalText; }, 2500);
      } catch (err) {
        if (err.name !== 'AbortError') alert('选择文件夹失败: ' + err.message);
      } finally {
        folderBtn.disabled = false;
      }
    }
    folderBtn.addEventListener('click', pickFolderOnly);

    const btn = document.createElement('button');
    btn.textContent = `📦 批量导出 v${VERSION}`;
    Object.assign(btn.style, {
      padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none',
      borderRadius: '999px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(37,99,235,0.35)'
    });
    wrapper.appendChild(btn);

    let panel = null;

    async function fetchListPage(cursor) {
      const res = await fetch('https://www.iflyrec.com/XFTJWebAdaptService/v2/hjProcess/recentOperationFiles', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          favoriteStatus: '',
          fileRights: [],
          fileSource: [],
          fileType: [],
          lockStatus: [],
          orderName: '',
          scrollDownQueryParam: cursor || null,
          scrollUpQueryParam: null
        })
      });
      const data = await res.json();
      const records = findRecordsArray(data) || [];
      const container = findRecordsArrayContainer(data);
      const total = container && typeof container.parent.count === 'number' ? container.parent.count : null;
      const nextCursor = container ? container.parent.scrollDownQueryParam : null;
      return { records, nextCursor, total };
    }

    async function openPanel() {
      btn.disabled = true;
      btn.textContent = '加载列表中…';
      let firstPage;
      try {
        firstPage = await fetchListPage(null);
        console.log(`[iflyrec-exporter] 首页加载 ${firstPage.records.length} 条,共 ${firstPage.total}`);
      } catch (err) {
        alert('拉取文件列表失败: ' + err.message + '\n请截图控制台发给Claude诊断。');
        console.error('[iflyrec-exporter] list fetch error', err);
        btn.disabled = false;
        btn.textContent = `📦 批量导出 v${VERSION}`;
        return;
      }
      btn.disabled = false;
      btn.textContent = `📦 批量导出 v${VERSION}`;
      renderPanel(firstPage);
    }

    function renderPanel(firstPage) {
      if (panel) panel.remove();
      panel = document.createElement('div');
      Object.assign(panel.style, {
        position: 'fixed', top: '0', right: '0', bottom: '0', width: '360px',
        zIndex: 999998, background: '#fff', borderLeft: '1px solid #e2e8f0',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
        fontSize: '13px'
      });

      const header = document.createElement('div');
      Object.assign(header.style, { padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
      const titleEl = document.createElement('strong');
      titleEl.style.fontSize = '14px';
      titleEl.textContent = '批量导出转写';
      const closeX = document.createElement('button');
      closeX.textContent = '✕';
      Object.assign(closeX.style, { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#64748b' });
      closeX.addEventListener('click', () => panel.remove());
      header.appendChild(titleEl);
      header.appendChild(closeX);
      panel.appendChild(header);

      const countLine = document.createElement('div');
      Object.assign(countLine.style, { padding: '0 16px 8px', fontSize: '12px', color: '#94a3b8' });
      panel.appendChild(countLine);

      const toolbar = document.createElement('div');
      Object.assign(toolbar.style, { padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px', flexWrap: 'wrap' });

      const selectAllBtn = document.createElement('button');
      selectAllBtn.textContent = '全选(已加载)';
      Object.assign(selectAllBtn.style, {
        padding: '5px 10px', background: '#fff', color: '#475569', border: '1px solid #cbd5e1',
        borderRadius: '999px', fontSize: '12px', cursor: 'pointer'
      });
      toolbar.appendChild(selectAllBtn);
      panel.appendChild(toolbar);

      const list = document.createElement('div');
      Object.assign(list.style, { flex: '1', overflowY: 'auto', padding: '8px 16px' });
      panel.appendChild(list);

      const loadingMoreEl = document.createElement('div');
      Object.assign(loadingMoreEl.style, { textAlign: 'center', padding: '8px', fontSize: '12px', color: '#94a3b8', display: 'none' });
      loadingMoreEl.textContent = '加载中…';

      const state = {
        checkboxes: [],
        rowByOrderId: {},
        nextCursor: firstPage.nextCursor,
        total: firstPage.total,
        loadedCount: 0,
        loadingMore: false,
        exhausted: !firstPage.nextCursor
      };

      function updateCountLine() {
        countLine.textContent = state.total != null
          ? `已加载 ${state.loadedCount} / ${state.total} 条`
          : `已加载 ${state.loadedCount} 条`;
      }

      function appendRecords(records) {
        records.forEach(rec => {
          if (state.rowByOrderId[rec.orderId]) return;
          const row = document.createElement('label');
          Object.assign(row.style, { display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' });
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.dataset.orderId = rec.orderId;
          Object.assign(cb.style, { marginTop: '2px' });
          state.checkboxes.push({ cb, rec });
          state.rowByOrderId[rec.orderId] = row;
          const text = document.createElement('div');
          const dateStr = rec.lastOperateTime || rec.createTime ? new Date(rec.lastOperateTime || rec.createTime).toLocaleDateString() : '';
          text.innerHTML = `<div>${(rec.orderName || rec.orderId)}</div><div style="color:#94a3b8;font-size:11px;">${dateStr}</div>`;
          row.appendChild(cb);
          row.appendChild(text);
          list.insertBefore(row, loadingMoreEl);
        });
        state.loadedCount = state.checkboxes.length;
        updateCountLine();
      }

      list.appendChild(loadingMoreEl);
      appendRecords(firstPage.records);

      async function loadMore() {
        if (state.loadingMore || state.exhausted) return;
        state.loadingMore = true;
        loadingMoreEl.style.display = 'block';
        try {
          const page = await fetchListPage(state.nextCursor);
          console.log(`[iflyrec-exporter] 追加加载 ${page.records.length} 条`);
          if (page.records.length === 0 || !page.nextCursor) state.exhausted = true;
          state.nextCursor = page.nextCursor;
          if (page.total != null) state.total = page.total;
          appendRecords(page.records);
        } catch (err) {
          console.error('[iflyrec-exporter] 加载更多失败', err);
        } finally {
          state.loadingMore = false;
          loadingMoreEl.style.display = 'none';
        }
      }

      list.addEventListener('scroll', () => {
        if (list.scrollTop + list.clientHeight >= list.scrollHeight - 80) loadMore();
      });

      let allSelected = false;
      selectAllBtn.addEventListener('click', () => {
        allSelected = !allSelected;
        state.checkboxes.forEach(({ cb }) => { cb.checked = allSelected; });
        selectAllBtn.textContent = allSelected ? '全不选' : '全选(已加载)';
      });

      const footer = document.createElement('div');
      Object.assign(footer.style, { padding: '12px 16px', borderTop: '1px solid #e2e8f0' });
      const exportBtn = document.createElement('button');
      exportBtn.textContent = '⬇ 导出选中项';
      Object.assign(exportBtn.style, {
        width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none',
        borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
      });
      const status = document.createElement('div');
      Object.assign(status.style, { marginTop: '8px', fontSize: '12px', color: '#64748b', whiteSpace: 'pre-line' });
      footer.appendChild(exportBtn);
      footer.appendChild(status);
      panel.appendChild(footer);

      exportBtn.addEventListener('click', async () => {
        const selected = state.checkboxes.filter(({ cb }) => cb.checked).map(({ rec }) => rec);
        if (selected.length === 0) {
          status.textContent = '没有勾选任何条目。';
          return;
        }
        exportBtn.disabled = true;
        let dirHandle;
        try {
          dirHandle = await getTargetDir();
        } catch (err) {
          status.textContent = '未选择存放文件夹,已取消。';
          exportBtn.disabled = false;
          return;
        }

        let successCount = 0, failCount = 0, consecutiveFails = 0;
        for (let i = 0; i < selected.length; i++) {
          const rec = selected[i];
          status.textContent = `导出中 ${i + 1}/${selected.length}…\n成功 ${successCount} / 失败 ${failCount}`;
          try {
            const { md, saveTime } = await fetchTranscriptMarkdown(rec.orderId, rec.fileSource || 'hj', rec.originAudioId);
            const dateStr = formatDate(saveTime || rec.createTime || Date.now());
            const namePart = sanitizeFilename(rec.orderName) || rec.orderId;
            const filename = `${dateStr}_${namePart}.md`;
            await writeFile(dirHandle, filename, md);
            successCount++;
            consecutiveFails = 0;
            console.log('[iflyrec-exporter] 批量导出成功:', filename);
            const doneRow = state.rowByOrderId[rec.orderId];
            if (doneRow) {
              doneRow.style.opacity = '0.4';
              doneRow.style.textDecoration = 'line-through';
            }
          } catch (err) {
            failCount++;
            consecutiveFails++;
            console.error('[iflyrec-exporter] 批量导出失败:', rec.orderId, err);
            if (consecutiveFails >= 5) {
              status.textContent = `连续失败${consecutiveFails}次,已停止。\n成功 ${successCount} / 失败 ${failCount} / 共 ${selected.length}\n请截图控制台发给Claude诊断。`;
              exportBtn.disabled = false;
              return;
            }
          }
          await sleep(400);
        }
        status.textContent = `完成。成功 ${successCount} / 失败 ${failCount} / 共 ${selected.length}`;
        exportBtn.disabled = false;
      });

      document.body.appendChild(panel);
    }

    btn.addEventListener('click', openPanel);
  }

  if (IS_ABOUT) initAboutPage();
  if (IS_HOME) initHomePage();
})();
