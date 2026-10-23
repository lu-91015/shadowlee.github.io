/**
 * 熊猫竹林跳
 * 玩法参考小时候国产（MTK）手机里自带的“熊猫爬竹子”：熊猫抱着竹子一路往上爬，在三根竹子之间左右跳。
 *  - 瓢虫顺着竹子往下爬：抱在竹子上被它撞到会扣时间；跳过去正好落在它身上就能把它撞飞，得分并累积连击
 *  - 金色瓢虫很少见，撞飞得分高
 *  - 30 秒后会出现带刺的甲虫：撞不动，只能躲开
 *  - 掉下来的闹钟接住可以加时间；时间归零游戏结束
 * 画面和手感按现在的标准重做：高清绘制、视差竹林背景、挤压拉伸的跳跃、命中停顿 + 震屏、连击、音效和震动反馈。
 */
(function () {
  'use strict';

  window.addEventListener('load', () => {
    const canvas = document.getElementById('bamboo-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 400, H = 600;            // 逻辑尺寸；实际像素按屏幕 DPR 放大，画面更清晰
    const GM = window.__gameModal || {};
    const FONT = GM.FONT || 'sans-serif';
    const setNum = (el, v) => { if (!el) return; if (GM.setNum) GM.setNum(el, v); else el.textContent = v; };
    const scoreEl = document.getElementById('bamboo-score');
    const timeEl = document.getElementById('bamboo-time');
    const bestEl = document.getElementById('bamboo-best');
    const muteBtn = document.getElementById('bamboo-mute');
    const BEST_KEY = 'bamboo_best', MUTE_KEY = 'bamboo_mute';

    // ---- 高清画布 ----
    let dpr = 1;
    function fitDpr() {
      const d = Math.min(window.devicePixelRatio || 1, 2.5);
      if (d === dpr && canvas.width === Math.round(W * d)) return;
      dpr = d;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    fitDpr();

    // ---- 参数 ----
    const LANES = [88, 200, 312];
    const PY = 430;                     // 熊猫在屏幕上的高度（固定，世界往下滚）
    const START_TIME = 45;
    const JUMP_FRAMES = 15;
    const CLOCK_BONUS = 5, HURT_PENALTY = 4;
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    let best = 0;
    try { best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (e) {}

    // ======================== 音效（WebAudio 合成，无外部文件） ========================
    let actx = null, muted = false;
    try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}
    function audio() {
      if (muted) return null;
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        actx = new AC();
      }
      if (actx.state === 'suspended') actx.resume();
      return actx;
    }
    function tone(freq, dur, { type = 'sine', vol = 0.12, slide = 0, delay = 0 } = {}) {
      const a = audio(); if (!a) return;
      const t = a.currentTime + delay;
      const o = a.createOscillator(), g = a.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination);
      o.start(t); o.stop(t + dur + 0.02);
    }
    function noise(dur, vol = 0.08) {
      const a = audio(); if (!a) return;
      const len = Math.floor(a.sampleRate * dur);
      const buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 1200;
      g.gain.value = vol;
      src.buffer = buf;
      src.connect(f).connect(g).connect(a.destination);
      src.start();
    }
    const sfx = {
      jump: () => tone(420, 0.09, { type: 'triangle', slide: 380, vol: 0.07 }),
      smash: (combo) => { noise(0.08, 0.06); tone(660 * Math.pow(1.06, Math.min(combo, 12)), 0.12, { type: 'square', vol: 0.05, slide: 300 }); },
      gold: () => { [880, 1175, 1568].forEach((f, i) => tone(f, 0.14, { type: 'triangle', vol: 0.07, delay: i * 0.06 })); },
      clock: () => { tone(1046, 0.1, { vol: 0.09 }); tone(1568, 0.16, { vol: 0.08, delay: 0.08 }); },
      hurt: () => { tone(220, 0.25, { type: 'sawtooth', slide: -140, vol: 0.07 }); noise(0.12, 0.05); },
      tick: () => tone(1800, 0.03, { type: 'square', vol: 0.03 }),
      over: () => { [523, 392, 330, 262].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.08, delay: i * 0.13 })); },
    };
    function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
    function renderMute() {
      if (!muteBtn) return;
      muteBtn.textContent = muted ? '🔇' : '🔊';
      muteBtn.setAttribute('aria-label', muted ? '打开音效' : '关闭音效');
      muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    }
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        muted = !muted;
        try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
        renderMute();
        muteBtn.blur();
      });
    }
    renderMute();

    // ======================== 状态 ========================
    let phase, score, timeLeft, elapsed, scroll, speed, combo, comboT, hitStop, shake, invuln;
    let panda, bugs, clocks, particles, popups, ghosts, leaves, nextBugIn, nextClockIn, lastTick, flash;
    let queued = 0;   // 输入缓冲：跳跃途中按的方向，落地后立刻执行
    let landGrace = 0; // 刚落地的几帧不判被撞

    function reset() {
      phase = 'ready';
      score = 0; timeLeft = START_TIME; elapsed = 0; scroll = 0; speed = 2.0;
      combo = 0; comboT = 0; hitStop = 0; shake = 0; invuln = 0; flash = 0;
      panda = { lane: 1, x: LANES[1], y: PY, from: 1, jumpT: 0, sx: 1, sy: 1, rot: 0, dir: 1 };
      bugs = []; clocks = []; particles = []; popups = []; ghosts = [];
      nextBugIn = 50; nextClockIn = 60 * 9; lastTick = START_TIME;
      queued = 0;
      landGrace = 0;
      leaves = Array.from({ length: 14 }, () => newLeaf(true));
      updateHud();
    }

    function newLeaf(anyY) {
      return { x: rand(-20, W + 20), y: anyY ? rand(-40, H) : -20, vx: rand(-0.3, 0.3), vy: rand(0.4, 1.0),
        rot: rand(0, Math.PI * 2), vr: rand(-0.03, 0.03), s: rand(0.6, 1.2), sway: rand(0, 6), depth: Math.random() };
    }

    function updateHud() {
      setNum(scoreEl, score);
      setNum(timeEl, Math.max(0, Math.ceil(timeLeft)));
      setNum(bestEl, Math.max(best, score));
    }

    // ======================== 输入 ========================
    function move(dir) {
      if (phase === 'over') return;
      if (phase === 'ready') { phase = 'playing'; audio(); }
      if (panda.jumpT > 0) { queued = dir; return; }   // 跳跃中：缓冲一次
      const to = panda.lane + dir;
      if (to < 0 || to > 2) {
        // 撞到边上：小小地弹一下，提示到头了
        panda.sx = 1.12; panda.sy = 0.9;
        return;
      }
      panda.from = panda.lane;
      panda.lane = to;
      panda.dir = dir;
      panda.jumpT = JUMP_FRAMES;
      panda.sx = 0.82; panda.sy = 1.2;   // 起跳拉伸
      sfx.jump();
    }

    // 点画面左半边往左跳，右半边往右跳（手机上两只拇指正好）
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (phase === 'over') { if (overT > 40) reset(); return; }
      const rect = canvas.getBoundingClientRect();
      move((e.clientX - rect.left) / rect.width < 0.5 ? -1 : 1);
    });
    window.addEventListener('keydown', (e) => {
      if (window.__gameModal && !window.__gameModal.wantsKeys('bamboo', e)) return;
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); if (!e.repeat) move(-1); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); if (!e.repeat) move(1); }
      else if (k === ' ' || k === 'Enter') {
        e.preventDefault();
        if (phase === 'over' && overT > 40) reset();
        else if (phase === 'ready') { phase = 'playing'; audio(); }
      }
    });

    // ======================== 生成 ========================
    function spawnBug() {
      // 公平性：最近刚生成的几只不能把三根竹子都堵在同一高度
      const recent = bugs.filter(b => b.y < 60);
      const blocked = new Set(recent.map(b => b.lane));
      let lanes = [0, 1, 2].filter(l => !blocked.has(l));
      if (!lanes.length) return;
      const lane = lanes[Math.floor(Math.random() * lanes.length)];
      const t = elapsed / 60;
      let kind = 'lady';
      const r = Math.random();
      // 金瓢虫：约 4%，同屏最多一只，保持稀有感
      if (r < 0.04 && !bugs.some(b => b.kind === 'gold' && !b.dead)) kind = 'gold';
      else if (t > 30 && r < 0.06 + Math.min(0.32, (t - 30) * 0.006)) kind = 'beetle';
      // 甲虫不能和另外一只甲虫并排出现，留条活路
      if (kind === 'beetle' && recent.some(b => b.kind === 'beetle')) kind = 'lady';
      bugs.push({
        kind, lane, y: -30,
        crawl: kind === 'gold' ? rand(1.2, 1.8) : kind === 'beetle' ? rand(0.3, 0.7) : rand(0.4, 1.1),
        wiggle: rand(0, 6), dead: false, vx: 0, vy: 0, rot: 0,
      });
    }

    function spawnClock() {
      clocks.push({ lane: Math.floor(Math.random() * 3), y: -30, vy: 0, swing: rand(0, 6), got: false });
    }

    // ======================== 特效 ========================
    const STAR_COLORS = ['#fff6c2', '#ffd76a', '#ffffff', '#ffb3c7', '#bcd2ff'];
    function burst(x, y, n, colors = STAR_COLORS, power = 1) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = rand(1.5, 4.5) * power;
        particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 1, decay: rand(0.02, 0.04),
          size: rand(3, 6.5), rot: rand(0, 3), vr: rand(-0.3, 0.3), color: colors[Math.floor(Math.random() * colors.length)], star: Math.random() < 0.6 });
      }
    }
    function popup(text, x, y, color = '#ffffff', big = false) {
      popups.push({ text, x, y, t: 0, color, big });
    }

    // ======================== 更新 ========================
    function hurt() {
      if (invuln > 0) return;
      timeLeft -= HURT_PENALTY;
      invuln = 60;
      combo = 0;
      shake = 10;
      flash = 1;
      hitStop = 5;
      popup(`-${HURT_PENALTY}s`, panda.x, panda.y - 40, '#ff6f9c', true);
      sfx.hurt();
      buzz(80);
    }

    function smash(b) {
      b.dead = true;
      b.vx = (Math.random() < 0.5 ? -1 : 1) * rand(3, 5);
      b.vy = rand(-7, -5);
      combo++;
      comboT = 120;
      const base = b.kind === 'gold' ? 50 : 10;
      const gain = base * Math.min(combo, 8);
      score += gain;
      hitStop = b.kind === 'gold' ? 7 : 4;
      shake = b.kind === 'gold' ? 7 : 4;
      burst(LANES[b.lane], b.y, b.kind === 'gold' ? 26 : 14, b.kind === 'gold' ? ['#ffd76a', '#fff6c2', '#ffffff'] : STAR_COLORS, b.kind === 'gold' ? 1.3 : 1);
      popup(combo > 1 ? `+${gain}  ×${combo}` : `+${gain}`, LANES[b.lane], b.y - 30, b.kind === 'gold' ? '#ffd76a' : '#ffffff', b.kind === 'gold' || combo >= 3);
      if (b.kind === 'gold') sfx.gold(); else sfx.smash(combo);
      buzz(b.kind === 'gold' ? 35 : 15);
      updateHud();
    }

    function update() {
      // 背景树叶一直飘（准备 / 结束时也动，画面不死）
      for (const l of leaves) {
        l.y += l.vy + (phase === 'playing' ? speed * 0.35 * (0.4 + l.depth) : 0);
        l.x += l.vx + Math.sin((l.y + l.sway * 50) / 60) * 0.4;
        l.rot += l.vr;
        if (l.y > H + 30) Object.assign(l, newLeaf(false));
      }
      for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.vx *= 0.98; p.rot += p.vr; p.life -= p.decay; }
      particles = particles.filter(p => p.life > 0);
      for (const q of popups) q.t++;
      popups = popups.filter(q => q.t < 55);
      for (const g of ghosts) g.life -= 0.12;
      ghosts = ghosts.filter(g => g.life > 0);
      shake *= 0.85;
      flash = Math.max(0, flash - 0.06);
      // 挤压拉伸回弹
      panda.sx += (1 - panda.sx) * 0.25;
      panda.sy += (1 - panda.sy) * 0.25;

      if (phase === 'over') { overT++; return; }
      if (phase !== 'playing') return;
      if (hitStop > 0) { hitStop--; return; }   // 命中停顿：画面定格几帧，打击感

      const dt = 1 / 60;
      elapsed++;
      timeLeft -= dt;
      speed = Math.min(5.2, 2.0 + elapsed / 60 * 0.045);
      scroll += speed;
      if (invuln > 0) invuln--;
      if (landGrace > 0) landGrace--;
      if (comboT > 0 && --comboT === 0) combo = 0;

      // 最后 5 秒每秒滴答一声
      const sec = Math.ceil(timeLeft);
      if (sec !== lastTick) { lastTick = sec; if (sec <= 5 && sec > 0) sfx.tick(); updateHud(); }

      // 熊猫跳跃
      if (panda.jumpT > 0) {
        panda.jumpT--;
        const k = 1 - panda.jumpT / JUMP_FRAMES;
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // easeInOut
        panda.x = LANES[panda.from] + (LANES[panda.lane] - LANES[panda.from]) * e;
        panda.y = PY - Math.sin(Math.PI * k) * 34;
        panda.rot = Math.sin(Math.PI * k) * 0.5 * panda.dir;
        if (elapsed % 2 === 0) ghosts.push({ x: panda.x, y: panda.y, rot: panda.rot, life: 0.6 });
        // 宽容：跳跃最后几帧里，目标竹子上的瓢虫已经撞到熊猫身上了，算“撞飞”而不是等落地再判
        if (panda.jumpT <= 4) {
          for (const b of bugs) {
            if (!b.dead && b.kind !== 'beetle' && b.lane === panda.lane && Math.abs(b.y - PY) <= 50) smash(b);
          }
        }
        if (panda.jumpT === 0) {
          panda.x = LANES[panda.lane]; panda.y = PY; panda.rot = 0;
          panda.sx = 1.25; panda.sy = 0.8;   // 落地压扁
          // 落地：落在瓢虫身上就撞飞（判定放宽到 ±50）；落在甲虫身上才受伤（判定收紧到 ±28）
          for (const b of bugs) {
            if (b.dead || b.lane !== panda.lane) continue;
            const dy = Math.abs(b.y - PY);
            if (b.kind === 'beetle') { if (dy <= 28) hurt(); }
            else if (dy <= 50) smash(b);
          }
          landGrace = 4;
          burst(panda.x, PY + 18, 5, ['#9be08f', '#cdeec0', '#ffffff'], 0.6);
          if (queued) { const q = queued; queued = 0; move(q); }
        }
      }

      // 生成
      if (--nextBugIn <= 0) {
        spawnBug();
        const gap = Math.max(16, 52 - elapsed / 60 * 0.9);   // 越往后越密
        nextBugIn = Math.round(rand(gap * 0.7, gap * 1.4));
      }
      if (--nextClockIn <= 0) {
        spawnClock();
        // 时间越少，闹钟来得越勤一点（救急），但别太多
        nextClockIn = Math.round(60 * (timeLeft < 15 ? rand(5, 8) : rand(8, 13)));
      }

      // 虫子
      for (const b of bugs) {
        if (b.dead) {
          b.x = (b.x ?? LANES[b.lane]) + b.vx;
          b.y += b.vy; b.vy += 0.35; b.rot += 0.3 * Math.sign(b.vx);
          continue;
        }
        b.y += speed + b.crawl;
        b.wiggle += 0.25;
        // 抱在竹子上时被往下爬的虫子撞到
        // 被撞判定比画面上看起来小一点（-24 ~ +12）；刚落地的 4 帧内不算，免得“明明躲开了”
        if (panda.jumpT === 0 && landGrace === 0 && b.lane === panda.lane && b.y > PY - 24 && b.y < PY + 12) hurt();
      }
      bugs = bugs.filter(b => b.y < H + 60 && (!b.dead || b.y < H + 60));

      // 闹钟：往下掉
      for (const c of clocks) {
        c.vy = Math.min(c.vy + 0.08, 3.2);
        c.y += speed + c.vy;
        c.swing += 0.08;
        // 接闹钟的范围放宽一点
        const px = panda.x, near = Math.abs(LANES[c.lane] - px) < 40 && Math.abs(c.y - panda.y) < 52;
        if (!c.got && near) {
          c.got = true;
          timeLeft += CLOCK_BONUS;
          popup(`+${CLOCK_BONUS}s`, LANES[c.lane], c.y - 30, '#9be08f', true);
          burst(LANES[c.lane], c.y, 14, ['#ffffff', '#9be08f', '#fff6c2']);
          sfx.clock();
          buzz(20);
          updateHud();
        }
      }
      clocks = clocks.filter(c => !c.got && c.y < H + 40);

      if (timeLeft <= 0) {
        timeLeft = 0;
        phase = 'over';
        overT = 0;
        if (score > best) { best = score; try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {} }
        sfx.over();
        updateHud();
      }
    }
    let overT = 0;

    // ======================== 绘制 ========================
    // 预渲染远景竹林（两层视差），只在第一次画
    const farLayers = [0, 1].map(layer => {
      const c = document.createElement('canvas');
      c.width = W * 2; c.height = H * 2;   // 2 倍分辨率，避免高 DPR 下发糊
      const g = c.getContext('2d');
      g.scale(2, 2);
      const n = layer === 0 ? 9 : 6;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * (W / n) + rand(-14, 14);
        const w = layer === 0 ? rand(7, 11) : rand(12, 18);
        const col = layer === 0 ? 'rgba(122, 170, 150, 0.22)' : 'rgba(96, 160, 120, 0.30)';
        g.fillStyle = col;
        g.fillRect(x - w / 2, 0, w, H);
        g.fillStyle = layer === 0 ? 'rgba(90, 140, 120, 0.25)' : 'rgba(70, 130, 95, 0.35)';
        for (let y = rand(0, 80); y < H; y += rand(70, 110)) g.fillRect(x - w / 2 - 1, y, w + 2, 3);
        // 叶子
        g.fillStyle = layer === 0 ? 'rgba(120, 180, 140, 0.18)' : 'rgba(100, 175, 120, 0.25)';
        for (let k = 0; k < 4; k++) {
          const ly = rand(0, H), side = Math.random() < 0.5 ? -1 : 1;
          g.save(); g.translate(x, ly); g.rotate(side * rand(0.4, 0.9));
          g.beginPath(); g.ellipse(side * 18, 0, 20, 4, 0, 0, Math.PI * 2); g.fill();
          g.restore();
        }
      }
      return c;
    });

    function drawBackground() {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#e9f6ef');
      g.addColorStop(0.55, '#d8efe4');
      g.addColorStop(1, '#c4e3d3');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // 斜射的光
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rays = ctx.createLinearGradient(0, 0, W, H);
      rays.addColorStop(0, 'rgba(255, 250, 220, 0.35)');
      rays.addColorStop(0.5, 'rgba(255, 250, 220, 0)');
      ctx.fillStyle = rays;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const x0 = -60 + i * 110;
        ctx.moveTo(x0, 0); ctx.lineTo(x0 + 60, 0); ctx.lineTo(x0 + 260, H); ctx.lineTo(x0 + 170, H);
        ctx.fill();
      }
      ctx.restore();
      // 两层远景竹林，不同速度滚动（视差）
      farLayers.forEach((c, i) => {
        const off = (scroll * (i === 0 ? 0.25 : 0.5)) % H;
        ctx.drawImage(c, 0, off - H, W, H);
        ctx.drawImage(c, 0, off, W, H);
      });
      // 底部雾
      const fog = ctx.createLinearGradient(0, H * 0.55, 0, H);
      fog.addColorStop(0, 'rgba(240, 250, 245, 0)');
      fog.addColorStop(1, 'rgba(240, 250, 245, 0.75)');
      ctx.fillStyle = fog;
      ctx.fillRect(0, H * 0.55, W, H * 0.45);
    }

    function drawLeaves(front) {
      for (const l of leaves) {
        if ((l.depth > 0.6) !== front) continue;
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.rot);
        ctx.scale(l.s, l.s);
        ctx.fillStyle = front ? 'rgba(110, 185, 110, 0.85)' : 'rgba(140, 200, 150, 0.45)';
        ctx.beginPath(); ctx.ellipse(0, 0, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(60, 120, 70, 0.4)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.restore();
      }
    }

    // 三根主竹子：圆柱渐变 + 滚动的竹节 + 竹节上随机长叶子
    const stalkGrad = (x) => {
      const g = ctx.createLinearGradient(x - 16, 0, x + 16, 0);
      g.addColorStop(0, '#3e8f4f');
      g.addColorStop(0.3, '#7fcb78');
      g.addColorStop(0.55, '#9ad98c');
      g.addColorStop(1, '#2f7340');
      return g;
    };
    const NODE_GAP = 96;
    function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
    function drawStalks() {
      LANES.forEach((x, li) => {
        const sway = Math.sin(scroll / 180 + li * 1.7) * 1.2;
        ctx.save();
        ctx.translate(sway, 0);
        ctx.fillStyle = stalkGrad(x);
        ctx.beginPath(); ctx.roundRect(x - 15, -10, 30, H + 20, 6); ctx.fill();
        // 竹节：随滚动往下走
        const first = Math.floor(-scroll / NODE_GAP) - 1;
        for (let k = first; k < first + H / NODE_GAP + 3; k++) {
          const y = k * NODE_GAP + scroll;
          if (y < -20 || y > H + 20) continue;
          ctx.fillStyle = 'rgba(40, 92, 50, 0.9)';
          ctx.beginPath(); ctx.roundRect(x - 17, y - 3, 34, 6, 3); ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillRect(x - 9, y - 1, 6, 2);
          // 有些竹节长出一簇叶子（用竹节编号做随机，滚动时保持不变）
          const h = hash(k * 3 + li * 17);
          if (h > 0.62) {
            const side = h > 0.81 ? 1 : -1;
            ctx.fillStyle = '#76c270';
            for (let j = 0; j < 3; j++) {
              ctx.save();
              ctx.translate(x + side * 14, y + 2);
              ctx.rotate(side * (0.35 + j * 0.28));
              ctx.beginPath(); ctx.ellipse(side * 16, 0, 17, 4.2, 0, 0, Math.PI * 2); ctx.fill();
              ctx.restore();
            }
          }
        }
        // 高光细线
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(x - 7, -10, 3, H + 20);
        ctx.restore();
      });
    }

    function starPath(x, y, r, rot) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r : r * 0.45;
        const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
    }

    function drawBug(b) {
      const x = b.dead ? b.x : LANES[b.lane];
      ctx.save();
      ctx.translate(x, b.y);
      ctx.rotate(b.dead ? b.rot : Math.PI + Math.sin(b.wiggle) * 0.12);   // 头朝下爬
      const s = b.kind === 'beetle' ? 1.15 : 1;
      ctx.scale(s, s);
      // 投影
      ctx.fillStyle = 'rgba(20, 50, 30, 0.18)';
      ctx.beginPath(); ctx.ellipse(3, 4, 13, 15, 0, 0, Math.PI * 2); ctx.fill();
      // 腿（爬行时摆动）
      ctx.strokeStyle = '#1b1b1f'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        const sw = Math.sin(b.wiggle * 2 + i) * 3;
        ctx.beginPath(); ctx.moveTo(-8, i * 6); ctx.lineTo(-15, i * 7 + sw); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, i * 6); ctx.lineTo(15, i * 7 - sw); ctx.stroke();
      }
      // 头
      ctx.fillStyle = '#1b1b1f';
      ctx.beginPath(); ctx.arc(0, -12, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-2.6, -14, 1.6, 0, Math.PI * 2); ctx.arc(2.6, -14, 1.6, 0, Math.PI * 2); ctx.fill();
      // 壳
      let shell, spot = '#1b1b1f';
      if (b.kind === 'gold') {
        shell = ctx.createRadialGradient(-4, -4, 2, 0, 0, 14);
        shell.addColorStop(0, '#fff3b0'); shell.addColorStop(0.5, '#ffcc33'); shell.addColorStop(1, '#d99a00');
      } else if (b.kind === 'beetle') {
        shell = ctx.createRadialGradient(-4, -4, 2, 0, 0, 14);
        shell.addColorStop(0, '#6b5bd6'); shell.addColorStop(0.5, '#33287a'); shell.addColorStop(1, '#16113a');
      } else {
        shell = ctx.createRadialGradient(-4, -4, 2, 0, 0, 14);
        shell.addColorStop(0, '#ff8a8a'); shell.addColorStop(0.5, '#e8343c'); shell.addColorStop(1, '#a5121b');
      }
      ctx.fillStyle = shell;
      ctx.beginPath(); ctx.ellipse(0, 0, 12, 13, 0, 0, Math.PI * 2); ctx.fill();
      if (b.kind === 'beetle') {
        // 甲虫：一排尖刺，表示撞不得
        ctx.fillStyle = '#d7d2ff';
        for (const [sx, sy] of [[-7, -3], [0, -6], [7, -3], [-6, 5], [6, 5]]) {
          ctx.beginPath(); ctx.moveTo(sx - 2.5, sy + 2); ctx.lineTo(sx, sy - 4); ctx.lineTo(sx + 2.5, sy + 2); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#ff4d6d';
        ctx.beginPath(); ctx.arc(-2.6, -14, 1.4, 0, Math.PI * 2); ctx.arc(2.6, -14, 1.4, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 13); ctx.stroke();
        ctx.fillStyle = spot;
        for (const [sx, sy, r] of [[-5, -4, 2.6], [5, -4, 2.6], [-6, 5, 2.2], [6, 5, 2.2]]) {
          ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.ellipse(-5, -6, 3.5, 2, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // 金瓢虫：周围闪光
      if (b.kind === 'gold' && !b.dead) {
        ctx.save();
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(b.wiggle * 1.5);
        ctx.fillStyle = '#fff6c2';
        starPath(x + 14, b.y - 12, 4, b.wiggle);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawClock(c) {
      const x = LANES[c.lane] + Math.sin(c.swing) * 6;
      ctx.save();
      ctx.translate(x, c.y);
      ctx.rotate(Math.sin(c.swing * 1.3) * 0.25);
      // 光晕
      const halo = ctx.createRadialGradient(0, 0, 6, 0, 0, 30);
      halo.addColorStop(0, 'rgba(255, 255, 220, 0.8)'); halo.addColorStop(1, 'rgba(255, 255, 220, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
      // 铃铛
      ctx.fillStyle = '#ff6f9c';
      ctx.beginPath(); ctx.arc(-10, -12, 6, 0, Math.PI * 2); ctx.arc(10, -12, 6, 0, Math.PI * 2); ctx.fill();
      // 表盘
      ctx.fillStyle = '#ff6f9c';
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, 11.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#13204a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -7); ctx.moveTo(0, 0); ctx.lineTo(5, 2); ctx.stroke();
      // 腿
      ctx.strokeStyle = '#ff6f9c'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-8, 12); ctx.lineTo(-11, 17); ctx.moveTo(8, 12); ctx.lineTo(11, 17); ctx.stroke();
      ctx.restore();
    }

    // 熊猫：抱竹子的背影 + 侧脸，爬的时候手脚交替
    function drawPanda(x, y, rot, sx, sy, alpha = 1, ghost = false) {
      const climb = phase === 'playing' && panda.jumpT === 0 ? Math.sin(scroll / 14) : 0;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(sx * 1.15, sy * 1.15);
      if (ghost) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath(); ctx.ellipse(0, 0, 22, 26, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        return;
      }
      const K = '#1b1b1f';
      // 后腿
      ctx.fillStyle = K;
      ctx.beginPath(); ctx.ellipse(-14, 16 + climb * 3, 8, 11, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(14, 16 - climb * 3, 8, 11, -0.3, 0, Math.PI * 2); ctx.fill();
      // 身体
      const body = ctx.createRadialGradient(-6, -6, 4, 0, 0, 26);
      body.addColorStop(0, '#ffffff'); body.addColorStop(1, '#e6ecf5');
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.ellipse(0, 4, 20, 22, 0, 0, Math.PI * 2); ctx.fill();
      // 前爪抱竹
      ctx.fillStyle = K;
      ctx.beginPath(); ctx.ellipse(-16, -8 - climb * 3, 7, 10, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(16, -8 + climb * 3, 7, 10, 0.5, 0, Math.PI * 2); ctx.fill();
      // 头
      ctx.beginPath(); ctx.arc(-11, -30, 6.5, 0, Math.PI * 2); ctx.arc(11, -30, 6.5, 0, Math.PI * 2); ctx.fill();
      const head = ctx.createRadialGradient(-5, -26, 3, 0, -22, 18);
      head.addColorStop(0, '#ffffff'); head.addColorStop(1, '#e9eef7');
      ctx.fillStyle = head;
      ctx.beginPath(); ctx.arc(0, -22, 15, 0, Math.PI * 2); ctx.fill();
      // 眼圈 + 眼睛（受伤时变成 > <）
      const ouch = invuln > 40;
      ctx.fillStyle = K;
      ctx.beginPath(); ctx.ellipse(-6, -23, 4.6, 5.8, 0.5, 0, Math.PI * 2); ctx.ellipse(6, -23, 4.6, 5.8, -0.5, 0, Math.PI * 2); ctx.fill();
      if (ouch) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-8, -25); ctx.lineTo(-4.5, -23); ctx.lineTo(-8, -21);
        ctx.moveTo(8, -25); ctx.lineTo(4.5, -23); ctx.lineTo(8, -21); ctx.stroke();
      } else {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-5.4, -24.5, 1.7, 0, Math.PI * 2); ctx.arc(6.6, -24.5, 1.7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = K;
      ctx.beginPath(); ctx.ellipse(0, -16.5, 2.6, 1.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255, 143, 179, 0.7)';
      ctx.beginPath(); ctx.arc(-10, -15, 2.4, 0, Math.PI * 2); ctx.arc(10, -15, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawTimeBar() {
      const frac = clamp(timeLeft / 60, 0, 1);
      const x = 16, y = 14, w = W - 32, h = 10;
      ctx.fillStyle = 'rgba(19, 32, 74, 0.12)';
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.fill();
      const low = timeLeft < 10;
      const pulse = low ? 0.6 + 0.4 * Math.sin(elapsed / 4) : 1;
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      if (low) { g.addColorStop(0, '#ff6f9c'); g.addColorStop(1, '#ff9a6a'); }
      else { g.addColorStop(0, '#5fb760'); g.addColorStop(1, '#9be08f'); }
      ctx.globalAlpha = pulse;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(x, y, Math.max(h, w * frac), h, 5); ctx.fill();
      ctx.globalAlpha = 1;
      // 连击
      if (combo >= 2) {
        ctx.textAlign = 'right';
        ctx.font = `600 ${18 + Math.min(combo, 8)}px ${FONT}`;
        ctx.fillStyle = '#e64980';
        ctx.globalAlpha = Math.min(1, comboT / 30);
        ctx.fillText(`连击 ×${combo}`, W - 18, 50);
        ctx.globalAlpha = 1;
      }
    }

    function overlay(title, sub, hint) {
      ctx.fillStyle = 'rgba(19, 32, 74, 0.5)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = `600 34px ${FONT}`;
      ctx.fillText(title, W / 2, H * 0.3);
      if (sub) {
        ctx.font = `500 17px ${FONT}`;
        ctx.fillStyle = '#e6f2ff';
        sub.split('\n').forEach((line, i) => ctx.fillText(line, W / 2, H * 0.3 + 38 + i * 26));
      }
      if (hint) {
        ctx.font = `500 15px ${FONT}`;
        ctx.fillStyle = '#c9d7ff';
        ctx.fillText(hint, W / 2, H * 0.3 + 128);
      }
    }

    function draw() {
      fitDpr();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      if (shake > 0.3) ctx.translate(rand(-shake, shake), rand(-shake, shake));
      drawBackground();
      drawLeaves(false);
      drawStalks();
      for (const c of clocks) drawClock(c);
      for (const b of bugs) if (!b.dead) drawBug(b);
      // 残影
      for (const g of ghosts) drawPanda(g.x, g.y, g.rot, 1, 1, g.life * 0.35, true);
      // 受伤无敌时闪烁
      if (!(invuln > 0 && Math.floor(invuln / 4) % 2 === 0)) drawPanda(panda.x, panda.y, panda.rot, panda.sx, panda.sy);
      for (const b of bugs) if (b.dead) drawBug(b);
      // 粒子
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        if (p.star) { starPath(p.x, p.y, p.size, p.rot); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      drawLeaves(true);
      // 飘字
      for (const q of popups) {
        const k = q.t / 55;
        ctx.globalAlpha = 1 - k * k;
        ctx.textAlign = 'center';
        ctx.font = `600 ${q.big ? 24 : 19}px ${FONT}`;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(19, 32, 74, 0.45)';
        const yy = q.y - q.t * 0.9;
        ctx.strokeText(q.text, q.x, yy);
        ctx.fillStyle = q.color;
        ctx.fillText(q.text, q.x, yy);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      if (flash > 0) {
        ctx.fillStyle = `rgba(255, 80, 120, ${flash * 0.22})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (phase === 'playing') drawTimeBar();

      if (phase === 'ready') {
        overlay('熊猫竹林跳', '点左边 / 右边跳到旁边的竹子\n跳到瓢虫身上把它撞飞，被虫子撞到会扣时间', '点击画面或按 ← → 开始');
        drawLegendRow();
      } else if (phase === 'over') {
        overlay('时间到', `得分 ${score}\n最高 ${best}`, overT > 40 ? '点击画面再来一局' : '');
      }
    }

    function drawLegendRow() {
      const y = H * 0.3 + 178;
      const items = [['lady', '撞飞得分'], ['gold', '稀有高分'], ['beetle', '只能躲开'], ['clock', '加 5 秒']];
      items.forEach(([k, label], i) => {
        const x = 62 + i * 92;
        if (k === 'clock') {
          ctx.save();
          ctx.translate(x - LANES[0], 0);
          drawClock({ lane: 0, y, swing: Math.PI / 2 });
          ctx.restore();
        } else {
          drawBug({ kind: k, lane: 0, y, wiggle: 0, dead: true, x, rot: Math.PI });
        }
        ctx.fillStyle = '#fff';
        ctx.font = `500 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y + 36);
      });
    }

    // ======================== 循环：固定 60Hz，只在弹窗打开时运行 ========================
    const STEP = 1000 / 60;
    let lastTime = performance.now(), acc = 0;
    function isOpen() { return !window.__gameModal || window.__gameModal.current() === 'bamboo'; }
    function loop(now) {
      requestAnimationFrame(loop);
      const dt = Math.max(0, Math.min(100, now - lastTime));
      lastTime = now;
      if (!isOpen()) { acc = 0; return; }
      acc += dt;
      while (acc >= STEP) { update(); acc -= STEP; }
      draw();
    }

    reset();
    requestAnimationFrame(loop);

    window.__gameHooks = window.__gameHooks || {};
    window.__gameHooks.bamboo = (action) => {
      if (action === 'close' && phase === 'playing' && score > best) {
        best = score;
        try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
      }
      if (action === 'open' || action === 'close') reset();
    };
  });
})();
