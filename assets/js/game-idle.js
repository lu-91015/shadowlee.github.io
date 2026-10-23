/**
 * 李豆沙的直播间（放置游戏）
 *  - 李豆沙在直播，观众自己涌进来产生「人气」；点直播画面 = 打 call，手动加速
 *  - 用人气买设备（应援熊猫、麦克风、补光灯……），每种设备攒到 25 / 50 / 100… 个时产出翻倍
 *  - 「粉丝」只涨不掉，人气越高涨得越快；粉丝够了、人气攒够了就能开「新衣回」
 *  - 新衣回：揭幕动画 + 60 秒限时直播（人气 ×3、礼物雨），解锁下一套衣服，不清零任何进度
 *  - 每套衣服有一个特长，衣柜里可以随时换着穿；10 套按出道顺序解锁，集齐后还有隐藏的魔法熊猫
 *  - 关掉网页也会继续直播（离线收益按 50% 算，最多 8 小时）
 *
 * 下面 CONFIG 是纯 JSON，数值模拟器（idle_sim.py）直接读取同一份，用来核对理论用时：
 * 每天上线 2 次 × 20 分钟约 5.5 天集齐；一直在线积极玩约 33 小时。
 * 衣服立绘来自李豆沙本人 B 站动态（opus 1157213040286892036），缩成 540×960 webp 放在 assets/images/outfits/。
 */
(function () {
'use strict';
window.addEventListener('load', () => {
  const CONFIG = /*CONFIG*/
{
  "costGrowth": 1.15,
  "milestones": [
    25,
    50,
    100,
    150,
    200,
    300
  ],
  "generators": [
    {
      "id": "panda",
      "name": "应援熊猫",
      "icon": "🐼",
      "cost": 15,
      "pps": 0.2
    },
    {
      "id": "mic",
      "name": "麦克风",
      "icon": "🎤",
      "cost": 100,
      "pps": 1
    },
    {
      "id": "light",
      "name": "补光灯",
      "icon": "💡",
      "cost": 1100,
      "pps": 8
    },
    {
      "id": "card",
      "name": "声卡",
      "icon": "🎛️",
      "cost": 12000,
      "pps": 47
    },
    {
      "id": "plush",
      "name": "熊猫玩偶墙",
      "icon": "🧸",
      "cost": 130000,
      "pps": 260
    },
    {
      "id": "room",
      "name": "直播间布景",
      "icon": "🏠",
      "cost": 1400000.0,
      "pps": 1400
    },
    {
      "id": "clip",
      "name": "切片组",
      "icon": "✂️",
      "cost": 20000000.0,
      "pps": 7800
    },
    {
      "id": "collab",
      "name": "联动主播",
      "icon": "🤝",
      "cost": 330000000.0,
      "pps": 44000
    },
    {
      "id": "ops",
      "name": "官方运营",
      "icon": "📣",
      "cost": 5100000000.0,
      "pps": 260000
    },
    {
      "id": "stage",
      "name": "演唱会舞台",
      "icon": "🎆",
      "cost": 75000000000.0,
      "pps": 1600000.0
    }
  ],
  "click": {
    "base": 1,
    "ppsShare": 0.03
  },
  "fans": {
    "k": 0.05,
    "exp": 0.75
  },
  "fanBonusPerDecade": 0.05,
  "outfitBonus": 0.25,
  "gift": {
    "interval": 90,
    "seconds": 45
  },
  "offline": {
    "rate": 0.5,
    "capHours": 8
  },
  "event": {
    "seconds": 60,
    "mult": 3,
    "giftsPerSec": 1,
    "giftSeconds": 10
  },
  "outfits": [
    {
      "file": "outfit-01.webp",
      "fans": 0,
      "cost": 0,
      "perk": {
        "type": "all",
        "v": 0.1
      },
      "perkText": "全部收入 +10%"
    },
    {
      "file": "outfit-02.webp",
      "fans": 210.0,
      "cost": 14000.0,
      "perk": {
        "type": "click",
        "v": 2.5
      },
      "perkText": "打call ×2.5"
    },
    {
      "file": "outfit-03.webp",
      "fans": 2600.0,
      "cost": 200000.0,
      "perk": {
        "type": "gen",
        "v": 0.4
      },
      "perkText": "设备产出 +40%"
    },
    {
      "file": "outfit-04.webp",
      "fans": 1000000.0,
      "cost": 28000000.0,
      "perk": {
        "type": "offline",
        "v": 1.0
      },
      "perkText": "离线收益翻倍，最多算 12 小时"
    },
    {
      "file": "outfit-05.webp",
      "fans": 8100000.0,
      "cost": 270000000.0,
      "perk": {
        "type": "fans",
        "v": 0.6
      },
      "perkText": "粉丝增长 +60%"
    },
    {
      "file": "outfit-06.webp",
      "fans": 41000000.0,
      "cost": 1300000000.0,
      "perk": {
        "type": "gift",
        "v": 2
      },
      "perkText": "礼物更常出现，价值 ×2"
    },
    {
      "file": "outfit-07.webp",
      "fans": 130000000.0,
      "cost": 4700000000.0,
      "perk": {
        "type": "click",
        "v": 4
      },
      "perkText": "打call ×4"
    },
    {
      "file": "outfit-08.webp",
      "fans": 320000000.0,
      "cost": 11000000000.0,
      "perk": {
        "type": "gen",
        "v": 0.8
      },
      "perkText": "设备产出 +80%"
    },
    {
      "file": "outfit-09.webp",
      "fans": 830000000.0,
      "cost": 34000000000.0,
      "perk": {
        "type": "event",
        "v": 5
      },
      "perkText": "新衣回 ×5 收入，多 30 秒"
    },
    {
      "file": "outfit-10.webp",
      "fans": 1800000000.0,
      "cost": 57000000000.0,
      "perk": {
        "type": "all",
        "v": 0.5
      },
      "perkText": "全部收入 +50%"
    }
  ],
  "secret": {
    "file": "outfit-secret.webp",
    "perk": {
      "type": "all",
      "v": 1.0
    },
    "perkText": "全部收入 ×2，离线收益翻倍"
  },
  "secretGate": {
    "cost": 110000000000.0,
    "fans": 3200000000.0
  },
  "basePps": 0.5
}
/*END CONFIG*/;

  // ======================================================================
  const base = (window.SITE_BASE || '/').replace(/\/$/, '');
  const SAVE_KEY = 'idle_save_v1', MUTE_KEY = 'idle_mute';
  const OUTFIT_DIR = `${base}/assets/images/outfits/`;
  const $ = (id) => document.getElementById(id);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // 大数字：万 / 亿 / 万亿
  function fmt(n) {
    n = Math.floor(n);
    if (n < 1e4) return String(n);
    const units = [[1e12, '万亿'], [1e8, '亿'], [1e4, '万']];
    for (const [v, u] of units) {
      if (n >= v) {
        const x = n / v;
        return (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)).replace(/\.?0+$/, '') + u;
      }
    }
    return String(n);
  }
  function fmtRate(n) { return n < 10 ? n.toFixed(1) : fmt(n); }
  function fmtDur(s) {
    s = Math.floor(s);
    if (s < 60) return `${s} 秒`;
    if (s < 3600) return `${Math.floor(s / 60)} 分钟`;
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return m ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
  }

  // ---------------------------- 存档 ----------------------------
  function freshState() {
    return { P: 0, fans: 0, n: CONFIG.generators.map(() => 0), owned: 1, secret: false, equip: 0,
      event: 0, last: Date.now(), clicks: 0, buyMode: 1, tab: 'gen' };
  }
  let S = freshState();
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        S = Object.assign(freshState(), d);
        if (!Array.isArray(S.n) || S.n.length !== CONFIG.generators.length) S.n = CONFIG.generators.map((_, i) => (d.n && d.n[i]) || 0);
      }
    } catch (e) {}
  }
  function save() {
    S.last = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
  }

  // ---------------------------- 公式（与数值模拟器一致） ----------------------------
  const perkOf = (i) => (i === -1 ? CONFIG.secret.perk : CONFIG.outfits[i].perk);
  const perk = () => perkOf(S.equip);
  function milestoneCount(k, n = S.n[k]) { return CONFIG.milestones.filter(m => n >= m).length; }
  function genPps(k, n = S.n[k]) { return n ? CONFIG.generators[k].pps * n * Math.pow(2, milestoneCount(k, n)) : 0; }
  function genRaw() { let t = CONFIG.basePps || 0; for (let k = 0; k < S.n.length; k++) t += genPps(k); return t; }
  function mult(p = perk()) {
    let m = 1 + CONFIG.outfitBonus * (S.owned - 1 + (S.secret ? 1 : 0));
    m *= 1 + CONFIG.fanBonusPerDecade * Math.log10(1 + S.fans);
    if (p.type === 'all' || p.type === 'gen') m *= 1 + p.v;
    return m;
  }
  function eventMult(p = perk()) { return p.type === 'event' ? p.v : CONFIG.event.mult; }
  function pps(withEvent = true) {
    const p = perk();
    let v = genRaw() * mult(p);
    if (withEvent && S.event > 0) v *= eventMult(p);
    return v;
  }
  function clickValue() {
    const p = perk();
    let v = CONFIG.click.base + CONFIG.click.ppsShare * pps(false);
    if (p.type === 'click') v *= p.v;
    return v;
  }
  function fanRate() {
    const p = perk();
    let r = CONFIG.fans.k * Math.pow(Math.max(0, pps()), CONFIG.fans.exp);
    if (p.type === 'fans') r *= 1 + p.v;
    return r;
  }
  function costOf(k, count = 1) {
    const g = CONFIG.generators[k], r = CONFIG.costGrowth;
    return g.cost * Math.pow(r, S.n[k]) * (Math.pow(r, count) - 1) / (r - 1);
  }
  function maxAffordable(k) {
    const g = CONFIG.generators[k], r = CONFIG.costGrowth;
    const c0 = g.cost * Math.pow(r, S.n[k]);
    return Math.max(0, Math.floor(Math.log(S.P * (r - 1) / c0 + 1) / Math.log(r)));
  }
  function nextGate() {
    if (S.owned < CONFIG.outfits.length) return { idx: S.owned, fans: CONFIG.outfits[S.owned].fans, cost: CONFIG.outfits[S.owned].cost, secret: false };
    if (!S.secret) return { idx: -1, fans: CONFIG.secretGate.fans, cost: CONFIG.secretGate.cost, secret: true };
    return null;
  }
  function offlineRate() { const p = perk(); return CONFIG.offline.rate * ((p.type === 'offline' || S.equip === -1) ? 2 : 1); }
  function offlineCap() { return (CONFIG.offline.capHours + (perk().type === 'offline' ? 4 : 0)) * 3600; }
  function giftInterval() { return CONFIG.gift.interval / (perk().type === 'gift' ? 1.6 : 1); }
  function giftValue() { return CONFIG.gift.seconds * pps(false) * (perk().type === 'gift' ? perk().v : 1); }
  function outfitFile(i) { return OUTFIT_DIR + (i === -1 ? CONFIG.secret.file : CONFIG.outfits[i].file); }
  function outfitName(i) { return i === -1 ? '隐藏衣服 · 魔法熊猫' : `第 ${i + 1} 套衣服`; }
  function perkText(i) { return i === -1 ? CONFIG.secret.perkText : CONFIG.outfits[i].perkText; }

  // ---------------------------- 音效 / 语音 ----------------------------
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}
  let actx = null;
  function blip(freq, dur, vol = 0.05, type = 'triangle') {
    if (muted) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  let voiceAudio = null;
  function playVoice() {
    if (muted) return;
    const btns = document.querySelectorAll('.voice-btn[data-audio]');
    if (!btns.length) return;
    try {
      if (voiceAudio) voiceAudio.pause();
      voiceAudio = new Audio(pick(btns).getAttribute('data-audio'));
      voiceAudio.volume = 0.6;
      voiceAudio.play().catch(() => {});
    } catch (e) {}
  }

  // ---------------------------- DOM ----------------------------
  const root = $('game-idle');
  if (!root) return;
  const el = {
    pop: $('idle-pop'), pps: $('idle-pps'), fans: $('idle-fans'), mute: $('idle-mute'),
    stage: $('idle-stage'), outfit: $('idle-outfit'), viewers: $('idle-viewers'), dm: $('idle-danmaku'),
    fx: $('idle-fx'), eventBar: $('idle-event'), gate: $('idle-gate'), list: $('idle-list'),
    wardrobe: $('idle-wardrobe'), tabs: root.querySelectorAll('.idle-tab'), modes: root.querySelectorAll('.idle-mode'),
    reveal: $('idle-reveal'), toast: $('idle-toast'),
  };
  const setNum = (node, v) => { if (!node) return; const g = window.__gameModal; if (g && g.setNum) g.setNum(node, v); else node.textContent = v; };

  // 设备列表（只建一次，之后只更新数字）
  el.list.innerHTML = CONFIG.generators.map((g, k) => `
    <div class="idle-gen" data-k="${k}">
      <span class="idle-gen-icon" aria-hidden="true">${g.icon}</span>
      <span class="idle-gen-main">
        <span class="idle-gen-name">${g.name} <b class="idle-gen-count"></b></span>
        <span class="idle-gen-sub"></span>
        <span class="idle-gen-bar"><span></span></span>
      </span>
      <button type="button" class="idle-buy"><span class="idle-buy-n"></span><span class="idle-buy-cost"></span></button>
    </div>`).join('');
  const genRows = [...el.list.querySelectorAll('.idle-gen')];
  el.list.addEventListener('click', (e) => {
    const b = e.target.closest('.idle-buy');
    if (!b) return;
    buy(+b.closest('.idle-gen').dataset.k);
  });

  function buyCount(k) {
    if (S.buyMode === 'max') return Math.max(1, maxAffordable(k));
    return S.buyMode;
  }
  function buy(k) {
    const count = buyCount(k);
    const c = costOf(k, count);
    if (c > S.P) return;
    const before = milestoneCount(k);
    S.P -= c;
    S.n[k] += count;
    blip(660 + k * 40, 0.08);
    if (milestoneCount(k) > before) {
      toast(`${CONFIG.generators[k].name} 达到 ${S.n[k]} 个，产出翻倍！`);
      playVoice();
    }
    render(true);
  }

  el.modes.forEach(m => m.addEventListener('click', () => {
    const v = m.dataset.mode;
    S.buyMode = v === 'max' ? 'max' : +v;
    el.modes.forEach(x => x.classList.toggle('active', x === m));
    render(true);
  }));
  el.tabs.forEach(t => t.addEventListener('click', () => {
    S.tab = t.dataset.tab;
    applyTab();
  }));
  function applyTab() {
    el.tabs.forEach(x => { const on = x.dataset.tab === S.tab; x.classList.toggle('active', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
    root.querySelector('.idle-gen-panel').hidden = S.tab !== 'gen';
    el.wardrobe.hidden = S.tab !== 'wardrobe';
    if (S.tab === 'wardrobe') renderWardrobe();
  }

  // 衣柜：已解锁的可以点击换上；没解锁的显示剪影
  function renderWardrobe() {
    const items = CONFIG.outfits.map((o, i) => i).concat([-1]);
    el.wardrobe.innerHTML = items.map(i => {
      const unlocked = i === -1 ? S.secret : i < S.owned;
      const on = S.equip === i;
      return `<button type="button" class="idle-ward${unlocked ? '' : ' locked'}${on ? ' on' : ''}" data-i="${i}" ${unlocked ? '' : 'disabled'}>
        <img src="${outfitFile(i)}" alt="" loading="lazy">
        <span class="idle-ward-name">${unlocked ? outfitName(i) : (i === -1 ? '？？？' : `第 ${i + 1} 套`)}</span>
        <span class="idle-ward-perk">${unlocked ? perkText(i) : '新衣回解锁'}</span>
        ${on ? '<span class="idle-ward-badge">穿着</span>' : ''}
      </button>`;
    }).join('');
  }
  el.wardrobe.addEventListener('click', (e) => {
    const b = e.target.closest('.idle-ward');
    if (!b || b.disabled) return;
    S.equip = +b.dataset.i;
    el.outfit.src = outfitFile(S.equip);
    blip(880, 0.1);
    renderWardrobe();
    render(true);
  });

  if (el.mute) {
    const renderMute = () => { el.mute.textContent = muted ? '🔇' : '🔊'; el.mute.setAttribute('aria-pressed', muted ? 'true' : 'false'); el.mute.setAttribute('aria-label', muted ? '打开声音' : '关闭声音'); };
    el.mute.addEventListener('click', () => { muted = !muted; try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {} if (muted && voiceAudio) voiceAudio.pause(); renderMute(); el.mute.blur(); });
    renderMute();
  }

  // ---------------------------- 直播间画面：打 call / 飘字 / 弹幕 / 礼物 ----------------------------
  function floatText(text, x, y, cls = '') {
    const d = document.createElement('div');
    d.className = 'idle-float ' + cls;
    d.textContent = text;
    d.style.left = x + 'px'; d.style.top = y + 'px';
    el.fx.appendChild(d);
    setTimeout(() => d.remove(), 900);
  }
  el.stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.idle-gift')) return;
    const r = el.stage.getBoundingClientRect();
    const v = clickValue();
    S.P += v;
    S.clicks++;
    floatText('+' + fmt(v), e.clientX - r.left, e.clientY - r.top);
    el.outfit.classList.remove('bounce'); void el.outfit.offsetWidth; el.outfit.classList.add('bounce');
    blip(520 + Math.random() * 120, 0.05, 0.03);
    if (Math.random() < 0.25) spawnDanmaku(true);
    render();
  });

  const DM_TEXT = ['来了来了', '打call！', '好可爱', '豆沙！', '妈妈！', '宝宝！', '老婆！', '晚上好', 'kmx', '草', '笑死', '这是可以说的吗', '贴贴', '好听', '？', '+1', '豆沙我来了', '熊猫熊猫', '冲冲冲', '收藏了'];
  const EVENT_TEXT = ['新衣服！！', '好看！', '新衣回来了', '妈妈好美', '截图截图', '这套绝了', '老婆新衣服', '啊啊啊啊', '值了', '爆了爆了'];
  const EMOTES = ((window.EMOTE_META || {}).items || []).filter(i => i.file && !/\.gif$/i.test(i.file));
  let dmLanes = 0;
  function spawnDanmaku(fromClick = false) {
    if (el.dm.childElementCount > 26) return;
    const d = document.createElement('div');
    d.className = 'idle-dm' + (S.event > 0 ? ' hot' : '');
    const useEmote = EMOTES.length && Math.random() < 0.3;
    if (useEmote) {
      const img = document.createElement('img');
      img.src = `${base}/assets/images/emotes/${pick(EMOTES).file}`;
      img.alt = '';
      d.appendChild(img);
    } else {
      d.textContent = fromClick ? '打call！' : pick(S.event > 0 ? EVENT_TEXT : DM_TEXT);
    }
    dmLanes = (dmLanes + 1 + Math.floor(Math.random() * 2)) % 7;
    d.style.top = (6 + dmLanes * 11) + '%';
    d.style.animationDuration = rand(5, 8) + 's';
    el.dm.appendChild(d);
    d.addEventListener('animationend', () => d.remove());
  }

  // 礼物：平时每隔一阵飘出一个；新衣回期间像下雨一样掉
  function spawnGift(rain = false) {
    const g = document.createElement('button');
    g.type = 'button';
    g.className = 'idle-gift' + (rain ? ' rain' : '');
    g.setAttribute('aria-label', '领取礼物');
    g.textContent = pick(['🎁', '💝', '🍬', '⭐', '🎀']);
    g.style.left = rand(8, 82) + '%';
    if (!rain) g.style.top = rand(25, 65) + '%';
    el.fx.appendChild(g);
    const life = rain ? 2600 : 8000;
    const timer = setTimeout(() => g.remove(), life);
    g.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      clearTimeout(timer);
      const v = rain ? CONFIG.event.giftSeconds * pps(false) : giftValue();
      S.P += v;
      const r = el.stage.getBoundingClientRect();
      floatText('+' + fmt(v), e.clientX - r.left, e.clientY - r.top, 'gift');
      blip(990, 0.12, 0.06);
      if (!rain) playVoice();
      g.remove();
      render(true);
    });
  }

  function toast(text) {
    if (!el.toast) return;
    el.toast.textContent = text;
    el.toast.classList.remove('show'); void el.toast.offsetWidth; el.toast.classList.add('show');
  }

  // ---------------------------- 新衣回 ----------------------------
  let revealing = false;
  el.gate.addEventListener('click', (e) => {
    if (!e.target.closest('.idle-gate-btn')) return;
    const g = nextGate();
    if (!g || S.fans < g.fans || S.P < g.cost || revealing) return;
    S.P -= g.cost;
    if (g.secret) { S.secret = true; S.equip = -1; }
    else { S.owned++; S.equip = g.idx; }
    save();
    startReveal(S.equip);
  });

  function startReveal(i) {
    revealing = true;
    const r = el.reveal;
    r.innerHTML = `
      <div class="idle-curtain left"></div><div class="idle-curtain right"></div>
      <div class="idle-reveal-card"><img src="${outfitFile(i)}" alt=""></div>
      <div class="idle-reveal-text"><b>${i === -1 ? '隐藏新衣回！' : '新衣回！'}</b><span>${outfitName(i)}</span><em>${perkText(i)}</em></div>`;
    r.hidden = false;
    r.classList.remove('go'); void r.offsetWidth; r.classList.add('go');
    [523, 659, 784, 1046].forEach((f, k) => setTimeout(() => blip(f, 0.25, 0.07), 600 + k * 120));
    setTimeout(playVoice, 900);
    setTimeout(() => {
      r.hidden = true;
      r.classList.remove('go');
      revealing = false;
      el.outfit.src = outfitFile(i);
      S.event = CONFIG.event.seconds + (perk().type === 'event' ? 30 : 0);
      eventTotal = S.event;
      toast(`新衣回开播！${Math.round(S.event)} 秒内人气 ×${eventMult()}，礼物雨来了`);
      render(true);
    }, 3200);
  }
  let eventTotal = CONFIG.event.seconds;

  // ---------------------------- 主循环 ----------------------------
  let timer = null, lastTick = 0, giftIn = 0, dmIn = 0, rainIn = 0, saveIn = 0;
  function tick() {
    const now = Date.now();
    let dt = (now - lastTick) / 1000;
    lastTick = now;
    if (dt > 5) { settleOffline(dt); dt = 0; }   // 标签页被切走太久：按离线结算
    if (dt <= 0) { render(); return; }
    if (!revealing) {
      S.P += pps() * dt;
      S.fans += fanRate() * dt;
      if (S.event > 0) S.event = Math.max(0, S.event - dt);
    }
    // 弹幕密度随人气增长，新衣回期间刷屏
    dmIn -= dt;
    if (dmIn <= 0) { spawnDanmaku(); dmIn = S.event > 0 ? rand(0.12, 0.3) : Math.max(0.5, 3.2 - Math.log10(1 + pps()) * 0.35) * rand(0.6, 1.4); }
    giftIn -= dt;
    if (giftIn <= 0) { if (S.event <= 0) spawnGift(false); giftIn = giftInterval() * rand(0.7, 1.3); }
    if (S.event > 0) { rainIn -= dt; if (rainIn <= 0) { spawnGift(true); rainIn = 1 / CONFIG.event.giftsPerSec * rand(0.6, 1.4); } }
    saveIn -= dt;
    if (saveIn <= 0) { save(); saveIn = 5; }
    render();
  }

  function settleOffline(secs) {
    const eff = Math.min(secs, offlineCap());
    if (eff < 30) return;
    const rate = offlineRate();
    const gainP = pps(false) * rate * eff;
    const gainF = fanRate() * rate * eff;
    S.P += gainP;
    S.fans += gainF;
    S.event = 0;
    toast(`你不在的 ${fmtDur(secs)} 里，直播间攒了 ${fmt(gainP)} 人气、${fmt(gainF)} 粉丝${secs > eff ? `（离线最多算 ${fmtDur(offlineCap())}）` : ''}`);
  }

  // ---------------------------- 渲染 ----------------------------
  let lastFull = 0;
  function render(full = false) {
    setNum(el.pop, fmt(S.P));
    setNum(el.pps, fmtRate(pps()) + '/秒');
    setNum(el.fans, fmt(S.fans));
    el.viewers.textContent = `${fmt(Math.max(1, Math.round(Math.sqrt(S.fans) * 3 + 1)))} 人在看`;
    el.stage.classList.toggle('event', S.event > 0);
    // 新衣回倒计时条
    if (S.event > 0) {
      el.eventBar.hidden = false;
      el.eventBar.firstElementChild.style.width = `${(S.event / eventTotal) * 100}%`;
      el.eventBar.lastElementChild.textContent = `新衣回 ${Math.ceil(S.event)} 秒 · 人气 ×${eventMult()}`;
    } else el.eventBar.hidden = true;

    const now = performance.now();
    if (!full && now - lastFull < 250) return;   // 列表 4 次/秒刷新就够
    lastFull = now;

    // 新衣回进度
    const g = nextGate();
    if (!g) {
      el.gate.innerHTML = `<div class="idle-gate-done">11 套衣服全部集齐！🎉</div>`;
    } else {
      const fOK = S.fans >= g.fans, cOK = S.P >= g.cost;
      const fp = Math.min(1, S.fans / g.fans), cp = Math.min(1, S.P / g.cost);
      el.gate.innerHTML = `
        <div class="idle-gate-head"><b>${g.secret ? '隐藏新衣回' : `下一场新衣回 · 第 ${g.idx + 1} 套`}</b><span>${g.secret ? '？？？' : CONFIG.outfits[g.idx].perkText}</span></div>
        <div class="idle-gate-row"><span>粉丝</span><span class="idle-gate-bar${fOK ? ' ok' : ''}"><i style="width:${fp * 100}%"></i></span><span>${fmt(S.fans)} / ${fmt(g.fans)}</span></div>
        <div class="idle-gate-row"><span>筹备</span><span class="idle-gate-bar${cOK ? ' ok' : ''}"><i style="width:${cp * 100}%"></i></span><span>${fmt(S.P)} / ${fmt(g.cost)}</span></div>
        <button type="button" class="idle-gate-btn game-btn primary" ${fOK && cOK && !revealing && S.event <= 0 ? '' : 'disabled'}>开新衣回</button>`;
    }

    // 设备
    genRows.forEach((row, k) => {
      const gdef = CONFIG.generators[k];
      const count = buyCount(k);
      const c = costOf(k, count);
      // 前一档至少买过 1 个才显示下一档（逐步揭晓）
      const visible = k === 0 || S.n[k] > 0 || S.n[k - 1] > 0;
      row.hidden = !visible;
      if (!visible) return;
      row.querySelector('.idle-gen-count').textContent = S.n[k] ? `×${S.n[k]}` : '';
      const nextM = CONFIG.milestones.find(m => m > S.n[k]);
      const prevM = [...CONFIG.milestones].reverse().find(m => m <= S.n[k]) || 0;
      const each = gdef.pps * Math.pow(2, milestoneCount(k)) * mult();
      row.querySelector('.idle-gen-sub').textContent = `每个 +${fmtRate(each)}/秒` + (nextM ? ` · 到 ${nextM} 个产出翻倍` : ' · 已满级');
      row.querySelector('.idle-gen-bar span').style.width = nextM ? `${((S.n[k] - prevM) / (nextM - prevM)) * 100}%` : '100%';
      row.querySelector('.idle-buy-n').textContent = `买 ${count}`;
      row.querySelector('.idle-buy-cost').textContent = fmt(c);
      row.querySelector('.idle-buy').disabled = c > S.P;
    });
  }

  // ---------------------------- 打开 / 关闭 ----------------------------
  function open() {
    load();
    el.outfit.src = outfitFile(S.equip);
    el.modes.forEach(x => x.classList.toggle('active', String(x.dataset.mode) === String(S.buyMode)));
    applyTab();
    const away = (Date.now() - (S.last || Date.now())) / 1000;
    if (away > 30) settleOffline(away);
    else if (S.P === 0 && S.clicks === 0) toast('点直播画面给豆沙打 call，攒人气买设备吧');
    lastTick = Date.now();
    giftIn = rand(20, 40); dmIn = 0.3; rainIn = 0; saveIn = 5;
    render(true);
    clearInterval(timer);
    timer = setInterval(tick, 100);
  }
  function close() {
    clearInterval(timer); timer = null;
    save();
    el.dm.innerHTML = ''; el.fx.innerHTML = '';
    if (voiceAudio) voiceAudio.pause();
  }
  window.addEventListener('pagehide', () => { if (timer) save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && timer) save(); });

  window.__gameHooks = window.__gameHooks || {};
  window.__gameHooks.idle = (action) => { if (action === 'open') open(); else if (action === 'close') close(); };
  window.__idleSummary = () => { load(); return { owned: S.owned + (S.secret ? 1 : 0) }; };
});
})();
