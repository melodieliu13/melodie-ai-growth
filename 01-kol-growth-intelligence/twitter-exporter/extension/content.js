// ============ KOL Signal 导出器：X(Twitter) 主页推文 → 按月 Markdown 归档 ============
// 参照：得到Clippings导出器(dedao-clippings-exporter) 的目录句柄持久化 + 直写文件模式

(function () {
  'use strict';

  const APP = 'kol-signal-exporter-v1';
  const VERSION = '3.4';
  const DB_NAME = 'kolSignalExportDb';
  const DB_STORE = 'handles';
  const DIR_KEY = 'kolLibraryDir';
  const FOLLOWING_QUEUE_KEY = 'kolSignalFollowingQueueV1';
  const ARCHIVE_QUEUE_KEY = 'kolSignalArchiveQueueV1';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const jitterSleep = (min, max) => sleep(min + Math.random() * (max - min));

  clearExistingUi();
  boot();

  function boot() {
    if (!document.body) {
      setTimeout(boot, 200);
      return;
    }

    const panel = document.createElement('div');
    panel.id = `${APP}-panel`;
    panel.style.cssText = `
      position: fixed; top: 16px; right: 24px; z-index: 2147483647;
      display: flex; flex-direction: column; gap: 8px; width: 260px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 14px; box-shadow: 0 8px 28px rgba(0,0,0,.16);
    `;

    const defaultHandle = guessHandleFromUrl();
    const defaultMonth = monthString(new Date());

    panel.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:#0f172a;">KOL Signal 导出器 v${VERSION}</div>
      <label style="font-size:12px;color:#475569;">KOL名（存档文件夹名）</label>
      <input id="${APP}-kol" value="${escapeAttr(defaultHandle)}" style="${inputStyle()}" />
      <label style="font-size:12px;color:#475569;">目标月份 (YYYY-MM)</label>
      <input id="${APP}-month" value="${escapeAttr(defaultMonth)}" style="${inputStyle()}" />
      <button id="${APP}-dir-btn" style="${buttonStyle('#334155')}">① 选择/确认 KOL情报库 文件夹</button>
      <button id="${APP}-run-btn" style="${buttonStyle('#059669')}">② 开始抓取本月推文</button>
      <div style="border-top:1px solid #e2e8f0;margin-top:2px;padding-top:8px;font-size:11px;color:#64748b;">关注列表分析（先打开 你的handle/following 页面）</div>
      <button id="${APP}-following-btn" style="${buttonStyle('#7c3aed')}">③ 抓取当前关注列表</button>
      <button id="${APP}-sample-btn" style="${buttonStyle('#0891b2')}">④ 批量抓取关注者内容样本</button>
      <div style="border-top:1px solid #e2e8f0;margin-top:2px;padding-top:8px;font-size:11px;color:#64748b;">核心KOL整月存档（先点①选好文件夹，且该文件夹的名单梳理/下要有 抓取名单.json）</div>
      <button id="${APP}-archive-btn" style="${buttonStyle('#c2410c')}">⑤ 批量抓取优先名单整月存档</button>
      <button id="${APP}-stop-btn" style="${buttonStyle('#dc2626')}">停止</button>
      <div id="${APP}-status" style="
        display: none; max-height: 40vh; overflow: auto; white-space: pre-wrap;
        background: #111827; color: #f9fafb; padding: 10px 12px; border-radius: 8px;
        font-size: 12px; line-height: 1.55;
      "></div>
    `;

    document.body.appendChild(panel);

    let stopRequested = false;
    document.getElementById(`${APP}-dir-btn`).onclick = handleChooseDir;
    document.getElementById(`${APP}-stop-btn`).onclick = () => {
      stopRequested = true;
      clearFollowingQueue();
      clearArchiveQueue();
      setStatus('已请求停止，等待当前操作结束…');
    };
    document.getElementById(`${APP}-run-btn`).onclick = () => {
      stopRequested = false;
      handleRun(() => stopRequested);
    };
    document.getElementById(`${APP}-following-btn`).onclick = () => {
      stopRequested = false;
      handleExtractFollowing(() => stopRequested);
    };
    document.getElementById(`${APP}-sample-btn`).onclick = () => {
      stopRequested = false;
      handleStartBatchSample();
    };
    document.getElementById(`${APP}-archive-btn`).onclick = () => {
      stopRequested = false;
      handleStartPriorityArchive();
    };

    console.log(`[KOL Signal导出器] v${VERSION} ready`, location.href);
    setTimeout(resumeFollowingQueueIfNeeded, 900);
    setTimeout(() => resumeArchiveQueueIfNeeded(() => stopRequested), 900);
  }

  function clearExistingUi() {
    document.getElementById(`${APP}-panel`)?.remove();
    document.getElementById(`${APP}-status`)?.remove();
  }

  // ---------- UI helpers ----------

  function inputStyle() {
    return 'width:100%;box-sizing:border-box;padding:7px 9px;font-size:13px;border:1px solid #cbd5e1;border-radius:7px;margin-bottom:2px;';
  }

  function buttonStyle(bg) {
    return `background:${bg};color:#fff;border:0;border-radius:8px;padding:9px 10px;font-size:13px;font-weight:600;cursor:pointer;`;
  }

  function escapeAttr(value) {
    return String(value ?? '').replace(/"/g, '&quot;');
  }

  function setStatus(text) {
    const el = document.getElementById(`${APP}-status`);
    if (!el) return;
    el.style.display = 'block';
    el.textContent = text;
  }

  function guessHandleFromUrl() {
    const match = location.pathname.match(/^\/([^/]+)\/?$/);
    return match ? match[1] : '';
  }

  function monthString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function safeFileName(name) {
    return String(name || '未命名').replace(/[\\/:*?"<>|]/g, '_').trim() || '未命名';
  }

  // ---------- IndexedDB directory handle persistence (同dedao模式) ----------

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function storeDir(handle) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(handle, DIR_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getStoredDir() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(DIR_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function ensureDirPermission(dir, request) {
    const options = { mode: 'readwrite' };
    if ((await dir.queryPermission(options)) === 'granted') return 'granted';
    if (request && (await dir.requestPermission(options)) === 'granted') return 'granted';
    return 'prompt';
  }

  async function verifyWritable(dir) {
    // 从IndexedDB恢复的handle，queryPermission可能显示granted但实际写入会报NotFoundError
    // ——所以选完文件夹后立刻实测一次真实写入，而不是只信任权限状态
    const testName = '.kol-signal-write-test';
    const handle = await dir.getFileHandle(testName, { create: true });
    const writable = await handle.createWritable();
    await writable.write('ok');
    await writable.close();
    await dir.removeEntry(testName);
  }

  async function chooseKolLibraryDir(forceFresh) {
    if (!window.showDirectoryPicker) {
      throw new Error('当前Chrome不支持直接选择文件夹，请升级Chrome版本。');
    }
    if (!forceFresh) {
      const existing = await getStoredDir();
      if (existing && await ensureDirPermission(existing, true) === 'granted') return existing;
    }
    const dir = await window.showDirectoryPicker({ id: 'kol-signal-library', mode: 'readwrite' });
    await storeDir(dir);
    return dir;
  }

  async function handleChooseDir() {
    try {
      // 点这个按钮永远强制重新选一次——避免复用一个已经失效的旧引用
      const dir = await chooseKolLibraryDir(true);
      await verifyWritable(dir);
      setStatus(`✅ 已选择并验证可写：${dir.name}\n（确认是「05-信号情报/KOL情报库」这个文件夹）现在可以点②开始抓取了`);
    } catch (err) {
      setStatus(`选择/验证文件夹失败(${err.name || 'Error'})：${err.message}`);
    }
  }

  // ---------- 推文抓取 ----------

  function parseAriaCount(button) {
    const label = button?.getAttribute('aria-label') || '';
    const match = label.match(/^([\d,.]+[KMkm]?)/);
    return match ? match[1] : '0';
  }

  function escapeMarkdownDollar(text) {
    // 币种代号常见写法如$BTC/$ETH——Obsidian把孤立的$当LaTeX公式定界符，
    // 两个不相关的$配对后中间一大段推文会被当公式硬解析、渲染成警告色。转义掉避免误触发
    return text.replace(/\$/g, '\\$');
  }

  function extractQuote(article, mainTimeEl, mainTextEl) {
    const allTimes = Array.from(article.querySelectorAll('time[datetime]'));
    const quoteTimeEl = allTimes.find(t => t !== mainTimeEl);
    if (!quoteTimeEl) return null;

    const allTexts = Array.from(article.querySelectorAll('[data-testid="tweetText"]'));
    const quoteTextEl = allTexts.find(t => t !== mainTextEl);

    const names = Array.from(article.querySelectorAll('[data-testid="User-Name"]'));
    const quoteNameEl = names.length > 1 ? names[names.length - 1] : null;
    const author = escapeMarkdownDollar((quoteNameEl?.innerText || quoteNameEl?.textContent || '').replace(/\s+/g, ' ').trim());

    // 引用卡片自己的图/视频封面（跟主图分开抓，避免混在一起分不清是谁发的）
    const quoteScope = quoteTimeEl.closest('div[role="link"]') || article;
    const images = extractImages(quoteScope);

    return {
      datetime: quoteTimeEl.getAttribute('datetime'),
      text: escapeMarkdownDollar((quoteTextEl?.innerText || quoteTextEl?.textContent || '').trim()),
      author,
      images,
    };
  }

  function upgradeImageQuality(url) {
    return url.replace(/([?&]name=)\w+/, '$1large');
  }

  function extractImages(scope) {
    // 不依赖具体data-testid（X的markup会变），直接按图片实际域名/路径识别，更抗改版
    const media = Array.from(scope.querySelectorAll('img[src*="pbs.twimg.com/media"]'))
      .map(img => upgradeImageQuality(img.src));
    const posters = Array.from(scope.querySelectorAll('video[poster]'))
      .map(v => v.getAttribute('poster'));
    return Array.from(new Set([...media, ...posters])).filter(Boolean);
  }

  function extractSocialContext(article) {
    const el = article.querySelector('[data-testid="socialContext"]');
    const text = el ? escapeMarkdownDollar((el.innerText || el.textContent || '').trim()) : '';
    return text || null;
  }

  function extractTweet(article) {
    const timeEl = article.querySelector('time[datetime]');
    if (!timeEl) return null;
    const datetime = timeEl.getAttribute('datetime');
    const permalinkEl = timeEl.closest('a[href*="/status/"]');
    const href = permalinkEl?.getAttribute('href') || '';
    const idMatch = href.match(/status\/(\d+)/);
    const id = idMatch ? idMatch[1] : datetime + Math.random();

    const isAd = !!article.querySelector('[data-testid="placementTracking"]');
    if (isAd) return null;

    const textEl = article.querySelector('[data-testid="tweetText"]');
    const text = escapeMarkdownDollar((textEl?.innerText || textEl?.textContent || '').trim());

    const quote = extractQuote(article, timeEl, textEl);
    // 主体图/视频封面：排除掉已经算进quote.images的（避免引用卡片里的图被重复计入主体）
    const allImages = extractImages(article);
    const images = quote ? allImages.filter(src => !quote.images.includes(src)) : allImages;

    const author = (() => {
      const nameEl = article.querySelector('[data-testid="User-Name"]');
      return nameEl ? escapeMarkdownDollar((nameEl.innerText || nameEl.textContent || '').replace(/\s+/g, ' ').trim()) : '';
    })();
    const context = extractSocialContext(article);

    if (!text && images.length === 0 && !quote) return null; // 纯空壳（无文字无图无引用）大概率是解析失败，跳过

    const replyBtn = article.querySelector('[data-testid="reply"]');
    const retweetBtn = article.querySelector('[data-testid="retweet"]');
    const likeBtn = article.querySelector('[data-testid="like"]');

    return {
      id,
      datetime,
      text,
      author,
      context,
      reply: parseAriaCount(replyBtn),
      retweet: parseAriaCount(retweetBtn),
      like: parseAriaCount(likeBtn),
      quote,
      images,
    };
  }

  function collectVisibleTweets() {
    return Array.from(document.querySelectorAll('article[data-testid="tweet"]'))
      .map(extractTweet)
      .filter(Boolean);
  }

  function expandTruncatedTweets() {
    // 长推文在时间线里默认折叠，有"显示更多"按钮——不点开的话tweetText只读到截断预览
    const links = document.querySelectorAll('[data-testid="tweet-text-show-more-link"]');
    links.forEach(link => link.click());
    return links.length;
  }

  // X偶尔会整页报错("出错了。请尝试重新加载。"+一个"重试"按钮)——这是加载/限流问题，
  // 不是账号真的没内容。批量抓取时必须先识别出这种情况，别把它当成"空账号"计入熔断。
  function findRetryButton() {
    return Array.from(document.querySelectorAll('button, div[role="button"]'))
      .find(el => (el.innerText || el.textContent || '').trim() === '重试'
        || (el.innerText || el.textContent || '').trim().toLowerCase() === 'retry');
  }

  function pageHasLoadError() {
    const bodyText = document.body.innerText || document.body.textContent || '';
    return bodyText.includes('出错了') && !!findRetryButton();
  }

  async function tryRecoverFromLoadError() {
    if (!pageHasLoadError()) return false;
    const btn = findRetryButton();
    if (btn) btn.click();
    await jitterSleep(2500, 4000);
    return pageHasLoadError(); // 返回true代表重试后仍然报错
  }

  async function scrollAndCollect(monthStart, monthEnd, isStopped, onProgress) {
    const seen = new Map(); // 落在目标月份内的，最终会存档
    const seenAnyId = new Set(); // 见过的所有推文id，不管在不在目标月份——判断"真的没有新推文在加载了"
    const seenOldIds = new Set(); // 比目标月份更早的推文id(去重)——判断"已经滚过目标月份了"
    let staleRounds = 0;
    let recoveryAttempts = 0; // 卡住时给多次长等待恢复机会，一次不够（软限流可能需要更久才缓解）
    const MAX_ROUNDS = 500;
    const MAX_STALE = 10;
    const MAX_OUT_OF_RANGE = 6;
    const MAX_RECOVERY_ATTEMPTS = 3; // 07-03发现：批量整月存档62个账号里有26个被误判"没内容"，实为软限流——1次恢复机会不够，加到3次，等待时间也逐次拉长

    for (let round = 0; round < MAX_ROUNDS; round++) {
      if (isStopped()) break;

      // 深度滚动请求量大，比批量采样更容易触发X的限流/页面报错——先识别报错并重试，
      // 不要把"页面卡住加载不出来"误判成"这个月真的没内容了"
      if (await tryRecoverFromLoadError()) {
        await jitterSleep(5000, 9000);
      }

      const expanded = expandTruncatedTweets();
      if (expanded > 0) await sleep(400);

      const beforeAnyCount = seenAnyId.size;
      const rawArticleCount = document.querySelectorAll('article[data-testid="tweet"]').length;
      for (const tweet of collectVisibleTweets()) {
        if (seenAnyId.has(tweet.id)) continue;
        seenAnyId.add(tweet.id);
        const d = new Date(tweet.datetime);
        if (d > monthEnd) continue; // 比目标月份新(比如账号发得很频繁，还在滚过更近月份的内容)，继续滚
        if (d < monthStart) {
          seenOldIds.add(tweet.id);
          continue;
        }
        seen.set(tweet.id, tweet);
      }

      onProgress(seen.size, round, rawArticleCount);

      if (seenOldIds.size >= MAX_OUT_OF_RANGE) break; // 已经滚过目标月份，见到足够多更早的推文了

      // 关键：这里判断的是"有没有任何新推文加载出来"，不是"有没有新的目标月份推文"——
      // 账号发得频繁时，可能要滚很多轮全是更新的月份，才能滚到目标月份，不能因为还没找到符合条件的就提前判定"没内容了"
      const gainedAny = seenAnyId.size - beforeAnyCount;
      if (gainedAny === 0) {
        staleRounds += 1;
      } else {
        staleRounds = 0;
        recoveryAttempts = 0; // 重新加载出内容了，恢复机会计数重置
      }

      if (staleRounds >= MAX_STALE) {
        if (recoveryAttempts < MAX_RECOVERY_ATTEMPTS) {
          // 卡住：大概率是加载慢/被轻度限流，长等后再继续试，而不是直接判定"到底了"
          // 逐次拉长等待时间（第1次6-10s，第2次10-14s，第3次14-18s），给限流更多缓解时间
          recoveryAttempts += 1;
          staleRounds = 0;
          await jitterSleep(2000 + recoveryAttempts * 4000, 6000 + recoveryAttempts * 4000);
          continue;
        }
        break; // 长等待恢复过 MAX_RECOVERY_ATTEMPTS 次还是卡住，才真的判定为到底/加载不出来了
      }

      window.scrollBy(0, Math.round(window.innerHeight * 0.85));
      await jitterSleep(900, 1700);
    }

    return Array.from(seen.values());
  }

  function formatStamp(datetime) {
    const dt = new Date(datetime);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  }

  function formatTweetBlock(t) {
    const lines = [`<!-- id:${t.id} -->`, `## [${formatStamp(t.datetime)}]`];
    if (t.context && !/^已置顶|^Pinned/.test(t.context)) {
      lines.push(`🔁 ${t.context}`); // 纯转发(无自己评论)时，作者其实是被转发的原作者，不是本KOL
    }
    if (t.author) lines.push(`作者：${t.author}`);
    lines.push(t.text || '(无文字——见下方配图/引用)');
    lines.push(`互动：转发${t.retweet} · 点赞${t.like} · 回复${t.reply}`);
    if (t.quote) {
      lines.push(`引用 ${t.quote.author || '(未知作者)'}（${t.quote.datetime ? formatStamp(t.quote.datetime) : '时间未知'}）：${t.quote.text || '(未能读取引用文字，见其配图)'}`);
      if (t.quote.images && t.quote.images.length) lines.push(...t.quote.images.map(p => `![](${p})`));
    }
    if (t.images && t.images.length) {
      lines.push(...t.images.map(p => `![](${p})`));
    }
    return lines.join('\n');
  }

  function buildMarkdown(kolName, month, sourceUrl, tweets) {
    const sorted = tweets.slice().sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    const body = sorted.map(formatTweetBlock).join('\n\n');

    const frontmatter = [
      '---',
      `kol: "${kolName}"`,
      `month: "${month}"`,
      `source: "${sourceUrl}"`,
      `updated: ${today()}`,
      `tweet_count: ${sorted.length}`,
      '---',
    ].join('\n');

    return `${frontmatter}\n\n${body}\n`;
  }

  function extractExistingIds(content) {
    const ids = new Set();
    const re = /<!--\s*id:(\d+)\s*-->/g;
    let m;
    while ((m = re.exec(content))) ids.add(m[1]);
    return ids;
  }

  function parseExistingTweets(content) {
    // 从已有MD反解出tweet对象，供合并重排用（不重新计算互动，只保留原样本文块）
    const blocks = content.split(/(?=<!--\s*id:\d+\s*-->)/).filter(b => b.trim().startsWith('<!--'));
    return blocks.map(block => {
      const idMatch = block.match(/id:(\d+)/);
      const stampMatch = block.match(/## \[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]/);
      return {
        id: idMatch ? idMatch[1] : null,
        datetime: stampMatch ? stampMatch[1].replace(' ', 'T') : null,
        rawBlock: block.trim(),
      };
    }).filter(t => t.id);
  }

  async function withRetry(fn, label, attempts = 3, delayMs = 250) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (i < attempts - 1) await sleep(delayMs);
      }
    }
    const wrapped = new Error(`[${label}] ${lastErr.name || 'Error'}: ${lastErr.message}`);
    wrapped.name = lastErr.name;
    throw wrapped;
  }

  async function getKolDetailDir(dir, category) {
    // KOL情报库/根下分两个并列文件夹：KOL详情(实际抓到的KOL内容) + 关注列表(筛选哪些人值得抓的分析)
    // KOL详情下再按身份类型分文件夹(官方账号/机构投研等)，category为空时直接存KOL详情根下(手动单个抓取②没有分类信息)
    const kolDetailDir = await withRetry(() => dir.getDirectoryHandle('KOL详情', { create: true }), '打开KOL详情文件夹');
    if (!category) return kolDetailDir;
    const safeCat = safeFileName(category); // category 也要清洗，否则含 / : * 等字符会让 getDirectoryHandle 报 "Name is not allowed"
    return withRetry(() => kolDetailDir.getDirectoryHandle(safeCat, { create: true }), `打开KOL详情/${safeCat}文件夹`);
  }

  async function writeMerged(dir, kolName, month, sourceUrl, newTweets) {
    const folder = await withRetry(() => dir.getDirectoryHandle(safeFileName(kolName), { create: true }), '打开KOL文件夹');
    // 文件名自带月份+handle，即使脱离文件夹单独看也知道是谁的——不依赖文件夹名才能辨认
    const filename = `${month}_${safeFileName(kolName)}.md`;
    let existingContent = '';
    try {
      const handle = await folder.getFileHandle(filename, { create: false });
      const file = await handle.getFile();
      existingContent = await file.text();
    } catch (_) {
      existingContent = '';
    }

    const existingIds = extractExistingIds(existingContent);
    // 配图直接嵌入X的原始URL（跟得到课程transcript同一种做法），不下载到本地
    const trulyNew = newTweets.filter(t => !existingIds.has(t.id));

    let finalMarkdown;
    if (existingContent) {
      const existingTweets = parseExistingTweets(existingContent);
      const merged = existingTweets
        .map(t => ({ id: t.id, datetime: t.datetime, rawBlock: t.rawBlock }))
        .concat(trulyNew.map(t => ({ id: t.id, datetime: t.datetime, rawBlock: formatTweetBlock(t) })))
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

      const body = merged.map(m => m.rawBlock).join('\n\n');
      const frontmatter = [
        '---',
        `kol: "${kolName}"`,
        `month: "${month}"`,
        `source: "${sourceUrl}"`,
        `updated: ${today()}`,
        `tweet_count: ${merged.length}`,
        '---',
      ].join('\n');
      finalMarkdown = `${frontmatter}\n\n${body}\n`;
    } else {
      finalMarkdown = buildMarkdown(kolName, month, sourceUrl, trulyNew);
    }

    await withRetry(async () => {
      const handle = await folder.getFileHandle(filename, { create: true });
      const writable = await handle.createWritable();
      await writable.write(finalMarkdown);
      await writable.close();
    }, `写主文件${filename}`);
    await removePlaceholderIfExists(folder);

    return { added: trulyNew.length, total: existingIds.size + trulyNew.length };
  }

  // 07-03新增：确认某账号该月真的没有推文（两轮抓取都是空）时，也要落一个和有内容账号同名格式的真实文件，
  // 而不是留着"待抓取.md"占位符不动——不然打开文件夹分不清"没跑到"还是"跑了但真的没内容"。
  async function writeConfirmedEmpty(dir, kolName, month, sourceUrl) {
    const folder = await withRetry(() => dir.getDirectoryHandle(safeFileName(kolName), { create: true }), '打开KOL文件夹');
    const filename = `${month}_${safeFileName(kolName)}.md`;
    const frontmatter = [
      '---',
      `kol: "${kolName}"`,
      `month: "${month}"`,
      `source: "${sourceUrl}"`,
      `updated: ${today()}`,
      `tweet_count: 0`,
      '---',
    ].join('\n');
    const body = `该账号在 ${month} 未抓到任何推文——已连续抓取两轮（含限流重试）确认，不是插件没跑到，而是这个月大概率真的没发/账号该月不活跃。\n\n如果怀疑仍是限流导致的误判，可以用②对这个账号单独手动重跑一次。`;
    await withRetry(async () => {
      const handle = await folder.getFileHandle(filename, { create: true });
      const writable = await handle.createWritable();
      await writable.write(`${frontmatter}\n\n${body}\n`);
      await writable.close();
    }, `写确认无内容文件${filename}`);
    await removePlaceholderIfExists(folder);
  }

  // 待抓取.md是建文件夹结构时留的占位说明，一旦有真实结果（有内容或确认无内容）就该清掉，
  // 不然占位符和真实文件并排放在一起，Melodie打开文件夹还是分不清状态。
  async function removePlaceholderIfExists(folder) {
    try {
      await folder.removeEntry('待抓取.md');
    } catch (_) {
      // 不存在就算了，不是错误
    }
  }

  async function handleRun(isStopped) {
    const kolName = document.getElementById(`${APP}-kol`).value.trim() || guessHandleFromUrl();
    const month = document.getElementById(`${APP}-month`).value.trim() || monthString(new Date());
    const sourceUrl = location.origin + '/' + guessHandleFromUrl();

    if (!/^\d{4}-\d{2}$/.test(month)) {
      setStatus('月份格式不对，应为 YYYY-MM，例如 2026-07');
      return;
    }

    let dir;
    try {
      dir = await chooseKolLibraryDir();
    } catch (err) {
      setStatus(`未选择文件夹：${err.message}`);
      return;
    }

    const [y, m] = month.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1, 0, 0, 0);
    const monthEnd = new Date(y, m, 0, 23, 59, 59);

    setStatus(`开始抓取 @${kolName} ${month} 的推文…\n正在滚动加载…`);

    let lastRawCount = 0;
    const tweets = await scrollAndCollect(monthStart, monthEnd, isStopped, (count, round, rawCount) => {
      lastRawCount = rawCount;
      setStatus(`@${kolName} ${month}\n已抓取 ${count} 条推文（滚动第${round + 1}轮，页面当前有${rawCount}条原始推文）…`);
    });

    if (tweets.length === 0) {
      const diag = lastRawCount === 0
        ? '页面上一条推文元素都没找到——可能页面还没加载完就点了②，刷新页面等完全加载出推文后再试。'
        : `页面上能看到${lastRawCount}条原始推文，但没有一条落在${month}这个月份范围内，或提取失败——可能是月份判断/页面结构的问题，需要我再看一下。`;
      setStatus(`@${kolName} ${month}\n没有抓到新推文。\n${diag}`);
      return;
    }

    try {
      const kolDetailDir = await getKolDetailDir(dir);
      const result = await writeMerged(kolDetailDir, kolName, month, sourceUrl, tweets);
      setStatus(`✅ 完成\n@${kolName} → ${dir.name}/KOL详情/${safeFileName(kolName)}/${month}_${safeFileName(kolName)}.md\n本次新增 ${result.added} 条，文件累计 ${result.total} 条。`);
    } catch (err) {
      const isFolderStale = /打开KOL文件夹/.test(err.message);
      const hint = isFolderStale
        ? '文件夹引用失效了——先点一下上面「①选择/确认 KOL情报库 文件夹」重新选一次同一个文件夹（会自动验证可写），再点②重跑，本次已抓到的推文不会丢。'
        : '已自动重试3次仍失败——可以再点一次「开始抓取本月推文」，本次已抓到的推文不会丢，重跑会跳过已存的部分。';
      setStatus(`写入失败(${err.name || 'Error'})：${err.message}\n${hint}`);
    }
  }

  // ---------- 关注列表抓取 ----------

  const RESERVED_PATH_NAMES = ['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings', 'compose'];

  function findRowScope(el) {
    return el.closest('[data-testid="cellInnerDiv"]')
      || el.closest('button')
      || el.parentElement?.parentElement?.parentElement?.parentElement
      || el.parentElement
      || el;
  }

  function extractFollowingRowFromHandle(handle, scope) {
    // 名字/简介不查具体子元素的data-testid(那些猜了两次都不对)，
    // 改成直接读整行的可见文字，按"第一行是名字，中间是简介，最后是关注按钮文字"这个视觉顺序解析，
    // 这个顺序比任何具体的CSS/testid都更不容易变
    const lines = (scope.innerText || scope.textContent || '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .filter(l => !/^(关注|正在关注|关注你|Follow|Following|Follows you|Blocked|已屏蔽)$/.test(l))
      .filter(l => !new RegExp(`^@${handle}$`, 'i').test(l));

    const name = escapeMarkdownDollar(lines[0] || '');
    const bio = escapeMarkdownDollar(lines.slice(1).join(' '));
    return { handle, name, bio };
  }

  function collectFollowingRows() {
    const seen = new Set();
    const rows = [];

    // 策略1：头像容器的data-testid里直接嵌了handle，这个模式在X全站(推文/列表/私信)都很稳定
    for (const avatarEl of document.querySelectorAll('[data-testid^="UserAvatar-Container-"]')) {
      const handle = (avatarEl.getAttribute('data-testid') || '').replace('UserAvatar-Container-', '').trim();
      if (!handle || seen.has(handle)) continue;
      seen.add(handle);
      rows.push(extractFollowingRowFromHandle(handle, findRowScope(avatarEl)));
    }

    // 策略2(兜底)：策略1如果一个都没匹配到，退回去扫个人主页链接的href
    if (rows.length === 0) {
      for (const link of document.querySelectorAll('a[href]')) {
        const href = link.getAttribute('href') || '';
        const m = href.match(/^\/(\w{1,15})$/);
        if (!m || RESERVED_PATH_NAMES.includes(m[1].toLowerCase())) continue;
        const handle = m[1];
        if (seen.has(handle)) continue;
        seen.add(handle);
        rows.push(extractFollowingRowFromHandle(handle, findRowScope(link)));
      }
    }

    return rows;
  }

  async function scrollAndCollectFollowing(isStopped, onProgress) {
    const seen = new Map();
    let staleRounds = 0;
    const MAX_ROUNDS = 2000;
    const MAX_STALE = 10;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      if (isStopped()) break;

      const before = seen.size;
      const rawNameCount = document.querySelectorAll('[data-testid^="UserAvatar-Container-"]').length || document.querySelectorAll('a[href]').length;
      for (const info of collectFollowingRows()) {
        if (info.handle && !seen.has(info.handle)) seen.set(info.handle, info);
      }

      onProgress(seen.size, round, rawNameCount);

      const gained = seen.size - before;
      staleRounds = gained === 0 ? staleRounds + 1 : 0;
      if (staleRounds >= MAX_STALE) break;

      window.scrollBy(0, Math.round(window.innerHeight * 0.85));
      await sleep(700);
    }

    return Array.from(seen.values());
  }

  async function handleExtractFollowing(isStopped) {
    if (!/\/following\/?$/.test(location.pathname)) {
      setStatus('当前页面不是"关注列表"页——请先打开 x.com/你的handle/following，再点这个按钮。');
      return;
    }

    let dir;
    try {
      dir = await chooseKolLibraryDir();
    } catch (err) {
      setStatus(`未选择文件夹：${err.message}`);
      return;
    }

    setStatus('开始抓取关注列表…\n正在滚动加载…');
    let lastRawNameCount = 0;
    const list = await scrollAndCollectFollowing(isStopped, (count, round, rawNameCount) => {
      lastRawNameCount = rawNameCount;
      setStatus(`已抓取 ${count} 个关注账号（滚动第${round + 1}轮，页面上有${rawNameCount}个可识别元素）…`);
    });

    if (list.length === 0) {
      const diag = lastRawNameCount === 0
        ? '页面上连头像元素/链接都没找到——页面可能还没加载完，刷新页面等列表完全出来后再试。'
        : `页面上有${lastRawNameCount}个可识别元素，但一个都没提取出handle——需要我再看一下提取逻辑。`;
      setStatus(`没有抓到任何关注账号。\n${diag}`);
      return;
    }

    try {
      const folder = await withRetry(() => dir.getDirectoryHandle('名单梳理', { create: true }), '打开关注列表文件夹');

      await withRetry(async () => {
        const handle = await folder.getFileHandle('关注列表.json', { create: true });
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(list, null, 2));
        await writable.close();
      }, '写关注列表.json');

      const mdLines = [
        '# 关注列表',
        '',
        `共 ${list.length} 个账号，抓取于 ${today()}`,
        '',
        '| handle | 名称 | 简介 |',
        '|---|---|---|',
        ...list.map(u => `| @${u.handle} | ${(u.name || '').replace(/\|/g, ' ')} | ${(u.bio || '').replace(/\|/g, ' ').replace(/\n/g, ' ').slice(0, 150)} |`),
      ];
      await withRetry(async () => {
        const handle = await folder.getFileHandle('关注列表.md', { create: true });
        const writable = await handle.createWritable();
        await writable.write(mdLines.join('\n') + '\n');
        await writable.close();
      }, '写关注列表.md');

      setStatus(`✅ 完成\n共抓到 ${list.length} 个关注账号\n存到 ${dir.name}/名单梳理/关注列表.json 和 .md\n\n下一步：点④开始批量抓取内容样本`);
    } catch (err) {
      setStatus(`写入失败(${err.name || 'Error'})：${err.message}`);
    }
  }

  // ---------- 批量抓取关注者内容样本（跨页面导航，队列持久化在localStorage，参照得到导出器的批量模式） ----------

  function loadFollowingQueue() {
    try {
      return JSON.parse(localStorage.getItem(FOLLOWING_QUEUE_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function saveFollowingQueue(queue) {
    localStorage.setItem(FOLLOWING_QUEUE_KEY, JSON.stringify(queue));
  }

  function clearFollowingQueue() {
    localStorage.removeItem(FOLLOWING_QUEUE_KEY);
  }

  async function sampleProfileTweets(maxTweets) {
    const seen = new Map();
    for (let round = 0; round < 4 && seen.size < maxTweets; round++) {
      const expanded = expandTruncatedTweets();
      if (expanded > 0) await sleep(300);
      for (const tweet of collectVisibleTweets()) {
        if (!seen.has(tweet.id)) seen.set(tweet.id, tweet);
      }
      if (seen.size >= maxTweets) break;
      window.scrollBy(0, Math.round(window.innerHeight * 0.85));
      await sleep(700);
    }
    return Array.from(seen.values()).slice(0, maxTweets);
  }

  function formatSampleBlock(user, tweets) {
    const header = [`## @${user.handle}`, `名称：${user.name || '(无)'}`, `简介：${user.bio || '(无)'}`];
    if (tweets.length === 0) {
      header.push('（没有抓到可读的推文——可能是空账号/被封禁/加载失败）');
      return header.join('\n');
    }
    const sorted = tweets.slice().sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    const body = sorted.map(t => {
      const stamp = formatStamp(t.datetime);
      const lines = [`- [${stamp}] ${t.text || '(无文字，见配图/引用)'}`];
      if (t.images && t.images.length) lines.push(`  ${t.images.map(p => `![](${p})`).join(' ')}`);
      return lines.join('\n');
    });
    return [...header, '', ...body].join('\n');
  }

  async function handleStartBatchSample() {
    let dir;
    try {
      dir = await chooseKolLibraryDir();
    } catch (err) {
      setStatus(`未选择文件夹：${err.message}`);
      return;
    }

    try {
      const folder = await withRetry(() => dir.getDirectoryHandle('名单梳理', { create: true }), '打开关注列表文件夹');
      const fileHandle = await folder.getFileHandle('关注列表.json', { create: false });
      const file = await fileHandle.getFile();
      const list = JSON.parse(await file.text());

      if (!list.length) {
        setStatus('关注列表是空的——先点③抓取关注列表。');
        return;
      }

      // 如果有暂停的队列(比如熔断暂停)，从暂停的位置继续，不重新从0开始——避免白白重跑一遍已完成的部分
      const existing = loadFollowingQueue();
      const handles = list.map(u => u.handle);
      const canResume = existing && existing.handles?.length === handles.length && existing.index < handles.length;
      const queue = canResume
        ? { ...existing, active: true, consecutiveEmpty: 0 }
        : { active: true, index: 0, handles, consecutiveEmpty: 0 };
      saveFollowingQueue(queue);
      setStatus(canResume
        ? `继续批量抓取，从第 ${queue.index + 1}/${queue.handles.length} 个开始…`
        : `已建立批量抓取队列，共 ${queue.handles.length} 个账号，即将开始跳转…`);
      await sleep(500);
      location.href = `https://x.com/${queue.handles[queue.index]}`;
    } catch (err) {
      setStatus(`找不到关注列表.json，请先点③抓取关注列表。(${err.message})`);
    }
  }

  async function alreadySampled(folder, handle) {
    try {
      const fileHandle = await folder.getFileHandle('内容样本.md', { create: false });
      const file = await fileHandle.getFile();
      const content = await file.text();
      return content.includes(`## @${handle}\n`) || content.includes(`## @${handle}\r\n`);
    } catch (_) {
      return false;
    }
  }

  async function appendSample(folder, block) {
    let existing = '';
    try {
      const fileHandle = await folder.getFileHandle('内容样本.md', { create: false });
      const file = await fileHandle.getFile();
      existing = await file.text();
    } catch (_) {
      existing = `# 关注者内容样本\n\n更新：${today()}\n`;
    }
    const finalContent = `${existing.trim()}\n\n${block}\n`;
    await withRetry(async () => {
      const fileHandle = await folder.getFileHandle('内容样本.md', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(finalContent);
      await writable.close();
    }, '写内容样本.md');
  }

  async function resumeFollowingQueueIfNeeded() {
    const queue = loadFollowingQueue();
    if (!queue?.active) return;

    if (queue.index >= queue.handles.length) {
      clearFollowingQueue();
      setStatus(`✅ 批量抓取全部完成，共 ${queue.handles.length} 个账号。`);
      return;
    }

    const targetHandle = queue.handles[queue.index];
    const currentHandle = guessHandleFromUrl();

    if (currentHandle.toLowerCase() !== targetHandle.toLowerCase()) {
      setStatus(`批量抓取中：第 ${queue.index + 1}/${queue.handles.length} 个 @${targetHandle}\n正在跳转…`);
      location.href = `https://x.com/${targetHandle}`;
      return;
    }

    let dir;
    try {
      dir = await getStoredDir();
      if (!dir || await ensureDirPermission(dir, false) !== 'granted') {
        setStatus('文件夹授权失效了——点一下「①选择/确认 KOL情报库 文件夹」重新授权后，再点④继续批量抓取（队列进度不会丢）。');
        return;
      }
    } catch (err) {
      setStatus(`读取文件夹失败：${err.message}——点①重新授权后再点④继续。`);
      return;
    }

    try {
      const folder = await withRetry(() => dir.getDirectoryHandle('名单梳理', { create: true }), '打开关注列表文件夹');

      if (await alreadySampled(folder, targetHandle)) {
        setStatus(`批量抓取中：第 ${queue.index + 1}/${queue.handles.length} 个 @${targetHandle} 已抓过，跳过`);
      } else {
        await jitterSleep(2200, 3800); // 等页面渲染出推文（打乱间隔，避免固定节奏被识别为脚本）

        let loadError = await tryRecoverFromLoadError(); // 先识别X页面级报错，点"重试"后再判断是否恢复
        const tweets = loadError ? [] : await sampleProfileTweets(8);

        const listFileHandle = await folder.getFileHandle('关注列表.json', { create: false });
        const listFile = await listFileHandle.getFile();
        const list = JSON.parse(await listFile.text());
        const user = list.find(u => u.handle === targetHandle) || { handle: targetHandle, name: '', bio: '' };
        const block = loadError
          ? [`## @${user.handle}`, `名称：${user.name || '(无)'}`, `简介：${user.bio || '(无)'}`,
              '（页面加载报错，重试后仍失败——疑似限流/风控，不代表账号真的没内容，建议之后单独重跑此账号）'].join('\n')
          : formatSampleBlock(user, tweets);
        await appendSample(folder, block);
        setStatus(loadError
          ? `批量抓取中：第 ${queue.index + 1}/${queue.handles.length} 个 @${targetHandle}\n页面加载报错（疑似限流），已记录待重跑`
          : `批量抓取中：第 ${queue.index + 1}/${queue.handles.length} 个 @${targetHandle}\n抓到 ${tweets.length} 条样本，已存档`);

        // 熔断：连续好几个账号都抓空/报错，大概率是页面加载或风控出了系统性问题，不是这些账号真的都没内容
        // ——先暂停报警，而不是傻乎乎地把整个列表都空转完
        queue.consecutiveEmpty = (loadError || tweets.length === 0) ? (queue.consecutiveEmpty || 0) + 1 : 0;
        const EMPTY_CIRCUIT_BREAKER = 5;
        if (queue.consecutiveEmpty >= EMPTY_CIRCUIT_BREAKER) {
          queue.active = false;
          saveFollowingQueue(queue);
          setStatus(`⚠️ 已暂停：连续 ${EMPTY_CIRCUIT_BREAKER} 个账号都抓到0条样本/报错，大概率是被限流了，不是这些账号真的都没内容。\n建议先歇久一点（比如1小时以上）再点④恢复——进度停在第 ${queue.index + 1}/${queue.handles.length} 个（@${targetHandle}），不会丢。`);
          return;
        }
      }

      queue.index += 1;
      saveFollowingQueue(queue);

      if (queue.index >= queue.handles.length) {
        clearFollowingQueue();
        setStatus(`✅ 批量抓取全部完成，共 ${queue.handles.length} 个账号。\n存在 ${dir.name}/名单梳理/内容样本.md`);
        return;
      }

      // 每跑15个账号强制歇一次长的（模拟人类浏览节奏，降低被限流概率）
      if (queue.index % 15 === 0) {
        setStatus(`已跑${queue.index}个账号，强制休息一下（避免被限流）…`);
        await jitterSleep(45000, 90000);
      } else {
        await jitterSleep(4000, 8000);
      }
      location.href = `https://x.com/${queue.handles[queue.index]}`;
    } catch (err) {
      setStatus(`批量抓取第${queue.index + 1}个(@${targetHandle})出错(${err.name || 'Error'})：${err.message}\n点④可以重新触发继续（会跳过已经抓过的）。`);
    }
  }

  // ---------- 批量抓取优先名单整月存档（复用②的整月抓取逻辑，跨页面导航模式同④） ----------

  function loadArchiveQueue() {
    try {
      return JSON.parse(localStorage.getItem(ARCHIVE_QUEUE_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function saveArchiveQueue(queue) {
    localStorage.setItem(ARCHIVE_QUEUE_KEY, JSON.stringify(queue));
  }

  function clearArchiveQueue() {
    localStorage.removeItem(ARCHIVE_QUEUE_KEY);
  }

  async function handleStartPriorityArchive() {
    let dir;
    try {
      dir = await chooseKolLibraryDir();
    } catch (err) {
      setStatus(`未选择文件夹：${err.message}`);
      return;
    }

    try {
      const folder = await withRetry(() => dir.getDirectoryHandle('名单梳理', { create: true }), '打开关注列表文件夹');
      const fileHandle = await folder.getFileHandle('抓取名单.json', { create: false });
      const file = await fileHandle.getFile();
      const priority = JSON.parse(await file.text());

      // 支持新格式 kols:[{handle,category}]（分类存进KOL详情/[分类]/[handle]/），
      // 兼容旧格式 handles:[字符串]（没有分类时直接存进KOL详情/[handle]/）
      const kols = priority.kols?.length
        ? priority.kols
        : (priority.handles || []).map(h => ({ handle: h, category: null }));

      if (!kols.length) {
        setStatus('抓取名单.json里没有kols/handles——检查文件内容。');
        return;
      }
      if (!/^\d{4}-\d{2}$/.test(priority.target_month || '')) {
        setStatus('抓取名单.json里的target_month格式不对，应为YYYY-MM，例如2026-06。');
        return;
      }

      const existing = loadArchiveQueue();
      // 只有"月份+账号列表内容都完全一致"才恢复旧队列；文件被改过(改了category/换了账号)就重建，
      // 避免"改了优先名单.json后重跑，插件却还在用旧队列跑旧数据"这种坑
      const canResume = existing && existing.month === priority.target_month
        && existing.index < existing.kols.length
        && JSON.stringify(existing.kols) === JSON.stringify(kols);
      const queue = canResume
        ? { ...existing, active: true, consecutiveEmpty: 0, emptyHandles: existing.emptyHandles || [] }
        : {
            active: true, index: 0, kols, month: priority.target_month, consecutiveEmpty: 0,
            retryPass: false, emptyHandles: [], originalTotal: kols.length,
          };
      saveArchiveQueue(queue);
      setStatus(canResume
        ? `继续批量整月存档，从第 ${queue.index + 1}/${queue.kols.length} 个开始…`
        : `已建立批量整月存档队列，共 ${queue.kols.length} 个账号，目标月份 ${queue.month}，即将开始跳转…`);
      await sleep(500);
      location.href = `https://x.com/${queue.kols[queue.index].handle}`;
    } catch (err) {
      setStatus(`找不到抓取名单.json，请先在名单梳理/文件夹下放好这个文件。(${err.message})`);
    }
  }

  // 07-03修复：之前跑完62个账号，插件报"✅全部完成"，但实际只有36个真的抓到内容，
  // 26个是被限流误判成"这个月没内容"后直接跳过、照样计入"完成"——完成 ≠ 真的抓到了。
  // 现在改成：第一轮跑完后，自动对"没抓到内容"的账号发起第二轮重跑（软限流大概率在歇过一轮后会缓解），
  // 只有第二轮还是空的，才在最终汇报里如实标为"两轮都没抓到"，不再笼统报"全部完成"。
  function finishArchiveQueue(queue) {
    const originalTotal = queue.originalTotal || queue.kols.length;
    if (!queue.retryPass && queue.emptyHandles.length > 0) {
      const retryCount = queue.emptyHandles.length;
      const retryQueue = {
        active: true,
        index: 0,
        kols: queue.emptyHandles,
        month: queue.month,
        consecutiveEmpty: 0,
        retryPass: true,
        emptyHandles: [],
        originalTotal,
      };
      saveArchiveQueue(retryQueue);
      setStatus(`第一轮完成：${originalTotal - retryCount}/${originalTotal} 个账号确认抓到内容。\n${retryCount} 个账号没抓到（大概率是限流误判），自动开始第二轮重跑，稍等…`);
      return retryQueue;
    }

    clearArchiveQueue();
    const stillEmpty = queue.emptyHandles.length;
    const confirmed = originalTotal - stillEmpty;
    if (stillEmpty === 0) {
      setStatus(`✅ 批量整月存档全部完成，共 ${originalTotal} 个账号，全部确认抓到内容。`);
    } else {
      const names = queue.emptyHandles.map(k => `@${k.handle}`).join('、');
      setStatus(`批量整月存档完成：${confirmed}/${originalTotal} 个账号确认抓到内容。\n${stillEmpty} 个账号两轮都没抓到（${names}）——已各自写入tweet_count:0的说明文件（不再是空占位符），大概率这个月确实没发；如果怀疑仍是限流，可以单独用②再试一次。`);
    }
    return null;
  }

  async function resumeArchiveQueueIfNeeded(isStopped) {
    let queue = loadArchiveQueue();
    if (!queue?.active) return;
    if (!queue.emptyHandles) queue.emptyHandles = []; // 兼容旧版本queue结构（无retry字段）

    if (queue.index >= queue.kols.length) {
      queue = finishArchiveQueue(queue);
      if (!queue) return;
      await sleep(500);
      location.href = `https://x.com/${queue.kols[queue.index].handle}`;
      return;
    }

    const { handle: targetHandle, category: targetCategory } = queue.kols[queue.index];
    const currentHandle = guessHandleFromUrl();

    if (currentHandle.toLowerCase() !== targetHandle.toLowerCase()) {
      setStatus(`批量整月存档中：第 ${queue.index + 1}/${queue.kols.length} 个 @${targetHandle}\n正在跳转…`);
      location.href = `https://x.com/${targetHandle}`;
      return;
    }

    let dir;
    try {
      dir = await getStoredDir();
      if (!dir || await ensureDirPermission(dir, false) !== 'granted') {
        setStatus('文件夹授权失效了——点一下「①选择/确认 KOL情报库 文件夹」重新授权后，再点⑤继续批量整月存档（队列进度不会丢）。');
        return;
      }
    } catch (err) {
      setStatus(`读取文件夹失败：${err.message}——点①重新授权后再点⑤继续。`);
      return;
    }

    let tweets = [];
    try {
      await jitterSleep(2500, 4200); // 等页面渲染出推文

      const loadError = await tryRecoverFromLoadError();
      const [y, m] = queue.month.split('-').map(Number);
      const monthStart = new Date(y, m - 1, 1, 0, 0, 0);
      const monthEnd = new Date(y, m, 0, 23, 59, 59);

      if (!loadError) {
        setStatus(`批量整月存档中：第 ${queue.index + 1}/${queue.kols.length} 个 @${targetHandle} ${queue.month}\n正在滚动加载…`);
        tweets = await scrollAndCollect(monthStart, monthEnd, isStopped, (count, round) => {
          setStatus(`批量整月存档中：第 ${queue.index + 1}/${queue.kols.length} 个 @${targetHandle} ${queue.month}\n已抓取 ${count} 条推文（滚动第${round + 1}轮）…`);
        });
      }

      const isEmpty = loadError || tweets.length === 0;
      if (isEmpty && queue.retryPass) {
        // 第二轮仍然抓不到——排除了限流误判的可能性，落一个真实的"确认无内容"文件，
        // 不再留占位符不动，这样打开文件夹能直接分清"没跑到"还是"跑了但真的没内容"
        const sourceUrl = `https://x.com/${targetHandle}`;
        const kolDetailDir = await getKolDetailDir(dir, targetCategory);
        await writeConfirmedEmpty(kolDetailDir, targetHandle, queue.month, sourceUrl);
        setStatus(`批量整月存档中：第 ${queue.index + 1}/${queue.kols.length} 个 @${targetHandle} ${queue.month}\n第二轮仍未抓到——已确认并写入说明文件（${queue.month}_${targetHandle}.md，tweet_count: 0）`);
      } else if (loadError) {
        setStatus(`批量整月存档中：第 ${queue.index + 1}/${queue.kols.length} 个 @${targetHandle}\n页面加载报错（疑似限流），已记录，将在第二轮自动重跑`);
      } else if (tweets.length === 0) {
        setStatus(`批量整月存档中：第 ${queue.index + 1}/${queue.kols.length} 个 @${targetHandle} ${queue.month}\n没抓到这个月的推文，已记录，将在第二轮自动重跑（排除限流误判后再确认）`);
      } else {
        const sourceUrl = `https://x.com/${targetHandle}`;
        const kolDetailDir = await getKolDetailDir(dir, targetCategory);
        const result = await writeMerged(kolDetailDir, targetHandle, queue.month, sourceUrl, tweets);
        const savedPath = targetCategory ? `KOL详情/${targetCategory}/${safeFileName(targetHandle)}/` : `KOL详情/${safeFileName(targetHandle)}/`;
        setStatus(`批量整月存档中：第 ${queue.index + 1}/${queue.kols.length} 个 @${targetHandle} ${queue.month}\n新增 ${result.added} 条，已存档到 ${savedPath}`);
      }

      if (isEmpty) queue.emptyHandles.push({ handle: targetHandle, category: targetCategory });

      // 熔断逻辑跟④一样：连续多个账号都是空/报错，大概率是被限流了，不是账号本身问题
      queue.consecutiveEmpty = isEmpty ? (queue.consecutiveEmpty || 0) + 1 : 0;
      const EMPTY_CIRCUIT_BREAKER = 5;
      if (queue.consecutiveEmpty >= EMPTY_CIRCUIT_BREAKER) {
        queue.active = false;
        saveArchiveQueue(queue);
        setStatus(`⚠️ 已暂停：连续 ${EMPTY_CIRCUIT_BREAKER} 个账号都没抓到内容，大概率是被限流了，不是账号真的都没内容。\n建议歇久一点（1小时以上）再点⑤恢复——进度停在第 ${queue.index + 1}/${queue.kols.length} 个（@${targetHandle}），不会丢，之后仍会自动补跑第二轮。`);
        return;
      }

      queue.index += 1;
      saveArchiveQueue(queue);

      if (queue.index >= queue.kols.length) {
        const nextQueue = finishArchiveQueue(queue);
        if (!nextQueue) return;
        await jitterSleep(8000, 15000);
        location.href = `https://x.com/${nextQueue.kols[nextQueue.index].handle}`;
        return;
      }

      // 整月抓取本身要滚很多轮，负载比④重很多——第一版每10个歇一次在第14个就熔断了，
      // 说明间隔还是太密，改成每5个歇一次、间隔也拉长
      if (queue.index % 5 === 0) {
        setStatus(`已跑${queue.index}个账号，强制休息一下（避免被限流）…`);
        await jitterSleep(90000, 180000);
      } else {
        await jitterSleep(8000, 15000);
      }
      location.href = `https://x.com/${queue.kols[queue.index].handle}`;
    } catch (err) {
      setStatus(`批量整月存档第${queue.index + 1}个(@${targetHandle})出错(${err.name || 'Error'})：${err.message}\n点⑤可以重新触发继续（不会丢已存的部分）。`);
    }
  }
})();
