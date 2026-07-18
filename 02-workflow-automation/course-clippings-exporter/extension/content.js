// ============ 得到课程导出器：URL 提取 + Obsidian Clippings 风格 MD 直写 ============

(function () {
  'use strict';

  const APP = 'dedao-md-exporter-v12';
  const LEGACY_APPS = ['dedao-md-exporter', 'dedao-md-exporter-v2', 'dedao-md-exporter-v3', 'dedao-md-exporter-v4', 'dedao-md-exporter-v5', 'dedao-md-exporter-v6', 'dedao-md-exporter-v7', 'dedao-md-exporter-v8', 'dedao-md-exporter-v9', 'dedao-md-exporter-v10', 'dedao-md-exporter-v11'];
  const VERSION = '1.85';
  const ARTICLE_PREFIX = 'https://www.dedao.cn/course/article?id=';
  const QUEUE_KEY = 'dedaoMdExportQueueV12';
  const PENDING_COURSE_EXPORT_KEY = 'dedaoMdPendingCourseExportV12';
  const CANONICAL_RESTART_COUNT_KEY = 'dedaoMdCanonicalRestartCountV12';
  const STOP_KEY = 'dedaoMdExportStoppedV12';
  const LEGACY_STATE_KEYS = [
    'dedaoMdExportQueueV1',
    'dedaoMdPendingCourseExportV1',
    'dedaoMdExportQueueV2',
    'dedaoMdPendingCourseExportV2',
    'dedaoMdCanonicalRestartCountV2',
    'dedaoMdExportQueueV3',
    'dedaoMdPendingCourseExportV3',
    'dedaoMdCanonicalRestartCountV3',
    'dedaoMdExportQueueV4',
    'dedaoMdPendingCourseExportV4',
    'dedaoMdCanonicalRestartCountV4',
    'dedaoMdExportQueueV5',
    'dedaoMdPendingCourseExportV5',
    'dedaoMdCanonicalRestartCountV5',
    'dedaoMdExportQueueV6',
    'dedaoMdPendingCourseExportV6',
    'dedaoMdCanonicalRestartCountV6',
    'dedaoMdExportQueueV7',
    'dedaoMdPendingCourseExportV7',
    'dedaoMdCanonicalRestartCountV7',
    'dedaoMdExportQueueV8',
    'dedaoMdPendingCourseExportV8',
    'dedaoMdCanonicalRestartCountV8',
    'dedaoMdExportQueueV9',
    'dedaoMdPendingCourseExportV9',
    'dedaoMdCanonicalRestartCountV9',
    'dedaoMdExportQueueV10',
    'dedaoMdPendingCourseExportV10',
    'dedaoMdCanonicalRestartCountV10',
    'dedaoMdExportQueueV11',
    'dedaoMdPendingCourseExportV11',
    'dedaoMdCanonicalRestartCountV11',
    'dedaoMdExportStoppedV11',
  ];
  const DB_NAME = 'dedaoMdExportDb';
  const DB_STORE = 'handles';
  const DIR_KEY = 'clippingsDir';
  const ID_RE = /^[A-Za-z0-9_-]{8,}$/;
  const DEFAULT_DESCRIPTION = '搜索感兴趣的知识，学习相关课程、电子书、听书。罗振宇·罗辑思维、薛兆丰·经济学、武志红·心理学、张明楷·刑法学等100多位专家学者的独家课程免费试读。多设备使用得到，提升你的学习效率。';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  clearLegacyState();
  clearExistingUi();
  disableBeforeUnload();

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
      display: flex; flex-direction: column; gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `;

    panel.innerHTML = `
      <button id="${APP}-md-btn" style="${buttonStyle('#059669')}">同步MD到Clippings v${VERSION}</button>
      <button id="${APP}-current-btn" style="${buttonStyle('#0f766e')}">只导出当前文章</button>
      <button id="${APP}-stop-btn" style="${buttonStyle('#dc2626')}">停止批量导出</button>
    `;

    const status = document.createElement('div');
    status.id = `${APP}-status`;
    status.style.cssText = `
      position: fixed; top: 146px; right: 24px; z-index: 2147483647;
      display: none; max-width: 420px; white-space: pre-wrap;
      background: #111827; color: #f9fafb; padding: 12px 16px;
      border-radius: 10px; font-size: 13px; line-height: 1.55;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,.28);
    `;

    document.body.appendChild(panel);
    document.body.appendChild(status);

    document.getElementById(`${APP}-md-btn`).onclick = handleSyncCourse;
    document.getElementById(`${APP}-current-btn`).onclick = handleExportCurrent;
    document.getElementById(`${APP}-stop-btn`).onclick = handleStopExport;

    setTimeout(resumeQueueIfNeeded, 900);
    console.log(`[得到导出器] v${VERSION} ready`, location.href);
  }

  function clearExistingUi() {
    document.getElementById(`${APP}-panel`)?.remove();
    document.getElementById(`${APP}-status`)?.remove();
    document.getElementById(`${APP}-modal`)?.remove();
    for (const legacyApp of LEGACY_APPS) {
      document.getElementById(`${legacyApp}-panel`)?.remove();
      document.getElementById(`${legacyApp}-status`)?.remove();
      document.getElementById(`${legacyApp}-modal`)?.remove();
    }
  }

  function clearLegacyState() {
    for (const key of LEGACY_STATE_KEYS) {
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    }
  }

  function handleStopExport() {
    stopAllExports();
    showStatus('已停止批量导出。\n队列和自动续跑标记已经清掉，刷新页面也不会继续跑。');
  }

  function stopAllExports() {
    try {
      localStorage.setItem(STOP_KEY, '1');
      localStorage.removeItem(QUEUE_KEY);
      localStorage.removeItem(PENDING_COURSE_EXPORT_KEY);
      sessionStorage.removeItem(CANONICAL_RESTART_COUNT_KEY);
      clearLegacyState();
    } catch (_) {}
  }

  function clearStopFlag() {
    try {
      localStorage.removeItem(STOP_KEY);
    } catch (_) {}
  }

  function shouldStopExport() {
    try {
      return localStorage.getItem(STOP_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function stopActiveQueue(message) {
    try {
      const queue = loadQueue();
      if (queue) {
        queue.active = false;
        saveQueue(queue);
      }
      localStorage.removeItem(QUEUE_KEY);
      localStorage.removeItem(PENDING_COURSE_EXPORT_KEY);
      sessionStorage.removeItem(CANONICAL_RESTART_COUNT_KEY);
      clearLegacyState();
    } catch (_) {}
    showStatus(message || '批量导出已停止。');
  }

  function buttonStyle(color) {
    return `
      min-width: 168px; background: ${color}; color: #fff; border: none;
      padding: 10px 16px; border-radius: 10px; font-size: 14px;
      font-family: inherit; cursor: pointer; box-shadow: 0 4px 16px rgba(15,23,42,.2);
    `;
  }

  function setButtonBusy(id, busy, label) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = busy;
    btn.style.opacity = busy ? '.7' : '1';
    if (label) btn.textContent = label;
  }

  function showStatus(message) {
    const el = document.getElementById(`${APP}-status`);
    if (!el) return;
    el.textContent = message;
    el.style.display = message ? 'block' : 'none';
    if (message) console.log('[得到导出器]', message);
  }

  function hideStatus() {
    showStatus('');
  }

  function disableBeforeUnload() {
    try {
      window.onbeforeunload = null;
      if (!window.__dedaoMdNoBeforeUnload) {
        window.__dedaoMdNoBeforeUnload = true;
        window.addEventListener('beforeunload', event => {
          event.stopImmediatePropagation();
          delete event.returnValue;
        }, true);
      }
    } catch (_) {}
  }

  async function handleExtractUrls() {
    const id = `${APP}-url-btn`;
    setButtonBusy(id, true, '提取中...');
    try {
      const articles = await collectCourseArticles();
      hideStatus();
      showUrlResult(articles);
    } catch (error) {
      console.error(error);
      hideStatus();
      showUrlResult([], error.message || String(error));
    } finally {
      setButtonBusy(id, false, '提取全部文章URL');
    }
  }

  async function handleSyncCourse() {
    const id = `${APP}-md-btn`;
    setButtonBusy(id, true, `准备同步 v${VERSION}...`);
    try {
      clearStopFlag();
      sessionStorage.removeItem(CANONICAL_RESTART_COUNT_KEY);

      const dir = await chooseClippingsDir();
      await ensureDirPermission(dir, true);

      await startCourseSyncWithDir(dir);
    } catch (error) {
      console.error(error);
      alert(`同步失败：${error.message || error}`);
    } finally {
      setButtonBusy(id, false, `同步MD到Clippings v${VERSION}`);
    }
  }

  async function handleExportCourse() {
    await handleSyncCourse();
  }

  async function handleAuditCourse() {
    return handleSyncCourse();
  }

  async function startCourseSyncWithDir(dir) {
    await ensureDirPermission(dir, true);
    await waitForArticleReady();

    const expected = expectedCourseArticleCount();
    const expectedText = expected ? `，课程显示约 ${expected} 篇` : '';
    const currentTitle = getCurrentSidebarTitle() || getArticleTitle();
    const currentOrder = getCurrentArticleOrder();
    const ok = window.confirm(`从当前这篇开始同步${expectedText}。\n\n这版只沿左侧目录向下走：\n- 当前页先保存/检查\n- 本地没有的，保存\n- source 对但文件名错的，改名\n- 文件明显残缺的，重写补完整\n- 已经正确存在的，跳过\n\n它不会再跳回发刊词/导论；中途断了，就点到断点那篇再按这个按钮。\n当前起点：${currentTitle || '当前文章'}\n现在开始吗？`);
    if (!ok) return;

    const fileIndex = await scanClippingsIndex(dir);
    const cleanedCurrentTitle = cleanupSidebarTitle(currentTitle || getArticleTitle());
    const queue = {
      active: true,
      mode: 'audit-walk',
      dynamicMode: true,
      anchoredWalk: true,
      courseName: getCourseName(),
      sidebarPlan: [],
      index: 0,
      total: expected || 0,
      expectedTotal: expected || 0,
      startOrder: currentOrder,
      anchorTitle: cleanedCurrentTitle,
      anchorTitleKey: compactTitle(cleanedCurrentTitle),
      lastOrder: currentOrder,
      lastTitle: cleanedCurrentTitle,
      lastTitleKey: compactTitle(cleanedCurrentTitle),
      seenIds: [],
      fileIndex,
      stats: { saved: 0, skipped: 0, renamed: 0, repaired: 0, failed: 0 },
      startedAt: new Date().toISOString(),
    };
    saveQueue(queue);
    await processQueue();
  }

  async function handleResumeFromCurrent() {
    const id = `${APP}-resume-btn`;
    setButtonBusy(id, true, '准备从当前页继续...');
    try {
      clearStopFlag();
      sessionStorage.removeItem(CANONICAL_RESTART_COUNT_KEY);

      const article = currentArticle();
      if (!article?.id) throw new Error('当前页面不是得到文章页，URL 里没有 article id。');

      const dir = await chooseClippingsDir();
      await ensureDirPermission(dir, true);

      await startCourseSyncWithDir(dir);
    } catch (error) {
      console.error(error);
      alert(`从当前页继续失败：${error.message || error}`);
    } finally {
      setButtonBusy(id, false, '从当前页继续导出');
    }
  }

  async function startCurrentAnchoredExport(dir, article, message) {
    await ensureDirPermission(dir, false);
    const expected = expectedCourseArticleCount();
    const currentTitle = getCurrentSidebarTitle() || getArticleTitle() || article?.title || '';
    const currentOrder = getCurrentArticleOrder();
    const cleanedCurrentTitle = cleanupSidebarTitle(currentTitle);
    const queue = {
      active: true,
      mode: 'audit-walk',
      dynamicMode: true,
      anchoredWalk: true,
      courseName: getCourseName(),
      sidebarPlan: [],
      total: expected,
      expectedTotal: expected || 0,
      index: 0,
      seenIds: [],
      anchorId: article.id,
      startOrder: currentOrder,
      anchorTitle: cleanedCurrentTitle,
      anchorTitleKey: compactTitle(cleanedCurrentTitle),
      lastOrder: currentOrder,
      lastTitle: cleanedCurrentTitle,
      lastTitleKey: compactTitle(cleanedCurrentTitle),
      stats: { saved: 0, skipped: 0, renamed: 0, repaired: 0, failed: 0 },
      startedAt: new Date().toISOString(),
    };
    sessionStorage.removeItem(CANONICAL_RESTART_COUNT_KEY);
    saveQueue(queue);
    showStatus(message || '已建立从当前文章开始的断点队列。');
  }

  async function startCourseExportWithDir(dir) {
    return startCourseSyncWithDir(dir);
  }

  async function handleExportCurrent() {
    const id = `${APP}-current-btn`;
    setButtonBusy(id, true, '导出中...');
    try {
      clearStopFlag();
      const article = currentArticle();
      if (!article) throw new Error('当前页面不是得到文章页，URL 里没有 article id。');

      const dir = await chooseClippingsDir();
      await ensureDirPermission(dir, true);
      const queue = {
        active: true,
        mode: 'current',
        courseName: getCourseName(),
        articles: [article],
        index: 0,
        stats: { saved: 0, skipped: 0, failed: 0 },
        startedAt: new Date().toISOString(),
      };
      saveQueue(queue);
      await processQueue();
    } catch (error) {
      console.error(error);
      alert(`导出失败：${error.message || error}`);
    } finally {
      setButtonBusy(id, false, '只导出当前文章');
    }
  }

  async function collectCourseArticles() {
    if (restartCourseExportOnCanonicalPage('当前在 fullScreen 页面，先切回普通文章页再扫描目录...')) {
      throw new Error('正在切回普通文章页，请稍等自动继续。');
    }

    showStatus('寻找课程目录...');
    const sidebar = findSidebar();
    const articles = new Map();

    if (currentArticle()) addArticle(articles, currentArticle(), 'current');

    if (sidebar) {
      await expandSidebar(sidebar);
      await scrollSidebar(sidebar, articles);
      collectArticlesFromRoot(sidebar, articles, 'sidebar');
    }

    const expected = expectedCourseArticleCount();
    if (sidebar && (!expected || articles.size < expected)) {
      showStatus(`目录没有暴露足够链接，改用顺序导出模式。\n已识别 ${articles.size} 篇`);
    }

    if (articles.size <= 1) {
      collectArticlesFromRoot(document, articles, 'document-fallback');
      collectArticlesFromHtml(articles);
    }

    const result = Array.from(articles.values())
      .filter(a => a.id && a.url && isLikelyCourseArticle(a))
      .sort((a, b) => sortByTitle(a.title, b.title));

    showStatus(`已识别 ${result.length} 篇文章`);
    return result;
  }

  async function collectSidebarExportPlan() {
    const sidebar = findSidebar();

    try {
      if (sidebar) await expandSidebar(sidebar);
    } catch (_) {}

    const items = [];
    const seen = new Set();
    let rawItems = [];

    const addVisibleItems = () => {
      rawItems = getVisibleLeftLessonItems(sidebar);
      for (const item of rawItems) {
        const title = cleanupSidebarTitle(item.text);
        const key = compactTitle(title);
        if (!title || !key || seen.has(key)) continue;
        seen.add(key);
        items.push({ title, key });
      }
    };

    if (sidebar) {
      const scrollTargets = [sidebar, ...findScrollables(sidebar)]
        .filter(Boolean)
        .filter((el, idx, arr) => arr.indexOf(el) === idx)
        .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));

      let scannedScrollable = false;
      for (const scroller of scrollTargets) {
        if (shouldStopExport()) break;
        const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        if (maxTop < 40) continue;
        scannedScrollable = true;
        const original = scroller.scrollTop;
        const steps = Math.min(360, Math.max(20, Math.ceil(maxTop / Math.max(90, (scroller.clientHeight || 360) * 0.42))));
        for (let i = 0; i <= steps; i++) {
          if (shouldStopExport()) break;
          scroller.scrollTop = Math.round(maxTop * i / steps);
          await sleep(90);
          addVisibleItems();
          if (i % 12 === 0) showStatus(`扫描左侧完整目录...\n已收集 ${items.length} 篇`);
        }
        // Extra passes to the true bottom — scrollHeight may have grown during the
        // loop due to lazy-loading; the fixed step count misses newly revealed items.
        let prevHeight = scroller.scrollHeight;
        for (let extra = 0; extra < 6; extra++) {
          if (shouldStopExport()) break;
          scroller.scrollTop = 999999;
          await sleep(180);
          addVisibleItems();
          if (scroller.scrollHeight === prevHeight) break;
          prevHeight = scroller.scrollHeight;
        }

        scroller.scrollTop = original;
      }

      if (!scannedScrollable) addVisibleItems();
    } else {
      addVisibleItems();
    }

    const currentKey = compactTitle(getArticleTitle());
    let currentIndex = currentKey
      ? items.findIndex(item => item.key.includes(currentKey) || currentKey.includes(item.key))
      : -1;

    if (currentIndex < 0) {
      const activeIndex = rawItems.findIndex(item => /上次学到|已学完|已学\d+%/.test(item.el.innerText || item.el.textContent || ''));
      if (activeIndex >= 0) {
        const activeKey = compactTitle(rawItems[activeIndex].text);
        currentIndex = items.findIndex(item => item.key === activeKey);
      }
    }

    return { items, currentIndex };
  }

  function resolveCurrentPlanIndex(sidebarPlan) {
    const items = Array.isArray(sidebarPlan?.items) ? sidebarPlan.items : [];
    if (!items.length) return -1;
    if (Number.isInteger(sidebarPlan.currentIndex) && sidebarPlan.currentIndex >= 0) return sidebarPlan.currentIndex;

    const candidates = [
      getCurrentSidebarTitle(),
      getArticleTitle(),
      cleanupArticleTitle(document.title || ''),
    ].map(compactTitle).filter(Boolean);

    for (const candidate of candidates) {
      const index = items.findIndex(item => item.key && (item.key.includes(candidate) || candidate.includes(item.key)));
      if (index >= 0) return index;
    }

    const orderCandidates = [
      lessonOrderFromTitle(getCurrentSidebarTitle()),
      lessonOrderFromTitle(getArticleTitle()),
      lessonOrderFromTitle(document.title || ''),
    ].filter(value => value >= 0);

    for (const order of orderCandidates) {
      const index = items.findIndex(item => lessonOrderFromTitle(item.title) === order);
      if (index >= 0) return index;
    }

    return -1;
  }

  async function clickScanSidebar(sidebar, articles) {
    showStatus(`目录没有暴露足够链接，开始点击扫描...\n已识别 ${articles.size} 篇`);

    const scrollTargets = [sidebar, ...findScrollables(sidebar)]
      .filter(Boolean)
      .filter((el, idx, arr) => arr.indexOf(el) === idx);
    const scroller = scrollTargets.sort((a, b) => b.scrollHeight - a.scrollHeight)[0] || sidebar;
    const originalTop = scroller.scrollTop;
    const clicked = new Set();
    let attempts = 0;

    const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const steps = maxTop > 80 ? Math.min(80, Math.max(12, Math.ceil(maxTop / 260))) : 1;

    for (let step = 0; step <= steps; step++) {
      if (!document.contains(sidebar)) sidebar = findSidebar();
      if (!sidebar) break;

      if (steps > 1) scroller.scrollTop = Math.round(maxTop * step / steps);
      await sleep(220);

      const items = getSidebarLessonItems(sidebar);
      for (const item of items) {
        const signature = normalizeText(item.text).slice(0, 140);
        if (!signature || clicked.has(signature)) continue;
        clicked.add(signature);

        const before = idFromUrl(location.href);
        try {
          item.el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        } catch (_) {
          continue;
        }

        attempts++;
        await sleep(520);
        const after = idFromUrl(location.href);
        if (after && after !== before) {
          addArticle(articles, {
            id: after,
            title: cleanupSidebarTitle(item.text),
            url: articleUrl(after),
          }, 'click-scan');
        } else if (after) {
          addArticle(articles, {
            id: after,
            title: cleanupSidebarTitle(item.text),
            url: articleUrl(after),
          }, 'click-scan-current');
        }

        if (attempts % 8 === 0) {
          showStatus(`点击扫描目录...\n已点击 ${attempts} 个条目，识别 ${articles.size} 篇`);
        }
      }
    }

    try {
      scroller.scrollTop = originalTop;
    } catch (_) {}
    showStatus(`点击扫描完成。\n已识别 ${articles.size} 篇`);
  }

  function getSidebarLessonItems(sidebar) {
    const candidates = Array.from(sidebar.querySelectorAll('li, [class*="item"], [class*="list"], [class*="lesson"], [class*="article"], div'))
      .filter(isVisible)
      .filter(el => {
        const rect = el.getBoundingClientRect();
        const text = normalizeText(el.innerText || el.textContent);
        if (rect.width < 80 || rect.width > 380) return false;
        if (rect.height < 28 || rect.height > 140) return false;
        if (text.length < 4 || text.length > 180) return false;
        if (el.querySelectorAll('li, [class*="item"], [class*="lesson"], [class*="article"]').length > 3) return false;
        return isSidebarLessonElement(el, text) || isLikelyLessonTitle(text);
      });
    const nodes = leafLessonElements(candidates);

    const out = [];
    const seen = new Set();
    for (const el of nodes) {
      const text = cleanupSidebarTitle(el.innerText || el.textContent);
      if (!text || seen.has(text)) continue;
      seen.add(text);
      out.push({ el, text });
    }
    return out;
  }

  function getVisibleLeftLessonItems(preferredRoot) {
    const roots = [preferredRoot, document].filter(Boolean);
    const out = [];
    const seen = new Set();

    for (const root of roots) {
      const candidates = Array.from(root.querySelectorAll('li, [class*="item"], [class*="lesson"], [class*="article"], div'))
        .filter(isVisible)
        .filter(el => !el.closest?.(`#${APP}-panel, #${APP}-status, #${APP}-modal`))
        .filter(el => {
          const rect = el.getBoundingClientRect();
          const text = normalizeText(el.innerText || el.textContent);
          if (rect.left < -5 || rect.left > 360) return false;
          if (rect.right < 90 || rect.right > 460) return false;
          if (rect.width < 80 || rect.width > 390) return false;
          if (rect.height < 24) return false; // no upper bound — video-thumbnail items can exceed 280 px
          if (text.length < 4 || text.length > 220) return false;
          if (el.querySelectorAll('li, [class*="item"], [class*="lesson"], [class*="article"]').length > 3) return false;
          return isSidebarLessonElement(el, text);
        })
      const nodes = leafLessonElements(candidates)
        .sort((a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return ar.top - br.top || ar.left - br.left || ar.height - br.height;
        });

      for (const el of nodes) {
        const text = cleanupSidebarTitle(el.innerText || el.textContent);
        const key = compactTitle(text);
        if (!text || !key || seen.has(key)) continue;
        seen.add(key);
        out.push({ el, text });
      }

      if (out.length > 1) break;
    }

    return out;
  }

  function leafLessonElements(elements) {
    return elements.filter(el => !elements.some(other => other !== el && el.contains(other)));
  }

  function cleanupSidebarTitle(text) {
    return normalizeText(text)
      .replace(/^[^｜|丨：:\d]{1,16}\(\d{1,4}讲\)\s*/g, '')
      .replace(/\d{1,2}分\d{1,2}秒.*$/g, '')
      .replace(/\d{1,2}秒.*$/g, '')
      .replace(/\d+人学过.*$/g, '')
      .replace(/已学完.*$/g, '')
      .replace(/已学\d+%.*$/g, '')
      .replace(/上次学到/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isSidebarLessonElement(el, rawText) {
    const raw = normalizeText(rawText || el?.innerText || el?.textContent);
    const title = cleanupSidebarTitle(raw);
    if (!isPlausibleSidebarTitle(title)) return false;

    // 课程条目这一行通常带时长、学习人数、已学状态或播放按钮；章节分组标题没有这些结构。
    const hasLessonMeta = /\d{1,2}分\d{1,2}秒|\d+人学过|已学完|已学\d+%|上次学到/.test(raw);
    const hasPlayGlyph = /▶|播放|play/i.test(raw) || Boolean(el?.querySelector?.('svg, [class*="play"], [class*="audio"], [class*="video"]'));
    if (!hasLessonMeta && !hasPlayGlyph) return false;

    if (/已更新|共\s*\d{1,4}\s*讲|我的学习|知识城邦|账户充值|得到一下|课程目录|设置文本|收起目录/.test(raw)) return false;
    if (/^筛选[▾▴▲▼]?$/.test(normalizeText(raw))) return false;
    if (/^\D{0,8}\(\d{1,4}讲\)$/.test(title)) return false;
    return true;
  }

  function isPlausibleSidebarTitle(text) {
    const value = cleanupArticleTitle(text);
    if (!value || value.length < 2 || value.length > 140) return false;
    if (isUiOrNarrationTitle(value)) return false;
    if (isMarkdownImageLine(value) || containsUrl(value)) return false;
    if (/^\d+\s*\/\s*\d+$/.test(value)) return false;
    if (/^(?:\d{1,2}分)?\d{1,2}秒|^\d+人学过|^已学/.test(value)) return false;
    if (/我的学习|知识城邦|账户充值|得到一下|设置文本|收起目录|已更新|加载中|写留言|发布留言/.test(value)) return false;
    if (/^筛选[▾▴▲▼]?$/.test(value)) return false;
    if (/^\D{0,8}\(\d{1,4}讲\)$/.test(value)) return false;
    // Also reject grouped-sidebar section headers like "06｜经济学辞典(27讲)" which start
    // with a digit so the above pattern misses them, but they always end with (N讲).
    if (/\(\d{1,4}讲\)\s*$/.test(value)) return false;
    return /[\u4e00-\u9fffA-Za-z0-9]/.test(value);
  }

  function isLikelyLessonTitle(text) {
    const value = cleanupSidebarTitle(text);
    return /^(?:\d{1,3}(?:[.．、]\s*|[｜|丨])|第?\d{1,3}讲|发刊词|模块导读|【?直播加餐】?|【?加餐】?|加餐|直播|课前|结束|导读|导论|测试|路径|命题|应用|[一二三四五六七八九十]+、)/.test(value) ||
      /讲|问答|导读|课件|放送/.test(value);
  }

  function expectedCourseArticleCount() {
    const text = normalizeText(document.body?.innerText || '');
    const matches = Array.from(text.matchAll(/共\s*(\d{1,4})\s*讲/g)).map(match => Number(match[1])).filter(Boolean);
    return matches.length ? Math.max(...matches) : 0;
  }

  function isLikelyCourseArticle(article) {
    if (!article?.id || !article.url) return false;
    if (article.title && isLikelyLessonTitle(article.title)) return true;
    if (article.sources?.some(source => /current|click-scan|sidebar|scroll/.test(source))) return true;
    return false;
  }

  function findSidebar() {
    const candidates = Array.from(document.querySelectorAll('aside, nav, div, section, ul'))
      .filter(el => isVisible(el))
      .map(el => ({ el, score: scoreSidebar(el) }))
      .filter(item => item.score > 12)
      .sort((a, b) => b.score - a.score);
    return candidates[0]?.el || null;
  }

  function scoreSidebar(el) {
    const rect = el.getBoundingClientRect();
    const cls = String(el.className || '').toLowerCase();
    const text = normalizeText(el.textContent);
    let score = 0;
    score += Math.min(80, el.querySelectorAll('li').length * 3);
    score += Math.min(40, el.querySelectorAll('a[href*="article"], [data-id], [data-article-id], [class*="item"]').length * 2);
    if (/side|catalog|menu|list|chapter|lesson|article|column|course/.test(cls)) score += 25;
    if (/讲|节|课|模块|目录|已学|更新/.test(text)) score += 12;
    if (rect.left < 500 || rect.right > window.innerWidth - 500) score += 8;
    if (rect.height > 260 && rect.width > 120) score += 8;
    if (rect.width > window.innerWidth * .78) score -= 35;
    return score;
  }

  async function expandSidebar(sidebar) {
    showStatus('展开目录...');
    const clickables = Array.from(sidebar.querySelectorAll('[aria-expanded="false"], [class*="arrow"], [class*="expand"], [class*="fold"], [class*="collapse"], li'))
      .filter(isVisible)
      .slice(0, 160);

    let clicked = 0;
    for (const el of clickables) {
      const text = normalizeText(el.textContent);
      if (isSidebarLessonElement(el, text)) continue;
      const hasIcon = el.matches('[aria-expanded="false"], [class*="arrow"], [class*="expand"], [class*="fold"], [class*="collapse"]') ||
        el.querySelector('[class*="arrow"], [class*="expand"], [class*="fold"], [class*="collapse"]');
      const looksSection = text.length > 2 && text.length < 80 && /讲|节|周|模块|课前|结束|导读/.test(text);
      if (!hasIcon && !looksSection) continue;
      try {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        clicked++;
        if (clicked % 20 === 0) await sleep(120);
      } catch (_) {}
    }
    if (clicked) await sleep(500);
  }

  async function scrollSidebar(sidebar, articles) {
    showStatus(`滚动目录加载...\n已识别 ${articles.size} 篇`);
    const targets = [sidebar, ...findScrollables(sidebar), document.scrollingElement || document.documentElement]
      .filter(Boolean)
      .filter((el, idx, arr) => arr.indexOf(el) === idx);

    for (const el of targets) {
      const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
      const steps = maxTop > 80 ? Math.min(35, Math.max(8, Math.ceil(maxTop / 420))) : 1;
      const original = el.scrollTop;
      for (let i = 0; i <= steps; i++) {
        if (steps > 1) el.scrollTop = Math.round(maxTop * i / steps);
        await sleep(90);
        collectArticlesFromRoot(sidebar, articles, 'scroll');
        if (i % 8 === 0) showStatus(`滚动目录加载...\n已识别 ${articles.size} 篇`);
      }
      el.scrollTop = original;
    }
  }

  function findScrollables(root) {
    return Array.from(root.querySelectorAll('div, ul, ol, section'))
      .filter(el => {
        const style = getComputedStyle(el);
        return isVisible(el) &&
          el.scrollHeight > el.clientHeight + 80 &&
          /(auto|scroll|overlay)/.test(`${style.overflowY}${style.overflow}`);
      })
      .slice(0, 8);
  }

  function collectArticlesFromRoot(root, map, source) {
    root.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || a.href;
      const id = idFromUrl(href);
      if (id) addArticle(map, { id, title: normalizeText(a.textContent), url: articleUrl(id) }, source);
    });

    const attrs = ['data-id', 'data-article-id', 'data-articleid', 'data-enid', 'data-item-id', 'data-key', 'data-url', 'href'];
    root.querySelectorAll('li, [data-id], [data-article-id], [data-enid], [data-url], [class*="item"], [class*="article"], [class*="lesson"]').forEach(el => {
      for (const attr of attrs) {
        const value = el.getAttribute?.(attr);
        const id = idFromUrl(value) || (value && ID_RE.test(value) ? value : null);
        if (id) addArticle(map, { id, title: readableTitle(el), url: articleUrl(id) }, source);
      }

      for (const [key, value] of Object.entries(el.dataset || {})) {
        if (!/(id|url|article|item|enid)/i.test(key)) continue;
        const id = idFromUrl(value) || (value && ID_RE.test(value) ? value : null);
        if (id) addArticle(map, { id, title: readableTitle(el), url: articleUrl(id) }, source);
      }
    });
  }

  function collectArticlesFromHtml(map) {
    const html = document.documentElement.innerHTML;
    const patterns = [
      /course\/article\?id=([A-Za-z0-9_-]{8,})/g,
      /["'](?:articleId|article_id|articleEnid|article_enid|enid)["']\s*:\s*["']([A-Za-z0-9_-]{8,})["']/g,
    ];
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(html))) {
        addArticle(map, { id: match[1], url: articleUrl(match[1]) }, 'html');
      }
    }
  }

  function addArticle(map, article, source) {
    if (!article?.id || !ID_RE.test(article.id)) return;
    const existing = map.get(article.id);
    const title = normalizeText(article.title || existing?.title);
    map.set(article.id, {
      id: article.id,
      title: title.slice(0, 160),
      url: article.url || articleUrl(article.id),
      sources: Array.from(new Set([...(existing?.sources || []), source].filter(Boolean))),
    });
  }

  function currentArticle() {
    const id = idFromUrl(location.href);
    if (!id) return null;
    // Video/audio recap lessons (e.g. "\u4e32\u8bb2\u7b54\u7591") often have no lesson-specific
    // h1/h2 on the page itself -- getArticleTitle() then falls back to scanning
    // body text and can mistake an ordinary transcript sentence for the title.
    // The left-nav sidebar always has the real lesson name, so grab it here too;
    // resolveArticleTitle() prefers sidebarTitle over the page-derived title.
    const sidebarTitle = getCurrentSidebarTitle();
    return { id, title: getArticleTitle(), sidebarTitle, url: articleUrl(id), sources: ['current'] };
  }

  function assertStillOnArticle(expected, message) {
    const current = currentArticle();
    if (!expected?.id || !current?.id || current.id === expected.id) return;
    throw new Error(message || `页面从 ${expected.id} 跳到了 ${current.id}，已停止。`);
  }

  function idFromUrl(url) {
    if (!url) return null;
    const match = String(url).match(/[?&]id=([^&?#]+)/);
    if (!match) return null;
    const id = decodeURIComponent(match[1]);
    return ID_RE.test(id) ? id : null;
  }

  function articleUrl(id) {
    return `${ARTICLE_PREFIX}${encodeURIComponent(id)}`;
  }

  function restartCourseExportOnCanonicalPage(message) {
    const current = currentArticle();
    if (!current?.id) return false;

    const target = articleUrl(current.id);
    const currentUrl = String(location.href || '');
    const needsCanonical = isFullScreenUrl() || currentUrl !== target;
    if (!needsCanonical) return false;

    const count = Number(sessionStorage.getItem(CANONICAL_RESTART_COUNT_KEY) || '0');
    if (count >= 1) return false;
    sessionStorage.setItem(CANONICAL_RESTART_COUNT_KEY, String(count + 1));

    localStorage.setItem(PENDING_COURSE_EXPORT_KEY, '1');
    showStatus(message || '切回标准文章页后继续扫描目录...');
    disableBeforeUnload();
    location.replace(target);
    return true;
  }

  function isFullScreenUrl() {
    try {
      const url = new URL(location.href);
      if (url.searchParams.get('fullScreen') === 'true') return true;
    } catch (_) {}
    return [location.href, document.URL, location.search].some(value => /(?:[?&]|^)fullScreen=true(?:[&#]|$)/i.test(String(value || '')));
  }

  function urlWithoutFullScreen() {
    const url = new URL(location.href);
    url.searchParams.delete('fullScreen');
    return url.toString();
  }

  function canonicalArticleSource(article) {
    const id = article?.id || idFromUrl(article?.url) || idFromUrl(location.href);
    if (id) return articleUrl(id);
    return String(article?.url || location.href).replace(/[?&]fullScreen=true/g, '');
  }

  function readableTitle(el) {
    const titleEl = el.querySelector?.('[class*="title"], [class*="name"], [class*="text"], h1, h2, h3, h4, span, div');
    return normalizeText(titleEl?.textContent || el.textContent);
  }

  function sortByTitle(a, b) {
    const an = normalizeText(a).match(/\d+/)?.[0];
    const bn = normalizeText(b).match(/\d+/)?.[0];
    if (an && bn && Number(an) !== Number(bn)) return Number(an) - Number(bn);
    return 0;
  }

  function showUrlResult(articles, errorMessage) {
    closeModal();
    const courseName = getCourseName();
    const modal = document.createElement('div');
    modal.id = `${APP}-modal`;
    modal.style.cssText = modalStyle();
    modal.innerHTML = `
      <div style="font-size:20px;font-weight:650;margin-bottom:6px;">${escapeHtml(courseName)}</div>
      <div style="font-size:14px;color:#64748b;margin-bottom:16px;">${errorMessage ? escapeHtml(errorMessage) : `找到 ${articles.length} 篇文章`}</div>
      <div style="flex:1;overflow:auto;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;min-height:180px;margin-bottom:16px;">
        ${articles.slice(0, 160).map((a, i) => `
          <div style="padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#334155;">
            ${i + 1}. ${escapeHtml(a.title || a.id)}
            <div style="color:#94a3b8;word-break:break-all;">${escapeHtml(a.url)}</div>
          </div>
        `).join('')}
        ${articles.length === 0 ? '<div style="padding:40px;text-align:center;color:#94a3b8;">未找到文章</div>' : ''}
      </div>
      <div style="display:flex;gap:10px;">
        <button data-action="download" style="${smallButton('#4f46e5', '#fff')}" ${articles.length ? '' : 'disabled'}>下载URL文件</button>
        <button data-action="copy" style="${smallButton('#f1f5f9', '#334155')}" ${articles.length ? '' : 'disabled'}>复制URL</button>
        <button data-action="close" style="${smallButton('#fff', '#64748b', true)}">关闭</button>
      </div>
    `;

    modal.onclick = async event => {
      const action = event.target?.getAttribute?.('data-action');
      if (action === 'close') closeModal();
      if (action === 'copy') {
        await navigator.clipboard.writeText(articles.map(a => a.url).join('\n'));
        event.target.textContent = '已复制';
      }
      if (action === 'download') {
        downloadText(`${safeFileName(courseName)}-urls.txt`, articles.map(a => a.url).join('\n') + '\n');
      }
    };
    showModal(modal);
  }

  async function processQueue() {
    if (shouldStopExport()) {
      stopActiveQueue('批量导出已停止。');
      return;
    }

    const queue = loadQueue();
    if (!queue?.active) return;

    const dir = await getStoredDir();
    if (!dir) {
      showStatus('找不到 Clippings 文件夹授权，请重新点击导出按钮选择文件夹。');
      return;
    }

    const permission = await ensureDirPermission(dir, false);
    if (permission !== 'granted') {
      showStatus('需要重新授权 Clippings 文件夹。\n请点击“同步MD到Clippings”继续。');
      return;
    }

    if (queue.mode === 'sidebar-walk' || queue.mode === 'audit-walk') {
      await processSidebarWalkQueue(queue, dir);
      return;
    }

    if (queue.mode === 'walk') {
      await processWalkQueue(queue, dir);
      return;
    }

    const article = queue.articles[queue.index];
    if (!article) {
      queue.active = false;
      saveQueue(queue);
      hideStatus();
      alert(doneMessage(queue));
      return;
    }

    const current = currentArticle();
    if (!current || current.id !== article.id) {
      if (shouldStopExport()) {
        stopActiveQueue('批量导出已停止。');
        return;
      }
      showStatus(`打开第 ${queue.index + 1}/${queue.articles.length} 篇...\n${article.title || article.id}`);
      disableBeforeUnload();
      location.href = article.url;
      return;
    }

    showStatus(`导出第 ${queue.index + 1}/${queue.articles.length} 篇...\n${article.title || getArticleTitle()}`);
    await waitForArticleReady();
    await preloadFullPageContent();
    if (shouldStopExport()) {
      stopActiveQueue('批量导出已停止。');
      return;
    }

    let filename = '';
    try {
      assertArticlePageUsable(article);
      const data = buildMarkdownData(article);
      assertMarkdownLooksLikeArticle(data.md);
      const md = data.md;
      const title = data.cleanTitle;
      filename = safeFileName(`${title} - 得到APP.md`);
      const result = queue.mode === 'current'
        ? await writeMarkdownForSingleTest(dir, filename, md)
        : await writeMarkdownIfMissing(dir, filename, md);
      queue.lastFile = result.filename || filename;
      queue.lastResult = result.status;
      if (result.status === 'saved') queue.stats.saved++;
      if (result.status === 'skipped') queue.stats.skipped++;
    } catch (error) {
      console.error('[得到导出器] 单篇失败', error);
      queue.stats.failed++;
      queue.lastError = `${article.url}${filename ? ` (${filename})` : ''}: ${error.message || error}`;
      stopQueueOnArticleFailure(queue);
      return;
    }

    queue.index++;
    saveQueue(queue);
    if (queue.index >= queue.articles.length) {
      queue.active = false;
      saveQueue(queue);
      hideStatus();
      alert(doneMessage(queue));
      return;
    }

    await sleep(700);
    if (shouldStopExport()) {
      stopActiveQueue('批量导出已停止。');
      return;
    }
    disableBeforeUnload();
    location.href = queue.articles[queue.index].url;
  }

  async function processSidebarWalkQueue(queue, dir) {
    if (shouldStopExport()) {
      stopActiveQueue('批量导出已停止。');
      return;
    }

    const current = currentArticle();
    if (!current) {
      showStatus('批量导出暂停：当前页面没有识别到文章 id。');
      return;
    }

    if (isFullScreenUrl()) {
      showStatus('当前是 fullScreen 页面，直接保存当前文章，不再切回导论。');
      await sleep(500);
    }

    queue.sidebarPlan = Array.isArray(queue.sidebarPlan) ? queue.sidebarPlan : [];
    queue.seenIds = Array.isArray(queue.seenIds) ? queue.seenIds : [];
    queue.stats = queue.stats || { saved: 0, skipped: 0, renamed: 0, repaired: 0, failed: 0 };
    if (typeof queue.stats.renamed !== 'number') queue.stats.renamed = 0;
    if (typeof queue.stats.repaired !== 'number') queue.stats.repaired = 0;
    const isAudit = queue.mode === 'audit-walk';
    const isAnchoredWalk = queue.anchoredWalk || queue.dynamicMode || !queue.sidebarPlan.length;

    const total = Number(queue.total || queue.sidebarPlan.length || 0);
    const alreadySeen = queue.seenIds.includes(current.id);

    if (!alreadySeen) {
      const displayIndex = queue.seenIds.length + 1;
      const plannedIndex = Number(queue.index || 0);
      const planned = !isAnchoredWalk && plannedIndex >= 0 && plannedIndex < queue.sidebarPlan.length
        ? queue.sidebarPlan[plannedIndex]
        : null;
      // v1.81: consume the sidebar title saved BEFORE navigation (reliable for audio courses
      // where document.title is not the article title).
      const pendingTitle = queue._pendingNextTitle ? cleanupSidebarTitle(queue._pendingNextTitle) : '';
      if (pendingTitle) delete queue._pendingNextTitle;
      const currentSidebarTitle = pendingTitle || getCurrentSidebarTitle();
      const article = {
        ...current,
        title: planned?.title || currentSidebarTitle || current.title || getArticleTitle(),
        sidebarTitle: planned?.title || currentSidebarTitle || '',
      };
      showStatus(`${isAudit ? '检查补漏' : '左侧目录批量'}第 ${displayIndex}${total ? `/${total}` : ''} 篇...\n${article.title || getArticleTitle()}`);
      await waitForArticleReady();
      const actualTitle = getArticleTitle();
      const actualSidebarTitle = getCurrentSidebarTitle() || currentSidebarTitle;
      const hasReadableTitle = Boolean(compactTitle(actualTitle) || compactTitle(actualSidebarTitle));
      if (planned && hasReadableTitle && !titlesLooselyMatch(planned.title, actualTitle) && !titlesLooselyMatch(planned.title, actualSidebarTitle)) {
        console.warn('[得到导出器] 标题读取与计划不一致，继续使用左侧目录标题保存', {
          planned: planned.title,
          actualTitle,
          actualSidebarTitle,
          currentId: current.id,
        });
      }
      await preloadFullPageContent();
      if (shouldStopExport()) {
        stopActiveQueue('批量导出已停止。');
        return;
      }

      let filename = '';
      let savedArticleTitle = article.sidebarTitle || article.title || getArticleTitle();
      try {
        const pageTitle = cleanupArticleTitle(actualTitle);
        const safeArticle = {
          ...article,
          title: isGoodArticleTitle(pageTitle) ? pageTitle : (actualSidebarTitle || article.title),
          sidebarTitle: isGoodArticleTitle(pageTitle) ? pageTitle : (actualSidebarTitle || article.sidebarTitle),
        };
        savedArticleTitle = safeArticle.sidebarTitle || safeArticle.title || savedArticleTitle;
        assertArticlePageUsable(safeArticle);
        const data = buildMarkdownData(safeArticle);
        assertMarkdownLooksLikeArticle(data.md);
        savedArticleTitle = data.cleanTitle || savedArticleTitle;
        filename = filenameFromCleanTitle(outputTitleForArticle(data.cleanTitle, safeArticle.sidebarTitle));
        const result = isAudit
          ? await auditMarkdownInClippings(dir, queue, safeArticle, filename, data.md, data.cleanTitle)
          : await writeMarkdownIfMissing(dir, filename, data.md);
        queue.lastFile = result.filename || filename;
        queue.lastResult = result.status;
        if (result.status === 'saved') queue.stats.saved++;
        if (result.status === 'skipped') queue.stats.skipped++;
        if (result.status === 'renamed') queue.stats.renamed++;
        if (result.status === 'repaired') queue.stats.repaired++;
      } catch (error) {
        const isSkippablePage = /目录列表.*不是文章正文|视频\/音频专属页|未识别到文章标题/.test(error.message || '');
        if (isSkippablePage) {
          console.warn('[得到导出器] 跳过无正文页，继续下一篇', current.id, error.message);
          queue.stats.skipped++;
          // fall through to seenIds.push so this page isn't retried
        } else {
          console.error('[得到导出器] 左侧目录批量单篇失败', error);
          queue.stats.failed++;
          queue.lastError = `${canonicalArticleSource(article)}${filename ? ` (${filename})` : ''}: ${error.message || error}`;
          stopQueueOnArticleFailure(queue);
          return;
        }
      }

      queue.seenIds.push(current.id);
      queue.lastTitle = cleanupSidebarTitle(savedArticleTitle);
      queue.lastTitleKey = compactTitle(queue.lastTitle);
      queue.lastOrder = getCurrentArticleOrder();
      queue.index = queue.seenIds.length;
      saveQueue(queue);
    } else {
      // Update anchor to current position even when skipping an already-seen article.
      // Without this, queue.lastTitle stays at the previous saved article, so
      // findAnchoredNextSidebarControl keeps resolving "next after previous" = this same
      // article again → infinite cycle on the same already-seen page.
      const currentOrd = getCurrentArticleOrder();
      if (currentOrd >= 0) queue.lastOrder = currentOrd;
      // Use page title directly — getCurrentSidebarTitle() can fall back to the
      // "上次学到" marker (which may be a different, earlier article) when the
      // current article is not visible in the sidebar (e.g. a different module).
      // That would set the anchor backwards and cause a reverse loop.
      const freshTitle = cleanupSidebarTitle(getArticleTitle() || current.title || '');
      if (freshTitle && compactTitle(freshTitle)) {
        queue.lastTitle = freshTitle;
        queue.lastTitleKey = compactTitle(freshTitle);
      }
      saveQueue(queue);
    }

    if (total && queue.seenIds.length >= total) {
      queue.active = false;
      saveQueue(queue);
      hideStatus();
      alert(doneMessage(queue));
      return;
    }

    let target = null;
    let targetSource = '';
    if (shouldStopExport()) {
      stopActiveQueue('批量导出已停止。');
      return;
    }

    const shouldContinueDynamically = () => {
      const expectedRemaining = Number(queue.total || 0);
      const expectedCourseTotal = Number(queue.expectedTotal || 0);
      if (expectedRemaining && queue.seenIds.length < expectedRemaining) return true;
      if (expectedCourseTotal && queue.seenIds.length < expectedCourseTotal) return true;
      return false;
    };

    const nextIndex = Math.max(Number(queue.index || 0) + 1, queue.seenIds.length);
    if (isAnchoredWalk) {
      // Primary: title-index sidebar — walks every sidebar item in DOM order,
      // including 加餐/工具/进阶/附录 interleaved between numbered articles.
      // Order-based search is intentionally avoided: it skips unnumbered items
      // and finds wrong articles when numbering restarts across sections.
      target = await findAnchoredNextSidebarControl(queue);
      if (target) {
        targetSource = 'anchored-sidebar';
        showStatus('从当前断点向下打开下一篇...');
      }
      // Right-rail fallback intentionally removed: "下一篇" on 加餐/辞典 articles
      // often links to an earlier article in publication order, causing backward loops.
      // The v1.73 height-filter fix and v1.74 title-extraction fix make sidebar
      // navigation reliable enough that right-rail is no longer a safe fallback.
      queue.index = queue.seenIds.length;
    } else {
      const hasPlannedNext = queue.sidebarPlan.length && nextIndex < queue.sidebarPlan.length;
      if (hasPlannedNext) {
        queue.index = nextIndex;
        const plannedNext = queue.sidebarPlan[nextIndex];
        target = await findSidebarItemByKey(plannedNext.key);
        targetSource = 'plan';
        if (target) {
          showStatus(`打开下一篇...\n${plannedNext.title}`);
        } else if (isAudit || shouldContinueDynamically()) {
          queue.dynamicMode = true;
          targetSource = '';
          showStatus(`计划里的下一篇暂时没渲染，改为动态寻找...\n${plannedNext.title}`);
        } else {
          queue.active = false;
          queue.lastError = `没有在左侧目录找到计划中的第 ${nextIndex + 1} 篇：${plannedNext.title}`;
          saveQueue(queue);
          hideStatus();
          alert(`${doneMessage(queue)}\n\n${queue.lastError}\n批量导出已停止，避免跳过中间文章。`);
          return;
        }
      } else if (queue.sidebarPlan.length && (isAudit || shouldContinueDynamically())) {
        queue.dynamicMode = true;
        queue.index = nextIndex;
        showStatus(isAudit
          ? '当前扫描到的目录清单已检查完，继续向后滚动寻找下一篇...'
          : '当前渲染的目录清单已导出完，继续向后滚动寻找下一篇...');
      } else if (queue.sidebarPlan.length) {
        queue.active = false;
        saveQueue(queue);
        hideStatus();
        alert(doneMessage(queue));
        return;
      }
    }

    if (!target && isAnchoredWalk) {
      queue.active = false;
      saveQueue(queue);
      hideStatus();
      alert(`${doneMessage(queue)}\n\n没有在左侧目录当前断点之后找到下一篇，批量导出已停止。`);
      return;
    }

    if (!target) {
      const nextOrder = getCurrentArticleOrder() + 1;
      if (nextOrder > 0) {
        target = await findSidebarItemByOrderAsync(nextOrder);
        if (target) {
          targetSource = 'order';
          showStatus(`按编号打开第 ${nextOrder} 篇...`);
        }
      }
      if (!target) target = findRightRailNextControl();
      if (target) {
        if (!targetSource) targetSource = 'right';
        if (targetSource === 'right') showStatus('打开右侧“下一篇”...');
      } else {
        target = await findSidebarNextControlAsync();
        targetSource = 'sidebar';
        showStatus('打开左侧目录下一篇...');
      }
      queue.index = queue.seenIds.length;
      if (!target) {
        queue.active = false;
        saveQueue(queue);
        hideStatus();
        alert(`${doneMessage(queue)}\n\n没有在左侧目录当前断点之后找到下一篇，批量导出已停止。`);
        return;
      }
    }

    saveQueue(queue);
    if (shouldStopExport()) {
      stopActiveQueue('批量导出已停止。');
      return;
    }
    let moved = await clickNavigationControlAndWait(target, current.id);
    if (!moved && targetSource === 'right-primary') {
      showStatus('右侧"下一篇"没有响应，改点左侧目录...');
      const fallback = await findAnchoredNextSidebarControl(queue);
      if (fallback) moved = await clickNavigationControlAndWait(fallback, current.id);
    }
    if (!moved && targetSource === 'anchored-sidebar') {
      showStatus('左侧下一篇没有响应，重新从当前断点向下找一次...');
      const retryTarget = await findAnchoredNextSidebarControl(queue);
      if (retryTarget && retryTarget !== target) {
        moved = await clickNavigationControlAndWait(retryTarget, current.id);
      }
    }
    if (!moved && targetSource === 'plan') {
      if (isAudit) {
        queue.dynamicMode = true;
        showStatus('计划中的下一篇没有响应，改为动态寻找下一篇...');
        const fallbackTarget = await findSidebarNextControlAsync();
        if (fallbackTarget) {
          targetSource = 'sidebar';
          moved = await clickNavigationControlAndWait(fallbackTarget, current.id);
        }
      } else {
        queue.active = false;
        queue.lastError = `点击计划中的下一篇后页面没有变化：${queue.sidebarPlan[Number(queue.index || 0)]?.title || '未知标题'}`;
        saveQueue(queue);
        hideStatus();
        alert(`${doneMessage(queue)}\n\n${queue.lastError}\n批量导出已停止，避免重复保存当前页或跳篇。`);
        return;
      }
    }
    if (!moved && targetSource === 'right') {
      showStatus('右侧“下一篇”没有响应，改点左侧目录下一篇...');
      const sidebarTarget = await findSidebarNextControlAsync();
      if (sidebarTarget) {
        moved = await clickNavigationControlAndWait(sidebarTarget, current.id);
      }
    }
    if (!moved && targetSource !== 'right' && targetSource !== 'right-primary' && targetSource !== 'anchored-sidebar') {
      showStatus('左侧目录下一篇没有响应，改点右侧“下一篇”...');
      const rightTarget = findRightRailNextControl();
      if (rightTarget) {
        moved = await clickNavigationControlAndWait(rightTarget, current.id);
      }
    }
    if (moved === 'changed') {
      await sleep(900);
      await processQueue();
      return;
    }

    if (!moved) {
      queue.active = false;
      saveQueue(queue);
      hideStatus();
      alert(`${doneMessage(queue)}\n\n点击下一篇后页面没有变化，批量导出已停止，避免重复保存当前页。`);
    }
  }

  async function processWalkQueue(queue, dir) {
    if (shouldStopExport()) {
      stopActiveQueue('批量导出已停止。');
      return;
    }

    const current = currentArticle();
    if (!current) {
      showStatus('顺序导出暂停：当前页面没有识别到文章 id。');
      return;
    }

    queue.seenIds = Array.isArray(queue.seenIds) ? queue.seenIds : [];
    const total = Number(queue.total || 0);
    const alreadySeen = queue.seenIds.includes(current.id);

    if (!alreadySeen) {
      const displayIndex = queue.seenIds.length + 1;
      showStatus(`顺序导出第 ${displayIndex}${total ? `/${total}` : ''} 篇...\n${current.title || getArticleTitle()}`);
      await waitForArticleReady();
      await preloadFullPageContent();
      if (shouldStopExport()) {
        stopActiveQueue('批量导出已停止。');
        return;
      }

      let filename = '';
      try {
        assertArticlePageUsable(current);
        const data = buildMarkdownData(current);
        assertMarkdownLooksLikeArticle(data.md);
        filename = safeFileName(`${data.cleanTitle} - 得到APP.md`);
        const result = await writeMarkdownIfMissing(dir, filename, data.md);
        queue.lastFile = result.filename || filename;
        queue.lastResult = result.status;
        if (result.status === 'saved') queue.stats.saved++;
        if (result.status === 'skipped') queue.stats.skipped++;
      } catch (error) {
        console.error('[得到导出器] 顺序导出单篇失败', error);
        queue.stats.failed++;
        queue.lastError = `${canonicalArticleSource(current)}${filename ? ` (${filename})` : ''}: ${error.message || error}`;
        stopQueueOnArticleFailure(queue);
        return;
      }

      queue.seenIds.push(current.id);
      queue.index = queue.seenIds.length;
      saveQueue(queue);
    }

    if (total && queue.seenIds.length >= total) {
      queue.active = false;
      saveQueue(queue);
      hideStatus();
      alert(doneMessage(queue));
      return;
    }

    if (shouldStopExport()) {
      stopActiveQueue('批量导出已停止。');
      return;
    }
    const moved = await clickNextArticle(current.id);
    if (!moved) {
      queue.active = false;
      saveQueue(queue);
      hideStatus();
      alert(`${doneMessage(queue)}\n\n没有找到“下一篇”，顺序导出已停止。`);
      return;
    }

    if (moved === 'changed') {
      await sleep(900);
      await processQueue();
    }
  }

  async function clickNextArticle(beforeId) {
    if (shouldStopExport()) return false;
    const next = await findNextArticleControl();
    if (!next) return false;

    if (shouldStopExport()) return false;
    showStatus('打开下一篇...');
    disableBeforeUnload();
    try {
      next.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    } catch (_) {
      next.click?.();
    }
    next.click?.();

    for (let i = 0; i < 30; i++) {
      if (shouldStopExport()) return false;
      await sleep(300);
      const current = currentArticle();
      if (current?.id && current.id !== beforeId) return 'changed';
    }

    return 'navigating';
  }

  async function findNextArticleControl() {
    const sidebarNext = await findSidebarNextControlAsync();
    return sidebarNext || null;
  }

  function findSidebarNextControl() {
    const sidebar = findSidebar();
    return findSidebarNextControlFromSidebar(sidebar);
  }

  async function findAnchoredNextSidebarControl(queue) {
    if (shouldStopExport()) return null;
    const startedAt = Date.now();
    const timeoutMs = 30000;
    let sidebar = findSidebar();
    let direct = findAnchoredNextInVisibleSidebar(sidebar, queue);
    if (direct) return direct;
    if (!sidebar) return null;

    // Track whether the current article was visible in the initial sidebar view.
    // If it was visible at start but scrolls out of the virtual-scroll viewport,
    // every item now visible is definitionally AFTER the current position — so
    // the first non-anchor item is the correct next article (needed for unnumbered
    // articles like 辞典11 whose order=-1, which firstVisibleItemAfterOrder skips).
    const initialItems = getVisibleLeftLessonItems(sidebar);
    const currentFoundInitially = findCurrentVisibleLessonIndex(initialItems, queue) >= 0;

    const scrollTargets = [sidebar, ...findScrollables(sidebar)]
      .filter(Boolean)
      .filter((el, idx, arr) => arr.indexOf(el) === idx)
      .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));

    for (const scroller of scrollTargets) {
      if (shouldStopExport()) return null;
      if (Date.now() - startedAt > timeoutMs) return null;
      const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      if (maxTop < 30) continue;

      let stalled = 0;
      for (let i = 0; i < 90; i++) {
        if (shouldStopExport()) return null;
        if (Date.now() - startedAt > timeoutMs) return null;
        const beforeTop = scroller.scrollTop;
        const step = Math.max(180, Math.floor((scroller.clientHeight || 360) * 0.75));
        scroller.scrollTop = Math.min(maxTop, beforeTop + step);
        await sleep(260);
        sidebar = findSidebar() || sidebar;
        direct = findAnchoredNextInVisibleSidebar(sidebar, queue);
        if (direct) return direct;

        // Scroll-past detection for unnumbered articles (order=-1):
        // if current article was visible at start but is no longer in view,
        // return the first non-anchor visible item (it comes after current).
        if (currentFoundInitially) {
          const items = getVisibleLeftLessonItems(sidebar);
          if (items.length && findCurrentVisibleLessonIndex(items, queue) < 0) {
            const anchorKeys = new Set(queueAnchorKeys(queue));
            for (const item of items) {
              if (!item.el.isConnected) continue; // virtual scroll may have detached this
              const key = compactTitle(item.text);
              if (key && !anchorKeys.has(key)) {
                try {
                  const ctrl = clickableLeftSideOf(item.el);
                  if (ctrl) {
                    queue._pendingNextTitle = item.text;
                    return ctrl;
                  }
                } catch (_) { continue; }
              }
            }
          }
        }

        if (scroller.scrollTop === beforeTop || scroller.scrollTop >= maxTop) {
          stalled += 1;
          if (stalled >= 2) break;
        } else {
          stalled = 0;
        }
      }
    }

    return null;
  }

  function findAnchoredNextInVisibleSidebar(sidebar, queue) {
    if (!sidebar) return null;
    const items = getVisibleLeftLessonItems(sidebar);
    if (items.length < 2) return null;

    const index = findCurrentVisibleLessonIndex(items, queue);
    if (index >= 0) return firstClickableAfterVisibleIndex(items, index, queue);

    const storedOrder = Number(queue.lastOrder);
    const currentOrder = Number.isFinite(storedOrder) && storedOrder >= 0 ? storedOrder : getCurrentArticleOrder();
    if (currentOrder >= 0) {
      const firstAfterCurrent = firstVisibleItemAfterOrder(items, currentOrder, queue);
      if (firstAfterCurrent) return firstAfterCurrent;

      const ordered = items
        .map(item => ({ item, order: lessonOrderFromTitle(item.text) }))
        .filter(entry => entry.order > currentOrder)
        .sort((a, b) => a.order - b.order);
      if (ordered.length) {
        queue._pendingNextTitle = ordered[0].item.text;
        return clickableLeftSideOf(ordered[0].item.el);
      }
    }

    return null;
  }

  function findCurrentVisibleLessonIndex(items, queue) {
    if (!items?.length) return -1;

    // Search keys: lastTitle + live page signals ONLY.
    // Do NOT include anchorTitle (always article 01, never updated) — it produces
    // false positives when the sidebar hasn't scrolled to the current article yet,
    // causing the walk to restart from article 02.
    const searchKeys = [
      queue?.lastTitle,
      getCurrentSidebarTitle(),
      getArticleTitle(),
      cleanupArticleTitle(document.title || ''),
    ]
      .map(t => compactTitle(cleanupSidebarTitle(t || '')))
      .filter(Boolean);

    for (const key of searchKeys) {
      const index = items.findIndex(item => {
        const itemKey = compactTitle(item.text);
        return itemKey && (itemKey === key || itemKey.includes(key) || key.includes(itemKey));
      });
      if (index >= 0) return index;
    }

    const storedOrder = Number(queue?.lastOrder);
    const currentOrder = Number.isFinite(storedOrder) && storedOrder >= 0 ? storedOrder : getCurrentArticleOrder();
    if (currentOrder >= 0) {
      const byOrder = items.findIndex(item => lessonOrderFromTitle(item.text) === currentOrder);
      if (byOrder >= 0) return byOrder;
    }

    // 上次学到 intentionally NOT used here: it marks where the user last studied
    // in the 得到 app, which diverges from the batch-export current position and
    // causes the walk to jump to that unrelated article.
    return -1;
  }

  function firstClickableAfterVisibleIndex(items, index, queue) {
    if (index < 0 || index + 1 >= items.length) return null;
    const anchorKeys = new Set(queueAnchorKeys(queue));
    for (let i = index + 1; i < items.length; i++) {
      const key = compactTitle(items[i].text);
      if (!key || anchorKeys.has(key)) continue;
      const clickable = clickableLeftSideOf(items[i].el);
      if (clickable) {
        if (queue) queue._pendingNextTitle = items[i].text;
        return clickable;
      }
    }
    return null;
  }

  function firstVisibleItemAfterOrder(items, currentOrder, queue) {
    if (!items?.length || currentOrder < 0) return null;

    // Check if the sidebar has scrolled PAST the current article (no visible items
    // at or before currentOrder). When true, every visible item is after the current
    // position, so the very first one is the correct next article — including
    // unnumbered 加餐/工具/进阶 items (order=-1) that come right after a numbered article.
    const hasItemsAtOrBeforeCurrent = items.some(item => {
      const ord = lessonOrderFromTitle(item.text);
      return ord >= 0 && ord <= currentOrder;
    });
    if (!hasItemsAtOrBeforeCurrent) {
      if (queue) queue._pendingNextTitle = items[0].text;
      return clickableLeftSideOf(items[0].el);
    }

    // Standard: first item with order > currentOrder.
    const byOrder = items.find(item => lessonOrderFromTitle(item.text) > currentOrder);
    if (byOrder) {
      if (queue) queue._pendingNextTitle = byOrder.text;
      return clickableLeftSideOf(byOrder.el);
    }

    // Module-boundary fallback: item at index immediately after the last match for
    // currentOrder (handles unnumbered items that follow a numbered article in DOM).
    let lastMatchIdx = -1;
    for (let i = 0; i < items.length; i++) {
      if (lessonOrderFromTitle(items[i].text) === currentOrder) lastMatchIdx = i;
    }
    if (lastMatchIdx >= 0 && lastMatchIdx + 1 < items.length) {
      if (queue) queue._pendingNextTitle = items[lastMatchIdx + 1].text;
      return clickableLeftSideOf(items[lastMatchIdx + 1].el);
    }
    return null;
  }

  function queueAnchorKeys(queue) {
    const candidates = [
      queue?.lastTitle,
      queue?.anchorTitle,
      getCurrentSidebarTitle(),
      getArticleTitle(),
      cleanupArticleTitle(document.title || ''),
    ]
      .map(cleanupSidebarTitle)
      .map(compactTitle)
      .filter(Boolean);
    return Array.from(new Set(candidates));
  }

  async function findSidebarNextControlAsync() {
    if (shouldStopExport()) return null;
    const startedAt = Date.now();
    const timeoutMs = 18000;
    let sidebar = findSidebar();
    let direct = findSidebarNextControlFromSidebar(sidebar);
    if (direct) return direct;

    const currentKey = compactTitle(getArticleTitle() || getCurrentSidebarTitle());
    const currentOrder = getCurrentArticleOrder();

    const scrollTargets = [sidebar, ...findScrollables(sidebar)]
      .filter(Boolean)
      .filter((el, idx, arr) => arr.indexOf(el) === idx)
      .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));

    for (const scroller of scrollTargets) {
      if (shouldStopExport()) return null;
      if (Date.now() - startedAt > timeoutMs) return null;
      const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      if (maxTop < 30) continue;

      for (let i = 0; i < 24; i++) {
        if (shouldStopExport()) return null;
        if (Date.now() - startedAt > timeoutMs) return null;
        const beforeTop = scroller.scrollTop;
        const step = Math.max(120, Math.floor((scroller.clientHeight || 360) * 0.65));
        scroller.scrollTop = Math.min(maxTop, beforeTop + step);
        await sleep(260);
        sidebar = findSidebar() || sidebar;

        direct = findSidebarNextControlFromSidebar(sidebar);
        if (direct) return direct;

        const fallback = firstForwardVisibleSidebarItem(sidebar, currentKey, currentOrder);
        if (fallback) return fallback;
        if (scroller.scrollTop === beforeTop || scroller.scrollTop >= maxTop) break;
      }
    }

    if (currentOrder >= 0) {
      const byOrder = await findSidebarItemByOrderAsync(currentOrder + 1, startedAt, timeoutMs);
      if (byOrder) return byOrder;
    }

    return null;
  }

  async function findSidebarItemByOrderAsync(order, startedAt = Date.now(), timeoutMs = 14000) {
    if (!Number.isFinite(order) || order < 0) return null;
    let sidebar = findSidebar();

    const findVisible = () => {
      const items = getVisibleLeftLessonItems(sidebar);
      const match = items.find(item => lessonOrderFromTitle(item.text) === order);
      return match ? clickableLeftSideOf(match.el) : null;
    };

    let found = findVisible();
    if (found) return found;
    if (!sidebar) return null;

    const scrollTargets = [sidebar, ...findScrollables(sidebar)]
      .filter(Boolean)
      .filter((el, idx, arr) => arr.indexOf(el) === idx)
      .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));

    for (const scroller of scrollTargets) {
      if (shouldStopExport()) return null;
      if (Date.now() - startedAt > timeoutMs) return null;
      const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      if (maxTop < 30) continue;

      const currentTop = Math.max(0, scroller.scrollTop || 0);
      const step = Math.max(120, Math.floor((scroller.clientHeight || 360) * 0.55));
      for (let top = currentTop; top <= maxTop; top += step) {
        if (shouldStopExport()) return null;
        if (Date.now() - startedAt > timeoutMs) return null;
        scroller.scrollTop = Math.min(maxTop, top);
        await sleep(180);
        sidebar = findSidebar() || sidebar;
        found = findVisible();
        if (found) return found;
      }
    }

    return null;
  }

  function findSidebarNextControlFromSidebar(sidebar) {
    if (!sidebar) return null;

    const items = getVisibleLeftLessonItems(sidebar);
    if (items.length < 2) return null;

    const index = findCurrentVisibleLessonIndex(items, {
      lastTitle: cleanupArticleTitle(getArticleTitle()),
      anchorTitle: getCurrentSidebarTitle(),
      lastOrder: getCurrentArticleOrder(),
    });
    return firstClickableAfterVisibleIndex(items, index, null);
  }

  function firstForwardVisibleSidebarItem(sidebar, currentKey, currentOrder) {
    const items = getVisibleLeftLessonItems(sidebar);
    if (!items.length) return null;

    const currentStillVisible = currentKey && items.some(item => compactTitle(item.text) === currentKey);
    if (currentStillVisible) return null;

    const first = items.find(item => compactTitle(item.text) !== currentKey);
    if (first) {
      const order = lessonOrderFromTitle(first.text);
      if (currentOrder < 0 || order < 0 || order > currentOrder) {
        const clickable = clickableLeftSideOf(first.el);
        if (clickable) return clickable;
      }
    }

    if (currentOrder >= 0) {
      const ordered = items
        .map(item => ({ item, order: lessonOrderFromTitle(item.text) }))
        .filter(entry => entry.order > currentOrder)
        .sort((a, b) => a.order - b.order);
      if (ordered.length) return clickableLeftSideOf(ordered[0].item.el);
    }

    return null;
  }

  function lessonOrderFromTitle(text) {
    const value = cleanupSidebarTitle(text);
    const match = value.match(/^(?:第)?0*(\d{1,4})(?:讲|[.．、｜|丨\s])/);
    return match ? Number(match[1]) : -1;
  }

  function getCurrentArticleOrder() {
    const candidates = [
      getArticleTitle(),
      getCurrentSidebarTitle(),
      cleanupArticleTitle(document.title || ''),
    ];
    for (const candidate of candidates) {
      const order = lessonOrderFromTitle(candidate);
      if (order >= 0) return order;
    }
    return -1;
  }

  function getCurrentSidebarTitle() {
    const sidebar = findSidebar();
    const items = getVisibleLeftLessonItems(sidebar);
    if (!items.length) return '';

    // Primary: match by article ID from current URL. Reliable even when the page title
    // doesn't contain standard lesson markers (e.g. "为什么你一定要分享关系攻略?").
    // Scans all <a> elements in each item — audio courses may use /course/audio or
    // other URL patterns, not just /course/article.
    const currentId = idFromUrl(location.href);
    if (currentId) {
      const idMatched = items.find(item => {
        const el = item.el;
        if (el.tagName === 'A' && (el.getAttribute('href') || '').includes(currentId)) return true;
        return Array.from(el.querySelectorAll('a[href]')).some(a => (a.getAttribute('href') || '').includes(currentId));
      });
      if (idMatched) return cleanupSidebarTitle(idMatched.text);
    }

    // Fallback: title-key matching. Try both getArticleTitle() and document.title —
    // audio courses often have the correct title only in document.title, not in h1/h2.
    const titleKeys = [
      compactTitle(getArticleTitle()),
      compactTitle(cleanupArticleTitle(document.title || '')),
    ].filter(Boolean);
    for (const titleKey of titleKeys) {
      const matched = items.find(item => {
        const key = compactTitle(item.text);
        return key && (key.includes(titleKey) || titleKey.includes(key));
      });
      if (matched) return cleanupSidebarTitle(matched.text);
    }

    const lastStudied = items.find(item => /上次学到/.test(item.el.innerText || item.el.textContent || ''));
    if (lastStudied) return cleanupSidebarTitle(lastStudied.text);

    // Do NOT fall back to 已学完 here — that returns the FIRST already-completed article
    // (often article 01/02) when the current article is not visible in the sidebar,
    // causing findCurrentVisibleLessonIndex to anchor at the wrong position and
    // restart the walk from the beginning.
    return '';
  }

  async function findSidebarItemByKey(targetKey) {
    const wanted = compactTitle(targetKey);
    if (!wanted) return null;

    let sidebar = findSidebar();

    const findVisible = () => {
      const items = getVisibleLeftLessonItems(sidebar);
      let match = items.find(item => compactTitle(item.text) === wanted);
      if (!match) {
        match = items.find(item => {
          const key = compactTitle(item.text);
          return key && (key.includes(wanted) || wanted.includes(key));
        });
      }
      return match ? clickableLeftSideOf(match.el) : null;
    };

    let found = findVisible();
    if (found) return found;

    if (!sidebar) return null;

    const scrollTargets = [sidebar, ...findScrollables(sidebar)]
      .filter(Boolean)
      .filter((el, idx, arr) => arr.indexOf(el) === idx)
      .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));

    for (const scroller of scrollTargets) {
      if (shouldStopExport()) return null;
      const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      if (maxTop < 40) continue;
      const original = scroller.scrollTop;
      const steps = Math.min(420, Math.max(30, Math.ceil(maxTop / 150)));
      for (let i = 0; i <= steps; i++) {
        if (shouldStopExport()) return null;
        scroller.scrollTop = Math.round(maxTop * i / steps);
        await sleep(80);
        sidebar = findSidebar() || sidebar;
        found = findVisible();
        if (found) return found;
      }
      scroller.scrollTop = original;
    }

    return null;
  }

  async function clickNavigationControlAndWait(control, beforeId) {
    if (shouldStopExport()) return false;
    if (!control) return false;
    disableBeforeUnload();

    if (typeof control.activate === 'function') {
      if (shouldStopExport()) return false;
      const activated = await control.activate(beforeId);
      if (activated) return activated;
    } else {
      const clicked = await clickElementAtMultiplePoints(control, beforeId);
      if (clicked) return clicked;
    }

    for (let i = 0; i < 60; i++) {
      if (shouldStopExport()) return false;
      await sleep(250);
      const current = currentArticle();
      if (current?.id && current.id !== beforeId) return 'changed';
    }

    return false;
  }

  async function clickElementAtMultiplePoints(el, beforeId) {
    if (!el || !isVisible(el)) return false;

    const fireAt = (target, x, y) => {
      for (const type of ['pointerover', 'mouseover', 'pointermove', 'mousemove', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
        const EventClass = type.startsWith('pointer') && typeof PointerEvent !== 'undefined' ? PointerEvent : MouseEvent;
        target.dispatchEvent(new EventClass(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
        }));
      }
    };

    const currentIdChanged = () => {
      const current = currentArticle();
      return current?.id && current.id !== beforeId;
    };

    const targets = [];
    for (let node = el, i = 0; node && i < 6; i++, node = node.parentElement) {
      if (!isVisible(node)) continue;
      if (node.closest?.(`#${APP}-panel, #${APP}-status`)) continue;
      targets.push(node);
    }

    for (const target of targets.filter((node, idx, arr) => arr.indexOf(node) === idx)) {
      const rect = target.getBoundingClientRect();
      const xs = [
        rect.left + rect.width / 2,
        rect.left + Math.min(18, rect.width * 0.3),
        rect.right - Math.min(18, rect.width * 0.3),
      ].filter(x => x > rect.left && x < rect.right);
      const ys = [
        rect.top + rect.height / 2,
        rect.top + Math.min(18, rect.height * 0.3),
        rect.bottom - Math.min(18, rect.height * 0.3),
      ].filter(y => y > rect.top && y < rect.bottom);

      for (const y of ys) {
        for (const x of xs) {
          if (shouldStopExport()) return false;
          const pointTarget = document.elementFromPoint(x, y) || target;
          try {
            fireAt(pointTarget, x, y);
            pointTarget.click?.();
            target.click?.();
          } catch (_) {}

          for (let i = 0; i < 4; i++) {
            await sleep(150);
            if (currentIdChanged()) return 'changed';
          }
        }
      }
    }

    return false;
  }

  function clickableLeftSideOf(el) {
    const fireAt = (target, x, y) => {
      for (const type of ['pointerover', 'mouseover', 'pointermove', 'mousemove', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
        const EventClass = type.startsWith('pointer') && typeof PointerEvent !== 'undefined' ? PointerEvent : MouseEvent;
        target.dispatchEvent(new EventClass(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
        }));
      }
    };

    const currentIdChanged = beforeId => {
      const current = currentArticle();
      return current?.id && current.id !== beforeId;
    };

    const clickTargets = () => {
      const targets = [];
      let node = el;
      for (let i = 0; node && i < 5; i++, node = node.parentElement) {
        if (!isVisible(node)) continue;
        const rect = node.getBoundingClientRect();
        if (rect.left > 420 || rect.width > 460) continue;
        targets.push(node);
      }
      return targets.filter((node, idx, arr) => arr.indexOf(node) === idx);
    };

    // Extract article URL strictly from el itself or its DIRECT children only.
    // Never use closest() — ancestor traversal finds "继续学习" / breadcrumb <a> tags
    // that point to an earlier article (e.g. article 01), causing backward-loop bugs.
    const extractArticleUrl = () => {
      if (el.tagName === 'A') {
        const href = el.getAttribute('href') || el.href || '';
        if (href.includes('article')) {
          const id = idFromUrl(href);
          if (id) return articleUrl(id);
        }
      }
      for (const child of Array.from(el.children || [])) {
        if (child.tagName === 'A') {
          const href = child.getAttribute('href') || child.href || '';
          if (href.includes('article')) {
            const id = idFromUrl(href);
            if (id) return articleUrl(id);
          }
        }
      }
      return null;
    };

    return {
      async activate(beforeId) {
        // Scroll the element into view first so coordinate-based clicks land on-screen.
        try { el.scrollIntoView({ behavior: 'instant', block: 'nearest' }); } catch (_) {}
        await sleep(100);

        // Try clicking the <a> link directly — most reliable for Vue/React SPA routing.
        // Direct children only (same logic as extractArticleUrl): never walk the full subtree
        // because a deeply-nested <a> may point to a different article (e.g. "继续学习" link).
        const directLink = el.tagName === 'A' ? el
          : Array.from(el.children || []).find(c => c.tagName === 'A' && (c.getAttribute('href') || '').includes('article'))
            ?? el.querySelector?.('a[href*="/course/article"]');
        if (directLink) {
          try { directLink.click(); } catch (_) {}
          await sleep(700);
          if (currentIdChanged(beforeId)) return 'changed';
        }

        // Coordinate-based click simulation (pointer + mouse event sequence).
        for (const target of clickTargets()) {
          if (shouldStopExport()) return false;
          const rect = target.getBoundingClientRect();
          const y = rect.top + Math.min(Math.max(rect.height / 2, 16), rect.height - 10);
          const xs = [
            rect.left + Math.min(42, rect.width * 0.25),
            rect.left + rect.width * 0.5,
            rect.right - Math.min(42, rect.width * 0.22),
          ].filter(x => x > rect.left && x < rect.right);

          for (const x of xs) {
            if (shouldStopExport()) return false;
            const pointTarget = document.elementFromPoint(x, y) || target;
            try {
              fireAt(pointTarget, x, y);
              target.click?.();
            } catch (_) {}
            await sleep(360);
            if (currentIdChanged(beforeId)) return 'changed';
          }
        }
        // URL fallback: only el itself or direct children — no ancestor traversal.
        const url = extractArticleUrl();
        if (url && !url.includes(beforeId)) {
          location.href = url;
          return 'changed';
        }
        return false;
      },
      dispatchEvent(event) {
        const rect = el.getBoundingClientRect();
        const x = Math.max(rect.left + 18, Math.min(rect.left + rect.width * 0.35, rect.right - 24));
        const y = rect.top + Math.min(Math.max(rect.height / 2, 16), rect.height - 10);
        const target = document.elementFromPoint(x, y) || el;
        fireAt(target, x, y);
        return true;
      },
      click() {
        const rect = el.getBoundingClientRect();
        const x = Math.max(rect.left + 18, Math.min(rect.left + rect.width * 0.35, rect.right - 24));
        const y = rect.top + Math.min(Math.max(rect.height / 2, 16), rect.height - 10);
        const target = document.elementFromPoint(x, y) || el;
        target.click?.();
      },
    };
  }

  function compactTitle(text) {
    return normalizeText(text)
      .replace(/[-｜|丨:："'“”‘’\s]/g, '')
      .replace(/\d{1,2}分\d{1,2}秒.*$/g, '')
      .replace(/\d{1,2}秒.*$/g, '')
      .replace(/\d+人学过.*$/g, '')
      .replace(/已学完|已学\d+%|上次学到/g, '')
      .trim();
  }

  function titlesLooselyMatch(expected, actual) {
    const a = compactTitle(expected);
    const b = compactTitle(actual);
    if (!a || !b) return false;
    if (a === b || a.includes(b) || b.includes(a)) return true;
    const expectedOrder = lessonOrderFromTitle(expected);
    const actualOrder = lessonOrderFromTitle(actual);
    return expectedOrder >= 0 && expectedOrder === actualOrder;
  }

  function outputTitleForArticle(extractedTitle, plannedTitle) {
    const planned = cleanupArticleTitle(plannedTitle || '');
    const extracted = cleanupArticleTitle(extractedTitle || '');
    if (isGoodArticleTitle(extracted)) return extracted;
    if (isPlausibleSidebarTitle(planned)) return planned;
    return extracted || planned || '未命名';
  }

  function filenameFromCleanTitle(cleanTitle) {
    return safeFileName(`${cleanupArticleTitle(cleanTitle || '未命名')} - 得到APP.md`);
  }

  function replaceMarkdownYamlTitle(markdown, cleanTitle) {
    const fullTitle = `${cleanupArticleTitle(cleanTitle || '未命名')} - 得到APP`;
    return String(markdown || '').replace(/^title:\s*["']?.+?["']?\s*$/m, `title: "${yamlEscape(fullTitle)}"`);
  }

  function findRightRailNextControl() {
    // DOM text search — coordinate-based approach fails when the extension panel
    // overlaps the target area (elementFromPoint returns panel elements instead).
    const panelSel = `#${APP}-panel, #${APP}-status`;
    for (const el of document.querySelectorAll('a, button, [role="button"], [role="link"]')) {
      if (!isVisible(el)) continue;
      if (el.closest?.(panelSel)) continue;
      const text = normalizeText(
        el.getAttribute('aria-label') || el.getAttribute('title') ||
        el.innerText || el.textContent || ''
      );
      if (!/下一篇|下一讲|下一节/.test(text) || text.length > 15) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      // Must not be confined to the far-left sidebar area
      if (rect.right < window.innerWidth * 0.35) continue;
      return el;
    }
    return null;
  }

  async function resumeQueueIfNeeded() {
    if (shouldStopExport()) {
      stopActiveQueue('批量导出已停止。');
      return;
    }

    if (localStorage.getItem(PENDING_COURSE_EXPORT_KEY) === '1') {
      localStorage.removeItem(PENDING_COURSE_EXPORT_KEY);
      await sleep(1200);
      if (shouldStopExport()) {
        stopActiveQueue('批量导出已停止。');
        return;
      }
      try {
        const dir = await getStoredDir();
        if (!dir) {
          showStatus('已切回普通文章页。请重新点击“同步MD到Clippings”，选择 Clippings 文件夹。');
          return;
        }

        const permission = await ensureDirPermission(dir, false);
        if (permission !== 'granted') {
          showStatus('已切回普通文章页。Chrome 需要重新授权 Clippings 文件夹，请再点一次“同步MD到Clippings”。');
          return;
        }

        await startCourseExportWithDir(dir);
      } catch (error) {
        console.error(error);
        showStatus(`切回普通页后自动继续失败：${error.message || error}\n请再点一次“同步MD到Clippings”。`);
      }
      return;
    }

    const queue = loadQueue();
    if (!queue?.active) return;
    // Only auto-resume on article pages — course/detail or other pages have no article
    // content and no useful article sidebar, so resuming there causes wrong navigation.
    if (!location.href.includes('/course/article')) return;
    await sleep(900);
    if (shouldStopExport()) {
      stopActiveQueue('批量导出已停止。');
      return;
    }
    processQueue().catch(error => {
      console.error(error);
      showStatus(`自动续传失败：${error.message || error}`);
    });
  }

  async function waitForArticleReady() {
    for (let i = 0; i < 30; i++) {
      const root = findArticleRoot();
      const text = normalizeText(root?.innerText || root?.textContent);
      if (text.length > 500 || (document.readyState === 'complete' && text.length > 180)) return;
      await sleep(400);
    }
  }

  function assertArticlePageUsable(article) {
    const text = normalizeText(document.body?.innerText || '');
    if (/服务异常|请稍后重试|页面不存在|访问出错/.test(text)) {
      throw new Error('页面服务异常，未保存');
    }
    if (isVideoOnlyPage()) {
      throw new Error('视频/音频专属页，无文字正文，已跳过');
    }

    const title = getArticleTitle() || firstTitleFromMarkdown(domToMarkdown(findArticleRoot() || document.body));
    if (!title && !article?.title) {
      throw new Error('未识别到文章标题，未保存');
    }
  }

  function isVideoOnlyPage() {
    const root = findArticleRoot();
    const text = normalizeText(root?.innerText || root?.textContent || '');
    // Must be short — real articles always have 400+ chars of body text
    if (text.length > 400) return false;
    if (document.querySelector('video')) return true;
    if (/建议WiFi环境下播放|建议在WiFi/.test(text)) return true;
    if (document.querySelector('[class*="audioplayer"], [class*="audio-player"], [class*="video-player"]')) return true;
    return false;
  }

  function assertMarkdownLooksLikeArticle(markdown) {
    const body = String(markdown || '').replace(/^---[\s\S]*?---/, '').trim();
    const compact = normalizeText(body);
    const listSignals = (compact.match(/\d{1,2}分\d{1,2}秒|人学过|已学完|已学\d+%|上次学到/g) || []).length;
    const paragraphSignals = (compact.match(/。|？|！|你好|今天|首先|所以|但是|如果/g) || []).length;
    const imageOnlyTitle = /^!\[\]\(https?:\/\//.test(compact);

    if (imageOnlyTitle || listSignals >= 4 || (listSignals >= 2 && paragraphSignals < 8)) {
      throw new Error('当前抓到的是目录列表，不是文章正文，已停止写入');
    }
  }

  async function preloadFullPageContent() {
    const startX = window.scrollX;
    const startY = window.scrollY;
    let lastHeight = 0;
    let stable = 0;

    for (let i = 0; i < 14; i++) {
      const height = Math.max(
        document.body?.scrollHeight || 0,
        document.documentElement?.scrollHeight || 0
      );
      const y = Math.round(height * Math.min(1, (i + 1) / 12));
      window.scrollTo(startX, y);
      await sleep(260);

      const nextHeight = Math.max(
        document.body?.scrollHeight || 0,
        document.documentElement?.scrollHeight || 0
      );
      stable = Math.abs(nextHeight - lastHeight) < 40 ? stable + 1 : 0;
      lastHeight = nextHeight;
      if (stable >= 3 && document.body?.innerText?.includes('用户留言')) break;
    }

    window.scrollTo(startX, startY);
    await sleep(180);
  }

  function buildMarkdown(article) {
    return buildMarkdownData(article).md;
  }

  function buildMarkdownData(article) {
    const body = extractArticleMarkdown(article);
    const cleanTitle = stripDedaoSuffix(resolveArticleTitle(article, body));
    const title = `${cleanTitle} - 得到APP`;
    const source = canonicalArticleSource(article);
    const author = getAuthor();
    const description = getMeta('description') || DEFAULT_DESCRIPTION;

    const md = [
      '---',
      `title: "${yamlEscape(title)}"`,
      `source: "${yamlEscape(source)}"`,
      author ? `author:\n  - "[[${yamlEscape(author)}]]"` : 'author:',
      'published:',
      `created: ${today()}`,
      `description: "${yamlEscape(description)}"`,
      'tags:',
      '  - "clippings"',
      '---',
      body,
      '',
    ].join('\n');

    return { md, cleanTitle, title, source };
  }

  function extractArticleMarkdown(article) {
    const root = findArticleRoot();
    const sourceRoot = root || document.body;
    const markdown = domToMarkdown(sourceRoot);
    const clean = markdown
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+\n/g, '\n')
      .trim();
    let clipped = clipToCurrentArticle(clean, article);
    if (clipped.length > 80) {
      clipped = appendDocumentCommentsIfMissing(clipped, article);
      return enhanceMarkdownHierarchy(cleanArticleChrome(clipped));
    }

    const plain = normalizeText(sourceRoot.innerText || '').replace(/。/g, '。\n\n').trim();
    clipped = appendDocumentCommentsIfMissing(clipToCurrentArticle(plain, article), article);
    return enhanceMarkdownHierarchy(cleanArticleChrome(clipped));
  }

  function appendDocumentCommentsIfMissing(markdown, article) {
    const text = String(markdown || '');
    if (/(\n|^)#{0,6}\s*用户留言(\n|$)/.test(text)) return text;

    const bodyMarkdown = domToMarkdown(document.body)
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+\n/g, '\n')
      .trim();
    const bodyClipped = clipToCurrentArticle(bodyMarkdown, article);
    const comments = extractCommentSection(bodyClipped || bodyMarkdown);

    if (!comments || !/\S/.test(comments.replace(/用户留言/g, ''))) return text;
    return `${text.trim()}\n\n${comments}`;
  }

  function extractCommentSection(markdown) {
    const text = String(markdown || '');
    const match = text.match(/(?:^|\n)(?:#{1,6}\s*)?用户留言\n/);
    if (!match || match.index === undefined) return '';
    const start = match.index + (match[0].startsWith('\n') ? 1 : 0);
    return text.slice(start).trim();
  }

  function findArticleRoot() {
    const centerCandidates = articleCenterAncestors();
    const selectors = [
      'article',
      'main',
      '[class*="article"]',
      '[class*="content"]',
      '[class*="detail"]',
      '[class*="rich"]',
      '[class*="reader"]',
      '[class*="text"]',
    ];
    const candidates = [...centerCandidates, ...Array.from(document.querySelectorAll(selectors.join(',')))]
      .filter(isVisible)
      .filter((el, idx, arr) => arr.indexOf(el) === idx)
      .map(el => ({ el, score: scoreArticleRoot(el) }))
      .filter(item => item.score > 120)
      .sort((a, b) => b.score - a.score);
    return candidates[0]?.el || document.querySelector('main') || document.body;
  }

  function articleCenterAncestors() {
    const points = [
      [window.innerWidth * 0.56, window.innerHeight * 0.52],
      [window.innerWidth * 0.56, window.innerHeight * 0.38],
      [window.innerWidth * 0.56, window.innerHeight * 0.70],
    ];
    const out = [];
    for (const [x, y] of points) {
      let el = document.elementFromPoint(x, y);
      for (let i = 0; el && i < 8; i++, el = el.parentElement) out.push(el);
    }
    return out;
  }

  function scoreArticleRoot(el) {
    const text = normalizeText(el.innerText || el.textContent);
    const cls = String(el.className || '').toLowerCase();
    const rect = el.getBoundingClientRect();
    let score = Math.min(text.length, 8000);
    const listSignals = (text.match(/\d{1,2}分\d{1,2}秒|人学过|已学完|已学\d+%|上次学到/g) || []).length;
    const title = getArticleTitle();

    if (/article|content|detail|rich|reader|text/.test(cls)) score += 800;
    if (el.querySelector('h1,h2,h3')) score += 300;
    if (el.querySelectorAll('p, img, blockquote').length > 5) score += 300;
    if (title && text.includes(title)) score += 1400;
    if (rect.left > 320 && rect.left < window.innerWidth * 0.72 && rect.width > 480) score += 3000;
    if (rect.left > 500 && rect.width > 520 && rect.width < window.innerWidth * 0.78) score += 1800;
    if (rect.width < 260 || rect.height < 180) score -= 1000;
    if (rect.right < 420 || (rect.left < 340 && rect.width < 430)) score -= 7000;
    if (listSignals >= 4) score -= 5000;
    if (el.querySelectorAll('li').length > 80) score -= 2000;
    if (text.includes('课前必读') && text.includes('已更新') && text.includes('筛选')) score -= 3000;
    if (text.includes('加载中...') && text.includes('白程程，你好')) score += 1200;
    if (el.id === `${APP}-panel` || el.closest?.(`#${APP}-panel`)) score -= 5000;
    return score;
  }

  function domToMarkdown(node) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) return normalizeInline(node.textContent);
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node;
    const tag = el.tagName.toLowerCase();
    if (el.id?.startsWith(APP) || el.closest?.(`#${APP}-panel, #${APP}-status`)) return '';
    if (['script', 'style', 'noscript', 'svg', 'canvas', 'button', 'input', 'select', 'textarea', 'nav', 'aside', 'header', 'footer'].includes(tag)) return '';
    if (!isVisible(el) && tag !== 'img') return '';

    if (tag === 'br') return '\n';
    if (tag === 'img') {
      const src = el.currentSrc || el.src || el.getAttribute('data-src') || el.getAttribute('src');
      if (isSkippableImageElement(el, src)) return '';
      return src ? `\n\n![](${src})\n\n` : '';
    }
    if (tag === 'strong' || tag === 'b') return wrapInline('**', childrenInline(el));
    if (tag === 'em' || tag === 'i') return wrapInline('*', childrenInline(el));
    if (tag === 'a') return childrenInline(el);
    if (/^h[1-6]$/.test(tag)) {
      const level = Math.min(Number(tag[1]) + 1, 6);
      const text = normalizeText(el.innerText || el.textContent);
      return text ? `\n\n${'#'.repeat(level)} ${text}\n\n` : '';
    }
    if (tag === 'blockquote') {
      const text = domChildren(el).trim();
      return text ? `\n\n${text.split('\n').map(line => line ? `> ${line}` : '>').join('\n')}\n\n` : '';
    }
    if (tag === 'li') {
      const text = domChildren(el).trim().replace(/\n+/g, '\n  ');
      return text ? `- ${text}\n` : '';
    }
    if (tag === 'ul' || tag === 'ol') return `\n${domChildren(el)}\n`;
    if (['p', 'section', 'article', 'main'].includes(tag)) {
      const text = domChildren(el).trim();
      return text ? `\n\n${text}\n\n` : '';
    }
    if (tag === 'div') {
      const hasBlock = Array.from(el.children).some(child => /^(div|p|section|article|main|ul|ol|li|blockquote|h[1-6])$/i.test(child.tagName));
      const text = hasBlock ? domChildren(el).trim() : childrenInline(el).trim();
      return text ? (hasBlock ? `\n${text}\n` : `\n\n${text}\n\n`) : '';
    }
    return domChildren(el);
  }

  function domChildren(el) {
    return Array.from(el.childNodes).map(domToMarkdown).join('');
  }

  function childrenInline(el) {
    return Array.from(el.childNodes).map(child => {
      if (child.nodeType === Node.TEXT_NODE) return normalizeInline(child.textContent);
      if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'br') return ' ';
      return domToMarkdown(child).replace(/\n+/g, ' ');
    }).join('').replace(/\s+/g, ' ').trim();
  }

  function wrapInline(marker, text) {
    const value = String(text || '').trim();
    if (!value) return '';
    if (value.startsWith(marker) && value.endsWith(marker)) return value;
    return `${marker}${value}${marker}`;
  }

  function isSkippableImageElement(img, src) {
    if (!src) return true;
    if (isAvatarOrPromoImageUrl(src)) return true;
    if (isCalloutLabelIcon(img)) return true;

    const rect = img.getBoundingClientRect?.();
    const width = rect?.width || img.naturalWidth || Number(img.getAttribute('width')) || 0;
    const height = rect?.height || img.naturalHeight || Number(img.getAttribute('height')) || 0;
    const squareLike = width > 0 && height > 0 && Math.abs(width - height) <= Math.max(10, Math.min(width, height) * 0.25);
    if (!squareLike || Math.max(width, height) > 120) return false;

    const scope = [
      img.className,
      img.alt,
      img.parentElement?.className,
      img.parentElement?.parentElement?.className,
    ].map(value => String(value || '').toLowerCase()).join(' ');

    return /avatar|head|portrait|author|user|comment|reply|face|photo/.test(scope);
  }

  // Small "解释/案例/提示/小贴士" bullet-marker icons (e.g. in 薛兆丰经济学课辞典)
  // sit right next to their own bold label text, so the label already carries
  // the meaning — the icon is purely decorative. We detect these by adjacent
  // text rather than measured size, because getBoundingClientRect() can read 0
  // at extraction time (image not yet laid out during preload/scroll), which
  // previously let them fall through as normal content images and render at
  // full native resolution in Obsidian instead of their small on-page size.
  function isCalloutLabelIcon(img) {
    const scopeEl = img.closest?.('p, li, div, span') || img.parentElement;
    const scopeText = normalizeText(scopeEl?.textContent || '').slice(0, 20);
    return /^(解释|案例|提示|小贴士|知识点|划重点|重点|注意)[：:]/.test(scopeText);
  }

  async function chooseClippingsDir() {
    if (!window.showDirectoryPicker) {
      throw new Error('当前 Chrome 不支持直接选择文件夹。请升级 Chrome，或先用 URL 提取方案。');
    }
    // Always prompt so the user can pick any destination (Clippings, Mini MBA, etc.)
    const dir = await window.showDirectoryPicker({ id: 'dedao-clippings', mode: 'readwrite' });
    await storeDir(dir);
    return dir;
  }

  async function ensureDirPermission(dir, request) {
    const options = { mode: 'readwrite' };
    if ((await dir.queryPermission(options)) === 'granted') return 'granted';
    if (request && (await dir.requestPermission(options)) === 'granted') return 'granted';
    return 'prompt';
  }

  async function writeMarkdownIfMissing(dir, filename, content) {
    try {
      await dir.getFileHandle(filename, { create: false });
      return { status: 'skipped', filename };
    } catch (_) {
      const handle = await dir.getFileHandle(filename, { create: true });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return { status: 'saved', filename };
    }
  }

  async function writeMarkdownForSingleTest(dir, filename, content) {
    try {
      await dir.getFileHandle(filename, { create: false });
      const testName = filename.replace(/\.md$/i, ' - codex-test.md');
      return await writeMarkdownReplacing(dir, testName, content);
    } catch (_) {
      return await writeMarkdownReplacing(dir, filename, content);
    }
  }

  async function writeMarkdownReplacing(dir, filename, content) {
    const handle = await dir.getFileHandle(filename, { create: true });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return { status: 'saved', filename };
  }

  async function scanClippingsIndex(dir) {
    const index = {
      entries: [],
      byName: {},
      bySource: {},
      bySourceId: {},
      byTitleKey: {},
      titleKeyCounts: {},
    };

    for await (const [name, handle] of dir.entries()) {
      if (handle.kind !== 'file' || !/\.md$/i.test(name)) continue;
      let text = '';
      try {
        const file = await handle.getFile();
        text = await file.text();
      } catch (error) {
        console.warn('[得到导出器] 读取已保存文件失败', name, error);
        continue;
      }

      const source = extractSourceFromMarkdown(text);
      const sourceId = idFromUrl(source);
      const rawTitle = extractTitleFromMarkdown(text) || name.replace(/\.md$/i, '');
      const title = stripDedaoSuffix(rawTitle);
      const titleKey = compactTitle(title);
      const charLength = normalizeText(text).length;
      const hasUserComments = /用户留言|##\s*用户留言/.test(text);
      addEntryToClippingsIndex(index, { name, source, sourceId, title, titleKey, charLength, hasUserComments });
    }

    for (const [key, count] of Object.entries(index.titleKeyCounts)) {
      if (count > 1) delete index.byTitleKey[key];
    }

    return index;
  }

  function addEntryToClippingsIndex(index, entry) {
    if (!index || !entry?.name) return;
    index.entries.push(entry);
    index.byName[entry.name] = entry;
    if (entry.source) index.bySource[entry.source] = entry;
    if (entry.sourceId) index.bySourceId[entry.sourceId] = entry;
    if (entry.titleKey) {
      index.titleKeyCounts[entry.titleKey] = (index.titleKeyCounts[entry.titleKey] || 0) + 1;
      if (index.titleKeyCounts[entry.titleKey] === 1) index.byTitleKey[entry.titleKey] = entry;
      if (index.titleKeyCounts[entry.titleKey] > 1) delete index.byTitleKey[entry.titleKey];
    }
  }

  function removeEntryFromClippingsIndex(index, entry) {
    if (!index || !entry?.name) return;
    index.entries = index.entries.filter(item => item.name !== entry.name);
    if (index.byName[entry.name]?.name === entry.name) delete index.byName[entry.name];
    if (entry.source && index.bySource[entry.source]?.name === entry.name) delete index.bySource[entry.source];
    if (entry.sourceId && index.bySourceId[entry.sourceId]?.name === entry.name) delete index.bySourceId[entry.sourceId];
    if (entry.titleKey) {
      index.titleKeyCounts[entry.titleKey] = Math.max(0, (index.titleKeyCounts[entry.titleKey] || 1) - 1);
      if (index.byTitleKey[entry.titleKey]?.name === entry.name) delete index.byTitleKey[entry.titleKey];
    }
  }

  function extractSourceFromMarkdown(text) {
    const raw = String(text || '');
    const yamlMatch = raw.match(/^source:\s*["']?([^"'\n]+)["']?\s*$/m);
    if (yamlMatch) return normalizeSourceUrl(yamlMatch[1]);
    const propertyMatch = raw.match(/^\s*source\s+https?:\/\/\S+/m);
    if (propertyMatch) return normalizeSourceUrl(propertyMatch[0].replace(/^\s*source\s+/, ''));
    const linkMatch = raw.match(/https:\/\/www\.dedao\.cn\/course\/article\?id=[A-Za-z0-9_-]+/);
    return linkMatch ? normalizeSourceUrl(linkMatch[0]) : '';
  }

  function extractTitleFromMarkdown(text) {
    const raw = String(text || '');
    const yamlMatch = raw.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    if (yamlMatch) return normalizeText(yamlMatch[1]);
    const h1Match = raw.match(/^#\s+(.+)$/m);
    if (h1Match) return normalizeText(h1Match[1]);
    return '';
  }

  function normalizeSourceUrl(url) {
    const id = idFromUrl(url);
    return id ? articleUrl(id) : String(url || '').trim().replace(/[?&]fullScreen=true/g, '');
  }

  async function auditMarkdownInClippings(dir, queue, article, expectedFilename, content, extractedTitle) {
    queue.fileIndex = queue.fileIndex || await scanClippingsIndex(dir);
    const index = queue.fileIndex;
    const source = canonicalArticleSource(article);
    const sourceId = article?.id || idFromUrl(source);
    let outputTitle = outputTitleForArticle(extractedTitle, article.sidebarTitle || article.title);
    let titleKey = compactTitle(outputTitle);
    let contentToWrite = content;
    let nameMatch = index.byName?.[expectedFilename];

    if (nameMatch && nameMatch.sourceId && sourceId && nameMatch.sourceId !== sourceId) {
      const pageTitle = cleanupArticleTitle(getArticleTitle());
      const pageFilename = isGoodArticleTitle(pageTitle) ? filenameFromCleanTitle(pageTitle) : '';
      if (pageFilename && pageFilename !== expectedFilename) {
        const pageNameMatch = index.byName?.[pageFilename];
        if (!pageNameMatch || (pageNameMatch.sourceId && sourceId && pageNameMatch.sourceId === sourceId)) {
          expectedFilename = pageFilename;
          outputTitle = pageTitle;
          titleKey = compactTitle(outputTitle);
          contentToWrite = replaceMarkdownYamlTitle(content, outputTitle);
          nameMatch = pageNameMatch;
        }
      }
    }

    const sourceMatch = (sourceId && index.bySourceId?.[sourceId]) || index.bySource?.[source];
    const existing = sourceMatch || (nameMatch && !nameMatch.sourceId ? nameMatch : null);

    if (existing) {
      const needsRepair = isExistingMarkdownIncomplete(existing, contentToWrite);
      if (existing.sourceId && sourceId && existing.sourceId === sourceId && existing.name !== expectedFilename) {
        if (needsRepair) {
          await assertSafeRepairTarget(index, expectedFilename, existing, sourceId);
          const repairResult = await writeMarkdownReplacing(dir, expectedFilename, contentToWrite);
          if (existing.name !== expectedFilename) {
            try {
              await dir.removeEntry(existing.name);
            } catch (error) {
              console.warn('[得到导出器] 删除旧残缺文件失败', existing.name, error);
            }
          }
          removeEntryFromClippingsIndex(index, existing);
          addEntryToClippingsIndex(index, {
            name: expectedFilename,
            source,
            sourceId,
            title: outputTitle,
            titleKey,
            charLength: normalizeText(contentToWrite).length,
            hasUserComments: /用户留言|##\s*用户留言/.test(contentToWrite),
          });
          return { status: 'repaired', filename: repairResult.filename || expectedFilename };
        }
        const renameResult = await renameMarkdownFile(dir, existing.name, expectedFilename);
        if (renameResult.status === 'renamed') {
          removeEntryFromClippingsIndex(index, existing);
          addEntryToClippingsIndex(index, { ...existing, name: expectedFilename, title: outputTitle, titleKey });
        }
        return renameResult;
      }
      if (needsRepair) {
        await assertSafeRepairTarget(index, expectedFilename, existing, sourceId);
        const repairName = existing.name === expectedFilename ? existing.name : expectedFilename;
        const repairResult = await writeMarkdownReplacing(dir, repairName, contentToWrite);
        if (existing.name !== repairName) {
          try {
            await dir.removeEntry(existing.name);
          } catch (error) {
            console.warn('[得到导出器] 删除旧残缺文件失败', existing.name, error);
          }
        }
        removeEntryFromClippingsIndex(index, existing);
        addEntryToClippingsIndex(index, {
          name: repairName,
          source,
          sourceId,
          title: outputTitle,
          titleKey,
          charLength: normalizeText(contentToWrite).length,
          hasUserComments: /用户留言|##\s*用户留言/.test(contentToWrite),
        });
        return { status: 'repaired', filename: repairResult.filename || repairName };
      }
      return { status: 'skipped', filename: existing.name };
    }

    if (nameMatch && nameMatch.sourceId && sourceId && nameMatch.sourceId !== sourceId) {
      const nameTitle = stripDedaoSuffix(nameMatch.name.replace(/\.md$/i, ''));
      const storedTitleMatches = titlesLooselyMatch(outputTitle, nameTitle) || titlesLooselyMatch(outputTitle, nameMatch.title);
      if (storedTitleMatches) {
        const duplicateFilename = nextAvailableDuplicateFilename(index, expectedFilename);
        const writeResult = await writeMarkdownReplacing(dir, duplicateFilename, contentToWrite);
        addEntryToClippingsIndex(index, {
          name: duplicateFilename,
          source,
          sourceId,
          title: outputTitle,
          titleKey,
          charLength: normalizeText(contentToWrite).length,
          hasUserComments: /用户留言|##\s*用户留言/.test(contentToWrite),
        });
        return { status: 'saved', filename: writeResult.filename || duplicateFilename };
      }
      throw new Error(`目标文件名已存在，但 source 不是当前文章：${expectedFilename}`);
    }

    const writeResult = await writeMarkdownReplacing(dir, expectedFilename, contentToWrite);
    addEntryToClippingsIndex(index, {
      name: expectedFilename,
      source,
      sourceId,
      title: outputTitle,
      titleKey,
      charLength: normalizeText(contentToWrite).length,
      hasUserComments: /用户留言|##\s*用户留言/.test(contentToWrite),
    });
    return writeResult;
  }

  function nextAvailableDuplicateFilename(index, filename) {
    const match = String(filename || '未命名.md').match(/^(.*?)(?: (\d+))?(\.md)$/i);
    const base = match ? match[1] : String(filename || '未命名.md').replace(/\.md$/i, '');
    const ext = match ? match[3] : '.md';
    for (let i = 1; i < 1000; i++) {
      const candidate = `${base} ${i}${ext}`;
      if (!index?.byName?.[candidate]) return candidate;
    }
    return `${base} ${Date.now()}${ext}`;
  }

  async function assertSafeRepairTarget(index, expectedFilename, existing, sourceId) {
    const targetMatch = index?.byName?.[expectedFilename];
    if (!targetMatch || targetMatch.name === existing?.name) return;
    if (targetMatch.sourceId && sourceId && targetMatch.sourceId === sourceId) return;
    throw new Error(`目标文件名已存在，但 source 不是当前文章：${expectedFilename}`);
  }

  function isExistingMarkdownIncomplete(entry, newContent) {
    const oldLength = Number(entry?.charLength || 0);
    const nextText = String(newContent || '');
    const newLength = normalizeText(nextText).length;
    if (!oldLength || !newLength) return false;
    if (newLength > 1500 && oldLength < newLength * 0.72) return true;
    const nextHasComments = /用户留言|##\s*用户留言/.test(nextText);
    if (nextHasComments && !entry.hasUserComments) return true;
    return false;
  }

  async function renameMarkdownFile(dir, oldName, newName) {
    if (!oldName || oldName === newName) return { status: 'skipped', filename: oldName || newName };
    try {
      await dir.getFileHandle(newName, { create: false });
      return { status: 'skipped', filename: oldName };
    } catch (_) {}

    const oldHandle = await dir.getFileHandle(oldName, { create: false });
    const text = await (await oldHandle.getFile()).text();
    await writeMarkdownReplacing(dir, newName, text);
    await dir.removeEntry(oldName);
    return { status: 'renamed', filename: newName };
  }

  function doneMessage(queue) {
    const fileLine = queue.lastFile ? `\n文件：${queue.lastFile}` : '';
    const resultText = queue.lastResult === 'saved' ? '已保存' : queue.lastResult === 'renamed' ? '已改名' : queue.lastResult === 'repaired' ? '已补完整' : '已存在';
    const resultLine = queue.lastResult ? `\n结果：${resultText}` : '';
    const errorLine = queue.lastError ? `\n最后错误：${queue.lastError}` : '';
    const stats = queue.stats || {};
    const title = queue.mode === 'audit-walk' ? '同步完成' : '导出完成';
    const renamedText = stats.renamed ? `，改名 ${stats.renamed}` : '';
    const repairedText = stats.repaired ? `，补完整 ${stats.repaired}` : '';
    if (queue.mode === 'audit-walk') {
      const checked = (Array.isArray(queue.seenIds) ? queue.seenIds.length : 0) + (Number(stats.failed || 0) || 0);
      const total = Number(queue.total || queue.expectedTotal || 0);
      const checkedText = total ? `检查 ${checked}/${total}` : `检查 ${checked}`;
      return `${title}：${checkedText}，补存 ${stats.saved || 0}，已存在 ${stats.skipped || 0}${renamedText}${repairedText}，失败 ${stats.failed || 0}${fileLine}${resultLine}${errorLine}`;
    }
    return `${title}：保存 ${stats.saved || 0}，已存在 ${stats.skipped || 0}${renamedText}${repairedText}，失败 ${stats.failed || 0}${fileLine}${resultLine}${errorLine}`;
  }

  function stopQueueOnArticleFailure(queue) {
    queue.active = false;
    saveQueue(queue);
    hideStatus();
    alert(`${doneMessage(queue)}\n\n当前这篇打开了，但没有成功写入 Markdown。批量导出已停止，避免页面继续往后跑却漏文件。`);
  }

  async function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function storeDir(dir) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(dir, DIR_KEY);
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

  function saveQueue(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  function loadQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function getArticleTitle() {
    const h1Candidates = Array.from(document.querySelectorAll('h1'))
      .map(el => stripDedaoSuffix(normalizeText(el.textContent)));

    // Strict pass: h1 then h2 with isGoodArticleTitle.
    // Course-name h1s like "贾宁·财务分析课" fail isGoodArticleTitle (no lesson markers),
    // so the real article title in h2 ("03 产业链位置：...") is found instead.
    for (const item of h1Candidates) {
      if (!isUiOrNarrationTitle(item) && isGoodArticleTitle(item)) return item;
    }
    for (const el of document.querySelectorAll('h2')) {
      const item = stripDedaoSuffix(normalizeText(el.textContent));
      if (!isUiOrNarrationTitle(item) && isGoodArticleTitle(item)) return item;
    }

    // Lenient fallback: h1 with isPlausiblePageTitle (may return course name, but better than nothing).
    for (const item of h1Candidates) {
      if (!isUiOrNarrationTitle(item) && isPlausiblePageTitle(item)) return item;
    }

    // Last resort: [class*="title"] and document.title.
    const candidates = [
      document.querySelector('[class*="title"]')?.textContent,
      document.title,
    ];
    for (const item of candidates) {
      const text = stripDedaoSuffix(normalizeText(item));
      if (!isUiOrNarrationTitle(text) && isGoodArticleTitle(text)) return text;
    }
    return '';
  }

  function isPlausiblePageTitle(text) {
    const value = cleanupArticleTitle(text);
    if (isUiOrNarrationTitle(value)) return false;
    if (!isPlausibleSidebarTitle(value)) return false;
    if (/建议WiFi环境下播放|用户留言|课后作业|课堂小结|本讲小结|划重点/.test(value)) return false;
    return value.length <= 100;
  }

  function resolveArticleTitle(article, body) {
    const sidebarTitle = cleanupArticleTitle(article?.sidebarTitle || article?.title);
    const pageTitle = cleanupArticleTitle(getArticleTitle());
    if (!isUiOrNarrationTitle(sidebarTitle) && isPlausibleSidebarTitle(sidebarTitle)) return sidebarTitle;
    if (!isUiOrNarrationTitle(pageTitle) && (isGoodArticleTitle(pageTitle) || isPlausiblePageTitle(pageTitle))) return pageTitle;

    const bodyTitle = firstTitleFromMarkdown(body);
    if (!isUiOrNarrationTitle(bodyTitle) && isGoodArticleTitle(bodyTitle)) return bodyTitle;

    const candidates = [
      article?.title,
      document.title,
      article?.id,
    ];

    for (const item of candidates) {
      const text = cleanupArticleTitle(item);
      if (!isUiOrNarrationTitle(text) && (isGoodArticleTitle(text) || isPlausiblePageTitle(text))) return text;
    }
    return cleanupArticleTitle(article?.id || '未命名');
  }

  function firstTitleFromMarkdown(markdown) {
    const lines = String(markdown || '').split('\n').map(line => line.replace(/^#+\s*/, '').trim()).filter(Boolean);
    for (const line of lines.slice(0, 20)) {
      if (isMarkdownImageLine(line) || containsUrl(line)) continue;
      const text = cleanupArticleTitle(line);
      // Long lines ending with sentence punctuation are body paragraphs, not titles.
      // e.g. "1. **你已经有了先发优势**，你分享出去，带进来的新的关系户...反而可以一起进步。"
      if (text.length > 40 && /[。！]\s*$/.test(text)) continue;
      if (!isUiOrNarrationTitle(text) && isGoodArticleTitle(text)) return text;
    }
    return '';
  }

  function cleanupArticleTitle(text) {
    let value = stripDedaoSuffix(normalizeText(text));
    if (isMarkdownImageLine(value) || containsUrl(value)) return '';
    return value
      .replace(/\d{1,2}分\d{1,2}秒.*$/g, '')
      .replace(/\d{1,2}秒.*$/g, '')
      .replace(/\d+人学过.*$/g, '')
      .replace(/已学完.*$/g, '')
      .replace(/已学\d+%.*$/g, '')
      .replace(/^[\-–—｜|丨\s]+|[\-–—｜|丨\s]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isUiOrNarrationTitle(text) {
    const value = cleanupArticleTitle(text);
    if (!value) return true;
    const simple = value.replace(/^[\-–—｜|丨\s]+|[\-–—｜|丨\s]+$/g, '').trim();
    if (!simple) return true;
    if (/^(建议WiFi环境下播放|建议 WiFi 环境下播放|用户留言|课后作业|课堂小结|本讲小结|划重点|添加到笔记|我的留言|写留言|发布留言|发表留言|收起目录|设置文本|香帅亲述|宁向东亲述)$/.test(simple)) return true;
    // "首次发布" caption always trails a real date (e.g. "首次发布- 2019年12月1日"),
    // so the old exact-match rule (`^首次发布$`) never fired. This caption sits
    // near the END of the article, right before 用户留言 — if it gets mistaken
    // for the title, clipToCurrentArticle slices from there and the entire real
    // body (everything before it) is silently dropped. Prefix-match instead.
    if (/^首次发布/.test(simple)) return true;
    if (/^[\u4e00-\u9fffA-Za-z·]{2,16}(?:亲述|转述|讲述)$/.test(simple)) return true;
    if (/(?:老师|作者)?(?:亲述|转述|讲述)$/.test(simple) && simple.length <= 18) return true;
    // "一键直达"/"猜你喜欢"/"延伸阅读"/"相关推荐" cards are cross-links to OTHER
    // lessons embedded mid-article. They often contain a colon or pipe (e.g.
    // "一键直达：第089讲｜比较优势原理"), which would otherwise pass the loose
    // catch-all in isGoodArticleTitle and get mistaken for the real title —
    // corrupting both the saved filename and clipToCurrentArticle's trim point.
    if (/^(一键直达|猜你喜欢|延伸阅读|相关推荐|继续学习)/.test(simple)) return true;
    return false;
  }

  function isGoodArticleTitle(text) {
    const value = cleanupArticleTitle(text);
    if (!value || value.length < 4 || value.length > 120) return false;
    if (isUiOrNarrationTitle(value)) return false;
    if (isMarkdownImageLine(value) || containsUrl(value)) return false;
    if (/^\d+\s*\/\s*\d+$/.test(value)) return false;
    if (/^https?:\/\//i.test(value)) return false;
    if (/我的学习|知识城邦|账户充值|得到一下|设置文本|收起目录|已更新|加载中/.test(value)) return false;
    if (/^筛选[▾▴▲▼]?$/.test(value)) return false;
    if (/香帅的北大金融学课$/.test(value)) return false;
    // 《XX课辞典》NN——正文标题 format (e.g. 薛兆丰经济学课辞典) uses an em-dash
    // separator, not a colon/pipe, so it needs its own pattern rather than
    // relying on the generic [：:｜|丨] catch-all below.
    if (/^《[^》]+》\s*\d{1,4}\s*[——–-]/.test(value)) return true;
    // Activity/campaign recap titles quote their theme name, e.g.
    // "\u201c经济学季90天\u201d活动总结" — no colon/pipe/讲 marker at all, so they'd
    // otherwise fail every pattern below and lose to a wrong mid-page caption
    // like "首次发布- <date>" that happens to sit near the article's end.
    if (/^["\u201c\u2018\u300c\u300e]/.test(value)) return true;
    if (/发刊词|模块导读|^第?\d{1,4}讲[丨｜|]|^第[一二三四五六七八九十百千万0-9]+[讲课周天][丨｜|：:]|^\d{1,4}(?:[.．、]\s*|[｜|丨]|\s)|【?直播加餐】?|【?加餐】?|加餐|直播|问答|课件|导读|导论|结束/.test(value)) return true;
    // Loose fallback for legit "\u6807\u7b7e\uff1a\u6b63\u9898" / "\u7f16\u53f7\uff5c\u6807\u9898" formats. Requires
    // substantive text AFTER the separator -- rejects ordinary sentences that
    // merely END with a colon to introduce a list, e.g. transcript lines like
    // "\u6211\u53d1\u73b0\u540c\u5b66\u7684\u95ee\u9898\u96c6\u4e2d\u5728\u4e09\u4e2a\u65b9\u9762\uff1a", which previously
    // slipped through as a "title" via firstTitleFromMarkdown and caused the
    // real intro paragraph before it to be deleted by clipToCurrentArticle.
    const sepMatch = value.match(/[：:｜|丨]/);
    if (sepMatch) {
      const after = value.slice(value.indexOf(sepMatch[0]) + 1).trim();
      if (after.length >= 2) return true;
    }
    return false;
  }

  function isMarkdownImageLine(text) {
    return /^!\[[^\]]*]\([^)]+\)/.test(String(text || '').trim());
  }

  function containsUrl(text) {
    return /https?:\/\/|piccdn\d*\.umiwi\.com|\.jpg\b|\.jpeg\b|\.png\b|\.webp\b/i.test(String(text || ''));
  }

  function clipToCurrentArticle(markdown, article) {
    let text = String(markdown || '').trim();
    if (!text) return '';

    const titleCandidates = [
      cleanupArticleTitle(article?.sidebarTitle),
      cleanupArticleTitle(article?.title),
      cleanupArticleTitle(getArticleTitle()),
      firstTitleFromMarkdown(text),
    ].filter(Boolean);

    for (const title of titleCandidates) {
      const idx = findArticleTitleIndex(text, title);
      // A real title only trims leading page chrome (breadcrumbs, course-name
      // header) that sits just above the body — that's always a small prefix.
      // Every title-detection bug seen so far (一键直达 cross-link cards,
      // "首次发布" date captions, a 解释/案例 callout paragraph) produced a
      // "title" that actually lives deep inside the real content; slicing at
      // that point silently deleted most of the article. Refusing to trim past
      // the halfway point turns those failures into "kept too much chrome"
      // instead of "deleted the article" — a much safer failure mode.
      if (idx > 0 && idx <= text.length * 0.5) {
        text = text.slice(idx).trim();
        break;
      }
    }

    text = text
      .replace(/^加载中\.\.\.\s*/m, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return text;
  }

  function cleanArticleChrome(markdown) {
    let text = String(markdown || '').trim();

    text = removeAvatarAndPromoImages(text);

    // Remove leading author card captured from Dedao article pages:
    // avatar image + author/course name immediately before the intro quote.
    text = text.replace(
      /\n{1,3}!\[\]\(https?:\/\/[^\n)]*(?:201712082200327955877802|avatar|head|portrait)[^\n)]*\)\n{1,3}[^\n]{1,30}\n{1,3}(?=> )/i,
      '\n\n'
    );

    // Fallback for this course's author card when CDN URL has no semantic name.
    text = text.replace(
      /\n{1,3}!\[\]\(https?:\/\/piccdn[^\n)]*\.jpg(?:\?[^\n)]*)?\)\n{1,3}香帅\n{1,3}(?=> )/i,
      '\n\n'
    );

    text = normalizeSpeakerMarkers(text);
    text = cleanUserComments(text);

    return text
      .replace(/\n{1,3}(这里是香帅的北大金融学课，帮你站在高处，重新理解财富。)\n{1,3}!\[\]\(https?:\/\/[^\n)]*\)\n{1,3}/g, '\n\n$1\n\n')
      .replace(/\n{1,3}(这里是[^\n]{0,80}课程[^\n]{0,100}。)\n{1,3}!\[\]\(https?:\/\/[^\n)]*\)\n{1,3}/g, '\n\n$1\n\n')
      .replace(/\n添加到笔记\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function normalizeSpeakerMarkers(markdown) {
    const author = getAuthor() || '香帅';
    const names = Array.from(new Set([author, '香帅'].filter(Boolean)));
    let text = String(markdown || '');

    for (const name of names) {
      const escaped = escapeRegExp(name);
      const marker = speakerMarker(name);
      text = text
        .replace(new RegExp(`\\n\\*\\*${escaped}\\*\\*\\n(?=\\n\\S)`, 'g'), `\n${marker}\n`)
        .replace(new RegExp(`\\n${escaped}\\n(?=\\n\\S)`, 'g'), `\n${marker}\n`);
    }

    return text;
  }

  function speakerMarker(name) {
    return `<span style="color:#f97316;font-weight:600">${name}：</span>`;
  }

  function escapeRegExp(text) {
    return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function cleanUserComments(markdown) {
    let text = String(markdown || '');
    text = text.replace(/(?:^|\n)(?:#{1,6}\s*)?我的留言[\s\S]*?(?=\n(?:#{1,6}\s*)?用户留言)/, '\n');

    const markerMatch = text.match(/(?:^|\n)(?:#{1,6}\s*)?用户留言\n/);
    if (!markerMatch || markerMatch.index === undefined) return text;

    const idx = markerMatch.index;
    const marker = markerMatch[0];
    const markerStartsWithNewline = marker.startsWith('\n');
    const before = text.slice(0, idx + (markerStartsWithNewline ? marker.length : 0)) +
      (markerStartsWithNewline ? '' : marker);
    const rawSection = text.slice(idx + marker.length);
    const comments = formatUserComments(rawSection);
    return `${before}${comments || lightlyCleanRawComments(rawSection)}`;
  }

  function formatUserComments(section) {
    const lines = String(section || '').split('\n');
    const comments = [];
    let current = null;
    let pendingName = '';

    function finishCurrent() {
      if (!current) return;
      current.body = current.body
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (current.name && current.body) comments.push(current);
      current = null;
    }

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();
      if (!trimmed || isCommentUiLine(trimmed)) continue;

      const next = lines[i + 1]?.trim() || '';
      if (next && isCommentDateLine(next) && !isCommentUiLine(trimmed)) {
        finishCurrent();
        pendingName = cleanupCommentName(trimmed);
        continue;
      }

      if (pendingName && isCommentDateLine(trimmed)) {
        current = { name: pendingName, date: trimmed.replace(/\s+编辑$/, ''), body: [] };
        pendingName = '';
        continue;
      }

      if (!current) continue;

      const reply = trimmed.match(/^作者\s*回复[:：]\s*(.*)$/);
      if (reply) {
        const content = reply[1].trim();
        current.body.push('');
        current.body.push(`> ${speakerMarker('作者回复')}${content ? ` ${content}` : ''}`);
        continue;
      }

      current.body.push(trimmed);
    }

    finishCurrent();

    if (comments.length === 0) return '';
    return comments.map(comment => {
      const title = `**${comment.name}${comment.date ? ` · ${comment.date}` : ''}**`;
      return `${title}\n\n${comment.body}`;
    }).join('\n\n');
  }

  function lightlyCleanRawComments(section) {
    return String(section || '')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !isCommentUiLine(line))
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function isCommentDateLine(text) {
    return /^\d{4}-\d{2}-\d{2}(?:\s+编辑)?$/.test(text);
  }

  function cleanupCommentName(text) {
    return String(text || '').replace(/^[-*]\s+/, '').trim();
  }

  function isCommentUiLine(text) {
    return /^(全部\s+精选|筛选|关注|展开|评论|分享|转发|公开|赞|回复|0\s*\/\s*5000|\d+)$/.test(text);
  }

  function removeAvatarAndPromoImages(markdown) {
    const lines = String(markdown || '').split('\n');
    const cleaned = [];

    for (const line of lines) {
      const image = line.match(/^\s*(?:[-*]\s*)?!\[\]\(([^)]+)\)\s*(.*?)\s*$/);
      if (!image) {
        if (/^\s*香帅的北大金融学课\s*$/.test(line) && cleaned.length < 8) continue;
        cleaned.push(line);
        continue;
      }

      const [, url, trailingText] = image;
      if (!isAvatarOrPromoImageUrl(url)) {
        cleaned.push(line);
        continue;
      }

      const label = normalizeText(trailingText);
      if (label && !/香帅的北大金融学课/.test(label)) cleaned.push(label);
    }

    return cleaned.join('\n');
  }

  function isAvatarOrPromoImageUrl(url) {
    const value = String(url || '').toLowerCase();
    return [
      /\/avatar\//,
      /\/uploader\/avatar\//,
      /\/uploader\/image\/note\//,
      /\/fe-oss\/default\//,
      /201712082200327955877802/,
      /202511270919125056039228/,
      /201712220052392182434676/,
      /x-oss-process=image\/resize,w_(?:32|48|64|80)\b/,
    ].some(pattern => pattern.test(value));
  }

  function enhanceMarkdownHierarchy(markdown) {
    const lines = String(markdown || '').split('\n');
    let inUserComments = false;
    let seenLeadTitle = false;
    let justWroteLeadTitle = false;
    let leadTextCount = 0;

    return lines.map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (/^#{1,6}\s+用户留言$/.test(trimmed)) {
        inUserComments = true;
        return line;
      }
      if (/^(#{1,6}|[-*+] |>)/.test(trimmed)) return line;

      if (!isMarkdownImageLine(trimmed)) leadTextCount++;

      if (!seenLeadTitle && leadTextCount <= 3 && isLeadArticleTitle(trimmed)) {
        seenLeadTitle = true;
        justWroteLeadTitle = true;
        return `# ${trimmed}`;
      }

      if (justWroteLeadTitle && isCourseNameLine(trimmed)) {
        justWroteLeadTitle = false;
        return `**${trimmed}**`;
      }
      justWroteLeadTitle = false;

      if (!inUserComments && isNumberedOutlineHeading(trimmed)) return `## ${normalizeNumberedOutlineHeading(trimmed)}`;

      if (/^\d+[.．、]\s*/.test(trimmed)) return line;
      const prev = nearestNonEmptyLine(lines, index, -1);
      const next = nearestNonEmptyLine(lines, index, 1);
      if (!inUserComments && isStandaloneBodyHeading(trimmed, prev, next)) return `## ${trimmed}`;
      if (trimmed.length > 42) return line;

      if (/^(我的留言|用户留言)$/.test(trimmed) && next) {
        if (trimmed === '用户留言') inUserComments = true;
        return `#### ${trimmed}`;
      }
      if (inUserComments) return line;

      if (isChineseSectionHeading(trimmed)) return `## ${trimmed}`;
      if (/^今日概要[:：]?$/.test(trimmed)) return '## 今日概要';
      if (trimmed === '划重点') return `### ${trimmed}`;
      if (isContentOutlineHeading(trimmed)) return `## ${trimmed}`;
      if (trimmed === '添加到笔记') return line;

      return line;
    }).join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function isChineseSectionHeading(text) {
    if (!/^[一二三四五六七八九十]{1,3}、/.test(text)) return false;
    if (/[。！？；;]$/.test(text)) return false;
    return text.length <= 36;
  }

  function isNumberedOutlineHeading(text) {
    if (!/^\d{1,2}[.．、]\s*\S/.test(text)) return false;
    if (/[。！？；;，,]$/.test(text)) return false;
    return text.length <= 42;
  }

  function normalizeNumberedOutlineHeading(text) {
    return String(text || '').replace(/^(\d{1,2})[.．、]\s*/, '$1. ').trim();
  }

  function isContentOutlineHeading(text) {
    if (/^第[一二三四五六七八九十百千万0-9]+(?:天|讲|课|周|部分|章|节)[:：]/.test(text)) return text.length <= 48;
    if (/^(下周课程预告|本周课程回顾|课程回顾|下周预告|课堂小结|课后思考|总结)$/.test(text)) return true;
    return false;
  }

  function isLeadArticleTitle(text) {
    if (!text || text.length > 90) return false;
    if (isMarkdownImageLine(text) || containsUrl(text)) return false;
    if (/^(#|[*_]{1,2}|<)/.test(text)) return false;
    if (/亲述|首次发布|用户留言|划重点/.test(text)) return false;
    return /^(发刊词|模块导读|加餐|直播|第?\d{2,3}讲|第[一二三四五六七八九十百千万0-9]+周|[“"].+[”"]问答)|[丨｜|：:]/.test(text);
  }

  function isCourseNameLine(text) {
    if (!text || text.length > 32) return false;
    if (/亲述|首次发布|用户留言/.test(text)) return false;
    return /(?:经济学|金融学|管理学|投资课|思维课|商业课|英语课|心理学课|课程|课)$/.test(text);
  }

  function isStandaloneBodyHeading(text, prev, next) {
    if (!text || text.length > 28) return false;
    if (!next || isMarkdownImageLine(next)) return false;
    if (/^(#|[*_]{1,2}|<)/.test(text)) return false;
    if (/亲述|首次发布|相关课程|添加到笔记/.test(text)) return false;
    if (/^[\d\s/]+$/.test(text)) return false;
    if (/[。！；;，,]$/.test(text)) return false;
    if (/[：:]$/.test(text)) return false;
    if (/^(你好|白程程，你好。)$/.test(text)) return false;
    return /^[\u4e00-\u9fa5A-Za-z0-9《》“”‘’、的和与及？?]+$/.test(text);
  }

  function nearestNonEmptyLine(lines, index, direction) {
    for (let i = index + direction; i >= 0 && i < lines.length; i += direction) {
      const value = lines[i]?.trim();
      if (value) return value;
    }
    return '';
  }

  function findArticleTitleIndex(markdown, title) {
    const normalizedTitle = normalizeComparableTitle(title);
    if (!normalizedTitle) return -1;

    const lines = markdown.split('\n');
    let offset = 0;
    let lastMatch = -1;
    for (const line of lines) {
      const cleanLine = cleanupArticleTitle(line.replace(/^[-#>*\s]+/, ''));
      if (normalizeComparableTitle(cleanLine) === normalizedTitle) lastMatch = offset;
      offset += line.length + 1;
    }
    if (lastMatch >= 0) return lastMatch;

    const direct = markdown.lastIndexOf(title);
    return direct;
  }

  function normalizeComparableTitle(text) {
    return cleanupArticleTitle(text).replace(/[丨|]/g, '｜').replace(/\s+/g, '');
  }

  function getCourseName() {
    const candidates = [
      document.querySelector('[class*="course"][class*="title"]')?.textContent,
      document.querySelector('[class*="column"][class*="title"]')?.textContent,
      document.querySelector('h1')?.textContent,
      document.title,
    ];
    for (const item of candidates) {
      const text = stripDedaoSuffix(normalizeText(item).split('|')[0]);
      if (text && text.length > 1 && text.length < 120) return text;
    }
    return '得到课程';
  }

  function getAuthor() {
    const meta = getMeta('author');
    if (meta) return cleanAuthor(meta);
    const text = normalizeText(document.body.innerText || '');
    const match = text.match(/([\u4e00-\u9fa5A-Za-z·]{2,12})亲述/);
    return match ? cleanAuthor(match[1]) : '';
  }

  function cleanAuthor(text) {
    return normalizeText(text).replace(/亲述|老师|作者[:：]?/g, '').replace(/^[丨｜|\s]+|[丨｜|\s]+$/g, '').trim();
  }

  function getMeta(name) {
    return document.querySelector(`meta[name="${name}"], meta[property="og:${name}"]`)?.getAttribute('content') || '';
  }

  function isVisible(el) {
    if (!el || !(el instanceof Element)) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 6 && rect.height > 6 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeInline(text) {
    return String(text || '').replace(/\s+/g, ' ');
  }

  function stripDedaoSuffix(text) {
    return normalizeText(text).replace(/\s*-\s*得到APP\s*$/i, '').replace(/\s*_得到APP\s*$/i, '');
  }

  function yamlEscape(text) {
    return String(text || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
  }

  function safeFileName(text) {
    let name = normalizeText(text || '未命名')
      .replace(/[\/\\⁄∕／⧸]/g, '-')
      .replace(/[:*?"<>|]/g, '-')
      .replace(/[\x00-\x1f\x7f]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/g, '')
      .replace(/^\.+$/g, '')
      .trim();

    if (!name) name = '未命名';
    return trimFileNameBytes(name, 220);
  }

  function trimFileNameBytes(name, maxBytes) {
    const encoder = new TextEncoder();
    if (encoder.encode(name).length <= maxBytes) return name;

    const match = name.match(/(\.[A-Za-z0-9]{1,8})$/);
    const ext = match ? match[1] : '';
    const base = ext ? name.slice(0, -ext.length) : name;
    let result = '';

    for (const char of Array.from(base)) {
      const next = `${result}${char}`;
      if (encoder.encode(`${next}${ext}`).length > maxBytes) break;
      result = next;
    }

    return `${result || '未命名'}${ext}`;
  }

  function today() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function showModal(modal) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = `${APP}-overlay`;
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.42);z-index:2147483646;';
    overlay.onclick = closeModal;
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  }

  function closeModal() {
    document.getElementById(`${APP}-modal`)?.remove();
    document.getElementById(`${APP}-overlay`)?.remove();
  }

  function modalStyle() {
    return `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: min(620px, calc(100vw - 36px)); max-height: min(760px, calc(100vh - 36px));
      display: flex; flex-direction: column; background: #fff; color: #111827;
      border-radius: 14px; box-shadow: 0 24px 70px rgba(0,0,0,.32);
      z-index: 2147483647; padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `;
  }

  function smallButton(bg, color, border) {
    return `flex:1;background:${bg};color:${color};border:${border ? '1px solid #cbd5e1' : '0'};border-radius:9px;padding:11px 12px;font-size:14px;font-weight:600;cursor:pointer;`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
