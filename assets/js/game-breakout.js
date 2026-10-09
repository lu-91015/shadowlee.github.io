/**
 * 熊猫打砖块 - 经典 Breakout
 * 球是一只熊猫，挡板是一根竹子；每行有一块“熊猫砖”，打掉得 30 分（普通砖 10 分）。球碰到砖块和挡板会迸出星星。
 * 关卡越多，砖块行数越多，球速越快
 */
(function () {
  'use strict';

  window.addEventListener('load', () => {
    const canvas = document.getElementById('breakout-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('breakout-score');
    const levelEl = document.getElementById('breakout-level');
    const livesEl = document.getElementById('breakout-lives');
    const bestEl = document.getElementById('breakout-best');
    const GM = window.__gameModal || {};
    const FONT = GM.FONT || 'sans-serif';
    const setNum = (el, v) => { if (!el) return; if (GM.setNum) GM.setNum(el, v); else el.textContent = v; };

    const W = canvas.width, H = canvas.height;
    const PADDLE_W_BASE = 96, PADDLE_H = 16, PADDLE_Y = H - 50;
    const BALL_R = 11, BALL_SPEED_BASE = 4.4;
    const BRICK_PTS = 10, PANDA_PTS = 30;
    const BRICK_COLS = 6, BRICK_H = 36, BRICK_GAP = 6;
    const MARGIN_X = 16, MARGIN_TOP = 70;
    const BEST_KEY = 'breakout-best';

    // 砖块颜色：从樱花粉过渡到站点主题蓝
    const colors = ['#ff8fb3', '#f59ad0', '#d6a4f0', '#aab2ff', '#7aa7ff', '#5b8cf5', '#2f6fed', '#3a5fd0', '#2e4bb0'];

    let state = 'ready'; // ready | playing | won | over
    let level = 1, score = 0, lives = 3, best = 0;
    let paddle = { x: W / 2, w: PADDLE_W_BASE };
    let ball = null;
    let bricks = [];
    let rafId;
    let particles = [];   // 星星特效
    let popups = [];      // “+30” 飘字


    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function readBest() {
      try { best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (e) { best = 0; }
    }

    function saveBest() {
      if (score > best) { best = score; try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {} }
    }

    function brickRows() { return clamp(3 + level, 4, 9); }

    function buildBricks() {
      const rows = brickRows();
      const totalGapX = (BRICK_COLS - 1) * BRICK_GAP;
      const brickW = (W - MARGIN_X * 2 - totalGapX) / BRICK_COLS;
      bricks = [];
      for (let r = 0; r < rows; r++) {
        const pandaCol = Math.floor(Math.random() * BRICK_COLS); // 每行一块熊猫砖
        for (let c = 0; c < BRICK_COLS; c++) {
          bricks.push({
            panda: c === pandaCol,
            x: MARGIN_X + c * (brickW + BRICK_GAP),
            y: MARGIN_TOP + r * (BRICK_H + BRICK_GAP),
            w: brickW,
            h: BRICK_H,
            color: colors[r % colors.length],
            broken: false,
          });
        }
      }
    }

    function resetGame() {
      level = 1;
      score = 0;
      lives = 3;
      particles = [];
      popups = [];
      state = 'ready';
      buildBricks();
      resetBall();
      draw();
      updateScore();
    }

    function resetBall() {
      paddle.w = Math.max(56, PADDLE_W_BASE - level * 4);
      paddle.x = clamp(paddle.x, paddle.w / 2, W - paddle.w / 2);
      ball = {
        x: paddle.x,
        y: PADDLE_Y - BALL_R - 4,
        r: BALL_R,
        spin: 0,
        vx: 0,
        vy: 0,
        speed: BALL_SPEED_BASE + level * 0.35,
      };
    }

    function launchBall() {
      if (state === 'over' || state === 'won') { resetGame(); state = 'ready'; }
      if (ball && ball.vx === 0 && ball.vy === 0) {
        const angle = -Math.PI / 2 + (Math.random() * 0.4 - 0.2);
        ball.vx = Math.cos(angle) * ball.speed;
        ball.vy = Math.sin(angle) * ball.speed;
        state = 'playing';
      } else if (state === 'ready') {
        state = 'playing';
      }
    }

    function circleRectHit(b, r) {
      const cx = clamp(b.x, r.x, r.x + r.w);
      const cy = clamp(b.y, r.y, r.y + r.h);
      const dx = b.x - cx;
      const dy = b.y - cy;
      return (dx * dx + dy * dy) <= (b.r * b.r);
    }

    function reflectOffBrick(brick) {
      const cx = clamp(ball.x, brick.x, brick.x + brick.w);
      const cy = clamp(ball.y, brick.y, brick.y + brick.h);
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      if (Math.abs(dx) > Math.abs(dy)) {
        ball.vx *= -1;
        ball.x += Math.sign(dx) * (ball.r + 1);
      } else {
        ball.vy *= -1;
        ball.y += Math.sign(dy) * (ball.r + 1);
      }
    }

    // 星星特效：在 (x, y) 迸出 n 颗小星星
    const STAR_COLORS = ['#fff6c2', '#ffd76a', '#ffffff', '#ffb3c7', '#bcd2ff'];
    function sparkle(x, y, n, power = 1) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = (1.2 + Math.random() * 2.2) * power;
        particles.push({
          x, y,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6,
          size: 4.5 + Math.random() * 4.5,
          rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
          life: 1, decay: 0.016 + Math.random() * 0.012,
          color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        });
      }
    }

    function burst(b) {
      sparkle(b.x + b.w / 2, b.y + b.h / 2, b.panda ? 16 : 8, b.panda ? 1.3 : 1);
    }

    function stepFx() {
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.vx *= 0.98;
        p.rot += p.vr; p.life -= p.decay;
      }
      particles = particles.filter(p => p.life > 0);
      for (const q of popups) { q.t += 1; q.y -= 0.6; }
      popups = popups.filter(q => q.t < 50);
    }

    function starPath(x, y, r, rot) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r : r * 0.45;
        const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    function update() {
      stepFx();
      if (state !== 'playing') return;

      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.spin += ball.vx * 0.03; // 熊猫随左右速度打滚

      // 墙壁
      if (ball.x - ball.r <= 0) { ball.x = ball.r; ball.vx *= -1; }
      if (ball.x + ball.r >= W) { ball.x = W - ball.r; ball.vx *= -1; }
      if (ball.y - ball.r <= 0) { ball.y = ball.r; ball.vy *= -1; }

      // 挡板
      if (ball.vy > 0
          && ball.y + ball.r >= PADDLE_Y - PADDLE_H / 2 && ball.y - ball.r <= PADDLE_Y + PADDLE_H / 2
          && ball.x + ball.r >= paddle.x - paddle.w / 2 && ball.x - ball.r <= paddle.x + paddle.w / 2) {
        const t = clamp((ball.x - (paddle.x - paddle.w / 2)) / paddle.w, 0, 1); // 0..1
        const angle = -Math.PI * 0.85 + t * Math.PI * 0.7; // 范围约 150°
        ball.vx = Math.cos(angle) * ball.speed;
        ball.vy = Math.sin(angle) * ball.speed;
        ball.y = PADDLE_Y - PADDLE_H / 2 - ball.r - 1;
        sparkle(ball.x, PADDLE_Y - PADDLE_H / 2, 6, 0.8);
      }

      // 砖块
      for (const b of bricks) {
        if (b.broken) continue;
        if (circleRectHit(ball, b)) {
          b.broken = true;
          const pts = b.panda ? PANDA_PTS : BRICK_PTS;
          score += pts;
          burst(b);
          if (b.panda) popups.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, t: 0, text: `+${pts}` });
          reflectOffBrick(b);
          updateScore();
          break;
        }
      }

      // 掉底
      if (ball.y - ball.r > H) {
        lives--;
        if (lives <= 0) {
          state = 'over';
          saveBest();
          // game over
        } else {
          resetBall();
          state = 'ready';
        }
        return;
      }

      // 过关
      if (bricks.every(b => b.broken)) {
        level++;
        buildBricks();
        resetBall();
        state = 'ready';
        // next level ready
      }
    }

    function updateScore() {
      setNum(scoreEl, score);
      setNum(levelEl, level);
      setNum(livesEl, lives);
      setNum(bestEl, Math.max(best, score));
    }

    // 预先生成星空背景
    const stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + 0.3, a: Math.random() * 0.5 + 0.2,
    }));

    function overlay(title, sub, hint, dim = 0.62) {
      ctx.fillStyle = `rgba(10, 16, 40, ${dim})`;
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = `600 34px ${FONT}`;
      ctx.fillText(title, W / 2, H / 2 + 10);
      if (sub) {
        ctx.font = `500 18px ${FONT}`;
        ctx.fillStyle = '#c9d7ff';
        ctx.fillText(sub, W / 2, H / 2 + 44);
      }
      if (hint) {
        ctx.font = `500 15px ${FONT}`;
        ctx.fillStyle = '#8fa3cc';
        ctx.fillText(hint, W / 2, H / 2 + 76);
      }
    }

    // 熊猫砖：白底圆角 + 🐼（和“合成熊猫”卡片上的图标一样）+ 粉色描边
    function drawPandaBrick(b) {
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#ff8fb3';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = `${Math.round(b.h * 0.72)}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐼', b.x + b.w / 2, b.y + b.h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }

    // 挡板：一根横放的竹子
    function drawBamboo() {
      const x = paddle.x - paddle.w / 2, y = PADDLE_Y - PADDLE_H / 2, w = paddle.w, h = PADDLE_H;
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#9be08f');
      g.addColorStop(0.45, '#5fb760');
      g.addColorStop(1, '#2f6e3b');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 7);
      ctx.fill();
      // 竹节
      ctx.fillStyle = '#285c32';
      const nodes = Math.max(2, Math.round(w / 32));
      for (let i = 1; i < nodes; i++) {
        const nx = x + (w * i) / nodes;
        ctx.fillRect(nx - 1.5, y + 1, 3, h - 2);
      }
      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x + 6, y + 3, w - 12, 2);
      // 两头各一片竹叶
      ctx.fillStyle = '#7cc576';
      ctx.beginPath(); ctx.ellipse(x - 4, y + 2, 10, 3.5, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + w + 4, y + 2, 10, 3.5, 0.6, 0, Math.PI * 2); ctx.fill();
    }

    // 球：一只会打滚的熊猫脸
    function drawPanda(cx, cy, r, spin) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(spin);
      ctx.shadowColor = 'rgba(122, 167, 255, 0.8)';
      ctx.shadowBlur = 10;
      // 耳朵
      ctx.fillStyle = '#1b1b1f';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'; // 浅色描边，深色背景上也看得见耳朵
      ctx.lineWidth = 1.5;
      for (const ex of [-r * 0.68, r * 0.68]) {
        ctx.beginPath(); ctx.arc(ex, -r * 0.7, r * 0.38, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      // 脸
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // 黑眼圈
      ctx.fillStyle = '#1b1b1f';
      ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.05, r * 0.24, r * 0.32, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 0.38, -r * 0.05, r * 0.24, r * 0.32, -0.5, 0, Math.PI * 2); ctx.fill();
      // 眼睛高光
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-r * 0.34, -r * 0.1, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.34, -r * 0.1, r * 0.09, 0, Math.PI * 2); ctx.fill();
      // 鼻子
      ctx.fillStyle = '#1b1b1f';
      ctx.beginPath(); ctx.ellipse(0, r * 0.32, r * 0.13, r * 0.09, 0, 0, Math.PI * 2); ctx.fill();
      // 腮红
      ctx.fillStyle = 'rgba(255, 143, 179, 0.7)';
      ctx.beginPath(); ctx.arc(-r * 0.6, r * 0.38, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.6, r * 0.38, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function draw() {
      // 背景：与站点一致的深蓝夜空
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1b2a5c'); g.addColorStop(1, '#0d1533');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (const st of stars) {
        ctx.globalAlpha = st.a;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 砖块
      for (const b of bricks) {
        if (b.broken) continue;
        if (b.panda) { drawPandaBrick(b); continue; }
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 7);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath();
        ctx.roundRect(b.x + 4, b.y + 3, b.w - 8, 5, 3);
        ctx.fill();
      }

      // 星星 + 飘字
      ctx.shadowColor = 'rgba(255, 230, 150, 0.8)';
      ctx.shadowBlur = 6;
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        starPath(p.x, p.y, p.size * (0.6 + 0.4 * p.life), p.rot);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.font = `600 18px ${FONT}`;
      for (const q of popups) {
        ctx.globalAlpha = 1 - q.t / 50;
        ctx.fillStyle = '#ff8fb3';
        ctx.fillText(q.text, q.x, q.y);
      }
      ctx.globalAlpha = 1;

      drawBamboo();
      if (ball) drawPanda(ball.x, ball.y, ball.r, ball.spin);

      if (state === 'ready') {
        overlay(`第 ${level} 关`, `熊猫砖 ${PANDA_PTS} 分，普通砖 ${BRICK_PTS} 分`, '点击画面或按空格发球', 0.4);
      } else if (state === 'over') {
        overlay('游戏结束', `得分 ${score}　最高 ${best}`, '点击画面再来一局');
      }
    }

    // 固定 60Hz 逻辑步长：高刷屏（120/144Hz）下速度不再变快
    const STEP = 1000 / 60;
    let lastTime = performance.now(), acc = 0;
    function isOpen() { return !window.__gameModal || window.__gameModal.current() === 'breakout'; }
    function loop(now) {
      rafId = requestAnimationFrame(loop);
      const dt = Math.max(0, Math.min(100, now - lastTime));
      lastTime = now;
      if (!isOpen()) { acc = 0; return; }
      acc += dt;
      while (acc >= STEP) { update(); acc -= STEP; }
      draw();
      updateScore();
    }

    function movePaddle(clientX) {
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) * (W / rect.width);
      paddle.x = clamp(x, paddle.w / 2, W - paddle.w / 2);
      if (state === 'ready' && ball) {
        ball.x = paddle.x;
        ball.y = PADDLE_Y - BALL_R - 4;
      }
    }

    canvas.addEventListener('mousemove', e => movePaddle(e.clientX));
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches[0]) movePaddle(e.touches[0].clientX);
    }, { passive: false });
    canvas.addEventListener('click', onStartBtn);
    window.addEventListener('keydown', e => {
      if (window.__gameModal && !window.__gameModal.wantsKeys('breakout', e)) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onStartBtn();
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const step = (e.key === 'ArrowLeft' ? -1 : 1) * 24;
        movePaddle((paddle.x / W) * canvas.getBoundingClientRect().width + step + canvas.getBoundingClientRect().left);
      }
    });

    function onStartBtn() {
      if (state === 'ready') launchBall();
      else if (state === 'over' || state === 'won') resetGame();
    }

    readBest();
    resetGame();
    updateScore();
    rafId = requestAnimationFrame(loop);

    if (window.__gameHooks) {
      window.__gameHooks.breakout = (action) => {
        if (action === 'open') resetGame();
        if (action === 'close' && state === 'playing') { saveBest(); }
      };
    }
  });
})();