import * as THREE from 'three';
import { OrbitControls } from './OrbitControls.js';

/* ---------- Telegram ---------- */
const tg = window.Telegram && window.Telegram.WebApp;
try { tg && tg.ready(); tg && tg.expand(); tg && tg.setHeaderColor && tg.setHeaderColor('#07080f'); tg && tg.setBackgroundColor && tg.setBackgroundColor('#07080f'); } catch (e) {}

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const nf = (v, d = 4) => (v == null || isNaN(v)) ? '–' : Number(v).toLocaleString('id-ID', { maximumFractionDigits: d });
const usd = (v) => v == null ? '–' : '$' + Number(v).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sgn = (v, d = 4) => v == null ? '–' : (v > 0 ? '+' : '') + nf(v, d);
const cls = (v) => v == null ? 'mut' : v > 0 ? 'pos' : v < 0 ? 'neg' : 'mut';
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- agents ---------- */
const AGENTS = [
  { id: 'screening', name: 'Hana', role: 'Screening', color: '#ff6fae', hair: '#ff9cc8', eye: '#ff3d8b', style: 'twin', desk: [-8, -2.2] },
  { id: 'analisa', name: 'Ren', role: 'Analisa Pool', color: '#5b8cff', hair: '#26305e', eye: '#3a6dff', style: 'spiky', glasses: true, desk: [-5, -2.2] },
  { id: 'buka', name: 'Kai', role: 'Buka Posisi', color: '#ffb03b', hair: '#ff7a2f', eye: '#e8641c', style: 'spiky2', desk: [-2, -2.2] },
  { id: 'pantau', name: 'Yuki', role: 'Pantau', color: '#38d6ff', hair: '#dfe9ff', eye: '#18b8ff', style: 'long', headset: true, desk: [-8, 1.4] },
  { id: 'tpsl', name: 'Aoi', role: 'Take Profit / Stop Loss', color: '#a46bff', hair: '#6a3fd1', eye: '#9b5cff', style: 'pony', desk: [-5, 1.4] },
  { id: 'laporan', name: 'Miko', role: 'Laporan', color: '#3ee6a0', hair: '#7a4a2b', eye: '#2bb67a', style: 'bob', desk: [-2, 1.4] },
  { id: 'dompet', name: 'Rin', role: 'Dompet', color: '#ffd84a', hair: '#ffe28a', eye: '#e0a100', style: 'buns', desk: [7, -2.2], room: 'tr' },
  { id: 'm_scan', name: 'Sora', role: 'Pemindai Meme', color: '#ff8a3d', hair: '#2b1d3a', eye: '#ff6a00', style: 'spiky', headset: true, desk: [13, -2.2], room: 'meme' },
  { id: 'm_buy', name: 'Taro', role: 'Sniper Beli', color: '#ff4f6d', hair: '#e8e8f0', eye: '#ff2d55', style: 'spiky2', desk: [16, -2.2], room: 'meme' },
  { id: 'm_exit', name: 'Nana', role: 'Penjaga Exit', color: '#c6ff4a', hair: '#3b8f4a', eye: '#5fd400', style: 'pony', desk: [13, 1.4], room: 'meme' },
  { id: 'm_acc', name: 'Kiko', role: 'Akuntan Meme', color: '#ffa8e0', hair: '#ff6fb5', eye: '#ff3da6', style: 'twin', glasses: true, desk: [16, 1.4], room: 'meme' },
];

/* ---------- state ---------- */
let D = null, prevD = null, selected = 'pantau', room = 'lp';

/* ---------- renderer ---------- */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0c1a');
scene.fog = new THREE.Fog('#0b0c1a', 30, 60);
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
controls.minDistance = 4; controls.maxDistance = 38; controls.maxPolarAngle = 1.32; controls.minPolarAngle = 0.35;

const ROOMS = { lp: { t: new THREE.Vector3(-4.6, 0.3, 0.2), off: new THREE.Vector3(6.5, 9.5, 11.5) }, tr: { t: new THREE.Vector3(7.0, 0.3, -1.4), off: new THREE.Vector3(4.5, 7.5, 9) }, meme: { t: new THREE.Vector3(14.9, 0.3, -1.0), off: new THREE.Vector3(3.5, 8.5, 11) } };
let camTween = null;
function flyTo(target, offset, dur = 1.1) {
  camTween = { t0: performance.now(), dur: dur * 1000, fromT: controls.target.clone(), fromP: camera.position.clone(), toT: target.clone(), toP: target.clone().add(offset) };
}
function fitOffset(off) { // push camera back on narrow screens
  const a = camera.aspect; const k = a < 0.75 ? 1.3 : a < 1 ? 1.12 : 0.9; return off.clone().multiplyScalar(k);
}
function goRoom(r, dur) { room = r; flyTo(ROOMS[r].t, fitOffset(ROOMS[r].off), dur); ['lp', 'tr', 'meme'].forEach((k) => $('r-' + k).classList.toggle('on', r === k)); $('roomtag').textContent = { lp: 'Lantai LP', tr: 'Ruang Trading', meme: 'Ruang Trading Meme' }[r]; }

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight('#c4cbff', '#3a2a50', 1.9));
const sun = new THREE.DirectionalLight('#fff1e0', 2.0);
sun.position.set(12, 16, 10); sun.target.position.set(4, 0, 0); scene.add(sun.target); sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536);
Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 11, bottom: -11, near: 1, far: 50 }); sun.shadow.bias = -0.0008;
scene.add(sun);
const pl1 = new THREE.PointLight('#ff5fa8', 14, 12, 1.6); pl1.position.set(-9, 3, -5); scene.add(pl1);
const pl2 = new THREE.PointLight('#38d6ff', 14, 12, 1.6); pl2.position.set(7, 3, -5); scene.add(pl2);
const pl3 = new THREE.PointLight('#8a6bff', 8, 10, 1.6); pl3.position.set(-3, 3, 3); scene.add(pl3);

/* ---------- materials ---------- */
const grad = (() => { const d = new Uint8Array([120, 185, 235, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...o });
const std = (c, r = 0.7, m = 0.05, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...o });
const outlineMat = new THREE.MeshBasicMaterial({ color: '#15101f', side: THREE.BackSide });
function withOutline(mesh, s = 1.06) { const o = new THREE.Mesh(mesh.geometry, outlineMat); o.scale.setScalar(s); mesh.add(o); return mesh; }
function sh(m) { m.castShadow = true; m.receiveShadow = true; return m; }
function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); return m; }
function canvasTex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, g: c.getContext('2d'), t }; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* ---------- office ---------- */
const office = new THREE.Group(); scene.add(office);
{
  // floor with tile texture
  const ft = canvasTex(512, 512); const g = ft.g;
  g.fillStyle = '#1b1d33'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#1e2139' : '#191b30'; g.fillRect(i * 64, j * 64, 64, 64); }
  g.strokeStyle = '#2a2d4d'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke(); }
  ft.t.wrapS = ft.t.wrapT = THREE.RepeatWrapping; ft.t.repeat.set(5, 3);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(21, 0.4, 12.4), [std('#24263f'), std('#24263f'), std('#1b1d33', 0.55, 0.1, { map: ft.t }), std('#24263f'), std('#2c2f50'), std('#24263f')]);
  floor.position.set(-0.2, -0.2, 0); floor.receiveShadow = true; office.add(floor);
  // trading room carpet
  const carpet = box(6.6, 0.03, 12, std('#1d2a3a', 0.9), 6.7, 0.015, 0); carpet.castShadow = false; office.add(carpet);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), std('#3a1f48', 0.95)); rug.rotation.x = -Math.PI / 2; rug.position.set(-5, 0.02, -0.4); rug.receiveShadow = true; office.add(rug);
  // walls
  const wallM = std('#191b31', 0.85);
  office.add(box(21, 3.4, 0.25, wallM, -0.2, 1.7, -6.1));
  office.add(box(0.25, 3.4, 12.4, wallM, -10.6, 1.7, 0));
  // neon strips
  const neon = (c) => new THREE.MeshBasicMaterial({ color: c });
  office.add(box(20.5, 0.06, 0.06, neon('#ff5fa8'), -0.2, 3.3, -5.95));
  office.add(box(0.06, 0.06, 12, neon('#38d6ff'), -10.45, 3.3, 0));
  office.add(box(20.5, 0.04, 0.04, neon('#7a5cff'), -0.2, 0.06, -5.95));
  // windows (night city) on left wall
  const wt = canvasTex(512, 256); const w = wt.g;
  const sky = w.createLinearGradient(0, 0, 0, 256); sky.addColorStop(0, '#0a0f2e'); sky.addColorStop(1, '#3a1d52'); w.fillStyle = sky; w.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 60; i++) { w.fillStyle = `rgba(255,255,255,${Math.random() * .8})`; w.fillRect(Math.random() * 512, Math.random() * 120, 2, 2); }
  w.fillStyle = '#ffe9b0'; w.beginPath(); w.arc(420, 50, 18, 0, 7); w.fill();
  for (let x = 0; x < 512; x += 28 + Math.random() * 20) { const h = 60 + Math.random() * 150, bw = 22 + Math.random() * 30; w.fillStyle = '#0d0f22'; w.fillRect(x, 256 - h, bw, h); for (let yy = 256 - h + 8; yy < 250; yy += 12) for (let xx = x + 4; xx < x + bw - 4; xx += 8) if (Math.random() < .35) { w.fillStyle = Math.random() < .5 ? '#ffd27a' : '#7ad8ff'; w.fillRect(xx, yy, 4, 5); } }
  [-3.4, 1.0, 4.6].forEach((z) => { const win = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshBasicMaterial({ map: wt.t })); win.rotation.y = Math.PI / 2; win.position.set(-10.46, 1.9, z); office.add(win); office.add(box(0.08, 1.85, 3.55, std('#2d3058'), -10.5, 1.9, z)); });
  // glass partition between rooms with door gap
  const glass = new THREE.MeshPhysicalMaterial({ color: '#9fdcff', transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, side: THREE.DoubleSide });
  const g1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 4.9), glass); g1.position.set(3.4, 1.3, -3.65); office.add(g1);
  const g2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 6.1), glass); g2.position.set(3.4, 1.3, 3.15); office.add(g2);
  office.add(box(0.1, 0.08, 12, std('#3a3f6e'), 3.4, 2.62, 0));
  office.add(box(0.1, 0.08, 12, std('#3a3f6e'), 3.4, 0.04, 0));
  // sign text on back wall
  const st = canvasTex(1024, 128); st.g.font = '900 78px system-ui'; st.g.textAlign = 'center'; st.g.textBaseline = 'middle';
  const sg = st.g.createLinearGradient(200, 0, 820, 0); sg.addColorStop(0, '#ff5fa8'); sg.addColorStop(1, '#38d6ff'); st.g.fillStyle = sg; st.g.shadowColor = '#ff5fa8'; st.g.shadowBlur = 24; st.g.fillText('NOBI · LP OFFICE', 512, 66);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.6), new THREE.MeshBasicMaterial({ map: st.t, transparent: true })); sign.position.set(-8.0, 2.85, -5.96); office.add(sign);
}
// plants
function plant(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
  g.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 16), toon('#f2efe6')))).position.y = 0.25;
  const lm = toon('#3fbf6e'); const lm2 = toon('#2c9a57');
  for (let i = 0; i < 7; i++) { const l = sh(new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), i % 2 ? lm : lm2)); l.position.set(Math.cos(i) * 0.18, 0.75 + (i % 3) * 0.2, Math.sin(i * 1.7) * 0.18); l.scale.set(1, 1.3, 1); g.add(l); }
  office.add(g); return g;
}
plant(-9.9, -5.4, 1.1); plant(2.8, -5.4); plant(-9.9, 5.6); plant(9.7, 5.5, 1.2); plant(9.7, -5.4);
// coffee machine
{ const g = new THREE.Group(); g.position.set(1.8, 0, -5.5);
  g.add(box(1.4, 0.9, 0.7, std('#2b2e4f'), 0, 0.45, 0)); g.add(box(0.55, 0.7, 0.5, std('#c9ccdf', 0.3, 0.6), -0.3, 1.25, 0)); g.add(box(0.2, 0.1, 0.1, new THREE.MeshBasicMaterial({ color: '#ff5fa8' }), -0.3, 1.45, 0.26));
  const cup = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.14, 12), toon('#fff'))); cup.position.set(0.35, 0.97, 0.1); g.add(cup); office.add(g); }
// water cooler
{ const g = new THREE.Group(); g.position.set(-10.0, 0, 3.0); g.add(box(0.5, 0.9, 0.5, toon('#e8ecff'), 0, 0.45, 0)); const b = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16), new THREE.MeshPhysicalMaterial({ color: '#7fd0ff', transparent: true, opacity: .6, roughness: .1 }))); b.position.y = 1.15; g.add(b); office.add(g); }
// sofa in trading room
{ const g = new THREE.Group(); g.position.set(5.2, 0, 4.4); const m = toon('#5b3fa8');
  g.add(box(2.4, 0.45, 0.9, m, 0, 0.3, 0)); g.add(box(2.4, 0.7, 0.25, m, 0, 0.75, -0.35)); g.add(box(0.25, 0.6, 0.9, m, -1.2, 0.5, 0)); g.add(box(0.25, 0.6, 0.9, m, 1.2, 0.5, 0));
  g.add(box(0.5, 0.35, 0.18, toon('#ff8fc4'), -0.6, 0.68, -0.15)); office.add(g); }

/* ---------- screens (live) ---------- */
const deskScreens = {};
function makeDesk(a) {
  const [x, z] = a.desk; const g = new THREE.Group(); g.position.set(x, 0, z);
  const top = std('#e9e4ff', 0.5); const leg = std('#3a3f66', 0.4, 0.5);
  g.add(box(1.7, 0.07, 0.85, top, 0, 0.66, 0));
  [[-0.78, -0.36], [0.78, -0.36], [-0.78, 0.36], [0.78, 0.36]].forEach(([lx, lz]) => g.add(box(0.06, 0.64, 0.06, leg, lx, 0.32, lz)));
  g.add(box(1.7, 0.03, 0.04, new THREE.MeshBasicMaterial({ color: a.color }), 0, 0.62, 0.43));
  // monitor angled so the camera sees it
  const mon = new THREE.Group(); mon.position.set(-0.45, 0.7, 0.05); mon.rotation.y = 0.55;
  mon.add(box(0.06, 0.25, 0.06, leg, 0, 0.12, -0.05)); mon.add(box(0.95, 0.6, 0.05, std('#14162a', 0.4, 0.3), 0, 0.55, -0.08));
  const sc = canvasTex(256, 160); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.53), new THREE.MeshBasicMaterial({ map: sc.t, toneMapped: false })); scr.position.set(0, 0.55, -0.05); mon.add(scr); g.add(mon);
  deskScreens[a.id] = sc;
  // keyboard, mug, papers
  g.add(box(0.5, 0.025, 0.17, std('#2c2f4a'), 0.15, 0.71, -0.15));
  const mug = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), toon(a.color))); mug.position.set(0.6, 0.76, 0.1); g.add(mug);
  g.add(box(0.28, 0.02, 0.36, std('#ffffff', 0.9), 0.55, 0.705, -0.2));
  // chair
  const ch = new THREE.Group(); ch.position.set(0.1, 0, -0.95); const cm = toon('#2e3156');
  ch.add(box(0.5, 0.08, 0.5, cm, 0, 0.42, 0)); ch.add(box(0.5, 0.55, 0.07, cm, 0, 0.72, -0.25)); ch.add(box(0.05, 0.4, 0.05, leg, 0, 0.2, 0)); g.add(ch);
  office.add(g); return g;
}
// ---- Ruang Trading Meme ----
const memeScreen = canvasTex(768, 384);
{
  const ft = canvasTex(256, 256); const g = ft.g; g.fillStyle = '#1a1626'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#211a30' : '#1a1528'; g.fillRect(i * 64, j * 64, 64, 64); }
  g.strokeStyle = '#3a2a4a'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); }
  ft.t.wrapS = ft.t.wrapT = THREE.RepeatWrapping; ft.t.repeat.set(4, 6);
  const fl = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 12.4), [std('#2a2238'), std('#2a2238'), std('#1a1626', 0.6, 0.1, { map: ft.t }), std('#2a2238'), std('#33284a'), std('#2a2238')]);
  fl.position.set(14.3, -0.2, 0); fl.receiveShadow = true; office.add(fl);
  office.add(box(8, 3.4, 0.25, std('#1d1830', 0.85), 14.3, 1.7, -6.1));
  office.add(box(0.25, 3.4, 12.4, std('#1d1830', 0.85), 18.4, 1.7, 0));
  office.add(box(7.8, 0.06, 0.06, new THREE.MeshBasicMaterial({ color: '#ff8a3d' }), 14.3, 3.3, -5.95));
  office.add(box(0.06, 0.06, 12, new THREE.MeshBasicMaterial({ color: '#c6ff4a' }), 18.25, 3.3, 0));
  const glass2 = new THREE.MeshPhysicalMaterial({ color: '#ffc89f', transparent: true, opacity: 0.12, roughness: 0.05, side: THREE.DoubleSide });
  const a1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 4.9), glass2); a1.position.set(10.4, 1.3, -3.65); office.add(a1);
  const a2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 6.1), glass2); a2.position.set(10.4, 1.3, 3.15); office.add(a2);
  office.add(box(0.1, 0.08, 12, std('#6e4a3a'), 10.4, 2.62, 0));
  const st = canvasTex(1024, 128); st.g.font = '900 74px system-ui'; st.g.textAlign = 'center'; st.g.textBaseline = 'middle';
  const sg = st.g.createLinearGradient(200, 0, 820, 0); sg.addColorStop(0, '#ff8a3d'); sg.addColorStop(1, '#c6ff4a'); st.g.fillStyle = sg; st.g.shadowColor = '#ff8a3d'; st.g.shadowBlur = 24; st.g.fillText('MEME TRADING DESK', 512, 66);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.52), new THREE.MeshBasicMaterial({ map: st.t, transparent: true })); sign.position.set(14.5, 3.0, -5.96); office.add(sign);
  office.add(box(4.4, 2.1, 0.12, std('#101225', 0.3, 0.4), 14.5, 1.75, -5.9));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.95), new THREE.MeshBasicMaterial({ map: memeScreen.t, toneMapped: false })); m.position.set(14.5, 1.75, -5.83); office.add(m);
  // beanbags + rocket lamp
  [[11.6, 4.4, '#ff8a3d'], [12.8, 4.9, '#c6ff4a']].forEach(([x, z, c]) => { const b = sh(new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 14), toon(c))); b.scale.set(1, 0.6, 1); b.position.set(x, 0.3, z); office.add(b); });
  const rk = new THREE.Group(); rk.position.set(17.6, 0, 5.2); rk.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.9, 16), toon('#f2efe6')))).position.y = 0.6; const nose = sh(new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 16), toon('#ff4f6d'))); nose.position.y = 1.25; rk.add(nose); office.add(rk);
  const pl4 = new THREE.PointLight('#ff8a3d', 14, 12, 1.6); pl4.position.set(14.5, 3, -5); scene.add(pl4);
  plant(17.8, -5.4); plant(10.9, 5.6, 0.9);
}
AGENTS.forEach(makeDesk);
// big wall screen (Pantau)
const wall = canvasTex(768, 384);
{ const fr = box(4.4, 2.3, 0.12, std('#101225', 0.3, 0.4), -5, 1.95, -5.9); office.add(fr);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.1), new THREE.MeshBasicMaterial({ map: wall.t, toneMapped: false })); m.position.set(-5, 1.95, -5.83); office.add(m); }
// trading board
const board = canvasTex(768, 384);
{ const fr = box(4.4, 2.3, 0.12, std('#101225', 0.3, 0.4), 6.8, 1.95, -5.9); office.add(fr);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.1), new THREE.MeshBasicMaterial({ map: board.t, toneMapped: false })); m.position.set(6.8, 1.95, -5.83); office.add(m); }

/* ---------- anime avatar ---------- */
function drawFace(a, expr) {
  const W = 512, H = 256; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const ey = 138, ex = 92;
  const eye = (cx, side) => {
    if (expr === 'blink' || expr === 'sleep') { g.strokeStyle = '#2a1830'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.arc(cx, ey - 6, 30, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); return; }
    if (expr === 'happy') { g.strokeStyle = '#2a1830'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.arc(cx, ey + 12, 28, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); return; }
    // white
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx, ey, 34, 40, 0, 0, 7); g.fill();
    // iris
    const ig = g.createLinearGradient(0, ey - 38, 0, ey + 38); ig.addColorStop(0, '#1a0f24'); ig.addColorStop(0.45, a.eye); ig.addColorStop(1, '#ffffff');
    g.fillStyle = ig; g.beginPath(); g.ellipse(cx + side * 2, ey + 3, 26, 35, 0, 0, 7); g.fill();
    g.fillStyle = '#140a1c'; g.beginPath(); g.ellipse(cx + side * 2, ey + 1, 12, 18, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(20,10,30,.6)'; g.lineWidth = 3; g.beginPath(); g.ellipse(cx + side * 2, ey + 3, 26, 35, 0, 0, 7); g.stroke();
    // highlights
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx - 9, ey - 12, 9, 11, -0.4, 0, 7); g.fill();
    g.beginPath(); g.arc(cx + 10, ey + 16, 5, 0, 7); g.fill();
    // lashes
    g.strokeStyle = '#1e1226'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.ellipse(cx, ey + 4, 38, 44, 0, 1.12 * Math.PI, 1.9 * Math.PI); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.moveTo(cx + side * 36, ey - 18); g.lineTo(cx + side * 48, ey - 26); g.stroke();
  };
  eye(W / 2 - ex, -1); eye(W / 2 + ex, 1);
  // brows
  g.strokeStyle = 'rgba(60,30,50,.85)'; g.lineWidth = 5; g.lineCap = 'round';
  const sad = expr === 'sad';
  [[-1], [1]].forEach(([s]) => { g.beginPath(); const bx = W / 2 + s * ex; g.moveTo(bx - 26 * s, ey - (sad ? 52 : 62)); g.quadraticCurveTo(bx, ey - (sad ? 70 : 72), bx + 26 * s, ey - (sad ? 74 : 64)); g.stroke(); });
  // blush
  g.fillStyle = 'rgba(255,110,150,.35)'; [[-1], [1]].forEach(([s]) => { g.beginPath(); g.ellipse(W / 2 + s * 128, ey + 50, 30, 14, 0, 0, 7); g.fill(); });
  g.strokeStyle = 'rgba(255,90,130,.5)'; g.lineWidth = 2; [[-1], [1]].forEach(([s]) => { for (let i = 0; i < 3; i++) { const bx = W / 2 + s * 128 - 14 + i * 12; g.beginPath(); g.moveTo(bx + 4, ey + 42); g.lineTo(bx - 2, ey + 56); g.stroke(); } });
  // mouth
  g.strokeStyle = '#5a2236'; g.fillStyle = '#c4405e'; g.lineWidth = 4;
  if (expr === 'happy') { g.beginPath(); g.moveTo(W / 2 - 18, ey + 62); g.quadraticCurveTo(W / 2, ey + 92, W / 2 + 18, ey + 62); g.closePath(); g.fill(); g.stroke(); }
  else if (sad) { g.beginPath(); g.moveTo(W / 2 - 12, ey + 74); g.quadraticCurveTo(W / 2, ey + 64, W / 2 + 12, ey + 74); g.stroke(); }
  else if (expr === 'sleep') { g.beginPath(); g.ellipse(W / 2, ey + 70, 6, 5, 0, 0, 7); g.stroke(); }
  else { g.beginPath(); g.moveTo(W / 2 - 10, ey + 68); g.quadraticCurveTo(W / 2, ey + 76, W / 2 + 10, ey + 68); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function tagTex(a, status, sel) {
  const W = 512, H = 150; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.font = '800 46px system-ui'; const t1 = `${a.name} · ${a.role.split(' /')[0]}`; g.font = '600 32px system-ui';
  g.font = '800 46px system-ui'; const w1 = g.measureText(t1).width; g.font = '600 32px system-ui'; const w2 = g.measureText(status).width;
  const w = Math.min(W - 8, Math.max(w1, w2) + 70), x = (W - w) / 2;
  g.fillStyle = sel ? 'rgba(25,20,45,.95)' : 'rgba(12,13,28,.86)'; rr(g, x, 6, w, 132, 28); g.fill();
  g.strokeStyle = a.color; g.lineWidth = sel ? 6 : 3; rr(g, x, 6, w, 132, 28); g.stroke();
  g.fillStyle = a.color; g.beginPath(); g.arc(x + 32, 50, 11, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = '800 46px system-ui'; g.textBaseline = 'middle'; g.fillText(t1, x + 52, 52);
  g.fillStyle = '#b9bde6'; g.font = '600 32px system-ui'; g.fillText(status, x + 52, 106);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function emoteTex(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  if (kind === 'zzz') { g.fillStyle = '#cfe0ff'; g.font = '900 54px system-ui'; g.fillText('Z', 20, 100); g.font = '900 40px system-ui'; g.fillText('z', 62, 62); g.font = '900 28px system-ui'; g.fillText('z', 92, 34); }
  if (kind === 'sweat') { g.fillStyle = '#7fd4ff'; g.beginPath(); g.moveTo(64, 14); g.quadraticCurveTo(104, 76, 64, 108); g.quadraticCurveTo(24, 76, 64, 14); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(54, 74, 8, 14, -0.3, 0, 7); g.fill(); }
  if (kind === 'star') { g.fillStyle = '#ffe14a'; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 22 : 54, an = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(64 + Math.cos(an) * r, 64 + Math.sin(an) * r); } g.fill(); }
  if (kind === 'eye') { g.fillStyle = '#38d6ff'; g.font = '900 70px system-ui'; g.textAlign = 'center'; g.fillText('!', 64, 100); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const EMO = { zzz: emoteTex('zzz'), sweat: emoteTex('sweat'), star: emoteTex('star'), eye: emoteTex('eye') };

function buildAvatar(a) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const skin = toon('#ffe1cf'), cloth = toon(a.color), dark = toon('#2a2740'), hairM = toon(a.hair), white = toon('#ffffff');
  // legs
  const legs = [];
  [-0.11, 0.11].forEach((x) => { const lg = new THREE.Group(); lg.position.set(x, 0.62, 0); const l = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.38, 4, 10), dark)); l.position.y = -0.27; lg.add(withOutline(l, 1.12));
    const shoe = sh(new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), toon('#1b1a2a'))); shoe.scale.set(1, 0.6, 1.5); shoe.position.set(0, -0.56, 0.05); lg.add(shoe); body.add(lg); legs.push(lg); });
  // torso + skirt/jacket
  const torso = withOutline(sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.32, 6, 14), cloth)), 1.07); torso.position.y = 0.92; torso.scale.set(1, 1, 0.8); body.add(torso);
  const hem = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.22, 18), cloth)); hem.position.y = 0.68; body.add(withOutline(hem, 1.06));
  const collar = sh(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 3), white)); collar.rotation.x = Math.PI; collar.position.set(0, 1.12, 0.15); body.add(collar);
  const tie = sh(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.03), toon('#ff3f6c'))); tie.position.set(0, 1.0, 0.19); body.add(tie);
  // arms
  const arms = [];
  [-1, 1].forEach((s) => { const ag = new THREE.Group(); ag.position.set(s * 0.27, 1.12, 0); const arm = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.3, 4, 10), cloth)); arm.position.y = -0.2; ag.add(withOutline(arm, 1.12));
    const hand = sh(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), skin)); hand.position.y = -0.42; ag.add(hand); ag.rotation.z = s * 0.12; body.add(ag); arms.push(ag); });
  // head
  const head = new THREE.Group(); head.position.y = 1.58; body.add(head);
  const neck = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.14, 10), skin)); neck.position.y = -0.4; head.add(neck);
  const skull = withOutline(sh(new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), skin)), 1.035); skull.scale.set(1, 0.96, 0.95); head.add(skull);
  const faces = { normal: drawFace(a, 'normal'), blink: drawFace(a, 'blink'), happy: drawFace(a, 'happy'), sad: drawFace(a, 'sad'), sleep: drawFace(a, 'sleep') };
  const faceMat = new THREE.MeshBasicMaterial({ map: faces.normal, transparent: true, depthWrite: false, alphaTest: 0.03, toneMapped: false });
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.428, 40, 24, Math.PI / 2 - 0.95, 1.9, Math.PI / 2 - 0.62, 1.24), faceMat);
  face.scale.set(1, 0.96, 0.95); face.renderOrder = 2; head.add(face);
  // ears
  [-1, 1].forEach((s) => { const e = sh(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), skin)); e.position.set(s * 0.41, -0.04, 0); e.scale.set(0.6, 1, 0.8); head.add(e); });
  // hair cap + back
  const cap = withOutline(sh(new THREE.Mesh(new THREE.SphereGeometry(0.455, 32, 18, 0, Math.PI * 2, 0, 1.18), hairM)), 1.03); cap.position.set(0, 0.03, -0.02); head.add(cap);
  const back = withOutline(sh(new THREE.Mesh(new THREE.SphereGeometry(0.46, 28, 18, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0.3, a.style === 'long' ? 2.5 : 2.0), hairM)), 1.03); back.position.set(0, 0.02, -0.03); head.add(back);
  // angel ring highlight
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.018, 6, 40, Math.PI * 1.1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .45 })); ring.rotation.set(-1.25, 0, Math.PI * 0.95); ring.position.set(0, 0.25, 0.05); head.add(ring);
  // bangs
  for (let i = -5; i <= 5; i++) { const b = withOutline(sh(new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.3 + (i % 2 ? 0.06 : 0), 6), hairM)), 1.06); const an = i * 0.15; b.position.set(Math.sin(an) * 0.37, 0.2 - Math.abs(i) * 0.02, Math.cos(an) * 0.33); b.rotation.set(Math.PI + 0.45, an, -i * 0.06); head.add(b); }
  // side locks
  [-1, 1].forEach((s) => { const l = withOutline(sh(new THREE.Mesh(new THREE.ConeGeometry(0.08, a.style === 'bob' ? 0.5 : 0.62, 7), hairM)), 1.06); l.rotation.set(Math.PI, 0, -s * 0.12); l.position.set(s * 0.39, -0.17, 0.12); head.add(l); });
  const sph = (r, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = withOutline(sh(new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), hairM)), 1.05); m.position.set(x, y, z); m.scale.set(sx, sy, sz); head.add(m); return m; };
  const tails = [];
  if (a.style === 'twin') { [-1, 1].forEach((s) => { sph(0.1, s * 0.4, 0.22, -0.12); const t = new THREE.Group(); t.position.set(s * 0.5, 0.2, -0.15); const tl = withOutline(sh(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.85, 10), hairM)), 1.05); tl.rotation.x = Math.PI; tl.position.y = -0.4; t.add(tl); t.rotation.z = s * 0.25; head.add(t); tails.push(t); }); const bow = toon('#ff3f8a'); [-1, 1].forEach((s) => { const b = sh(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 4), bow)); b.rotation.z = s * Math.PI / 2; b.position.set(s * 0.44, 0.3, -0.05); head.add(b); }); }
  if (a.style === 'pony') { sph(0.12, 0, 0.3, -0.42); const t = new THREE.Group(); t.position.set(0, 0.28, -0.48); const tl = withOutline(sh(new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.9, 10), hairM)), 1.05); tl.rotation.x = Math.PI - 0.25; tl.position.set(0, -0.4, -0.08); t.add(tl); head.add(t); tails.push(t); }
  if (a.style === 'buns') { sph(0.15, -0.3, 0.38, -0.12); sph(0.15, 0.3, 0.38, -0.12); }
  if (a.style === 'spiky' || a.style === 'spiky2') { for (let i = 0; i < 7; i++) { const sp = withOutline(sh(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 5), hairM)), 1.06); const an = i / 7 * Math.PI * 2; sp.position.set(Math.cos(an) * 0.24, 0.36, Math.sin(an) * 0.24 - 0.05); sp.rotation.set(Math.sin(an) * 0.9, 0, -Math.cos(an) * 0.9); head.add(sp); } }
  if (a.style === 'long') { [-1, 1].forEach((s) => { const l = withOutline(sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.6, 4, 10), hairM)), 1.04); l.position.set(s * 0.3, -0.45, -0.18); head.add(l); }); }
  if (a.style === 'bob' || a.style === 'buns' || a.style === 'twin') { const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.42, 0.05), new THREE.Vector3(0.05, 0.7, 0.1), new THREE.Vector3(0.18, 0.62, 0.15)); const ah = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.022, 6), hairM); head.add(ah); }
  if (a.glasses) { const gm = new THREE.MeshBasicMaterial({ color: '#1a1a2a' }); [-1, 1].forEach((s) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 24), gm); r.position.set(s * 0.17, -0.06, 0.4); head.add(r); }); head.add(box(0.12, 0.012, 0.012, gm, 0, -0.04, 0.42)); }
  if (a.headset) { const hm = toon('#222639'); const band = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.025, 6, 30, Math.PI), hm); band.position.y = 0.02; head.add(band); [-1, 1].forEach((s) => { const cup = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 16), toon(a.color))); cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.46, -0.02, 0); head.add(cup); }); const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), hm); mic.rotation.set(0, 0.6, Math.PI / 2); mic.position.set(-0.36, -0.2, 0.2); head.add(mic); }
  // selection ring
  const sel = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.58, 40), new THREE.MeshBasicMaterial({ color: a.color, transparent: true, opacity: 0, side: THREE.DoubleSide })); sel.rotation.x = -Math.PI / 2; sel.position.y = 0.03; root.add(sel);
  // hitbox
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.1; hit.userData.agent = a.id; root.add(hit);
  // tag + emote
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(a, '…'), depthTest: false, transparent: true })); tag.scale.set(1.9, 0.56, 1); tag.position.y = 2.55; tag.renderOrder = 10; root.add(tag);
  const emo = new THREE.Sprite(new THREE.SpriteMaterial({ map: EMO.zzz, transparent: true, depthTest: false })); emo.scale.set(0.45, 0.45, 1); emo.position.set(0.5, 2.15, 0); emo.visible = false; emo.renderOrder = 11; root.add(emo);
  root.scale.setScalar(0.7);
  scene.add(root);
  return { a, root, body, head, arms, legs, tails, face, faceMat, faces, sel, hit, tag, emo, expr: 'normal', blinkAt: performance.now() + 2000 + Math.random() * 3000, mode: 'idle', path: [], phase: Math.random() * 10, status: '', home: null, facing: 0, nextWander: performance.now() + 6000 + Math.random() * 12000, celebrateUntil: 0, activity: 'idle', lastTag: '' };
}

/* ---------- navigation ---------- */
const AISLE = -0.6;
const V = (x, z) => new THREE.Vector3(x, 0, z);
function spotOf(a) { const [x, z] = a.desk; return V(x + 0.1, z - 0.95); }
function viaOf(a) { const s = spotOf(a); if (s.z < AISLE - 1) { const col = a.room === 'tr' ? 8.9 : a.room === 'meme' ? (s.x < 14.5 ? 11.2 : 17.6) : s.x + 1.4; return [V(col, s.z), V(col, AISLE)]; } return [V(s.x, AISLE)]; }
const POI = {
  screen: { pos: V(-5, -4.7), via: [V(-3.5, -4.7), V(-3.5, AISLE)], face: Math.PI, isScreen: true },
  memeScreen: { pos: V(14.5, -4.7), via: [V(11.2, -4.7), V(11.2, AISLE)], face: Math.PI, isScreen: true },
  beanbag: { pos: V(12.2, 3.6), via: [V(12.2, AISLE)], face: 0 },
  rocket: { pos: V(17.0, 4.4), via: [V(17.0, AISLE)], face: Math.PI / 2 },
  coffee: { pos: V(1.6, -4.6), via: [V(1.6, AISLE)], face: Math.PI },
  window: { pos: V(-9.6, 4.6), via: [V(-9.6, AISLE)], face: -Math.PI / 2 },
  cooler: { pos: V(-9.5, 3.0), via: [V(-9.5, AISLE)], face: -Math.PI / 2 },
  sofa: { pos: V(5.2, 3.4), via: [V(5.2, AISLE)], face: 0 },
  board: { pos: V(6.8, -4.6), via: [V(8.9, -4.6), V(8.9, AISLE)], face: Math.PI },
};
const avatars = {};
AGENTS.forEach((a) => { const av = buildAvatar(a); const s = spotOf(a); av.root.position.copy(s); av.home = { pos: s, via: viaOf(a), face: 0 }; av.at = av.home; avatars[a.id] = av; });
function routeTo(av, dest) {
  if (av.at === dest && !av.path.length) return;
  const pts = [];
  const from = av.at || av.home;
  if (from) pts.push(...from.via);
  pts.push(...[...dest.via].reverse(), dest.pos);
  av.path = pts; av.dest = dest; av.mode = 'walk'; av.at = null;
}

/* ---------- confetti ---------- */
const CONF = 140; const confMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.06, 0.1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), CONF);
confMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); confMesh.frustumCulled = false; scene.add(confMesh);
const conf = []; const cols = ['#ff5fa8', '#38d6ff', '#ffe14a', '#3ee6a0', '#a46bff'].map((c) => new THREE.Color(c));
for (let i = 0; i < CONF; i++) { conf.push({ p: new THREE.Vector3(0, -10, 0), v: new THREE.Vector3(), r: new THREE.Euler(), life: 0 }); confMesh.setColorAt(i, cols[i % cols.length]); }
function burst(pos) { conf.forEach((c) => { c.p.copy(pos).add(new THREE.Vector3(0, 1.4, 0)); c.v.set((Math.random() - .5) * 3, 2.5 + Math.random() * 3, (Math.random() - .5) * 3); c.life = 2.5 + Math.random(); }); }
const dummy = new THREE.Object3D();

/* ---------- data-driven behaviour ---------- */
function rtStatus(name) { const r = (D && D.routines || []).find((x) => x.name.toLowerCase().includes(name)); return r ? r.status : null; }
function derive() {
  const st = {};
  const pos = (D && D.positions) || []; const has = pos.length > 0; const sol = D ? D.walletSol : null;
  const noFunds = sol != null && sol < 0.01;
  const scr = rtStatus('screening'); const mon = rtStatus('pantau'); const rep = rtStatus('per jam');
  const p = pos[0];
  st.screening = scr === 'aktif' ? { act: 'type', s: 'Memindai pool…', emo: null } : { act: 'sleep', s: 'Rutinitas dijeda', emo: 'zzz' };
  st.analisa = scr === 'aktif' ? { act: 'type', s: 'Cek filter MC/Vol/TVL' } : { act: 'idle', s: 'Menunggu kandidat', wander: true };
  st.buka = has ? { act: 'type', s: 'Posisi sudah terbuka', expr: 'happy' } : noFunds ? { act: 'worry', s: 'Butuh top-up SOL', emo: 'sweat', expr: 'sad' } : { act: 'idle', s: 'Siap buka posisi', wander: true };
  st.pantau = has ? { act: 'watch', s: p && p.inRange === false ? 'Keluar range!' : 'Memantau ' + (p.pool || 'posisi'), emo: 'eye' } : { act: 'idle', s: 'Tidak ada posisi', wander: true };
  st.tpsl = has && p ? { act: 'type', s: `PnL ${sgn(p.pnlPct, 2)}% · TP +${D.rules.tp}%` } : { act: 'idle', s: `TP +${D?.rules?.tp ?? 9}% / SL ${D?.rules?.sl ?? -3}%`, wander: true };
  st.laporan = rep === 'aktif' ? { act: 'type', s: 'Laporan per jam aktif', wander: true } : { act: 'idle', s: 'Laporan dijeda', wander: true };
  const tot = D ? D.totalUsd : null;
  st.dompet = noFunds ? { act: 'worry', s: `Saldo ${usd(tot)} · 0 SOL`, emo: 'sweat', expr: 'sad', wander: true } : { act: 'type', s: `Saldo ${usd(tot)}`, wander: true };
  const M = D && D.meme;
  if (!M || !M.available) { ['m_scan', 'm_buy', 'm_exit', 'm_acc'].forEach((k) => st[k] = { act: 'sleep', s: 'Belum ada data', emo: 'zzz' }); }
  else {
    const mo = (M.open || []).length, mp = M.paper || {}, mr = M.rules || {};
    st.m_scan = M.alive ? { act: 'type', s: `Memindai ${nf(M.scanner?.universe, 0)} token` } : { act: 'sleep', s: 'Bot pemindai mati', emo: 'zzz' };
    st.m_buy = mo ? { act: 'type', s: `${mo} posisi terbuka`, expr: 'happy' } : { act: 'idle', s: 'Menunggu sinyal lolos', wander: true };
    st.m_exit = mo ? { act: 'watch', s: 'Jaga TP/SL/stall', emo: 'eye', poi: POI.memeScreen } : { act: 'idle', s: `TP +${Math.round((mr.tp_pct || 0) * 100)}% · SL -${Math.round((mr.sl_pct || 0) * 100)}%`, wander: true };
    st.m_acc = (mp.dayPnl || 0) < 0 ? { act: 'worry', s: `Hari ini ${sgn(mp.dayPnl, 3)} SOL (paper)`, emo: 'sweat', expr: 'sad', wander: true } : (mp.dayPnl || 0) > 0 ? { act: 'type', s: `Hari ini ${sgn(mp.dayPnl, 3)} SOL (paper)`, expr: 'happy', wander: true } : { act: 'type', s: 'PnL hari ini 0 SOL', wander: true };
  }
  if (has && p && p.tp != null && p.pnlPct != null && p.pnlPct >= p.tp) { st.laporan = { act: 'celebrate', s: 'Take profit tercapai!', emo: 'star', expr: 'happy' }; st.tpsl = { act: 'celebrate', s: 'Take profit!', emo: 'star', expr: 'happy' }; }
  return st;
}
let ST = {};
function applyState() {
  ST = derive();
  for (const id in avatars) {
    const av = avatars[id]; const s = ST[id]; if (!s) continue;
    av.activity = s.act; av.status = s.s; av.wanderOk = !!s.wander; av.baseExpr = s.expr || 'normal';
    av.emo.visible = !!s.emo; if (s.emo) av.emo.material.map = EMO[s.emo];
    if (s.act === 'watch') routeTo(av, s.poi || POI.screen);
    else if (av.dest && av.dest.isScreen && s.act !== 'watch') routeTo(av, av.home);
    if (s.act === 'celebrate') { av.celebrateUntil = performance.now() + 9000; burst(av.root.position); }
    updateTag(av);
  }
  { const a0 = prevD && prevD.meme && (prevD.meme.trades || [])[0], b0 = D.meme && (D.meme.trades || [])[0];
    if (prevD && b0 && (!a0 || a0.closed !== b0.closed) && b0.pnlSol > 0) { ['m_acc', 'm_buy'].forEach((k) => { const av = avatars[k]; av.celebrateUntil = performance.now() + 9000; av.emo.visible = true; av.emo.material.map = EMO.star; burst(av.root.position); }); } }
  // TP transition detection: position closed and newest trade is take-profit
  if (prevD && (prevD.positions || []).length && !(D.positions || []).length) {
    const last = (D.trades || []).filter((t) => t.result != null).slice(-1)[0];
    if (last && /take|tp/i.test(last.reason || '') && last.result > 0) { const av = avatars.laporan; av.celebrateUntil = performance.now() + 10000; av.emo.visible = true; av.emo.material.map = EMO.star; burst(av.root.position); }
  }
}
function updateTag(av) { const key = av.status + (selected === av.a.id); if (key === av.lastTag) return; av.lastTag = key; av.tag.material.map.dispose(); av.tag.material.map = tagTex(av.a, av.status, selected === av.a.id); av.tag.material.needsUpdate = true; }

/* ---------- screens drawing ---------- */
function drawDesk(id, t) {
  const sc = deskScreens[id]; if (!sc) return; const g = sc.g; const a = AGENTS.find((x) => x.id === id);
  const bg = g.createLinearGradient(0, 0, 0, 160); bg.addColorStop(0, '#0c1230'); bg.addColorStop(1, '#170c2c'); g.fillStyle = bg; g.fillRect(0, 0, 256, 160);
  g.fillStyle = a.color; g.fillRect(0, 0, 256, 22); g.fillStyle = '#0b0b16'; g.font = '800 14px system-ui'; g.fillText(a.role.toUpperCase().slice(0, 26), 8, 16);
  const lines = screenLines(id); g.font = '700 17px system-ui';
  lines.forEach((l, i) => { g.fillStyle = l[1] || '#e7eaff'; g.fillText(l[0], 10, 48 + i * 24); });
  // decorative scanning line (no numbers implied)
  const y = 26 + ((t / 30) % 130); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, y, 256, 6);
  if (Math.floor(t / 500) % 2) { g.fillStyle = a.color; g.fillRect(10, 140, 10, 3); }
  sc.t.needsUpdate = true;
}
function screenLines(id) {
  if (!D) return [['Memuat data…']];
  const p = (D.positions || [])[0]; const R = D.rules || {};
  switch (id) {
    case 'screening': return [['Screening: ' + (rtStatus('screening') || '–')], ['MC > $500rb · Vol > $500rb', '#9aa0d0'], ['≥20 LP · TVL ≥ $100rb', '#9aa0d0'], ['Skip: FLOAT', '#9aa0d0']];
    case 'analisa': return [['Rentang bin'], [`${R.binsBelow ?? 30} bawah / ${R.binsAbove ?? 5} atas`, '#9aa0d0'], ['Prinsip:'], ['Rugi kecil, untung besar', '#9aa0d0']];
    case 'buka': return [['SOL: ' + nf(D.walletSol)], ['Maks ' + (R.maxSol ?? 0.25) + ' SOL · 1 posisi', '#9aa0d0'], [p ? 'Terbuka: ' + p.pool : (D.walletSol < 0.01 ? 'Butuh top-up SOL' : 'Siap'), p ? '#3ee6a0' : '#ffbf3c']];
    case 'pantau': return p ? [[p.pool], ['PnL ' + sgn(p.pnlPct, 2) + '%', p.pnlPct >= 0 ? '#3ee6a0' : '#ff5f6d'], [p.inRange === false ? 'Keluar range' : 'Dalam range', '#9aa0d0']] : [['Tidak ada posisi'], ['Menunggu posisi baru', '#9aa0d0']];
    case 'tpsl': return [['TP +' + (R.tp ?? 9) + '%', '#3ee6a0'], ['SL ' + (R.sl ?? -3) + '%', '#ff5f6d'], [p ? 'PnL ' + sgn(p.pnlPct, 2) + '%' : 'Tidak ada posisi', '#9aa0d0']];
    case 'laporan': return [['Hari ini: ' + sgn(D.pnlDay?.realizedSol) + ' SOL'], ['30 hari: ' + sgn(D.pnlMonth?.realizedSol) + ' SOL', cls(D.pnlMonth?.realizedSol) === 'neg' ? '#ff5f6d' : '#3ee6a0'], ['Ditutup 30h: ' + (D.pnlMonth?.closedCount ?? '–'), '#9aa0d0']];
    case 'm_scan': case 'm_buy': case 'm_exit': case 'm_acc': {
      const M = D.meme; if (!M || !M.available) return [['Belum ada data'], ['Nobitradememe', '#9aa0d0']];
      const mp = M.paper || {}, mr = M.rules || {};
      if (id === 'm_scan') return [['Scan: ' + nf(M.scanner?.scans, 0)], ['Universe ' + nf(M.scanner?.universe, 0), '#9aa0d0'], [M.alive ? 'Bot hidup' : 'Bot mati', M.alive ? '#3ee6a0' : '#ff5f6d']];
      if (id === 'm_buy') return [['Terbuka: ' + (M.open || []).length + '/' + (M.maxOpen ?? '–')], ['Ukuran ' + nf(M.sizeSol) + ' SOL', '#9aa0d0'], ['Mode PAPER', '#ffbf3c']];
      if (id === 'm_exit') return [['TP +' + Math.round((mr.tp_pct || 0) * 100) + '%', '#3ee6a0'], ['SL -' + Math.round((mr.sl_pct || 0) * 100) + '%', '#ff5f6d'], ['Stall ' + (mr.stall_sec ?? '–') + ' dtk', '#9aa0d0']];
      return [['Saldo ' + nf(mp.balance) + ' SOL'], ['Hari ini ' + sgn(mp.dayPnl, 3), (mp.dayPnl || 0) < 0 ? '#ff5f6d' : '#3ee6a0'], ['Menang ' + (mp.wins ?? 0) + '/' + (mp.closed ?? 0), '#9aa0d0']];
    }
    case 'dompet': return [['Total ' + usd(D.totalUsd)], ['SOL ' + nf(D.walletSol) + ' · USDC ' + nf(D.walletUsdc, 2), '#9aa0d0'], ...(D.tokens || []).slice(0, 2).map((t) => [t.symbol + ' ' + nf(t.amount, 0), '#ffd84a'])];
  }
  return [];
}
function drawWall(t) {
  const g = wall.g; const W = 768, H = 384; const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0d1638'); bg.addColorStop(1, '#2a0f3a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(120,140,255,.12)'; g.lineWidth = 1; for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = '#38d6ff'; g.font = '800 30px system-ui'; g.fillText('MONITOR POSISI LP', 28, 52);
  const live = D && Date.now() / 1000 - D.ts < 300; g.fillStyle = live ? '#3ee6a0' : '#ffbf3c'; g.beginPath(); g.arc(W - 40, 42, 9 + (Math.sin(t / 300) + 1) * 2, 0, 7); g.fill();
  const p = D && (D.positions || [])[0];
  if (!D) { g.fillStyle = '#fff'; g.font = '700 34px system-ui'; g.fillText('Memuat…', 28, 140); }
  else if (!p) { g.fillStyle = '#fff'; g.font = '900 56px system-ui'; g.fillText('Tidak ada posisi', 28, 150); g.fillStyle = '#aab0dd'; g.font = '600 26px system-ui'; g.fillText('SOL ' + nf(D.walletSol) + '  ·  Total ' + usd(D.totalUsd), 28, 200); g.fillText(D.walletSol < 0.01 ? 'Top-up SOL untuk buka LP lagi' : 'Menunggu sinyal screening', 28, 240); }
  else { g.fillStyle = '#fff'; g.font = '900 52px system-ui'; g.fillText(p.pool || 'Posisi', 28, 140); g.font = '800 64px system-ui'; g.fillStyle = (p.pnlPct || 0) >= 0 ? '#3ee6a0' : '#ff5f6d'; g.fillText(sgn(p.pnlPct, 2) + '%', 28, 220);
    g.fillStyle = '#aab0dd'; g.font = '600 24px system-ui'; g.fillText(`Modal ${nf(p.deposit)} SOL · Nilai ${nf(p.value)} SOL · ${p.inRange === false ? 'keluar range' : 'dalam range'}`, 28, 262);
    const sl = p.sl ?? -3, tp = p.tp ?? 9; const x0 = 28, x1 = W - 28, y = 310; g.fillStyle = '#20244a'; rr(g, x0, y, x1 - x0, 18, 9); g.fill(); const f = Math.max(0, Math.min(1, ((p.pnlPct || 0) - sl) / (tp - sl))); g.fillStyle = (p.pnlPct || 0) >= 0 ? '#3ee6a0' : '#ff5f6d'; rr(g, x0, y, (x1 - x0) * f, 18, 9); g.fill(); g.fillStyle = '#aab0dd'; g.font = '600 20px system-ui'; g.fillText('SL ' + sl + '%', x0, y + 48); g.fillText('TP +' + tp + '%', x1 - 90, y + 48); }
  wall.t.needsUpdate = true;
}
function drawMeme(t) {
  const g = memeScreen.g; const W = 768, H = 384; const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#2a1208'); bg.addColorStop(1, '#14231a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = '#ff8a3d'; g.font = '800 30px system-ui'; g.fillText('RADAR MEME · hp1b', 28, 50);
  const M = D && D.meme;
  if (!M || !M.available) { g.fillStyle = '#fff'; g.font = '800 46px system-ui'; g.fillText('Belum ada data', 28, 150); memeScreen.t.needsUpdate = true; return; }
  g.fillStyle = '#ffbf3c'; rr(g, W - 200, 22, 172, 40, 20); g.fill(); g.fillStyle = '#1a1000'; g.font = '800 22px system-ui'; g.fillText('PAPER', W - 155, 50);
  const mp = M.paper || {};
  g.fillStyle = '#fff'; g.font = '900 50px system-ui'; g.fillText(nf(mp.balance) + ' SOL', 28, 120);
  g.fillStyle = (mp.pnlSol || 0) < 0 ? '#ff5f6d' : '#3ee6a0'; g.font = '700 26px system-ui'; g.fillText('PnL ' + sgn(mp.pnlSol) + ' SOL · Menang ' + (mp.wins ?? 0) + '/' + (mp.closed ?? 0), 28, 160);
  g.fillStyle = '#aab0dd'; g.font = '600 20px system-ui'; g.fillText('Token terbaru di radar:', 28, 202);
  (M.feed || []).slice(0, 5).forEach((f, i) => { const y = 236 + i * 30; g.fillStyle = f.passed ? '#3ee6a0' : '#e7eaff'; g.font = '700 20px system-ui'; g.fillText(f.sym || '?', 28, y); g.fillStyle = '#9aa0d0'; g.font = '500 18px system-ui'; g.fillText(('$' + nf(f.mcapUsd, 0) + ' · ' + (f.verdict || '')).slice(0, 52), 170, y); });
  const y = 26 + ((t / 25) % 330); g.fillStyle = 'rgba(255,140,60,.07)'; g.fillRect(0, y, W, 8);
  memeScreen.t.needsUpdate = true;
}
function drawBoard() {
  const g = board.g; const W = 768, H = 384; const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#08243a'); bg.addColorStop(1, '#141038'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = '#ffd84a'; g.font = '800 30px system-ui'; g.fillText('RIWAYAT TRADE LP', 28, 52);
  if (!D) { board.t.needsUpdate = true; return; }
  g.fillStyle = '#aab0dd'; g.font = '600 22px system-ui'; g.fillText(`Menang ${D.wins}/${D.closed} · 30 hari ${sgn(D.pnlMonth?.realizedSol)} SOL`, 28, 88);
  const tr = (D.trades || []).filter((t) => t.result != null).slice(-7).reverse();
  tr.forEach((t, i) => { const y = 132 + i * 34; g.fillStyle = '#e7eaff'; g.font = '700 22px system-ui'; g.fillText(`#${t.n}  ${t.pool}`.slice(0, 34), 28, y); g.fillStyle = t.result > 0 ? '#3ee6a0' : t.result < 0 ? '#ff5f6d' : '#aab0dd'; g.textAlign = 'right'; g.fillText((t.approx ? '~' : '') + sgn(t.result) + ' SOL', W - 28, y); g.textAlign = 'left'; });
  board.t.needsUpdate = true;
}

/* ---------- interaction ---------- */
const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2(); let down = null;
canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 7) return; const r = canvas.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(Object.values(avatars).map((a) => a.hit)); if (hits[0]) select(hits[0].object.userData.agent, true);
});
let follow = null;
function select(id, zoom) {
  selected = id; renderChips(); renderPanel(); Object.values(avatars).forEach(updateTag);
  if (zoom) { const av = avatars[id]; follow = id; flyTo(av.root.position.clone().add(new THREE.Vector3(0, 0.9, 0)), new THREE.Vector3(1.8, 2.2, 3.4), 1.0); const ar = av.a.room || 'lp'; if (ar !== room) { room = ar; ['lp', 'tr', 'meme'].forEach((k) => $('r-' + k).classList.toggle('on', ar === k)); $('roomtag').textContent = { lp: 'Lantai LP', tr: 'Ruang Trading', meme: 'Ruang Trading Meme' }[ar]; } }
}
$('reset').onclick = () => { follow = null; goRoom(room); };
$('r-lp').onclick = () => { follow = null; goRoom('lp'); };
$('r-tr').onclick = () => { follow = null; goRoom('tr'); if (selected !== 'dompet') select('dompet', false); };
$('r-meme').onclick = () => { follow = null; goRoom('meme'); if (!selected.startsWith('m_')) select('m_acc', false); };
controls.addEventListener('start', () => { follow = null; camTween = null; });

/* ---------- UI ---------- */
function renderChips() {
  $('chips').innerHTML = AGENTS.map((a) => { const s = ST[a.id]; const dc = !s ? '#555' : s.act === 'sleep' || s.act === 'worry' ? '#ffbf3c' : s.act === 'idle' ? '#8d92b8' : '#3ee6a0';
    return `<button class="chip ${selected === a.id ? 'on' : ''}" style="--c:${a.color}" data-id="${a.id}"><span class="av" style="background:${a.color}">${a.name[0]}</span>${a.role.split(' /')[0]}<span class="sd" style="background:${dc}"></span></button>`; }).join('');
  $('chips').querySelectorAll('.chip').forEach((b) => b.onclick = () => { const id = b.dataset.id; const a = AGENTS.find((x) => x.id === id); if ((a.room || 'lp') !== room) goRoom(a.room || 'lp', 0.6); select(id, true); });
}
const ACT = { type: 'Sedang bekerja', sleep: 'Tidur (dijeda)', idle: 'Santai / standby', worry: 'Khawatir', watch: 'Memantau layar', celebrate: 'Merayakan!' };
function kv(rows) { return '<div class="kv">' + rows.map(([k, v, c]) => `<span>${k}</span><b class="${c || ''}">${v}</b>`).join('') + '</div>'; }
function renderPanel() {
  const a = AGENTS.find((x) => x.id === selected); const s = ST[a.id] || {}; if (!D) { $('panel').innerHTML = 'Memuat data…'; return; }
  const p = (D.positions || [])[0]; const R = D.rules || {}; let body = '', note = '';
  switch (a.id) {
    case 'screening': body = kv([['Rutinitas screening', rtStatus('screening') || '–', rtStatus('screening') === 'aktif' ? 'pos' : 'mut'], ['Market cap min', '$500.000'], ['Volume 24j min', '$500.000'], ['Jumlah LP min', '20'], ['TVL min', '$100.000'], ['Dilewati', (R.skip || []).join(', ')]]); note = rtStatus('screening') === 'aktif' ? 'Hana memindai pool Meteora setiap 5 menit.' : 'Screening sedang dijeda, jadi Hana tidur dulu sampai modal baru masuk.'; break;
    case 'analisa': body = kv([['Rentang bawah', (R.binsBelow ?? 30) + ' bin'], ['Rentang atas', (R.binsAbove ?? 5) + ' bin'], ['Maks per posisi', (R.maxSol ?? 0.25) + ' SOL'], ['Maks posisi', R.maxPositions ?? 1], ['Prinsip', R.principle || '–']]); note = 'Ren mengecek setiap kandidat terhadap filter sebelum posisi dibuka.'; break;
    case 'buka': body = kv([['SOL di dompet', nf(D.walletSol)], ['Ukuran posisi maks', (R.maxSol ?? 0.25) + ' SOL'], ['Posisi terbuka', (D.positions || []).length]]); note = p ? 'Posisi sudah terbuka, Kai menunggu posisi ditutup.' : D.walletSol < 0.01 ? 'SOL kosong, jadi belum bisa buka posisi atau bayar biaya transaksi. Top-up sekitar 0,35 SOL untuk lanjut LP.' : 'Siap membuka posisi saat ada kandidat yang lolos filter.'; break;
    case 'pantau': body = p ? kv([['Pool', p.pool], ['Modal', nf(p.deposit) + ' SOL'], ['Nilai', nf(p.value) + ' SOL'], ['PnL', sgn(p.pnlSol) + ' SOL (' + sgn(p.pnlPct, 2) + '%)', cls(p.pnlPct)], ['Range', p.inRange === false ? 'Keluar range' : p.inRange ? 'Dalam range' : '–']]) : kv([['Posisi terbuka', 'Tidak ada'], ['Rutinitas pantau', rtStatus('pantau') || '–', 'mut']]); note = p ? 'Yuki berdiri di depan layar besar selama posisi terbuka.' : 'Tidak ada posisi, jadi Yuki santai berkeliling kantor. Saat posisi dibuka, Yuki akan berjalan ke layar besar.'; break;
    case 'tpsl': body = kv([['Take profit', '+' + (R.tp ?? 9) + '%', 'pos'], ['Stop loss', (R.sl ?? -3) + '%', 'neg'], ['PnL posisi sekarang', p ? sgn(p.pnlPct, 2) + '%' : 'Tidak ada posisi', p ? cls(p.pnlPct) : 'mut']]); note = 'Posisi ditutup otomatis saat menyentuh TP atau SL.'; break;
    case 'laporan': body = kv([['PnL hari ini (UTC)', sgn(D.pnlDay?.realizedSol) + ' SOL', cls(D.pnlDay?.realizedSol)], ['PnL 30 hari', sgn(D.pnlMonth?.realizedSol) + ' SOL', cls(D.pnlMonth?.realizedSol)], ['Ditutup 30 hari', D.pnlMonth?.closedCount ?? '–'], ['Menang (catatan trade)', `${D.wins} dari ${D.closed}`], ['Perubahan vs modal awal', sgn(D.changeSol) + ' SOL', cls(D.changeSol)]]); note = 'Miko merayakan dengan konfeti setiap kali posisi kena take profit.'; break;
    case 'm_scan': case 'm_buy': case 'm_exit': case 'm_acc': {
      const M = D.meme; if (!M || !M.available) { body = kv([['Data', 'Belum ada']]); note = 'Belum ada data trading meme dari Nobitradememe di box.'; break; }
      const mp = M.paper || {}, mr = M.rules || {}, lv = M.live || {};
      if (a.id === 'm_scan') { body = kv([['Status bot', M.alive ? 'Hidup' : 'Mati', M.alive ? 'pos' : 'neg'], ['Scan terakhir', M.scanner?.last || '–'], ['Total scan', nf(M.scanner?.scans, 0)], ['Token di universe', nf(M.scanner?.universe, 0)], ...(M.scanner?.topReasons || []).slice(0, 3).map((r) => ['Ditolak: ' + r.r, nf(r.n, 0)])]); note = 'Sora memindai token baru Pump.fun dan menolak yang tidak lolos filter.'; }
      if (a.id === 'm_buy') { body = kv([['Posisi terbuka', (M.open || []).length + ' / ' + (M.maxOpen ?? '–')], ['Ukuran per trade (paper)', nf(M.sizeSol) + ' SOL'], ['Live trading', lv.enabled ? 'Aktif' : 'Belum aktif', lv.enabled ? 'pos' : 'mut'], ['Dompet live (on-chain)', nf(lv.walletSol) + ' SOL']]); note = 'Semua trade meme saat ini PAPER (simulasi), bukan uang sungguhan. Mode live belum dinyalakan.'; }
      if (a.id === 'm_exit') { body = kv([['Take profit', '+' + Math.round((mr.tp_pct || 0) * 100) + '%', 'pos'], ['Stop loss', '-' + Math.round((mr.sl_pct || 0) * 100) + '%', 'neg'], ['Stall exit', (mr.stall_sec ?? '–') + ' dtk & ≤ ' + Math.round((mr.stall_g || 0) * 100) + '%'], ['Batas waktu', Math.round((mr.time_stop_sec || 0) / 60) + ' mnt'], ['Dev maks', (mr.onchain_dev_max_pct ?? '–') + '%'], ['Top10 maks', (mr.onchain_top10_max_pct ?? '–') + '%']]); note = (M.open || []).length ? 'Nana berdiri di depan radar selama ada posisi terbuka.' : 'Tidak ada posisi meme terbuka, Nana santai.'; }
      if (a.id === 'm_acc') { body = kv([['Saldo paper', nf(mp.balance) + ' SOL'], ['Modal awal paper', nf(mp.startSol) + ' SOL'], ['PnL hari ini', sgn(mp.dayPnl) + ' SOL', cls(mp.dayPnl)], ['PnL total', sgn(mp.pnlSol) + ' SOL', cls(mp.pnlSol)], ['Win rate', (mp.wr ?? '–') + '% (' + (mp.wins ?? 0) + '/' + (mp.closed ?? 0) + ')']]); note = 'Angka dari buku besar paper hp1b milik Nobitradememe. Kiko merayakan saat ada trade menang.'; }
      break;
    }
    case 'dompet': body = kv([['Total nilai', usd(D.totalUsd)], ['SOL', nf(D.walletSol)], ['USDC', nf(D.walletUsdc, 2)], ...(D.tokens || []).map((t) => [t.symbol, nf(t.amount, 2) + (t.valueUsd != null ? ' (' + usd(t.valueUsd) + ')' : '')]), ['Modal awal', nf(D.startSol) + ' SOL'], ['Alamat', D.walletShort || '–']]); note = D.walletSol < 0.01 ? 'SOL 0, jadi token tidak bisa dijual dan LP tidak bisa dibuka sampai ada top-up untuk biaya.' : 'Saldo cukup untuk biaya transaksi.'; break;
  }
  $('panel').innerHTML = `<div class="ph"><div class="av" style="background:${a.color}">${a.name[0]}</div><div><h3>${a.name} · ${a.role}</h3><p>${ACT[s.act] || ''}</p></div></div><div class="badge"><span class="sd" style="width:7px;height:7px;border-radius:50%;background:${a.color}"></span>${s.s || ''}</div>${body}<div class="note">${note}</div>`;
}
function renderMeme() {
  const M = D.meme; const el = $('meme');
  if (!M || !M.available) { el.innerHTML = '<div class="mut">Belum ada data trading meme dari Nobitradememe.</div>'; return; }
  const mp = M.paper || {}, lv = M.live || {};
  const age = M.ts ? Math.round(Date.now() / 1000 - M.ts) : null;
  el.innerHTML = `<div class="badge"><span class="sd" style="width:7px;height:7px;border-radius:50%;background:${M.alive ? '#3ee6a0' : '#ff5f6d'}"></span>Mode PAPER (simulasi) · bot ${M.alive ? 'hidup' : 'mati'}${age != null ? ' · ' + (age < 120 ? age + ' dtk' : Math.round(age / 60) + ' mnt') + ' lalu' : ''}</div>` +
    kv([['Saldo paper', nf(mp.balance) + ' SOL'], ['PnL total', sgn(mp.pnlSol) + ' SOL', cls(mp.pnlSol)], ['PnL hari ini', sgn(mp.dayPnl) + ' SOL', cls(mp.dayPnl)], ['Win rate', (mp.wr ?? '–') + '% (' + (mp.wins ?? 0) + '/' + (mp.closed ?? 0) + ')'], ['Posisi terbuka', (M.open || []).length], ['Live trading', lv.enabled ? 'Aktif' : 'Belum aktif (dompet live ' + nf(lv.walletSol) + ' SOL)', lv.enabled ? 'pos' : 'mut']]) +
    '<div style="margin-top:8px">' + ((M.trades || []).slice(0, 6).map((t) => `<div class="tr"><b class="mut">🪙</b><div>${t.sym}<small>${(t.opened || '').slice(5, 16)} → ${(t.closed || '').slice(11, 16)} · ${t.reason}</small></div><b class="${cls(t.pnlSol)}">${sgn(t.pnlSol)} SOL</b></div>`).join('') || '<div class="mut" style="padding:8px 2px">Belum ada trade meme yang ditutup.</div>') + '</div>';
}
function renderLists() {
  renderMeme();
  const tr = (D.trades || []).slice(-6).reverse();
  $('trades').innerHTML = tr.length ? tr.map((t) => `<div class="tr"><b class="mut">#${t.n}</b><div>${t.pool}<small>${t.opened} → ${t.closed} · ${t.reason}</small></div><b class="${cls(t.result)}">${t.result == null ? '–' : (t.approx ? '~' : '') + sgn(t.result) + ' SOL'}</b></div>`).join('') : '<div class="mut">Belum ada trade.</div>';
  $('routines').innerHTML = (D.routines || []).map((r) => `<div class="rt"><span>${r.name}</span><span class="tag ${r.status === 'aktif' ? 'on' : 'off'}">${r.status}</span></div>`).join('') || '<div class="mut">–</div>';
  $('s-pos').textContent = (D.positions || []).length ? (D.positions || []).length : 'Tidak ada';
  $('s-usd').textContent = usd(D.totalUsd); $('s-sol').textContent = nf(D.walletSol);
  const pm = D.pnlMonth?.realizedSol; $('s-pnl').textContent = sgn(pm, 3); $('s-pnl').className = cls(pm);
}
function updatePill() {
  if (!D) return; const age = Math.max(0, Math.round(Date.now() / 1000 - D.ts)); const el = $('pill');
  const txt = age < 60 ? age + ' dtk lalu' : age < 3600 ? Math.round(age / 60) + ' mnt lalu' : Math.round(age / 3600) + ' jam lalu';
  el.className = 'pill' + (age > 300 ? ' stale' : ''); $('pillt').textContent = (age > 300 ? 'Data tertunda · ' : 'LIVE · ') + txt;
}

/* ---------- data loop ---------- */
const REFRESH = 30000;
async function load() {
  try {
    const r = await fetch('data.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw new Error(r.status);
    const d = await r.json(); prevD = D; D = d; applyState(); renderChips(); renderPanel(); renderLists(); drawBoard(); updatePill();
    $('foot').textContent = `Data diperbarui otomatis tiap ±1 menit dari dompet Syra (halaman cek tiap ${REFRESH / 1000} dtk). Terakhir: ${new Date(D.ts * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB. Tanpa token atau kunci rahasia.`;
  } catch (e) { $('pill').className = 'pill err'; $('pillt').textContent = 'Gagal memuat data'; }
}
load(); setInterval(load, REFRESH); setInterval(updatePill, 5000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });

/* ---------- animation ---------- */
const clock = new THREE.Clock(); let lastScreen = 0;
const wanderSpots = { lp: [POI.coffee, POI.window, POI.cooler], tr: [POI.sofa, POI.board, POI.coffee], meme: [POI.beanbag, POI.rocket, POI.memeScreen] };
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05); const now = performance.now(); const t = now / 1000;
  for (const id in avatars) {
    const av = avatars[id]; const { body, head, arms, legs, tails, root } = av; av.phase += dt;
    const celebrating = now < av.celebrateUntil;
    // wander scheduling
    if (av.mode !== 'walk' && av.wanderOk && !celebrating && now > av.nextWander) {
      av.nextWander = now + 14000 + Math.random() * 16000;
      if (av.at === av.home) { const list = id === 'laporan' ? [POI.coffee, { pos: V(7.4, -3.2), via: [V(8.9, -3.2), V(8.9, AISLE)], face: Math.PI / 2 }] : id === 'dompet' ? wanderSpots.tr : av.a.room === 'meme' ? wanderSpots.meme : wanderSpots.lp; routeTo(av, list[Math.floor(Math.random() * list.length)]); }
      else routeTo(av, av.home);
    }
    if (!av.wanderOk && av.mode !== 'walk' && av.at !== av.home && !(av.dest && av.dest.isScreen)) routeTo(av, av.home);
    // movement
    let walking = false;
    if (av.mode === 'walk' && av.path.length) {
      const tgt = av.path[0]; const d = tgt.clone().sub(root.position); d.y = 0; const dist = d.length(); const sp = 1.25 * dt;
      if (dist < sp) { root.position.copy(tgt); av.path.shift(); if (!av.path.length) { av.mode = 'idle'; av.at = av.dest; av.facing = av.dest.face || 0; if (av.dest !== av.home && !av.dest.isScreen) av.nextWander = now + 5000 + Math.random() * 5000; } }
      else { root.position.addScaledVector(d.normalize(), sp); av.facing = Math.atan2(d.x, d.z); walking = true; }
    }
    // rotate smoothly
    let dr = av.facing - root.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); root.rotation.y += dr * Math.min(1, dt * 8);
    // poses
    const atHome = av.at === av.home && !walking;
    const act = celebrating ? 'celebrate' : walking ? 'walk' : (av.activity === 'watch' && av.at && av.at.isScreen) ? 'watch' : atHome ? av.activity : 'idle';
    let armL = 0.12, armR = -0.12, armXL = 0, armXR = 0, legA = 0, bob = Math.sin(av.phase * 2) * 0.015, headX = 0, headZ = 0, headY = 0, jump = 0;
    if (act === 'walk') { const s = Math.sin(av.phase * 9); legA = s * 0.6; armXL = -s * 0.6; armXR = s * 0.6; bob = Math.abs(Math.cos(av.phase * 9)) * 0.06; }
    else if (act === 'type') { armXL = -1.15 + Math.sin(av.phase * 22) * 0.12; armXR = -1.15 + Math.sin(av.phase * 22 + 1.7) * 0.12; armL = 0.35; armR = -0.35; headX = 0.18 + Math.sin(av.phase * 3) * 0.03; headY = -0.3; }
    else if (act === 'sleep') { headX = 0.45; headZ = 0.25 + Math.sin(av.phase * 1.2) * 0.04; armXL = armXR = -0.9; armL = 0.4; armR = -0.4; bob = Math.sin(av.phase * 1.2) * 0.02; }
    else if (act === 'worry') { headZ = Math.sin(av.phase * 1.5) * 0.12; armXL = -0.4; armXR = -0.4; armL = 0.6; armR = -0.6; headX = 0.1; }
    else if (act === 'watch') { headX = -0.15 + Math.sin(av.phase * 0.8) * 0.05; headY = Math.sin(av.phase * 0.5) * 0.25; armXR = -0.5; armR = -0.6; }
    else if (act === 'celebrate') { jump = Math.abs(Math.sin(av.phase * 7)) * 0.35; armL = 2.6 + Math.sin(av.phase * 14) * 0.25; armR = -2.6 - Math.sin(av.phase * 14) * 0.25; headZ = Math.sin(av.phase * 7) * 0.12; av.facing = Math.sin(av.phase * 1.5) * 0.6; if (Math.random() < dt * 0.6) burst(root.position); }
    else { headY = Math.sin(av.phase * 0.4) * 0.3; headZ = Math.sin(av.phase * 0.7) * 0.05; armL = 0.12 + Math.sin(av.phase * 1.3) * 0.04; armR = -armL; }
    body.position.y = bob + jump;
    legs[0].rotation.x = legA; legs[1].rotation.x = -legA;
    arms[0].rotation.z = lerp(arms[0].rotation.z, -armL, 0.25); arms[1].rotation.z = lerp(arms[1].rotation.z, -armR, 0.25);
    arms[0].rotation.x = lerp(arms[0].rotation.x, armXL, 0.3); arms[1].rotation.x = lerp(arms[1].rotation.x, armXR, 0.3);
    head.rotation.x = lerp(head.rotation.x, headX, 0.15); head.rotation.z = lerp(head.rotation.z, headZ, 0.15); head.rotation.y = lerp(head.rotation.y, headY, 0.1);
    tails.forEach((tl, i) => { tl.rotation.x = Math.sin(av.phase * (walking ? 9 : 2) + i) * (walking ? 0.25 : 0.06); });
    // expression
    let expr = celebrating ? 'happy' : act === 'sleep' ? 'sleep' : av.baseExpr || 'normal';
    if (expr === 'normal' || expr === 'sad') { if (now > av.blinkAt) { if (now > av.blinkAt + 130) av.blinkAt = now + 1800 + Math.random() * 3500; else expr = 'blink'; } }
    if (expr !== av.expr) { av.expr = expr; av.faceMat.map = av.faces[expr]; av.faceMat.needsUpdate = true; }
    // emote bob / selection
    av.emo.position.y = 2.15 + Math.sin(t * 2.5 + av.phase) * 0.08; av.emo.material.rotation = act === 'celebrate' ? t * 2 : 0;
    av.sel.material.opacity = selected === id ? 0.55 + Math.sin(t * 4) * 0.25 : 0; av.sel.scale.setScalar(1 + (selected === id ? Math.sin(t * 4) * 0.06 : 0));
  }
  // confetti
  conf.forEach((c, i) => { if (c.life > 0) { c.life -= dt; c.v.y -= 6 * dt; c.v.multiplyScalar(0.985); c.p.addScaledVector(c.v, dt); if (c.p.y < 0.02) { c.p.y = 0.02; c.v.set(0, 0, 0); } c.r.x += dt * 6; c.r.y += dt * 4; } else c.p.y = -10; dummy.position.copy(c.p); dummy.rotation.copy(c.r); dummy.updateMatrix(); confMesh.setMatrixAt(i, dummy.matrix); });
  confMesh.instanceMatrix.needsUpdate = true;
  // screens
  if (now - lastScreen > 250) { lastScreen = now; AGENTS.forEach((a) => drawDesk(a.id, now)); drawWall(now); drawMeme(now); }
  // camera
  if (camTween) { const k = Math.min(1, (now - camTween.t0) / camTween.dur); const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; controls.target.lerpVectors(camTween.fromT, camTween.toT, e); camera.position.lerpVectors(camTween.fromP, camTween.toP, e); if (k >= 1) camTween = null; }
  else if (follow) { const av = avatars[follow]; const want = av.root.position.clone().add(new THREE.Vector3(0, 0.9, 0)); const delta = want.sub(controls.target).multiplyScalar(0.06); controls.target.add(delta); camera.position.add(delta); }
  controls.update();
  renderer.render(scene, camera);
}
function resize() { const r = canvas.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(canvas.parentElement); resize();
camera.position.copy(ROOMS.lp.t.clone().add(fitOffset(ROOMS.lp.off)).multiplyScalar(1.25)); controls.target.copy(ROOMS.lp.t); goRoom('lp', 1.6);
drawWall(0); drawBoard(); renderChips();
renderer.setAnimationLoop(tick);
setTimeout(() => { $('load').style.opacity = 0; setTimeout(() => $('load').remove(), 700); }, 400);
