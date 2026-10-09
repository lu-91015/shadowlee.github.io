/**
 * 李豆沙 Flappy - 熊猫版 Flappy Bird
 * 小鸟使用「魔法熊猫」表情，难度随得分逐步提升
 */
(function () {
  'use strict';
  const base = (window.SITE_BASE || '/').replace(/\/$/, '');

  window.addEventListener('load', () => {
    const canvas = document.getElementById('flappy-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const GM = window.__gameModal || {};
    const FONT = GM.FONT || 'sans-serif';
    const setNum = (el, v) => { if (!el) return; if (GM.setNum) GM.setNum(el, v); else el.textContent = v; };
    const scoreEl = document.getElementById('flappy-score');
    const bestEl = document.getElementById('flappy-best');

    // 小鸟图片：优先用「魔法熊猫」，否则取第一个表情
    const meta = window.EMOTE_META || { items: [] };
    const all = meta.items.filter(i => i.file);
    const birdItem = all.find(i => /魔法|巫师|小巫师/.test(i.name || '')) || all[0];
    let birdImg = null;
    if (birdItem) {
      birdImg = new Image();
      birdImg.src = `${base}/assets/images/emotes/${birdItem.file}`;
    }

    const GROUND_H = 60;
    const BIRD_X = 80;
    const BIRD_R = 32; // 比原来更大
    const GRAVITY = 0.35;
    const JUMP = -6.5;
    const MAX_FALL = 7.5;        // 最大下坠速度，避免越掉越快来不及反应
    const EASE_FRAMES = 180;     // 开局约 3 秒内重力从 40% 慢慢加到 100%（第一根竹子差不多这时到）
    const EASE_START = 0.4;
    const PIPE_W = 60;
    const GAP_BASE = 190; // 初始缺口更大，更简单
    const PIPE_SPEED_BASE = 2.0;
    const PIPE_INTERVAL_BASE = 115; // 管道间隔更大

    const HIT_R = BIRD_R * 0.78; // 碰撞半径略小于图片，表情图四周有留白

    let bird, pipes, score, best, frame, running, gameOver, rafId, nextPipeIn;
    try { best = parseInt(localStorage.getItem('flappy_best') || '0', 10) || 0; } catch (e) { best = 0; }

    function reset() {
      bird = { y: H / 2, vy: 0, rot: 0 };
      pipes = [];
      score = 0;
      frame = 0;
      setNum(scoreEl, 0);
      setNum(bestEl, best);
      nextPipeIn = 60; // 开局约 1 秒后出第一根管道
      running = true;
      gameOver = false;
    }

    function jump() {
      if (gameOver) { reset(); return; }
      if (!running) return;
      bird.vy = JUMP;
    }

    // 难度随得分越来越高
    function difficulty() {
      return {
        speed: PIPE_SPEED_BASE + score * 0.06,
        gap: Math.max(120, GAP_BASE - score * 2.5),
        interval: Math.max(70, PIPE_INTERVAL_BASE - score * 1.5),
      };
    }

    function spawnPipe() {
      const d = difficulty();
      const margin = 60;
      const gapTop = margin + Math.random() * (H - GROUND_H - d.gap - margin * 2);
      pipes.push({ x: W, gapTop, gap: d.gap });
    }

    function rectHit(bx, by, br, rx, ry, rw, rh) {
      const cx = Math.max(rx, Math.min(bx, rx + rw));
      const cy = Math.max(ry, Math.min(by, ry + rh));
      const dx = bx - cx, dy = by - cy;
      return (dx * dx + dy * dy) < (br * br);
    }

    function update() {
      if (!running || gameOver) return;
      frame++;
      const ease = Math.min(1, EASE_START + (1 - EASE_START) * (frame / EASE_FRAMES));
      bird.vy = Math.min(MAX_FALL, bird.vy + GRAVITY * ease);
      bird.y += bird.vy;
      bird.rot = Math.max(-0.5, Math.min(1.2, bird.vy / 12));

      const d = difficulty();
      // 用倒计时生成管道：间隔随难度变化时不会出现两根管道挤在一起
      if (--nextPipeIn <= 0) { spawnPipe(); nextPipeIn = Math.round(d.interval); }

      for (const p of pipes) {
        p.x -= d.speed;
        // 计分：鸟越过管道中心
        if (!p.passed && p.x + PIPE_W < BIRD_X - BIRD_R) {
          p.passed = true;
          score++;
          setNum(scoreEl, score);
        }
        // 碰撞
        const hitTop = rectHit(BIRD_X, bird.y, HIT_R, p.x, 0, PIPE_W, p.gapTop);
        const hitBottom = rectHit(BIRD_X, bird.y, HIT_R, p.x, p.gapTop + p.gap, PIPE_W, H - GROUND_H - (p.gapTop + p.gap));
        if (hitTop || hitBottom) die();
      }
      pipes = pipes.filter(p => p.x + PIPE_W > -10);

      // 地面 / 天花板
      if (bird.y + HIT_R >= H - GROUND_H) { bird.y = H - GROUND_H - HIT_R; die(); }
      if (bird.y - BIRD_R <= 0) { bird.y = BIRD_R; bird.vy = 0; }
    }

    function die() {
      if (gameOver) return;
      gameOver = true;
      running = false;
      if (score > best) { best = score; try { localStorage.setItem('flappy_best', String(best)); } catch (e) {} }
      setNum(bestEl, best);
    }

    // ---- 场景：月夜竹林（小鸟是骑扫帚的魔法熊猫） ----
    const stars = Array.from({ length: 45 }, () => ({
      x: Math.random() * W, y: Math.random() * (H - GROUND_H - 120), r: Math.random() * 1.4 + 0.4, t: Math.random() * 6,
    }));
    // 远处山丘轮廓，随时间缓慢平移
    let hillOffset = 0;

    function drawBamboo(x, y, h, fromTop) {
      if (h <= 0) return;
      const nodeGap = 46;
      // 竹竿
      const g = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
      g.addColorStop(0, '#3f8f4a');
      g.addColorStop(0.35, '#7cc576');
      g.addColorStop(1, '#2f6e3b');
      ctx.fillStyle = g;
      ctx.fillRect(x + 6, y, PIPE_W - 12, h);
      // 竹节
      ctx.fillStyle = '#285c32';
      const startY = fromTop ? y + h - 10 : y + 10;
      const dir = fromTop ? -1 : 1;
      for (let ny = startY; fromTop ? ny > y : ny < y + h; ny += dir * nodeGap) {
        ctx.fillRect(x + 4, ny - 2, PIPE_W - 8, 5);
      }
      // 竹子开口端的一圈
      const capY = fromTop ? y + h - 14 : y;
      ctx.fillStyle = '#5aa95c';
      ctx.beginPath();
      ctx.roundRect(x, capY, PIPE_W, 14, 5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x + 8, capY + 3, 8, 8);
      // 一片小竹叶
      ctx.fillStyle = '#7cc576';
      ctx.beginPath();
      const ly = fromTop ? y + h - 40 : y + 40;
      ctx.ellipse(x + PIPE_W + 8, ly, 13, 4, fromTop ? 0.5 : -0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawHills() {
      ctx.fillStyle = '#1a2a5e';
      ctx.beginPath();
      ctx.moveTo(0, H - GROUND_H);
      for (let x = 0; x <= W; x += 10) {
        const y = H - GROUND_H - 46 - Math.sin((x + hillOffset) / 70) * 16 - Math.sin((x + hillOffset) / 31) * 6;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H - GROUND_H);
      ctx.closePath();
      ctx.fill();
    }

    function overlay(title, sub, hint) {
      ctx.fillStyle = 'rgba(10, 16, 40, 0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = `600 34px ${FONT}`;
      ctx.fillText(title, W / 2, H / 2 - 10);
      if (sub) {
        ctx.font = `500 18px ${FONT}`;
        ctx.fillStyle = '#c9d7ff';
        ctx.fillText(sub, W / 2, H / 2 + 24);
      }
      if (hint) {
        ctx.font = `500 15px ${FONT}`;
        ctx.fillStyle = '#8fa3cc';
        ctx.fillText(hint, W / 2, H / 2 + 54);
      }
    }

    function draw() {
      // 夜空
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0f1a44');
      g.addColorStop(0.7, '#2a3f86');
      g.addColorStop(1, '#4a5fa8');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      const now = performance.now() / 1000;
      for (const st of stars) {
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(now * 1.6 + st.t);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 月亮
      // 月牙：外圆减去偏移的内圆（用裁剪 + evenodd，不会留下深色圆盘）
      ctx.save();
      ctx.beginPath(); ctx.arc(W - 78, 92, 30, 0, Math.PI * 2); ctx.clip();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(W - 64, 84, 26, 0, Math.PI * 2);
      ctx.fillStyle = '#fff6d8';
      ctx.fill('evenodd');
      ctx.restore();

      if (running && !gameOver) hillOffset += 0.4;
      drawHills();

      // 竹子
      for (const p of pipes) {
        drawBamboo(p.x, 0, p.gapTop, true);
        const bottomY = p.gapTop + p.gap;
        drawBamboo(p.x, bottomY, H - GROUND_H - bottomY, false);
      }

      // 地面
      ctx.fillStyle = '#13204a';
      ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
      ctx.fillStyle = '#2b4a8a';
      ctx.fillRect(0, H - GROUND_H, W, 4);

      // 小鸟
      ctx.save();
      ctx.translate(BIRD_X, bird.y);
      ctx.rotate(bird.rot);
      ctx.scale(-1, 1); // 原图朝左，左右镜像后朝右飞
      if (birdImg && birdImg.complete && birdImg.naturalWidth) {
        const s = BIRD_R * 2;
        ctx.drawImage(birdImg, -s / 2, -s / 2, s, s);
      } else {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#13204a';
        ctx.beginPath(); ctx.arc(-BIRD_R / 2, -BIRD_R / 3, 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      // 大号分数
      if (running || gameOver) {
        ctx.textAlign = 'center';
        ctx.font = `600 52px ${FONT}`;
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(15, 26, 68, 0.6)';
        ctx.strokeText(String(score), W / 2, 76);
        ctx.fillStyle = '#fff';
        ctx.fillText(String(score), W / 2, 76);
      }

      if (gameOver) {
        overlay('游戏结束', `得分 ${score}　最高 ${best}`, '点击画面或按空格再来');
      } else if (!running) {
        overlay('李豆沙 Flappy', null, '点击画面或按空格起飞');
      }
    }

    // 固定 60Hz 逻辑步长：高刷屏下速度不再变快
    const STEP = 1000 / 60;
    let lastTime = performance.now(), acc = 0;
    function isOpen() { return !window.__gameModal || window.__gameModal.current() === 'flappy'; }
    function loop(now) {
      rafId = requestAnimationFrame(loop);
      const dt = Math.max(0, Math.min(100, now - lastTime));
      lastTime = now;
      if (!isOpen()) { acc = 0; return; }
      acc += dt;
      while (acc >= STEP) { update(); acc -= STEP; }
      draw();
    }

    canvas.addEventListener('click', () => {
      if (!running && !gameOver) reset();
      jump();
    });
    window.addEventListener('keydown', (e) => {
      if (window.__gameModal && !window.__gameModal.wantsKeys('flappy', e)) return;
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!running && !gameOver) reset();
        jump();
      }
    });

    reset();
    running = false; // 等待第一次点击开始
    rafId = requestAnimationFrame(loop);

    if (window.__gameHooks) {
      window.__gameHooks.flappy = (action) => {
        if (action === 'close' && running && !gameOver) die(); // 中途关闭也记录最高分
        if (action === 'open' || action === 'close') { reset(); running = false; }
      };
    }
  });
})();