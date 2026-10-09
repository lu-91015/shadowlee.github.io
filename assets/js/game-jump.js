/**
 * 熊猫跳一跳（3D）
 * 按住蓄力，松开起跳，跳到下一个台子上。落在台子正中心算“完美”，连续完美 +2、+4、+6…，否则 +1。
 *
 * 渲染用 three.js（本站自带 lib/three.module.min.js，MIT），只在第一次打开游戏时才加载，不影响首页速度。
 * 角色模型借用自 shaw-core/ShadowLee_It-s-MyGO-（见 lib/shadowlee-characters3d.js 顶部说明）。
 *
 * 世界坐标：地面是 XZ 平面，Y 向上；下一个台子只会出现在 +X（屏幕右上）或 -Z（屏幕左上）方向。
 */
const base = (window.SITE_BASE || '/').replace(/\/$/, '');
const VERSION = '13';

const $ = (id) => document.getElementById(id);
const GM = () => window.__gameModal || {};
const setNum = (el, v) => { if (!el) return; const g = GM(); if (g.setNum) g.setNum(el, v); else el.textContent = v; };

const SKIN_KEY = 'jump_skin';
const BEST_KEY = 'jump_best';
const SKIN_LIST = [
  { id: 'skin3', name: '大墨镜小李' },
  { id: 'skin1', name: '毛绒小豆' },
  { id: 'skin2', name: '电视头小豆' },
  { id: 'skin4', name: '眼罩小豆' },
  { id: 'witch', name: '魔法熊猫' },
];

let game = null;
let loading = null;

function overlay(title, sub, hint) {
  const el = $('jump-overlay');
  if (!el) return;
  if (!title) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<div class="jump-ov-title">${title}</div>` +
    (sub ? `<div class="jump-ov-sub">${sub}</div>` : '') +
    (hint ? `<div class="jump-ov-hint">${hint}</div>` : '');
}

async function ensureGame() {
  if (game) return game;
  if (!loading) {
    overlay('加载中…', '第一次打开需要加载 3D 场景');
    loading = Promise.all([
      import(`${base}/assets/js/lib/three.module.min.js`),
      import(`${base}/assets/js/lib/shadowlee-characters3d.js?v=${VERSION}`),
    ]).then(([THREE, chars]) => {
      game = createGame(THREE, chars);
      return game;
    }).catch((err) => {
      console.error('[跳一跳] 加载失败', err);
      overlay('加载失败', '3D 场景没能加载出来', '请刷新页面再试');
      loading = null;
      throw err;
    });
  }
  return loading;
}

window.__gameHooks = window.__gameHooks || {};
window.__gameHooks.jump = (action) => {
  if (action === 'open') ensureGame().then(g => { if (GM().current && GM().current() === 'jump') g.open(); }).catch(() => {});
  if (action === 'close' && game) game.close();
};

// ======================================================================

function createGame(THREE, chars) {
  const canvas = $('jump-canvas');
  const W = canvas.width, H = canvas.height;
  const scoreEl = $('jump-score'), comboEl = $('jump-combo'), bestEl = $('jump-best');
  const chargeEl = $('jump-charge'), chargeFill = chargeEl ? chargeEl.firstElementChild : null;
  const popLayer = $('jump-pop');
  const skinBox = $('jump-skins');

  // ---- 参数 ----
  const PH = 1.0;               // 台子高度
  const CHAR_SCALE = 1.45;
  const CHARGE_MAX_MS = 1500;
  const DIST_PER_MS = 0.0046;   // 每毫秒蓄力对应的跳跃距离
  const JUMP_FRAMES = 34;
  const JUMP_HEIGHT = 2.4;
  const PERFECT_R = 0.3;        // 落点离中心 < 半宽 × 这个比例 算完美
  const FOOT_R = 0.18;

  // ---- 渲染器 / 场景 / 相机 ----
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    overlay('无法显示 3D', '你的浏览器没有开启 WebGL', '换个浏览器或打开硬件加速再试');
    throw e;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const VIEW_H = 11;
  const camera = new THREE.OrthographicCamera(-VIEW_H * W / H / 2, VIEW_H * W / H / 2, VIEW_H / 2, -VIEW_H / 2, 0.1, 100);
  const CAM_OFFSET = new THREE.Vector3(-6, 8.5, 6);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c9f2, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -10; sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10;
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0015;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);

  // 地面只接收影子，本身透明，背景是 CSS 渐变
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.14 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- 台子 ----
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });

  function canvasTex(size, draw) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  // 顶面的中心靶点（提示完美区）
  function addTarget(group, r) {
    const ring = new THREE.Mesh(
      new THREE.CircleGeometry(r * PERFECT_R, 32),
      new THREE.MeshBasicMaterial({ color: 0x13204a, transparent: true, opacity: 0.07, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = PH + 0.005;
    group.add(ring);
  }

  const PASTELS = [
    { top: 0xffd6e4, side: 0xff9fbd },
    { top: 0xe6dcff, side: 0xb59cf0 },
    { top: 0xdbe8ff, side: 0x8fb3ff },
    { top: 0xfff4d6, side: 0xf5c97a },
  ];

  const pandaTopTex = canvasTex(256, (g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#1b1b1f';
    const e = (x, rot) => { g.save(); g.translate(x, s * 0.47); g.rotate(rot); g.beginPath(); g.ellipse(0, 0, s * 0.11, s * 0.15, 0, 0, Math.PI * 2); g.fill(); g.restore(); };
    e(s * 0.33, 0.5); e(s * 0.67, -0.5);
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(s * 0.35, s * 0.44, s * 0.035, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(s * 0.65, s * 0.44, s * 0.035, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1b1b1f';
    g.beginPath(); g.ellipse(s * 0.5, s * 0.64, s * 0.06, s * 0.04, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,143,179,0.75)';
    g.beginPath(); g.arc(s * 0.22, s * 0.66, s * 0.06, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(s * 0.78, s * 0.66, s * 0.06, 0, Math.PI * 2); g.fill();
  });
  const stumpTopTex = canvasTex(256, (g, s) => {
    g.fillStyle = '#eef8dc'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(95,160,90,0.45)';
    for (let i = 1; i <= 5; i++) { g.lineWidth = 3; g.beginPath(); g.arc(s / 2, s / 2, (s / 2) * i / 5.4, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#cfe8b4'; g.beginPath(); g.arc(s / 2, s / 2, s * 0.06, 0, Math.PI * 2); g.fill();
  });

  function makeBox(h) {
    const c = PASTELS[Math.floor(Math.random() * PASTELS.length)];
    const geo = new THREE.BoxGeometry(h * 2, PH, h * 2);
    geo.translate(0, PH / 2, 0);
    const side = std(c.side), top = std(c.top);
    const mesh = new THREE.Mesh(geo, [side, side, top, side, side, side]);
    mesh.castShadow = mesh.receiveShadow = true;
    const g = new THREE.Group(); g.add(mesh);
    // 顶部一圈浅色边，看起来像圆角
    const lip = new THREE.Mesh(new THREE.BoxGeometry(h * 2 + 0.06, 0.08, h * 2 + 0.06), top);
    lip.position.y = PH - 0.04; lip.castShadow = true;
    g.add(lip);
    addTarget(g, h);
    return { group: g, h, round: false };
  }

  function makeGift(h) {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(h * 2, PH, h * 2); geo.translate(0, PH / 2, 0);
    const body = new THREE.Mesh(geo, std(0xffffff));
    body.castShadow = body.receiveShadow = true;
    const ribbonMat = std(0xff6f9c, { roughness: 0.45 });
    const rw = h * 0.28;
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(h * 2 + 0.02, PH + 0.02, rw), ribbonMat); r1.position.y = PH / 2;
    const r2 = new THREE.Mesh(new THREE.BoxGeometry(rw, PH + 0.02, h * 2 + 0.02), ribbonMat); r2.position.y = PH / 2;
    const bowGeo = new THREE.TorusGeometry(h * 0.2, h * 0.06, 8, 16);
    const b1 = new THREE.Mesh(bowGeo, ribbonMat); b1.position.set(-h * 0.18, PH + h * 0.1, 0); b1.rotation.set(0, Math.PI / 2, 0.5);
    const b2 = new THREE.Mesh(bowGeo, ribbonMat); b2.position.set(h * 0.18, PH + h * 0.1, 0); b2.rotation.set(0, Math.PI / 2, -0.5);
    [r1, r2, b1, b2].forEach(m => { m.castShadow = true; });
    g.add(body, r1, r2, b1, b2);
    return { group: g, h, round: false };
  }

  function makeStump(r) {
    const g = new THREE.Group();
    const geo = new THREE.CylinderGeometry(r, r * 1.04, PH, 32); geo.translate(0, PH / 2, 0);
    const side = std(0x6cbf6a, { roughness: 0.6 });
    const top = new THREE.MeshStandardMaterial({ map: stumpTopTex, roughness: 0.8 });
    const mesh = new THREE.Mesh(geo, [side, top, side]);
    mesh.castShadow = mesh.receiveShadow = true;
    // 竹节
    const node = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, 0.05, 6, 32), std(0x3f8f4a));
    node.rotation.x = Math.PI / 2; node.position.y = PH * 0.45;
    // 竹叶
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 4), std(0x7cc576));
    leaf.position.set(r * 0.9, PH * 0.5, r * 0.5); leaf.rotation.set(0.3, 0, -1.1); leaf.scale.z = 0.3;
    leaf.castShadow = true;
    g.add(mesh, node, leaf);
    addTarget(g, r);
    return { group: g, h: r, round: true };
  }

  function makePandaDrum(r) {
    const g = new THREE.Group();
    const geo = new THREE.CylinderGeometry(r, r, PH, 32); geo.translate(0, PH / 2, 0);
    const side = std(0xffffff);
    const top = new THREE.MeshStandardMaterial({ map: pandaTopTex, roughness: 0.7 });
    const mesh = new THREE.Mesh(geo, [side, top, side]);
    mesh.castShadow = mesh.receiveShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, 0.22, 32), std(0x1b1b1f));
    band.position.y = 0.2;
    // 两只耳朵在背后（远离镜头的一侧），不挡视线
    const earGeo = new THREE.SphereGeometry(r * 0.24, 12, 10);
    const e1 = new THREE.Mesh(earGeo, std(0x1b1b1f)); e1.position.set(r * 0.35, PH, -r * 0.82);
    const e2 = new THREE.Mesh(earGeo, std(0x1b1b1f)); e2.position.set(r * 0.82, PH, -r * 0.35);
    [band, e1, e2].forEach(m => { m.castShadow = true; });
    g.add(mesh, band, e1, e2);
    return { group: g, h: r, round: true };
  }

  function makePlatform(h) {
    const roll = Math.random();
    let p;
    if (roll < 0.38) p = makeBox(h);
    else if (roll < 0.6) p = makeStump(h * 1.05);
    else if (roll < 0.8) p = makeGift(h);
    else p = makePandaDrum(h * 1.05);
    p.squash = 0;
    scene.add(p.group);
    return p;
  }

  function disposePlatform(p) {
    scene.remove(p.group);
    p.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    });
  }

  // ---- 角色 ----
  const pivot = new THREE.Group();      // 位置 + 朝向
  const flipper = new THREE.Group();    // 空翻
  pivot.add(flipper);
  scene.add(pivot);
  let rig = null;
  let skin = 'skin3';
  try { skin = localStorage.getItem(SKIN_KEY) || 'skin3'; } catch (e) {}
  if (!SKIN_LIST.some(s => s.id === skin)) skin = 'skin3';

  // ---- 状态 ----
  let platforms = [], cur, next, phase = 'ready', score = 0, combo = 0, best = 0;
  let chargeStart = 0, charge = 0, jump = null, fallT = 0, fallTilt = null;
  const char = { x: 0, z: 0, y: PH };
  const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
  const ripples = [];
  try { best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (e) {}

  function setSkin(id) {
    skin = id;
    try { localStorage.setItem(SKIN_KEY, id); } catch (e) {}
    if (rig) {
      flipper.remove(rig.group);
      rig.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    rig = id === 'witch' ? chars.buildPandaWitch() : chars.buildCharacter(id);
    rig.group.scale.setScalar(CHAR_SCALE);
    rig.group.position.y = -0.7 * CHAR_SCALE;   // 让空翻绕着身体中心转
    flipper.position.y = 0.7 * CHAR_SCALE;
    rig.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    flipper.add(rig.group);
    if (skinBox) skinBox.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.skin === id));
  }

  if (skinBox) {
    skinBox.innerHTML = SKIN_LIST.map(s => `<button type="button" data-skin="${s.id}">${s.name}</button>`).join('');
    skinBox.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-skin]');
      if (!b || phase === 'jumping' || phase === 'falling' || phase === 'charging') return;
      setSkin(b.dataset.skin);
      b.blur();
    });
  }
  setSkin(skin);

  function sizeForScore() { return Math.max(0.6, 1.05 - score * 0.01) + Math.random() * 0.25; }

  function spawnNext() {
    const dirX = Math.random() < 0.5;
    const h = sizeForScore();
    const gap = 0.6 + Math.random() * (1.4 + Math.min(score, 50) * 0.025);
    const dist = cur.h + h + gap;
    const p = makePlatform(h);
    p.x = cur.x + (dirX ? dist : 0);
    p.z = cur.z - (dirX ? 0 : dist);
    p.group.position.set(p.x, 3, p.z);
    p.drop = 1;   // 新台子从上方落下
    platforms.push(p);
    next = p;
    while (platforms.length > 6) disposePlatform(platforms.shift());
  }

  // 站着时正面朝镜头（看得到脸），蓄力 / 起跳时转向下一个台子
  const CAM_YAW = Math.atan2(CAM_OFFSET.x, CAM_OFFSET.z);
  let targetYaw = CAM_YAW;
  function faceNext() {
    targetYaw = Math.atan2(next.x - char.x, next.z - char.z);
  }
  function turnTowards(yaw, k) {
    let d = yaw - pivot.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    pivot.rotation.y += d * k;
  }

  function camGoal(out) {
    return out.set((cur.x + next.x) / 2, PH * 0.5, (cur.z + next.z) / 2);
  }

  function reset() {
    platforms.forEach(disposePlatform);
    platforms = [];
    score = 0; combo = 0;
    const first = makeBox(1.1);
    first.x = 0; first.z = 0; first.squash = 0;
    scene.add(first.group);
    platforms.push(first);
    cur = first;
    spawnNext();
    next.drop = 0; next.group.position.y = 0;
    char.x = 0; char.z = 0; char.y = PH;
    flipper.rotation.set(0, 0, 0);
    if (rig) rig.body.scale.set(1, 1, 1);
    faceNext();
    pivot.rotation.y = CAM_YAW;
    camGoal(camTarget);
    camPos.copy(camTarget);
    phase = 'ready';
    jump = null;
    if (popLayer) popLayer.innerHTML = '';
    overlay('熊猫跳一跳', '按住蓄力，松开起跳', '落在台子正中心有连击加分');
    showCharge(0, false);
    updateHud();
  }

  function updateHud() {
    setNum(scoreEl, score);
    setNum(comboEl, combo);
    setNum(bestEl, Math.max(best, score));
  }
  function saveBest() {
    if (score > best) { best = score; try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {} }
    updateHud();
  }

  function showCharge(v, on) {
    if (!chargeEl) return;
    chargeEl.hidden = !on;
    if (chargeFill) {
      chargeFill.style.width = `${Math.round(v * 100)}%`;
      chargeFill.classList.toggle('full', v >= 1);
    }
  }

  // 3D 坐标 -> 画面上的百分比位置（飘字用）
  const tmpV = new THREE.Vector3();
  function popup(text, x, y, z, pink) {
    if (!popLayer) return;
    tmpV.set(x, y, z).project(camera);
    const el = document.createElement('div');
    el.className = 'jump-pop' + (pink ? ' pink' : '');
    el.textContent = text;
    el.style.left = `${(tmpV.x * 0.5 + 0.5) * 100}%`;
    el.style.top = `${(-tmpV.y * 0.5 + 0.5) * 100}%`;
    popLayer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  function ripple(p) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.42, 40),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, PH + 0.02, p.z);
    scene.add(m);
    ripples.push({ m, t: 0 });
  }

  // ---- 输入 ----
  function press() {
    if (phase === 'over') { reset(); return; }
    if (phase !== 'ready' && phase !== 'idle') return;
    if (phase === 'ready') overlay(null);
    phase = 'charging';
    chargeStart = performance.now();
  }
  function release() {
    if (phase !== 'charging') return;
    const held = Math.min(CHARGE_MAX_MS, performance.now() - chargeStart);
    const dist = held * DIST_PER_MS;
    let dx = next.x - char.x, dz = next.z - char.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    jump = { sx: char.x, sz: char.z, tx: char.x + dx * dist, tz: char.z + dz * dist, t: 0 };
    pivot.rotation.y = targetYaw;
    phase = 'jumping';
    charge = 0;
    showCharge(0, false);
  }

  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('keydown', (e) => {
    if (!GM().wantsKeys || !GM().wantsKeys('jump', e)) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) press(); }
  });
  window.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') release(); });

  function onPlatform(p, x, z, pad = 0) {
    if (p.round) return Math.hypot(x - p.x, z - p.z) <= p.h + pad;
    return Math.abs(x - p.x) <= p.h + pad && Math.abs(z - p.z) <= p.h + pad;
  }

  function land() {
    const { x, z } = char;
    if (onPlatform(next, x, z)) {
      const d = Math.hypot(x - next.x, z - next.z);
      let gain;
      if (d < next.h * PERFECT_R) {
        combo++;
        gain = combo * 2;
        popup(combo > 1 ? `完美 ×${combo}  +${gain}` : `完美  +${gain}`, x, PH + 2.2, z, true);
        ripple(next);
      } else {
        combo = 0;
        gain = 1;
        popup('+1', x, PH + 2, z, false);
      }
      score += gain;
      next.squash = 0.2;
      cur = next;
      spawnNext();
      faceNext();
      camGoal(camTarget);
      phase = 'idle';
      updateHud();
    } else if (onPlatform(cur, x, z)) {
      phase = 'idle';
      faceNext();
    } else {
      // 掉下去：如果擦着某个台子的边，往外侧倒
      const edge = onPlatform(next, x, z, FOOT_R * 2) ? next : (onPlatform(cur, x, z, FOOT_R * 2) ? cur : null);
      if (edge) {
        const ox = x - edge.x, oz = z - edge.z;
        fallTilt = Math.abs(ox) > Math.abs(oz) ? { z: -Math.sign(ox) } : { x: Math.sign(oz) };
      } else {
        fallTilt = null;
      }
      phase = 'falling';
      fallT = 0;
    }
  }

  function update() {
    camPos.lerp(camTarget, 0.08);

    for (const p of platforms) {
      if (p.drop > 0) { p.drop = Math.max(0, p.drop - 0.07); p.group.position.y = 3 * p.drop * p.drop; }
      if (!(p === cur && phase === 'charging')) p.squash = Math.max(0, p.squash - 0.04);
      p.group.scale.y = 1 - p.squash;
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.t++;
      const k = r.t / 40;
      r.m.scale.setScalar(1 + k * 5);
      r.m.material.opacity = 0.9 * (1 - k);
      if (r.t >= 40) { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); ripples.splice(i, 1); }
    }

    const relaxBody = () => {
      const s = rig.body.scale;
      s.x += (1 - s.x) * 0.3; s.y += (1 - s.y) * 0.3; s.z += (1 - s.z) * 0.3;
    };

    if (phase === 'charging') {
      charge = Math.min(1, (performance.now() - chargeStart) / CHARGE_MAX_MS);
      cur.squash = charge * 0.28;
      rig.body.scale.set(1 + charge * 0.12, 1 - charge * 0.3, 1 + charge * 0.12);
      char.y = PH * (1 - cur.squash);
      showCharge(charge, true);
    } else if (phase === 'jumping') {
      jump.t++;
      const k = jump.t / JUMP_FRAMES;
      char.x = jump.sx + (jump.tx - jump.sx) * k;
      char.z = jump.sz + (jump.tz - jump.sz) * k;
      char.y = PH + Math.sin(Math.PI * k) * JUMP_HEIGHT;
      flipper.rotation.x = k * Math.PI * 2;          // 往前空翻一圈
      relaxBody();
      if (jump.t >= JUMP_FRAMES) {
        flipper.rotation.x = 0;
        char.y = PH;
        land();
      }
    } else if (phase === 'falling') {
      fallT++;
      if (fallTilt) {
        const a = Math.min(1.5, fallT * 0.09);
        flipper.rotation.x = (fallTilt.x || 0) * a;
        flipper.rotation.z = (fallTilt.z || 0) * a;
      }
      char.y = Math.max(0, char.y - (0.03 + fallT * 0.012));
      if (fallT === 32) {
        phase = 'over';
        saveBest();
        overlay('掉下去了', `得分 ${score}　最高 ${best}`, '点击画面再来一局');
      }
    } else {
      char.y = PH * (1 - cur.squash);
      relaxBody();
    }
    if (phase === 'charging' || phase === 'jumping') turnTowards(targetYaw, 0.35);
    else if (phase !== 'falling') turnTowards(CAM_YAW, 0.12);
    pivot.position.set(char.x, char.y, char.z);
  }

  const sunOffset = new THREE.Vector3(4, 12, 7);
  function render() {
    camera.position.copy(camPos).add(CAM_OFFSET);
    camera.lookAt(camPos);
    sun.position.copy(camPos).add(sunOffset);
    sun.target.position.copy(camPos);
    renderer.render(scene, camera);
  }

  // ---- 循环：固定 60Hz，只在弹窗打开时运行 ----
  const STEP = 1000 / 60;
  let running = false, lastTime = 0, acc = 0, raf = 0;
  function loop(now) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.max(0, Math.min(100, now - lastTime));
    lastTime = now;
    acc += dt;
    while (acc >= STEP) { update(); acc -= STEP; }
    render();
  }

  reset();

  return {
    open() {
      reset();
      if (!running) { running = true; lastTime = performance.now(); acc = 0; raf = requestAnimationFrame(loop); }
    },
    close() {
      if (phase !== 'ready' && phase !== 'over') saveBest();
      running = false;
      cancelAnimationFrame(raf);
      showCharge(0, false);
    },
  };
}
