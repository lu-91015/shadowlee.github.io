/**
 * 游戏卡片 + 弹窗逻辑
 */
(function () {
  window.__gameHooks = window.__gameHooks || {};
  const modal = document.getElementById('game-modal');
  const content = modal.querySelector('.game-modal-content');
  const titleEl = document.getElementById('game-modal-title');
  const cards = document.querySelectorAll('.game-card');
  const instances = document.querySelectorAll('.game-instance');

  let openGame = null;
  let lastFocus = null;
  if (content) content.setAttribute('tabindex', '-1');

  // ---- 卡片上显示本机最高分 ----
  function readNum(key) {
    try { return parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch (e) { return 0; }
  }
  function readSlotClears() {
    try { return JSON.parse(localStorage.getItem('slot_clears') || '[]'); } catch (e) { return []; }
  }
  const SLOT_NAMES = { easy: '简单', normal: '普通', hard: '困难' };
  function refreshBest() {
    const set = (name, html) => {
      const el = document.querySelector(`[data-best-for="${name}"]`);
      if (el) el.innerHTML = html;
    };
    const best = (n) => (n > 0 ? `最高分<b>${n}</b>` : '');
    set('breakout', best(readNum('breakout-best')));
    set('merge', best(readNum('panda_merge_high_score')));
    set('flappy', best(readNum('flappy_best')));
    set('jump', best(readNum('jump_best')));
    const nb = readNum('number_best');
    set('number', nb >= 22966160 ? `已通关<b>22966160</b>` : nb > 3 ? `最大长到<b>${nb}</b>` : '');
    const clears = readSlotClears().filter(m => SLOT_NAMES[m]);
    set('slot', clears.length ? `已通关<b>${clears.map(m => SLOT_NAMES[m]).join(' / ')}</b>` : '');
  }

  function showGame(name) {
    instances.forEach(inst => {
      const on = inst.getAttribute('data-game') === name;
      inst.style.display = on ? 'flex' : 'none';
      if (on && titleEl) titleEl.textContent = inst.getAttribute('data-title') || '';
    });
    openGame = name;
    // 通知对应游戏开始（如果定义了）
    if (typeof window.__gameHooks[name] === 'function') {
      window.__gameHooks[name]('open');
    }
  }

  function hideModal() {
    if (!openGame) return;
    if (typeof window.__gameHooks[openGame] === 'function') {
      window.__gameHooks[openGame]('close');
    }
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    openGame = null;
    refreshBest();
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }

  function openModal(name) {
    if (openGame === name) return;
    // 只有键盘操作打开时才在关闭后把焦点还给卡片；鼠标点开的就不还，避免之后按空格又把游戏打开
    const a = document.activeElement;
    lastFocus = (a && a.matches && a.matches(':focus-visible')) ? a : null;
    if (!lastFocus && a && a.blur && a !== document.body) a.blur();
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    showGame(name);
    // 把焦点移进弹窗，空格 / 回车交给游戏，而不是背后的卡片
    if (content) content.focus({ preventScroll: true });
  }

  // 卡片是 <button>，回车 / 空格会原生触发 click
  cards.forEach(card => {
    card.addEventListener('click', () => openModal(card.getAttribute('data-game')));
  });

  modal.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', hideModal);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && openGame) hideModal();
  });

  // 当前打开的游戏名（没打开时为 null）
  function current() { return openGame; }

  // 键盘事件是否应交给游戏：弹窗里打开的是 name，焦点不在输入框 / 按钮上
  function wantsKeys(name, e) {
    if (openGame !== name) return false;
    if (e && e.defaultPrevented) return false;
    const t = e && e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName))) return false;
    return true;
  }

  // 数字变化时轻微跳动一下
  function setNum(el, value) {
    if (!el) return;
    const v = String(value);
    if (el.textContent === v) return;
    el.textContent = v;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  // 画布里统一用的字体
  const FONT = "'Fredoka', 'Microsoft YaHei', 'Segoe UI', sans-serif";

  refreshBest();

  // 暴露给其他脚本
  window.__gameModal = { open: openModal, close: hideModal, current, wantsKeys, setNum, FONT, refreshBest };
})();
