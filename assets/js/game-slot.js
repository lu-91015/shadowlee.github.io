/**
 * 熊猫老虎机 - 三种难度
 * 初始 500 分，攒到 1000 分通关。每局从全部表情里随机抽一个小图池，转轴只从图池里出图。
 * 图池大小、每转花费和赔率经过模拟：通关率约 简单 79% / 普通 48% / 困难 39%，
 * 一局大约 60–90 转。赔率里的倍数是“返还每转花费的几倍”（含本金）。
 */
(function () {
  'use strict';
  const base = (window.SITE_BASE || '/').replace(/\/$/, '');

  window.addEventListener('load', () => {
    const META = window.EMOTE_META || { items: [] };
    const all = META.items.filter(i => i.file && !i.file.toLowerCase().endsWith('.gif'));
    if (all.length < 2) return;

    const reelsRoot = document.getElementById('slot-reels');
    const scoreEl = document.getElementById('slot-score');
    const betEl = document.getElementById('slot-bet');
    const spinBtn = document.getElementById('slot-spin');
    const resetBtn = document.getElementById('slot-reset');
    const resultEl = document.getElementById('slot-result');
    const poolEl = document.getElementById('slot-pool');
    const payEl = document.getElementById('slot-paytable');
    const modeBtns = document.querySelectorAll('.slot-mode');
    if (!reelsRoot || !spinBtn || !scoreEl) return;
    const setNum = (el, v) => (window.__gameModal ? window.__gameModal.setNum(el, v) : (el.textContent = v));

    const START_SCORE = 500;
    const TARGET = 1000;

    // pays: [判断函数(各图出现次数, 从大到小), 名称, 返还倍数]，按从高到低匹配
    const MODES = {
      easy: {
        reels: 3, pool: 5, bet: 25,
        pays: [
          [c => c[0] === 3, '三个相同', 10],
          [c => c[0] === 2, '两个相同', 1.5],
        ],
      },
      normal: {
        reels: 4, pool: 6, bet: 30,
        pays: [
          [c => c[0] === 4, '四个相同', 25],
          [c => c[0] === 3, '三个相同', 3.5],
          [c => c[0] === 2 && c[1] === 2, '两对', 2],
          [c => c[0] === 2, '一对', 0.8],
        ],
      },
      hard: {
        reels: 5, pool: 7, bet: 40,
        pays: [
          [c => c[0] === 5, '五个相同', 100],
          [c => c[0] === 4, '四个相同', 11],
          [c => c[0] === 3 && c[1] === 2, '三带二', 3.8],
          [c => c[0] === 3, '三个相同', 2.3],
          [c => c[0] === 2 && c[1] === 2, '两对', 1.1],
          [c => c[0] === 2, '一对', 0.5],
        ],
      },
    };

    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const symbolSrc = (s) => `${base}/assets/images/emotes/${s.file}`;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const esc = (t) => String(t || '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

    function samplePool(n) {
      const copy = all.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, Math.min(n, copy.length));
    }

    let mode = 'easy';
    let score = START_SCORE;
    let isSpinning = false;
    let finished = false;
    let reels = [];
    let pool = [];
    let round = 0; // 每次重开 +1，用来作废还在转的上一局

    function fmtMult(m) { return '×' + (Number.isInteger(m) ? m : m.toFixed(1)); }

    function renderInfo() {
      const cfg = MODES[mode];
      poolEl.innerHTML = pool.map(s => `<img src="${esc(symbolSrc(s))}" alt="${esc(s.name)}" title="${esc(s.name)}">`).join('');
      payEl.innerHTML = cfg.pays.map(([, name, mult], i) =>
        `<tr data-i="${i}"><td>${name}</td><td>${fmtMult(mult)}</td></tr>`).join('') +
        `<tr><td>其他</td><td>×0</td></tr>`;
      setNum(betEl, cfg.bet);
    }

    function buildReels() {
      const count = MODES[mode].reels;
      reelsRoot.innerHTML = Array.from({ length: count }, (_, i) =>
        `<div class="slot-reel"><img id="slot-r${i}" src="${esc(symbolSrc(pool[i % pool.length]))}" alt=""></div>`
      ).join('');
      reels = Array.from({ length: count }, (_, i) => document.getElementById(`slot-r${i}`));
    }

    function setResult(html, cls) {
      resultEl.innerHTML = html;
      resultEl.className = 'slot-result' + (cls ? ' ' + cls : '');
    }

    function setMode(name) {
      if (isSpinning || !MODES[name]) return;
      mode = name;
      modeBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-mode') === name));
      resetGame();
    }

    function resetGame() {
      round++;
      isSpinning = false;
      finished = false;
      score = START_SCORE;
      pool = samplePool(MODES[mode].pool);
      setNum(scoreEl, score);
      setResult('点“旋转”开始');
      spinBtn.disabled = false;
      spinBtn.textContent = '旋转';
      buildReels();
      renderInfo();
    }

    function calcOutcome(results) {
      const cfg = MODES[mode];
      const counts = {};
      results.forEach(s => { counts[s.file] = (counts[s.file] || 0) + 1; });
      const c = Object.values(counts).sort((a, b) => b - a).concat([0]);
      const idx = cfg.pays.findIndex(([test]) => test(c));
      const mult = idx >= 0 ? cfg.pays[idx][2] : 0;
      const name = idx >= 0 ? cfg.pays[idx][1] : '';
      const back = Math.round(cfg.bet * mult);
      // 中奖的图（出现次数 ≥ 2）
      const hitFiles = new Set(Object.keys(counts).filter(f => counts[f] >= 2));
      return { idx, name, back, net: back - cfg.bet, hitFiles };
    }

    async function spinReel(el, ticks, myRound) {
      el.parentElement.classList.add('spinning');
      for (let i = 0; i < ticks; i++) {
        if (myRound !== round) return null;
        el.src = symbolSrc(rand(pool));
        await sleep(60);
      }
      const final = rand(pool);
      el.src = symbolSrc(final);
      el.parentElement.classList.remove('spinning');
      return final;
    }

    function markClear() {
      try {
        const list = JSON.parse(localStorage.getItem('slot_clears') || '[]');
        if (!list.includes(mode)) list.push(mode);
        localStorage.setItem('slot_clears', JSON.stringify(list));
      } catch (e) {}
    }

    async function spin() {
      if (isSpinning || finished) return;
      const cfg = MODES[mode];
      if (score < cfg.bet) {
        setResult('分数不够转一次了，点“重开”再来', 'lose');
        return;
      }

      isSpinning = true;
      const myRound = round;
      score -= cfg.bet;
      setNum(scoreEl, score);
      setResult(`−${cfg.bet}…`);
      spinBtn.disabled = true;
      reels.forEach(r => r.parentElement.classList.remove('hit'));
      payEl.querySelectorAll('tr').forEach(tr => tr.classList.remove('hit'));

      // 各轴同时开始转，依次停下
      const results = await Promise.all(reels.map((el, i) => spinReel(el, 10 + i * 5, myRound)));
      if (myRound !== round) return; // 转动途中重开 / 关闭了，丢弃这次结果

      const out = calcOutcome(results);
      score += out.back;
      setNum(scoreEl, score);
      if (out.idx >= 0) {
        results.forEach((s, i) => { if (out.hitFiles.has(s.file)) reels[i].parentElement.classList.add('hit'); });
        const row = payEl.querySelector(`tr[data-i="${out.idx}"]`);
        if (row) row.classList.add('hit');
        const sign = out.net >= 0 ? '+' : '−';
        setResult(`${out.name}，<b>${sign}${Math.abs(out.net)}</b>`, out.net > 0 ? 'win' : '');
      } else {
        setResult('没有相同的', 'lose');
      }

      if (score >= TARGET) {
        finished = true;
        markClear();
        setResult(`到 ${TARGET} 分了，<b>通关！</b>`, 'win');
        spinBtn.textContent = '已通关';
      } else if (score < cfg.bet) {
        finished = true;
        setResult('分数用完了，点“重开”再来一局', 'lose');
        spinBtn.textContent = '结束';
      } else {
        spinBtn.disabled = false;
      }
      isSpinning = false;
    }

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.getAttribute('data-mode')));
    });
    spinBtn.addEventListener('click', spin);
    resetBtn.addEventListener('click', resetGame);

    resetGame();

    window.__gameHooks.slot = (action) => {
      if (action === 'open' || action === 'close') resetGame();
    };
  });
})();
