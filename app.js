const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const { E, INFO, World } = Sim, W = 300, H = 190;
const world = new World(W, H, 42), cv = $("#cv"), ctx = cv.getContext("2d");
cv.width = W; cv.height = H;
const img = ctx.createImageData(W, H), noise = new Float32Array(W * H).map(() => Math.random() * .16 - .08);
let tool = E.SAND, paused = false, mouse = null, histo = [];
const ORDER = [E.SAND, E.WATER, E.FIRE, E.WOOD, E.OIL, E.LAVA, E.PLANT, E.ACID, E.POWDER, E.ICE, E.STONE, E.SMOKE, E.STEAM, E.WALL, E.EMPTY];

$("#pal").innerHTML = ORDER.map((t, i) => `<div class="el ${t === tool ? "on" : ""}" data-t="${t}"><i style="background:rgb(${INFO[t].color})"></i>${INFO[t].name}${i < 9 ? `<kbd>${i + 1}</kbd>` : ""}</div>`).join("");
const pick = t => { tool = t; $$(".el").forEach(e => e.classList.toggle("on", +e.dataset.t === t)); };
$$(".el").forEach(e => e.onclick = () => pick(+e.dataset.t));
addEventListener("keydown", e => { const n = +e.key; if (n >= 1 && n <= 9) pick(ORDER[n - 1]); if (e.key === " ") { e.preventDefault(); $("#pause").click(); } });
$("#brush").oninput = e => $("#bv").textContent = e.target.value; $("#speed").oninput = e => $("#sv").textContent = e.target.value;
$("#wind").onchange = e => world.wind = +e.target.value;
$("#pause").onclick = () => { paused = !paused; $("#pause").textContent = paused ? "▶ Lecture" : "⏸ Pause"; };
$("#stepBtn").onclick = () => world.step();
$("#clear").onclick = () => world.clear();
$("#snap").onclick = () => { const c = document.createElement("canvas"); c.width = W * 4; c.height = H * 4; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(cv, 0, 0, c.width, c.height);
  const a = document.createElement("a"); a.download = "particle-world.png"; a.href = c.toDataURL(); a.click(); };

function fit() { const st = $(".stage"), k = Math.max(1, Math.floor(Math.min((st.clientWidth - 32) / W, (st.clientHeight - 32) / H) * 2) / 2); cv.style.width = W * k + "px"; cv.style.height = H * k + "px"; }
addEventListener("resize", fit); fit();
const cell = e => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * W), Math.floor((e.clientY - r.top) / r.height * H)]; };
cv.addEventListener("contextmenu", e => e.preventDefault());
cv.addEventListener("pointerdown", e => { mouse = { b: e.button, p: cell(e) }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener("pointermove", e => { if (mouse) mouse.p = cell(e); hover = cell(e); });
cv.addEventListener("pointerup", () => mouse = null);
cv.addEventListener("wheel", e => { e.preventDefault(); const b = $("#brush"); b.value = Math.max(1, Math.min(20, +b.value + (e.deltaY < 0 ? 1 : -1))); b.oninput({ target: b }); });
let hover = null, last = null;
function paint() {
  if (!mouse) { last = null; return; }
  const t = mouse.b === 2 ? E.EMPTY : tool, r = +$("#brush").value, [x1, y1] = mouse.p, [x0, y0] = last || mouse.p;
  const steps = Math.max(1, Math.hypot(x1 - x0, y1 - y0) | 0);
  for (let s = 0; s <= steps; s++) world.paint(Math.round(x0 + (x1 - x0) * s / steps), Math.round(y0 + (y1 - y0) * s / steps), r, t, [E.WALL, E.WOOD, E.STONE, E.ICE, E.EMPTY, E.PLANT].includes(t) ? 1 : .5);
  last = mouse.p;
}
function render() {
  const d = img.data, c = world.cells, l = world.life, tk = world.tick;
  for (let i = 0; i < c.length; i++) {
    const t = c[i], base = INFO[t].color; let k = 1 + noise[i], r = base[0], g = base[1], b = base[2];
    if (t === E.FIRE) { const f = l[i] / 70; r = 255; g = 60 + f * 160 + Math.random() * 40; b = 20 + f * 40; k = 1; }
    else if (t === E.LAVA) { k = .85 + Math.sin(i * .37 + tk * .08) * .15; }
    else if (t === E.SMOKE || t === E.STEAM) { k = .6 + Math.min(1, l[i] / 120) * .5; }
    else if (t === E.WATER) { k = .9 + Math.sin((i % W) * .3 + tk * .1) * .06 + noise[i] * .4; }
    else if (t === E.EMPTY) { r = g = b = 10; k = 1 + noise[i] * .3; }
    d[i * 4] = r * k; d[i * 4 + 1] = g * k; d[i * 4 + 2] = b * k; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  if (hover) { ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = .5; ctx.beginPath(); ctx.arc(hover[0] + .5, hover[1] + .5, +$("#brush").value, 0, 7); ctx.stroke(); }
}
function stats() {
  const n = world.count(), tot = Object.values(n).reduce((a, b) => a + b, 0);
  $("#counts").innerHTML = ORDER.filter(t => n[t]).sort((a, b) => n[b] - n[a]).slice(0, 9).map(t => `<div class="cnt"><span><i style="background:rgb(${INFO[t].color})"></i>${INFO[t].name}</span><b class="mono">${n[t].toLocaleString("fr-FR")}</b></div>`).join("") || `<div class="dim" style="font-size:12px">Monde vide.</div>`;
  histo.push([n[E.FIRE] || 0, n[E.WATER] || 0, n[E.SMOKE] || 0]); if (histo.length > 120) histo.shift();
  const hc = $("#hist"), dpr = devicePixelRatio || 1, w = hc.clientWidth, h = hc.clientHeight; hc.width = w * dpr; hc.height = h * dpr; const x = hc.getContext("2d"); x.scale(dpr, dpr);
  const max = Math.max(1, ...histo.flat());
  [["#ff5a1e", 0], ["#3478e6", 1], ["#8d8d99", 2]].forEach(([col, k]) => { x.strokeStyle = col; x.lineWidth = 1.5; x.beginPath(); histo.forEach((v, i) => { const px = i / 119 * w, py = h - v[k] / max * (h - 4) - 2; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); });
  return tot;
}

/* scènes */
const SCENES = {
  volcan() { world.clear(); for (let x = 0; x < W; x++) { const hh = Math.max(0, 70 - Math.abs(x - W / 2) * .7); for (let y = H - 1; y > H - hh; y--) world.set(x, y, E.STONE); }
    for (let y = H - 60; y < H; y++) for (let x = W / 2 - 4; x < W / 2 + 4; x++) world.set(x, y, E.LAVA);
    for (let x = 10; x < 70; x++) for (let y = H - 30; y < H; y++) if (world.get(x, y) === E.EMPTY) world.set(x, y, E.WATER);
    for (let x = 220; x < 290; x += 6) for (let y = H - 50; y < H - 25; y++) world.set(x, y, E.WOOD); },
  foret() { world.clear(); for (let x = 0; x < W; x++) for (let y = H - 12; y < H; y++) world.set(x, y, E.SAND);
    for (let k = 0; k < 14; k++) { const tx = 15 + k * 20; for (let y = H - 13; y > H - 55; y--) world.set(tx, y, E.WOOD); world.paint(tx, H - 60, 8, E.PLANT); }
    world.paint(10, H - 70, 3, E.FIRE); world.wind = 1; $("#wind").value = "1"; },
  sablier() { world.clear(); for (let y = 10; y < H - 10; y++) { const w = Math.abs(y - H / 2) * 1.2 + 3; for (let x = 0; x < W; x++) if (Math.abs(x - W / 2) > w && Math.abs(x - W / 2) < w + 3) world.set(x, y, E.WALL); }
    for (let y = 14; y < H / 2 - 10; y++) for (let x = 0; x < W; x++) if (world.get(x, y) === E.EMPTY && Math.abs(x - W / 2) < Math.abs(y - H / 2) * 1.2) world.set(x, y, E.SAND); },
  labo() { world.clear(); for (const cx of [50, 150, 250]) { for (let y = 100; y < 180; y++) { world.set(cx - 30, y, E.WALL); world.set(cx + 30, y, E.WALL); } for (let x = cx - 30; x <= cx + 30; x++) world.set(x, 180, E.WALL); }
    for (let x = 22; x < 79; x++) for (let y = 140; y < 179; y++) world.set(x, y, E.WATER); world.paint(50, 80, 10, E.ICE);
    for (let x = 122; x < 179; x++) for (let y = 120; y < 179; y++) world.set(x, y, y < 150 ? E.OIL : E.WATER); world.paint(150, 100, 3, E.FIRE);
    for (let x = 222; x < 279; x++) for (let y = 150; y < 179; y++) world.set(x, y, E.POWDER); world.paint(250, 120, 6, E.ACID); },
};
$$("[data-scene]").forEach(b => b.onclick = () => SCENES[b.dataset.scene]());

let frames = 0, t0 = performance.now(), statT = 0;
function loop(now) {
  paint(); if (!paused) for (let i = 0; i < +$("#speed").value; i++) world.step();
  render(); frames++;
  if (now - t0 > 500) { $("#fps").textContent = `${Math.round(frames * 1000 / (now - t0))} img/s · ${W}×${H}`; frames = 0; t0 = now; }
  if (now - statT > 250) { stats(); statT = now; }
  requestAnimationFrame(loop);
}
SCENES.volcan(); requestAnimationFrame(loop);
