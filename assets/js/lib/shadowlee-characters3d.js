/**
 * 李豆沙 3D 角色模型（程序化 low-poly，零外部资源）
 *
 * 来源：shaw-core/ShadowLee_It-s-MyGO-（https://github.com/shaw-core/ShadowLee_It-s-MyGO-）
 *       game3d/characters3d.ts，原作者 shaw-core。
 * 本文件仅借用其中的角色建模代码，用 esbuild 从 TypeScript 转成 JS，逻辑未改动；
 * 唯一改动是 three 的导入路径指向本站自带的 lib/three.module.min.js。
 * 原仓库未附许可证，版权归原作者所有。
 */
import * as THREE from "./three.module.min.js";
const SKINS = [
  { id: "skin1", name: "毛绒小豆", vibe: "软萌 · 安静 · 治愈", features: ["猫耳睡帽 + 银白短发", "眼罩遮右眼", "蓝白睡衣风", "怀里抱着熊猫玩偶", "能力「安心毛绒」：眩晕增长减半，薄荷糖效果更强"] },
  { id: "skin2", name: "电视头小豆", vibe: "AI · 机器人 · 电子吉祥物", features: ["身体与1号相同", "头部是一块显示器", "屏幕上是睡眼猫嘴表情", "顶部机械耳", "能力「缓存锚点」：按 E 在脚下部署一次性临时存档点"] },
  { id: "skin3", name: "大墨镜小李", vibe: "活泼 · 外向 · 冒险感", features: ["及腰长白发", "宽大蓝色外套", "熊猫耳 + 护目镜", "能力「冒险家」：可以二段跳！"] },
  { id: "skin4", name: "眼罩小豆", vibe: "安静 · 病弱 · 神秘", features: ["银白短发双侧扎", "单眼眼罩 + 熊猫耳", "白蓝色居家服", "腿上贴着创可贴", "能力「创可贴」：每个存档点区间可抵挡一次尖刺"] },
  { id: "skinNovus", name: "？号 · 室友姐", vibe: "可靠 · 从容 · 温柔", features: ["橘色齐颈发 + 猫耳", "奶油色家居服", "口袋里永远有薄荷糖", "能力「次元之外」：完全不会晕3D"] }
];
const COL = {
  hair: 15264496,
  hairShade: 13358561,
  skin: 16771545,
  blush: 16622767,
  eye: 3900150,
  blueLight: 13624319,
  bluePale: 15266303,
  blueDeep: 2450411,
  white: 16777215,
  black: 1316380,
  patch: 16185337,
  bandaid: 16111544,
  novusHair: 14251842,
  novusHairShade: 12082222,
  cream: 16643042,
  amber: 10115886
};
const mat = (c, opts = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.92, ...opts });
const box = (w, h, d, c, m) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m ?? mat(c));
  mesh.castShadow = true;
  return mesh;
};
const ball = (r, c) => {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(c));
  mesh.castShadow = true;
  return mesh;
};
const cone = (r, h, c, seg = 4) => {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(c));
  mesh.castShadow = true;
  return mesh;
};
const makeMonitorFaceTexture = () => {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#15181f";
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#7db4ff";
  const eye = (x) => {
    g.beginPath();
    g.roundRect(x, 104, 62, 18, 9);
    g.fill();
  };
  eye(38);
  eye(156);
  g.strokeStyle = "#7db4ff";
  g.lineWidth = 9;
  g.lineCap = "round";
  g.beginPath();
  g.arc(112, 168, 15, Math.PI * 0.15, Math.PI * 0.85);
  g.stroke();
  g.beginPath();
  g.arc(144, 168, 15, Math.PI * 0.15, Math.PI * 0.85);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};
const addFace = (head, hz, opts) => {
  const mkEye = (x) => {
    const white = box(0.1, 0.11, 0.02, COL.white);
    white.position.set(x, 0.02, hz);
    const iris = box(0.055, 0.11, 0.022, opts.irisColor ?? COL.eye);
    iris.position.set(x + 0.015, 0.02, hz + 2e-3);
    head.add(white, iris);
  };
  if (opts.patchRight) {
    mkEye(-0.11);
    const patch = box(0.15, 0.14, 0.03, COL.patch);
    patch.position.set(0.11, 0.03, hz);
    const strap1 = box(0.5, 0.025, 0.02, COL.patch);
    strap1.position.set(0, 0.1, hz - 5e-3);
    strap1.rotation.z = -0.35;
    const strap2 = box(0.5, 0.025, 0.02, COL.patch);
    strap2.position.set(0, -0.04, hz - 5e-3);
    strap2.rotation.z = 0.3;
    head.add(patch, strap1, strap2);
  } else {
    mkEye(-0.11);
    mkEye(0.11);
  }
  const b1 = box(0.07, 0.035, 0.02, COL.blush);
  b1.position.set(-0.17, -0.07, hz);
  const b2 = b1.clone();
  b2.position.x = 0.17;
  head.add(b1, b2);
  const mouth = box(0.045, 0.028, 0.02, 14904186);
  mouth.position.set(0, -0.11, hz);
  head.add(mouth);
};
const buildPandaPlush = () => {
  const g = new THREE.Group();
  const hood = box(0.2, 0.18, 0.18, COL.blueLight);
  hood.position.y = 0.14;
  const face = box(0.15, 0.12, 0.05, COL.white);
  face.position.set(0, 0.13, 0.09);
  const eL = box(0.045, 0.05, 0.02, COL.black);
  eL.position.set(-0.04, 0.14, 0.12);
  const eR = eL.clone();
  eR.position.x = 0.04;
  const body = box(0.18, 0.16, 0.15, COL.blueLight);
  body.position.y = -0.02;
  const belly = box(0.12, 0.1, 0.03, COL.white);
  belly.position.set(0, -0.02, 0.08);
  const earL = ball(0.035, COL.black);
  earL.position.set(-0.08, 0.24, 0.02);
  const earR = earL.clone();
  earR.position.x = 0.08;
  g.add(hood, face, eL, eR, body, belly, earL, earR);
  return g;
};
const addLooseSocks = (leg, footY) => {
  const sock = box(0.19, 0.16, 0.21, COL.white);
  sock.position.y = footY + 0.1;
  leg.add(sock);
};
const addBandaid = (leg, y, rot) => {
  const b1 = box(0.1, 0.03, 0.02, COL.bandaid);
  b1.position.set(0.02, y, 0.09);
  b1.rotation.z = rot;
  const b2 = box(0.1, 0.03, 0.02, COL.bandaid);
  b2.position.set(0.02, y, 0.095);
  b2.rotation.z = rot + Math.PI / 2.2;
  leg.add(b1, b2);
};
const buildCharacter = (skin) => {
  if (skin === "skinNovus") return buildNovus();
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const isPajama = skin === "skin1" || skin === "skin2";
  const topColor = isPajama ? COL.blueLight : skin === "skin3" ? COL.blueDeep : COL.white;
  const makeLeg = (x) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.46, 0);
    const thigh = box(0.13, 0.3, 0.15, COL.skin);
    thigh.position.y = -0.15;
    const shoe = box(0.16, 0.12, 0.2, skin === "skin3" ? COL.black : 3812906);
    shoe.position.set(0, -0.4, 0.02);
    leg.add(thigh, shoe);
    if (skin !== "skin3") addLooseSocks(leg, -0.4);
    return leg;
  };
  const legL = makeLeg(-0.11);
  const legR = makeLeg(0.11);
  body.add(legL, legR);
  if (skin === "skin4") {
    addBandaid(legL, -0.14, -0.5);
    addBandaid(legR, -0.28, 0.4);
  }
  if (isPajama) {
    const shirt = box(0.5, 0.4, 0.32, topColor);
    shirt.position.y = 0.68;
    const frill = box(0.2, 0.4, 0.03, COL.white);
    frill.position.set(0, 0.68, 0.17);
    const shorts = box(0.44, 0.16, 0.3, COL.bluePale);
    shorts.position.y = 0.46;
    body.add(shirt, frill, shorts);
  } else if (skin === "skin3") {
    const dress = box(0.4, 0.44, 0.26, COL.white);
    dress.position.y = 0.66;
    const dressHem = box(0.44, 0.14, 0.3, 2042167);
    dressHem.position.y = 0.46;
    const jacket = box(0.6, 0.46, 0.4, topColor);
    jacket.position.set(0, 0.7, -0.03);
    const scarf = box(0.4, 0.12, 0.3, COL.white);
    scarf.position.y = 0.95;
    body.add(dress, dressHem, jacket, scarf);
  } else {
    const top = box(0.48, 0.4, 0.3, COL.white);
    top.position.y = 0.68;
    const collar = box(0.5, 0.08, 0.32, COL.blueLight);
    collar.position.y = 0.9;
    const shorts = box(0.44, 0.16, 0.3, COL.blueLight);
    shorts.position.y = 0.46;
    body.add(top, collar, shorts);
  }
  const armW = skin === "skin3" ? 0.16 : 0.13;
  const sleeveColor = skin === "skin3" ? topColor : isPajama ? topColor : COL.white;
  const makeArm = (x) => {
    const arm = new THREE.Group();
    arm.position.set(x, 0.86, 0);
    const sleeve = box(armW, 0.3, armW + 0.02, sleeveColor);
    sleeve.position.y = -0.14;
    const hand = box(0.1, 0.09, 0.1, COL.skin);
    hand.position.y = -0.33;
    arm.add(sleeve, hand);
    return arm;
  };
  const armL = makeArm(-(0.3 + (skin === "skin3" ? 0.04 : 0)));
  const armR = makeArm(0.3 + (skin === "skin3" ? 0.04 : 0));
  body.add(armL, armR);
  if (isPajama) {
    const plush = buildPandaPlush();
    plush.position.set(-0.08, 0.62, 0.22);
    plush.rotation.x = -0.15;
    body.add(plush);
    armL.rotation.x = -0.9;
    armL.rotation.z = 0.3;
  }
  const head = new THREE.Group();
  head.position.y = 1.08;
  body.add(head);
  if (skin === "skin2") {
    const frame = box(0.62, 0.5, 0.16, 14672874);
    const screenMat = new THREE.MeshBasicMaterial({ map: makeMonitorFaceTexture() });
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.42, 0.02), screenMat);
    screen.position.z = 0.08;
    const mkRoboEar = (x) => {
      const stem = box(0.07, 0.1, 0.07, 12173516);
      stem.position.set(x, 0.3, 0);
      const dot = ball(0.055, 8238335);
      dot.position.set(x, 0.38, 0);
      head.add(stem, dot);
    };
    mkRoboEar(-0.22);
    mkRoboEar(0.22);
    head.add(frame, screen);
    head.position.y = 1.14;
  } else {
    const face = box(0.44, 0.38, 0.36, COL.skin);
    head.add(face);
    addFace(head, 0.185, { patchRight: skin === "skin1" || skin === "skin4" });
    const bangs = box(0.46, 0.14, 0.1, COL.hair);
    bangs.position.set(0, 0.17, 0.15);
    const top = box(0.48, 0.16, 0.42, COL.hair);
    top.position.y = 0.22;
    const back = box(0.46, 0.34, 0.12, COL.hair);
    back.position.set(0, 0.02, -0.16);
    head.add(bangs, top, back);
    const mkSide = (x) => {
      const s = box(0.09, 0.36, 0.3, COL.hair);
      s.position.set(x, -0.02, -0.02);
      const inner = box(0.03, 0.2, 0.2, 9684477);
      inner.position.set(x, -0.14, 0.02);
      head.add(s, inner);
    };
    mkSide(-0.245);
    mkSide(0.245);
    if (skin === "skin3") {
      const longHair = box(0.4, 0.62, 0.1, COL.hair);
      longHair.position.set(0, 0.66, -0.22);
      const hairTip = box(0.32, 0.14, 0.09, COL.hairShade);
      hairTip.position.set(0, 0.32, -0.22);
      body.add(longHair, hairTip);
      const ahoge = box(0.04, 0.16, 0.04, COL.hair);
      ahoge.position.set(0.03, 0.36, 0);
      ahoge.rotation.z = 0.35;
      head.add(ahoge);
      const band = box(0.5, 0.055, 0.44, COL.black);
      band.position.y = 0.16;
      const mkLens = (x) => {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 8), mat(2831168, { roughness: 0.4, metalness: 0.3 }));
        lens.rotation.x = Math.PI / 2;
        lens.position.set(x, 0.18, 0.2);
        lens.castShadow = true;
        head.add(lens);
      };
      mkLens(-0.1);
      mkLens(0.1);
      head.add(band);
    }
    if (skin === "skin1") {
      const hat = box(0.52, 0.18, 0.46, COL.blueLight);
      hat.position.y = 0.28;
      const bandana = box(0.54, 0.08, 0.48, 9684477);
      bandana.position.y = 0.18;
      const earL2 = cone(0.09, 0.18, COL.white);
      earL2.position.set(-0.18, 0.44, 0);
      const earR2 = earL2.clone();
      earR2.position.x = 0.18;
      head.add(hat, bandana, earL2, earR2);
    }
    if (skin === "skin3" || skin === "skin4") {
      const pe1 = ball(0.1, COL.black);
      pe1.position.set(-0.2, 0.32, -0.02);
      const pe2 = pe1.clone();
      pe2.position.x = 0.2;
      head.add(pe1, pe2);
    }
    if (skin === "skin4") {
      const mkTie = (x) => {
        const tuft = box(0.08, 0.22, 0.09, COL.hair);
        tuft.position.set(x, -0.16, -0.08);
        tuft.rotation.z = x > 0 ? -0.25 : 0.25;
        const bead = ball(0.045, 9684477);
        bead.position.set(x * 0.92, -0.05, -0.06);
        head.add(tuft, bead);
      };
      mkTie(-0.28);
      mkTie(0.28);
    }
  }
  return { group, body, head, legL, legR, armL, armR };
};
const buildNovus = () => {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const makeLeg = (x) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.5, 0);
    const thigh = box(0.12, 0.34, 0.14, COL.skin);
    thigh.position.y = -0.17;
    const shoe = box(0.15, 0.11, 0.19, 9067067);
    shoe.position.set(0, -0.42, 0.02);
    leg.add(thigh, shoe);
    return leg;
  };
  const legL = makeLeg(-0.11);
  const legR = makeLeg(0.11);
  body.add(legL, legR);
  const top = box(0.5, 0.42, 0.32, COL.cream);
  top.position.y = 0.74;
  const collar = box(0.34, 0.07, 0.3, COL.white);
  collar.position.y = 0.97;
  const skirt = box(0.46, 0.18, 0.32, 16775404);
  skirt.position.y = 0.5;
  body.add(top, collar, skirt);
  const makeArm = (x) => {
    const arm = new THREE.Group();
    arm.position.set(x, 0.92, 0);
    const sleeve = box(0.13, 0.32, 0.15, COL.cream);
    sleeve.position.y = -0.15;
    const hand = box(0.1, 0.09, 0.1, COL.skin);
    hand.position.y = -0.35;
    arm.add(sleeve, hand);
    return arm;
  };
  const armL = makeArm(-0.31);
  const armR = makeArm(0.31);
  body.add(armL, armR);
  const head = new THREE.Group();
  head.position.y = 1.16;
  body.add(head);
  const face = box(0.44, 0.38, 0.36, COL.skin);
  head.add(face);
  addFace(head, 0.185, { irisColor: COL.amber });
  const bangs = box(0.46, 0.15, 0.1, COL.novusHair);
  bangs.position.set(0, 0.17, 0.15);
  const hairTop = box(0.5, 0.17, 0.44, COL.novusHair);
  hairTop.position.y = 0.22;
  const hairBack = box(0.48, 0.42, 0.14, COL.novusHair);
  hairBack.position.set(0, -0.05, -0.17);
  const hairBackTip = box(0.44, 0.1, 0.12, COL.novusHairShade);
  hairBackTip.position.set(0, -0.28, -0.16);
  head.add(bangs, hairTop, hairBack, hairBackTip);
  const mkSide = (x) => {
    const s = box(0.1, 0.42, 0.3, COL.novusHair);
    s.position.set(x, -0.06, -0.01);
    head.add(s);
  };
  mkSide(-0.25);
  mkSide(0.25);
  const mkCatEar = (x) => {
    const ear = cone(0.1, 0.2, COL.novusHair);
    ear.position.set(x, 0.4, 0);
    ear.rotation.z = x > 0 ? -0.2 : 0.2;
    const inner = cone(0.05, 0.1, 16767426);
    inner.position.set(x, 0.38, 0.03);
    inner.rotation.z = ear.rotation.z;
    head.add(ear, inner);
  };
  mkCatEar(-0.18);
  mkCatEar(0.18);
  return { group, body, head, legL, legR, armL, armR };
};
const buildPandaWitch = () => {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const broom = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.5, 6), mat(7031346));
  shaft.rotation.x = Math.PI / 2;
  shaft.castShadow = true;
  const bristles = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 7), mat(14135406));
  bristles.rotation.x = Math.PI / 2;
  bristles.position.z = -0.9;
  bristles.castShadow = true;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 6), mat(15979112));
  band.rotation.x = Math.PI / 2;
  band.position.z = -0.66;
  broom.add(shaft, bristles, band);
  broom.position.y = 0.28;
  body.add(broom);
  const torso = box(0.42, 0.36, 0.36, COL.white);
  torso.position.y = 0.52;
  const belly = box(0.3, 0.24, 0.05, 16775922);
  belly.position.set(0, 0.5, 0.19);
  body.add(torso, belly);
  const makeLeg = (x) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.42, 0.08);
    const paw = box(0.13, 0.2, 0.14, COL.black);
    paw.position.y = -0.1;
    paw.rotation.x = 0.5;
    leg.add(paw);
    return leg;
  };
  const legL = makeLeg(-0.17);
  const legR = makeLeg(0.17);
  body.add(legL, legR);
  const makeArm = (x) => {
    const arm = new THREE.Group();
    arm.position.set(x, 0.62, 0);
    const paw = box(0.12, 0.24, 0.13, COL.black);
    paw.position.y = -0.1;
    arm.add(paw);
    return arm;
  };
  const armL = makeArm(-0.26);
  const armR = makeArm(0.26);
  armL.rotation.x = -1.1;
  armR.rotation.x = -1.1;
  body.add(armL, armR);
  const scarf = box(0.34, 0.1, 0.3, 2830692);
  scarf.position.y = 0.7;
  const knot = box(0.12, 0.12, 0.08, 2830692);
  knot.position.set(0, 0.64, 0.18);
  body.add(scarf, knot);
  const head = new THREE.Group();
  head.position.y = 0.92;
  body.add(head);
  const skull = box(0.5, 0.42, 0.44, COL.white);
  head.add(skull);
  const mkEar = (x) => {
    const e2 = ball(0.11, COL.black);
    e2.position.set(x, 0.22, -0.04);
    head.add(e2);
  };
  mkEar(-0.22);
  mkEar(0.22);
  const mkPatch = (x) => {
    const patch = box(0.15, 0.16, 0.02, 2764083);
    patch.position.set(x, 0.03, 0.22);
    const eye = box(0.07, 0.08, 0.022, 3495625);
    eye.position.set(x, 0.03, 0.23);
    head.add(patch, eye);
  };
  mkPatch(-0.12);
  mkPatch(0.12);
  const nose = box(0.05, 0.04, 0.02, COL.black);
  nose.position.set(0, -0.07, 0.23);
  head.add(nose);
  const star = new THREE.Mesh(new THREE.CircleGeometry(0.055, 5), new THREE.MeshBasicMaterial({ color: 9287925, side: THREE.DoubleSide }));
  star.position.set(0.19, -0.06, 0.226);
  head.add(star);
  const hat = new THREE.Group();
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.05, 8), mat(2830692));
  const coneH = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 7), mat(2830692));
  coneH.position.y = 0.26;
  coneH.rotation.z = -0.22;
  coneH.position.x = 0.06;
  brim.castShadow = true;
  coneH.castShadow = true;
  const hatStar = new THREE.Mesh(new THREE.CircleGeometry(0.08, 5), new THREE.MeshBasicMaterial({ color: 16177003, side: THREE.DoubleSide }));
  hatStar.position.set(0.18, 0.48, 0.02);
  hat.add(brim, coneH, hatStar);
  hat.position.y = 0.24;
  hat.rotation.z = 0.1;
  head.add(hat);
  return { group, body, head, legL, legR, armL, armR };
};
const buildCheckpointPanda = () => {
  const group = new THREE.Group();
  const s = 0.62;
  const inner = new THREE.Group();
  inner.scale.set(s, s, s);
  group.add(inner);
  const torso = box(0.46, 0.4, 0.4, COL.white);
  torso.position.y = 0.34;
  const belly = box(0.32, 0.26, 0.05, 16775922);
  belly.position.set(0, 0.32, 0.21);
  inner.add(torso, belly);
  const mkLeg = (x) => {
    const leg = box(0.14, 0.13, 0.3, COL.black);
    leg.position.set(x, 0.1, 0.2);
    inner.add(leg);
  };
  mkLeg(-0.15);
  mkLeg(0.15);
  const mkArm = (x) => {
    const arm = box(0.12, 0.26, 0.13, COL.black);
    arm.position.set(x, 0.34, 0.02);
    inner.add(arm);
  };
  mkArm(-0.27);
  mkArm(0.27);
  const head = new THREE.Group();
  head.position.y = 0.74;
  inner.add(head);
  const skull = box(0.52, 0.44, 0.46, COL.white);
  head.add(skull);
  const mkEar = (x) => {
    const e2 = ball(0.11, COL.black);
    e2.position.set(x, 0.24, -0.04);
    head.add(e2);
  };
  mkEar(-0.22);
  mkEar(0.22);
  const mkPatch = (x) => {
    const patch = box(0.15, 0.17, 0.02, 2764083);
    patch.position.set(x, 0.03, 0.23);
    const eye = box(0.07, 0.085, 0.022, 3495625);
    eye.position.set(x, 0.03, 0.24);
    head.add(patch, eye);
  };
  mkPatch(-0.12);
  mkPatch(0.12);
  const nose = box(0.05, 0.04, 0.02, COL.black);
  nose.position.set(0, -0.08, 0.24);
  head.add(nose);
  const star = new THREE.Mesh(new THREE.CircleGeometry(0.06, 5), new THREE.MeshBasicMaterial({ color: 9287925, side: THREE.DoubleSide }));
  star.position.set(0.2, -0.07, 0.236);
  head.add(star);
  const scarfMat = mat(9676484);
  const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.34), scarfMat);
  scarf.position.y = 0.56;
  inner.add(scarf);
  const topStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), new THREE.MeshStandardMaterial({ color: 16361684, emissive: 14362487, emissiveIntensity: 0.7, flatShading: true }));
  topStar.position.y = 1.18;
  topStar.visible = false;
  inner.add(topStar);
  return {
    group,
    setActivated: () => {
      scarfMat.color.setHex(16020150);
      topStar.visible = true;
    },
    reset: () => {
      scarfMat.color.setHex(9676484);
      topStar.visible = false;
    }
  };
};
const buildYua = () => {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const makeLeg = (x) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.48, 0);
    const thigh = box(0.12, 0.32, 0.14, COL.skin);
    thigh.position.y = -0.16;
    const sock = box(0.14, 0.22, 0.16, COL.white);
    sock.position.y = -0.48;
    const shoe = box(0.14, 0.1, 0.19, 2765381);
    shoe.position.set(0, -0.64, 0.02);
    leg.add(thigh, sock, shoe);
    return leg;
  };
  const legL = makeLeg(-0.11);
  const legR = makeLeg(0.11);
  body.add(legL, legR);
  const skirtInner = box(0.38, 0.12, 0.28, COL.white);
  skirtInner.position.y = 0.48;
  const skirtOuter = box(0.44, 0.1, 0.34, 8236244);
  skirtOuter.position.y = 0.4;
  body.add(skirtInner, skirtOuter);
  const shirt = box(0.48, 0.4, 0.32, 9355480);
  shirt.position.y = 0.72;
  const collar = box(0.34, 0.28, 0.02, COL.white);
  collar.position.set(0, 0.78, 0.17);
  collar.rotation.x = 0.15;
  const ribbon = box(0.14, 0.1, 0.04, 4882341);
  ribbon.position.set(0, 0.66, 0.18);
  body.add(shirt, collar, ribbon);
  const choker = box(0.36, 0.055, 0.28, COL.black);
  choker.position.y = 0.96;
  const pend = ball(0.038, COL.white);
  pend.position.set(0, 0.93, 0.15);
  body.add(choker, pend);
  const penBody = box(0.075, 0.095, 0.04, 1711918);
  penBody.position.set(-0.14, 0.76, 0.175);
  const penBelly = box(0.042, 0.055, 0.025, COL.white);
  penBelly.position.set(-0.14, 0.755, 0.195);
  const penBeak = box(0.018, 0.014, 0.02, 16347926);
  penBeak.position.set(-0.14, 0.785, 0.2);
  const penWingL = box(0.018, 0.05, 0.02, 1711918);
  penWingL.position.set(-0.166, 0.758, 0.18);
  penWingL.rotation.z = 0.3;
  const penWingR = box(0.018, 0.05, 0.02, 1711918);
  penWingR.position.set(-0.114, 0.758, 0.18);
  penWingR.rotation.z = -0.3;
  const mkPenEye = (dx) => {
    const e2 = ball(8e-3, COL.white);
    e2.position.set(-0.14 + dx, 0.782, 0.198);
    body.add(e2);
  };
  mkPenEye(-0.013);
  mkPenEye(0.013);
  body.add(penBody, penBelly, penBeak, penWingL, penWingR);
  const makeArm = (x) => {
    const arm = new THREE.Group();
    arm.position.set(x, 0.9, 0);
    const sleeve = box(0.13, 0.3, 0.15, 9355480);
    sleeve.position.y = -0.14;
    const cuff = box(0.14, 0.06, 0.16, COL.white);
    cuff.position.y = -0.32;
    const hand = box(0.1, 0.09, 0.1, COL.skin);
    hand.position.y = -0.42;
    arm.add(sleeve, cuff, hand);
    return arm;
  };
  const armL = makeArm(-0.3);
  const armR = makeArm(0.3);
  body.add(armL, armR);
  const head = new THREE.Group();
  head.position.y = 1.12;
  body.add(head);
  const face = box(0.44, 0.4, 0.38, COL.skin);
  head.add(face);
  const glassMat = new THREE.MeshStandardMaterial({ color: 3817810, flatShading: true, roughness: 0.6, metalness: 0.3 });
  const mkLens = (x) => {
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.012, 6, 14), glassMat);
    frame.position.set(x, 0.04, 0.2);
    frame.castShadow = true;
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.062, 14),
      new THREE.MeshStandardMaterial({ color: 10340584, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    lens.position.set(x, 0.04, 0.201);
    head.add(frame, lens);
  };
  mkLens(-0.11);
  mkLens(0.11);
  const bridge = box(0.06, 0.012, 0.02, 3817810);
  bridge.position.set(0, 0.04, 0.2);
  head.add(bridge);
  const mkEye = (x) => {
    const w = box(0.09, 0.095, 0.02, COL.white);
    w.position.set(x, 0.04, 0.195);
    const iris = box(0.05, 0.095, 0.022, 6986692);
    iris.position.set(x + 0.015, 0.04, 0.196);
    head.add(w, iris);
  };
  mkEye(-0.11);
  mkEye(0.11);
  const mkB = (x) => {
    const b = box(0.07, 0.03, 0.02, COL.blush);
    b.position.set(x, -0.05, 0.2);
    head.add(b);
  };
  mkB(-0.17);
  mkB(0.17);
  const mouth = box(0.05, 0.04, 0.02, 14904186);
  mouth.position.set(0, -0.1, 0.2);
  head.add(mouth);
  const hairTop = box(0.5, 0.18, 0.46, 15263984);
  hairTop.position.y = 0.24;
  const bangs = box(0.48, 0.15, 0.1, 15263984);
  bangs.position.set(0, 0.18, 0.16);
  const sideL = box(0.1, 0.52, 0.3, 14737644);
  sideL.position.set(-0.26, -0.08, 0);
  const sideR = sideL.clone();
  sideR.position.x = 0.26;
  const backHair = box(0.48, 0.5, 0.12, 15263984);
  backHair.position.set(0, -0.04, -0.2);
  head.add(hairTop, bangs, sideL, sideR, backHair);
  const longHair = box(0.42, 0.72, 0.12, 15263984);
  longHair.position.set(0, 0.6, -0.22);
  const hairTip = box(0.34, 0.16, 0.1, 14211304);
  hairTip.position.set(0, 0.22, -0.22);
  const blueStrand = box(0.08, 0.6, 0.06, 9684477);
  blueStrand.position.set(-0.18, 0.62, -0.2);
  body.add(longHair, hairTip, blueStrand);
  const hairband = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.028, 6, 20, Math.PI),
    new THREE.MeshStandardMaterial({ color: COL.white, flatShading: true, roughness: 0.9 })
  );
  hairband.rotation.x = -Math.PI / 2;
  hairband.rotation.z = Math.PI;
  hairband.position.set(0, 0.28, 0.02);
  head.add(hairband);
  const starPin = new THREE.Mesh(
    new THREE.CircleGeometry(0.06, 5),
    new THREE.MeshBasicMaterial({ color: 16639626, side: THREE.DoubleSide })
  );
  starPin.position.set(0.23, 0.32, 0.06);
  starPin.rotation.y = -0.3;
  head.add(starPin);
  return { group, body, head, legL, legR, armL, armR };
};
const buildCheckpointPenguin = () => {
  const group = new THREE.Group();
  const s = 0.62;
  const inner = new THREE.Group();
  inner.scale.set(s, s, s);
  group.add(inner);
  const torso = box(0.48, 0.56, 0.42, 1711918);
  torso.position.y = 0.42;
  const belly = box(0.34, 0.4, 0.06, 16777215);
  belly.position.set(0, 0.38, 0.2);
  inner.add(torso, belly);
  const mkWing = (x, rot) => {
    const w = box(0.09, 0.3, 0.16, 1711918);
    w.position.set(x, 0.42, 0.02);
    w.rotation.z = rot;
    inner.add(w);
  };
  mkWing(-0.29, 0.25);
  mkWing(0.29, -0.25);
  const mkFoot = (x) => {
    const f = box(0.14, 0.06, 0.22, 16347926);
    f.position.set(x, 0.03, 0.08);
    inner.add(f);
  };
  mkFoot(-0.13);
  mkFoot(0.13);
  const head = new THREE.Group();
  head.position.y = 0.82;
  inner.add(head);
  const skull = box(0.44, 0.34, 0.4, 1711918);
  head.add(skull);
  const faceWhite = box(0.3, 0.2, 0.03, 16777215);
  faceWhite.position.set(0, -0.02, 0.2);
  head.add(faceWhite);
  const mkEye = (x) => {
    const e2 = box(0.05, 0.07, 0.02, COL.black);
    e2.position.set(x, 0.02, 0.215);
    const hl = box(0.018, 0.02, 0.022, COL.white);
    hl.position.set(x + 0.012, 0.04, 0.216);
    head.add(e2, hl);
  };
  mkEye(-0.09);
  mkEye(0.09);
  const beak = box(0.08, 0.05, 0.08, 16347926);
  beak.position.set(0, -0.05, 0.23);
  head.add(beak);
  const star = new THREE.Mesh(new THREE.CircleGeometry(0.06, 5), new THREE.MeshBasicMaterial({ color: 9287925, side: THREE.DoubleSide }));
  star.position.set(0.17, -0.05, 0.216);
  head.add(star);
  const scarfMat = mat(9676484);
  const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.38), scarfMat);
  scarf.position.y = 0.64;
  inner.add(scarf);
  const topStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), new THREE.MeshStandardMaterial({ color: 16361684, emissive: 14362487, emissiveIntensity: 0.7, flatShading: true }));
  topStar.position.y = 1.2;
  topStar.visible = false;
  inner.add(topStar);
  return {
    group,
    setActivated: () => {
      scarfMat.color.setHex(16020150);
      topStar.visible = true;
    },
    reset: () => {
      scarfMat.color.setHex(9676484);
      topStar.visible = false;
    }
  };
};
export {
  SKINS,
  buildCharacter,
  buildCheckpointPanda,
  buildCheckpointPenguin,
  buildPandaWitch,
  buildYua
};
