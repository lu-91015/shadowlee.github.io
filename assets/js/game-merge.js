/**
 * 合成熊猫 - 基于开源 suikagame (MIT) 改造
 * 物理掉落 + 相同表情合并
 */
(function () {
  const base = (window.SITE_BASE || '/').replace(/\/$/, '');

  /**
   * 每局随机挑等级用的表情，并排除“长得太像”的：
   *  - 只用非 gif（canvas 只画 gif 第一帧，几张 gif 第一帧几乎一样）
   *  - 同名编号变体算相似，例如「妈妈（1）」和「妈妈（2）」
   *  - 图像相似度：按球里实际显示的正方形裁切，算 64 位 dHash（轮廓）+ 4×4 色块（配色），
   *    dHash 差 ≤ 14 位，或差 ≤ 19 位且配色接近，就算相似（比离线校准的 12 / 16 多留了一点余量，
   *    因为浏览器缩图和离线算的有细微差别）。表情库里有同一张图换名重复上传的，也会被排除
   *  - 大半是白底文字的截图（近白像素 > 76%）不用，裁成圆以后看不清
   * 阈值是用站内 146 张非 gif 表情离线校准的：模拟 2000 局都能挑满 11 张，平均只需检查约 12 张图。
   * 特征算过一次会缓存，图片也会被浏览器缓存，第二局开始几乎不用再下载。
   */
  const LevelPicker = (() => {
    const cache = new Map();   // file -> Promise<{ img, dh, grid, white } | null>
    const cv = document.createElement('canvas');
    const cx = cv.getContext('2d', { willReadFrequently: true });

    function cropRect(img) {
      const iw = img.naturalWidth, ih = img.naturalHeight, side = Math.min(iw, ih);
      return [(iw - side) / 2, ih > iw ? (ih - side) * 0.3 : (ih - side) / 2, side, side];
    }
    function sample(img, w, h) {
      // 先缩到 64×64 再缩小，避免大图直接缩成几个像素时取样太粗
      cv.width = 64; cv.height = 64;
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(img, ...cropRect(img), 0, 0, 64, 64);
      if (w === 64) return cx.getImageData(0, 0, 64, 64).data;
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const tc = tmp.getContext('2d', { willReadFrequently: true });
      tc.imageSmoothingQuality = 'high';
      tc.drawImage(cv, 0, 0, w, h);
      return tc.getImageData(0, 0, w, h).data;
    }
    const gray = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

    function features(item) {
      if (cache.has(item.file)) return cache.get(item.file);
      const p = new Promise((resolve) => {
        const img = new Image();
        const done = (ok) => {
          if (!ok) return resolve(null);
          try {
            const d9 = sample(img, 9, 8);
            const dh = [];
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) dh.push(gray(d9, (r * 9 + c) * 4) > gray(d9, (r * 9 + c + 1) * 4) ? 1 : 0);
            const d4 = sample(img, 4, 4);
            const grid = [];
            for (let k = 0; k < 16; k++) grid.push(d4[k * 4], d4[k * 4 + 1], d4[k * 4 + 2]);
            const d32 = sample(img, 32, 32);
            let white = 0;
            for (let k = 0; k < 1024; k++) if (gray(d32, k * 4) > 235) white++;
            resolve({ img, dh, grid, white: white / 1024 });
          } catch (e) {
            resolve({ img, dh: null, grid: null, white: 0 });   // 读不了像素就当作不相似
          }
        };
        img.onload = () => done(true);
        img.onerror = () => done(false);
        setTimeout(() => done(img.complete && img.naturalWidth > 0), 6000);
        img.src = `${base}/assets/images/emotes/${item.file}`;
      });
      cache.set(item.file, p);
      return p;
    }

    const baseName = (n) => String(n || '').replace(/\s*[（(]\d+[）)]\s*[！!]?$/, '');
    function similar(a, b) {
      if (baseName(a.name) && baseName(a.name) === baseName(b.name)) return true;
      if (!a.f.dh || !b.f.dh) return false;
      let ham = 0;
      for (let k = 0; k < 64; k++) if (a.f.dh[k] !== b.f.dh[k]) ham++;
      let sq = 0;
      for (let k = 0; k < 48; k++) sq += (a.f.grid[k] - b.f.grid[k]) ** 2;
      const col = Math.sqrt(sq / 16);
      return ham <= 14 || (ham <= 19 && col <= 30);
    }

    async function pick(n) {
      const items = ((window.EMOTE_META || {}).items || []).filter(i => i.file && !/\.gif$/i.test(i.file));
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      const chosen = [], skipped = [];
      // 按随机顺序逐张检查；每次并行预取后面几张，减少等待
      for (let i = 0; i < items.length && chosen.length < n; i++) {
        for (let k = 1; k <= 4 && i + k < items.length; k++) features(items[i + k]);
        const f = await features(items[i]);
        if (!f) continue;
        const cand = { file: items[i].file, name: items[i].name, img: f.img, f };
        if (f.white > 0.76 || chosen.some(c => similar(c, cand))) { skipped.push(cand); continue; }
        chosen.push(cand);
      }
      // 极端情况（表情太少）：放宽条件，用被跳过的补齐
      while (chosen.length < n && skipped.length) chosen.push(skipped.shift());
      while (chosen.length < n) chosen.push({ file: '', name: '', img: null });
      return chosen;
    }

    return { pick };
  })();

  const gameLogger = {
    info: (msg) => console.log('[合成熊猫]', msg),
    warning: (msg) => console.warn('[合成熊猫]', msg),
    error: (msg) => console.error('[合成熊猫]', msg)
  };

  class PandaMergeGame {
    constructor(canvasId = 'merge-canvas') {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) {
        gameLogger.error('Canvas not found: ' + canvasId);
        return;
      }
      this.ctx = this.canvas.getContext('2d');
      const GM = window.__gameModal || {};
      this.FONT = GM.FONT || 'sans-serif';
      this.setNum = (el, v) => { if (!el) return; if (GM.setNum) GM.setNum(el, v); else el.textContent = v; };
      this.scoreEl = document.getElementById('merge-score');
      this.bestEl = document.getElementById('merge-best');
      this.nextEl = document.getElementById('merge-next');

      // 11 个等级的外观（大小 / 描边色 / 分数）固定；用哪张表情每局随机挑，见 pickLevelImages()
      this.emoteTypes = Array.from({ length: 11 }, (_, idx) => ({
        radius: [20, 25, 32, 40, 50, 62, 76, 92, 110, 132, 158][idx],
        // 每一级的描边色：从樱花粉渐变到主题蓝，再到深蓝（最大级）
        color: ['#ffb3c7', '#ff8fb3', '#f59ad0', '#d6a4f0', '#b3a8ff', '#8fb0ff', '#6f9bff', '#4f86f7', '#2f6fed', '#2353c9', '#13204a'][idx],
        points: idx + 1,
        img: null,
        file: '',
      }));
      this.levelsReady = false;
      this.pickToken = 0;

      this.fruits = [];
      this.nextFruit = null;
      this.nextFruitX = this.canvas.width / 2;
      this.score = 0;
      try {
        this.highScore = parseInt(localStorage.getItem('panda_merge_high_score') || '0', 10) || 0;
      } catch (e) { this.highScore = 0; }
      this.lastDropTime = 0;
      this.DROP_COOLDOWN = 450;   // 两次掉落之间的最短间隔（毫秒）
      this.OVER_FRAMES = 90;      // 球在危险线上方停留约 1.5 秒才判负
      this.gameOver = false;
      this.mergeEffects = [];
      this.lastFrameTime = 0;
      this.isPaused = false;

      this.gravity = 0.2;
      this.friction = 0.5;
      this.containerWidth = this.canvas.width;
      this.containerHeight = this.canvas.height;
      this.containerLeft = 0;
      this.containerRight = this.canvas.width;
      this.containerBottom = this.canvas.height;
      this.dropZoneHeight = 100;

      this.setupEventListeners();
      this.init(false);   // 页面加载时不去挑图，第一次打开游戏时才挑（省流量）

      this.STEP = 1000 / 60;      // 固定 60Hz 物理步长，高刷屏下速度不变
      this.acc = 0;
      this.lastFrameTime = performance.now();
      this.boundLoop = this.gameLoop.bind(this);
      requestAnimationFrame(this.boundLoop);
      gameLogger.info('游戏初始化完成');
    }

    // 每局随机挑 11 张互不相似的表情（见文件顶部 LevelPicker）
    pickLevelImages() {
      const token = ++this.pickToken;
      this.levelsReady = false;
      LevelPicker.pick(11).then(picked => {
        if (token !== this.pickToken) return;   // 期间又开了新局，丢弃
        picked.forEach((p, i) => { this.emoteTypes[i].img = p.img; this.emoteTypes[i].file = p.file; });
        this.levelsReady = true;
        this.updateNextHud();
        gameLogger.info('本局表情：' + picked.map(p => p.name).join(' / '));
      });
    }

    setupEventListeners() {
      const aim = (e) => {
        if (this.gameOver || !this.nextFruit || this.isPaused) return;
        const rect = this.canvas.getBoundingClientRect();
        this.nextFruitX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        this.nextFruitX = Math.max(
          this.nextFruit.radius,
          Math.min(this.containerWidth - this.nextFruit.radius, this.nextFruitX)
        );
        this.nextFruit.x = this.nextFruitX;
      };
      // pointer 事件同时覆盖鼠标和触屏：手指按下 / 拖动时也能瞄准
      this.canvas.addEventListener('pointermove', aim);
      this.canvas.addEventListener('pointerdown', aim);

      this.canvas.addEventListener('click', () => {
        if (this.gameOver) {
          this.init();
        } else if (this.isPaused) {
          this.togglePause();
        } else {
          this.dropFruit();
        }
      });

      window.addEventListener('keydown', (e) => {
        if (window.__gameModal && !window.__gameModal.wantsKeys('merge', e)) return;
        if (e.key === 'p' || e.key === 'P') {
          this.togglePause();
        }
      });

      window.addEventListener('blur', () => {
        if (!this.isOpen()) return;
        if (!this.gameOver && !this.isPaused) {
          this.togglePause();
        }
      });
    }

    init(pick = true) {
      if (pick) this.pickLevelImages();
      this.score = 0;
      this.fruits = [];
      this.gameOver = false;
      this.mergeEffects = [];
      this.isPaused = false;
      this.createNextFruit();
      this.updateHud();
      gameLogger.info('游戏重新开始');
    }

    updateHud() {
      this.setNum(this.scoreEl, this.score);
      this.setNum(this.bestEl, Math.max(this.highScore, this.score));
    }

    createNextFruit() {
      // 正在手上的是 nextFruit；HUD 里预告的是再下一个
      if (this.queued === undefined) this.queued = Math.floor(Math.random() * 3);
      const fruitIndex = this.queued;
      this.queued = Math.floor(Math.random() * 3);
      this.updateNextHud();
      this.nextFruit = {
        type: fruitIndex,
        x: this.nextFruitX,
        y: 50,
        vx: 0,
        vy: 0,
        radius: this.emoteTypes[fruitIndex].radius,
        color: this.emoteTypes[fruitIndex].color
      };
    }

    updateNextHud() {
      if (!this.nextEl || this.queued === undefined) return;
      const t = this.emoteTypes[this.queued];
      if (t.img && t.img.src) this.nextEl.src = t.img.src;
      else this.nextEl.removeAttribute('src');
    }

    isOpen() {
      return !window.__gameModal || window.__gameModal.current() === 'merge';
    }

    dropFruit() {
      if (this.gameOver || !this.nextFruit || this.isPaused || !this.levelsReady) return;
      const now = performance.now();
      if (now - this.lastDropTime < this.DROP_COOLDOWN) return;
      this.lastDropTime = now;
      this.fruits.push({
        type: this.nextFruit.type,
        x: this.nextFruit.x,
        y: this.nextFruit.y,
        vx: 0,
        vy: 1,
        radius: this.nextFruit.radius,
        color: this.nextFruit.color
      });
      this.createNextFruit();
    }

    togglePause() {
      if (this.gameOver) return;
      this.isPaused = !this.isPaused;
      gameLogger.info(this.isPaused ? '游戏暂停' : '游戏继续');
    }

    update(deltaTime) {
      this.mergeEffects = this.mergeEffects.filter(effect => {
        effect.radius += 2;
        effect.alpha -= 0.05;
        return effect.alpha > 0;
      });

      for (let i = 0; i < this.fruits.length; i++) {
        const fruit = this.fruits[i];
        fruit.vy += this.gravity;
        fruit.x += fruit.vx;
        fruit.y += fruit.vy;

        if (fruit.x - fruit.radius < this.containerLeft) {
          fruit.x = fruit.radius;
          fruit.vx *= -this.friction;
        } else if (fruit.x + fruit.radius > this.containerRight) {
          fruit.x = this.containerRight - fruit.radius;
          fruit.vx *= -this.friction;
        }

        if (fruit.y + fruit.radius > this.containerBottom) {
          fruit.y = this.containerBottom - fruit.radius;
          fruit.vy *= -this.friction;
          fruit.vx *= this.friction;
        }
      }

      for (let i = 0; i < this.fruits.length; i++) {
        for (let j = i + 1; j < this.fruits.length; j++) {
          const fruitA = this.fruits[i];
          const fruitB = this.fruits[j];
          if (fruitA.toRemove || fruitB.toRemove) continue;

          const dx = fruitB.x - fruitA.x;
          const dy = fruitB.y - fruitA.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = fruitA.radius + fruitB.radius;

          if (distance < minDistance) {
            const angle = Math.atan2(dy, dx);
            const overlap = minDistance - distance;
            const moveX = Math.cos(angle) * overlap * 0.5;
            const moveY = Math.sin(angle) * overlap * 0.5;

            fruitA.x -= moveX;
            fruitA.y -= moveY;
            fruitB.x += moveX;
            fruitB.y += moveY;

            const totalMass = fruitA.radius + fruitB.radius;
            const force = 1;
            fruitA.vx -= (moveX * force * fruitB.radius) / totalMass;
            fruitA.vy -= (moveY * force * fruitB.radius) / totalMass;
            fruitB.vx += (moveX * force * fruitA.radius) / totalMass;
            fruitB.vy += (moveY * force * fruitA.radius) / totalMass;

            if (fruitA.type === fruitB.type && fruitA.type < this.emoteTypes.length - 1) {
              const newType = fruitA.type + 1;
              const newX = (fruitA.x + fruitB.x) / 2;
              const newY = (fruitA.y + fruitB.y) / 2;
              this.fruits.push({
                type: newType,
                x: newX,
                y: newY,
                vx: (fruitA.vx + fruitB.vx) / 2,
                vy: (fruitA.vy + fruitB.vy) / 2,
                radius: this.emoteTypes[newType].radius,
                color: this.emoteTypes[newType].color
              });

              this.mergeEffects.push({
                x: newX,
                y: newY,
                radius: this.emoteTypes[newType].radius,
                color: this.emoteTypes[newType].color,
                alpha: 1
              });

              this.score += this.emoteTypes[newType].points;
              this.updateHud();
              fruitA.toRemove = true;
              fruitB.toRemove = true;

              if (newType === this.emoteTypes.length - 1) {
                gameLogger.info('恭喜！合成出了最大的表情！');
              }
            }
          }
        }
      }

      this.fruits = this.fruits.filter(fruit => !fruit.toRemove);

      // 球顶超过危险线并持续一段时间才判负（避免弹跳瞬间误判）
      const gameOverThreshold = this.dropZoneHeight;
      this.danger = 0;
      for (const fruit of this.fruits) {
        if (fruit.y - fruit.radius < gameOverThreshold) {
          fruit.overFrames = (fruit.overFrames || 0) + 1;
        } else {
          fruit.overFrames = 0;
        }
        this.danger = Math.max(this.danger, fruit.overFrames / this.OVER_FRAMES);
        if (fruit.overFrames > this.OVER_FRAMES && !this.gameOver) {
          this.gameOver = true;
          if (this.score > this.highScore) {
            this.highScore = this.score;
            try { localStorage.setItem('panda_merge_high_score', this.highScore.toString()); } catch (e) {}
          }
          gameLogger.warning('游戏结束');
          break;
        }
      }
    }

    overlay(title, sub, hint) {
      const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
      ctx.fillStyle = 'rgba(19, 32, 74, 0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = `600 34px ${this.FONT}`;
      ctx.fillText(title, W / 2, H / 2 - 10);
      if (sub) {
        ctx.font = `500 18px ${this.FONT}`;
        ctx.fillStyle = '#dbe6ff';
        ctx.fillText(sub, W / 2, H / 2 + 24);
      }
      if (hint) {
        ctx.font = `500 15px ${this.FONT}`;
        ctx.fillStyle = '#aebfe6';
        ctx.fillText(hint, W / 2, H / 2 + 54);
      }
    }

    draw() {
      const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;

      // 背景：冰蓝，越往下越深一点，像一个玻璃罐
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#f4f8ff');
      g.addColorStop(1, '#dce8ff');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // 危险线：平时是淡粉虚线；有球压线时变实、变红并闪烁
      const danger = this.gameOver ? 0 : (this.danger || 0);
      const pulse = danger > 0 ? 0.55 + 0.45 * Math.sin(performance.now() / 90) : 0;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, this.dropZoneHeight);
      ctx.lineTo(W, this.dropZoneHeight);
      if (danger > 0) {
        ctx.strokeStyle = `rgba(230, 60, 110, ${0.5 + 0.5 * pulse})`;
        ctx.lineWidth = 3;
      } else {
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = 'rgba(255, 111, 156, 0.55)';
        ctx.lineWidth = 2;
      }
      ctx.stroke();
      ctx.restore();
      if (danger > 0) {
        ctx.fillStyle = `rgba(230, 60, 110, ${0.08 + 0.12 * danger})`;
        ctx.fillRect(0, 0, W, this.dropZoneHeight);
      }

      for (const effect of this.mergeEffects) {
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius + (1 - effect.alpha) * 18, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(47, 111, 237, ${effect.alpha * 0.6})`;
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      for (const fruit of this.fruits) {
        this.drawFruit(fruit);
      }

      if (this.nextFruit && !this.gameOver && !this.isPaused) {
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 6]);
        ctx.moveTo(this.nextFruit.x, this.nextFruit.y + this.nextFruit.radius + 4);
        ctx.lineTo(this.nextFruit.x, H);
        ctx.strokeStyle = 'rgba(47, 111, 237, 0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        const ready = performance.now() - this.lastDropTime >= this.DROP_COOLDOWN;
        ctx.globalAlpha = ready ? 1 : 0.45;
        this.drawFruit(this.nextFruit);
        ctx.globalAlpha = 1;
      }

      if (!this.levelsReady && this.isOpen()) {
        ctx.fillStyle = 'rgba(19, 32, 74, 0.55)';
        ctx.font = `500 15px ${this.FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('正在挑选本局的表情…', W / 2, H / 2);
      }

      if (this.isPaused && !this.gameOver) {
        this.overlay('暂停中', null, '点击画面继续');
      }

      if (this.gameOver) {
        this.overlay('游戏结束', `得分 ${this.score}　最高 ${this.highScore}`, '点击画面重新开始');
      }
    }

    drawFruit(fruit) {
      this.ctx.beginPath();
      this.ctx.arc(fruit.x, fruit.y + 3, fruit.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(19, 32, 74, 0.12)';
      this.ctx.fill();

      {
        const img = this.emoteTypes[fruit.type].img;
        if (img && img.complete && img.naturalWidth) {
          const size = fruit.radius * 2;
          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.arc(fruit.x, fruit.y, fruit.radius, 0, Math.PI * 2);
          this.ctx.closePath();
          this.ctx.clip();
          // 按正方形居中裁切（不拉伸变形），竖图稍微偏上取，脸一般在上半部分
          const iw = img.naturalWidth, ih = img.naturalHeight, side = Math.min(iw, ih);
          const sx = (iw - side) / 2, sy = ih > iw ? (ih - side) * 0.3 : (ih - side) / 2;
          this.ctx.drawImage(img, sx, sy, side, side, fruit.x - fruit.radius, fruit.y - fruit.radius, size, size);
          this.ctx.restore();

          this.ctx.beginPath();
          this.ctx.arc(fruit.x, fruit.y, fruit.radius - 1, 0, Math.PI * 2);
          this.ctx.strokeStyle = '#fff';
          this.ctx.lineWidth = 3;
          this.ctx.stroke();
          this.ctx.beginPath();
          this.ctx.arc(fruit.x, fruit.y, fruit.radius + 0.5, 0, Math.PI * 2);
          this.ctx.strokeStyle = fruit.color;
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        } else {
          this.drawDefaultFruit(fruit);
        }
      }
    }

    drawDefaultFruit(fruit) {
      this.ctx.beginPath();
      this.ctx.arc(fruit.x, fruit.y, fruit.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = fruit.color;
      this.ctx.fill();
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(fruit.x - fruit.radius * 0.3, fruit.y - fruit.radius * 0.3, fruit.radius * 0.3, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.fill();
    }

    gameLoop(timestamp) {
      // 循环始终保持运行（只有一条），暂停 / 弹窗关闭时只是跳过物理更新
      requestAnimationFrame(this.boundLoop);
      const dt = Math.max(0, Math.min(100, timestamp - this.lastFrameTime));
      this.lastFrameTime = timestamp;
      if (!this.isOpen()) { this.acc = 0; return; }
      if (!this.isPaused && !this.gameOver) {
        this.acc += dt;
        while (this.acc >= this.STEP) { this.update(this.STEP); this.acc -= this.STEP; }
      } else {
        this.acc = 0;
      }
      this.draw();
    }
  }

  window.addEventListener('load', () => {
    const game = new PandaMergeGame();
    window.__gameHooks.merge = (action) => {
      if (action === 'open') game.init();
    };
  });
})();