// Particle World — moteur de simulation par automate cellulaire (module pur, testable sous Node).
(function (root) {
  const E = { EMPTY: 0, WALL: 1, SAND: 2, WATER: 3, FIRE: 4, SMOKE: 5, WOOD: 6, OIL: 7, LAVA: 8, STEAM: 9, STONE: 10, PLANT: 11, ACID: 12, POWDER: 13, ICE: 14 };
  const INFO = {
    [E.EMPTY]: { name: "Gomme", color: [10, 10, 12] },
    [E.WALL]: { name: "Mur", color: [90, 90, 104], solid: 1 },
    [E.SAND]: { name: "Sable", color: [222, 190, 120], dens: 3, powder: 1 },
    [E.WATER]: { name: "Eau", color: [52, 120, 230], dens: 2, liquid: 1 },
    [E.FIRE]: { name: "Feu", color: [255, 90, 30], gas: 1 },
    [E.SMOKE]: { name: "Fumée", color: [70, 70, 78], gas: 1, dens: -1 },
    [E.WOOD]: { name: "Bois", color: [120, 74, 40], solid: 1, burn: 0.015 },
    [E.OIL]: { name: "Huile", color: [90, 70, 30], dens: 1, liquid: 1, burn: 0.3 },
    [E.LAVA]: { name: "Lave", color: [255, 70, 10], dens: 4, liquid: 1, visc: 0.15 },
    [E.STEAM]: { name: "Vapeur", color: [190, 200, 215], gas: 1, dens: -2 },
    [E.STONE]: { name: "Pierre", color: [110, 108, 104], dens: 5, powder: 1 },
    [E.PLANT]: { name: "Plante", color: [50, 170, 70], solid: 1, burn: 0.06 },
    [E.ACID]: { name: "Acide", color: [140, 255, 60], dens: 2, liquid: 1 },
    [E.POWDER]: { name: "Poudre", color: [60, 60, 60], dens: 3, powder: 1, burn: 1, explode: 1 },
    [E.ICE]: { name: "Glace", color: [170, 220, 255], solid: 1 },
  };

  function World(w, h, seed = 1) {
    this.w = w; this.h = h; this.cells = new Uint8Array(w * h); this.life = new Uint8Array(w * h); this.moved = new Uint8Array(w * h);
    this.tick = 0; let s = seed >>> 0 || 1; this.rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    this.wind = 0;
  }
  const P = World.prototype;
  P.idx = function (x, y) { return y * this.w + x; };
  P.get = function (x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? E.WALL : this.cells[y * this.w + x]; };
  P.set = function (x, y, t, life) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; this.cells[i] = t; this.life[i] = life ?? (t === E.FIRE ? 30 + (this.rnd() * 40 | 0) : t === E.SMOKE ? 80 + (this.rnd() * 80 | 0) : t === E.STEAM ? 120 + (this.rnd() * 120 | 0) : 0); };
  P.swap = function (a, b) { const c = this.cells, l = this.life; [c[a], c[b]] = [c[b], c[a]]; [l[a], l[b]] = [l[b], l[a]]; this.moved[a] = this.moved[b] = 1; };
  P.paint = function (cx, cy, r, t, chance = 1) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r && this.rnd() < chance) {
      const cur = this.get(cx + x, cy + y); if (t === E.EMPTY || cur === E.EMPTY) this.set(cx + x, cy + y, t);
    }
  };
  P.count = function () { const n = {}; for (const c of this.cells) if (c) n[c] = (n[c] || 0) + 1; return n; };
  P.clear = function () { this.cells.fill(0); this.life.fill(0); };

  /** Échange vers une case si elle est vide ou moins dense (liquides et gaz). */
  P.tryMove = function (i, x, y, dens) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    const j = y * this.w + x, t = this.cells[j];
    if (t === E.EMPTY || (!INFO[t].solid && !INFO[t].powder && INFO[t].dens !== undefined && INFO[t].dens < dens && !this.moved[j])) { this.swap(i, j); return true; }
    return false;
  };

  P.ignite = function (x, y) {
    const t = this.get(x, y), inf = INFO[t];
    if (!inf || !inf.burn || this.rnd() > inf.burn) return;
    if (inf.explode) { this.explode(x, y, 6); return; }
    this.set(x, y, E.FIRE);
  };
  P.explode = function (cx, cy, r) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = x * x + y * y; if (d > r * r) continue; const t = this.get(cx + x, cy + y);
      if (t === E.WALL) continue; if (t === E.POWDER && d > 2) { this.set(cx + x, cy + y, E.FIRE, 3); continue; }
      this.set(cx + x, cy + y, this.rnd() < 0.6 ? E.FIRE : E.SMOKE);
    }
  };
  const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  P.neighbors = function (x, y, fn) { for (const [dx, dy] of N8) fn(x + dx, y + dy, this.get(x + dx, y + dy)); };

  P.step = function () {
    const w = this.w, h = this.h; this.moved.fill(0); this.tick++;
    const flip = this.tick & 1;
    for (let y = h - 1; y >= 0; y--) for (let k = 0; k < w; k++) {
      const x = flip ? k : w - 1 - k, i = y * w + x, t = this.cells[i];
      if (!t || this.moved[i] || t === E.WALL) continue;
      const dir = this.rnd() < .5 ? -1 : 1, inf = INFO[t];
      switch (t) {
        case E.SAND: case E.STONE: case E.POWDER:
          if (!this.tryMove(i, x, y + 1, inf.dens)) this.tryMove(i, x + dir, y + 1, inf.dens) || this.tryMove(i, x - dir, y + 1, inf.dens);
          break;
        case E.WATER: case E.OIL: case E.ACID: case E.LAVA: {
          if (t === E.LAVA && this.rnd() > 1 - inf.visc) break; // la lave est visqueuse
          if (t === E.LAVA) this.neighbors(x, y, (nx, ny, n) => {
            if (n === E.WATER || n === E.ICE) { this.set(nx, ny, E.STEAM); if (this.rnd() < .3) this.set(x, y, E.STONE); }
            else if (INFO[n] && INFO[n].burn) this.ignite(nx, ny);
            else if (n === E.SAND && this.rnd() < .002) this.set(nx, ny, E.LAVA);
          });
          if (t === E.ACID) this.neighbors(x, y, (nx, ny, n) => {
            if (n !== E.EMPTY && n !== E.ACID && n !== E.WALL && n !== E.WATER && this.rnd() < .05) { this.set(nx, ny, E.SMOKE, 20); if (this.rnd() < .3) this.set(x, y, E.EMPTY); }
          });
          if (t === E.WATER) this.neighbors(x, y, (nx, ny, n) => { if (n === E.FIRE) this.set(nx, ny, E.STEAM); if (n === E.ICE && this.rnd() < .0008) this.set(x, y, E.ICE); });
          if (this.cells[i] !== t) break;
          if (this.tryMove(i, x, y + 1, inf.dens)) break;
          if (this.tryMove(i, x + dir, y + 1, inf.dens) || this.tryMove(i, x - dir, y + 1, inf.dens)) break;
          const spread = t === E.LAVA ? 1 : 3 + (this.wind ? 2 : 0);
          for (let s = 1; s <= spread; s++) { const nx = x + dir * s; if (this.get(nx, y) !== E.EMPTY) break; if (s === spread || this.get(nx, y + 1) === E.EMPTY) { this.tryMove(i, nx, y, inf.dens); break; } }
          break;
        }
        case E.FIRE: {
          let fuel = false;
          this.neighbors(x, y, (nx, ny, n) => { if (INFO[n] && INFO[n].burn) { fuel = true; this.ignite(nx, ny); } });
          if (fuel && this.life[i] < 6) this.life[i] += 2;  // une braise reste tant qu'il y a du combustible à côté
          if (--this.life[i] <= 0) { this.set(x, y, this.rnd() < .5 ? E.SMOKE : E.EMPTY); break; }
          if (fuel) break;  // le feu « colle » au combustible au lieu de monter
          const ny = y - 1, nx = x + (this.rnd() * 3 | 0) - 1 + this.wind;
          if (this.get(nx, ny) === E.EMPTY && this.rnd() < .7) this.swap(i, ny * w + Math.max(0, Math.min(w - 1, nx)));
          break;
        }
        case E.SMOKE: case E.STEAM: {
          if (--this.life[i] <= 0) { this.set(x, y, t === E.STEAM && this.rnd() < .5 ? E.WATER : E.EMPTY); break; }
          const nx = x + (this.rnd() * 3 | 0) - 1 + this.wind;
          if (!this.tryMove(i, nx, y - 1, 99)) this.tryMove(i, x + dir, y, 99);
          break;
        }
        case E.PLANT:
          if (this.rnd() < .02) this.neighbors(x, y, (nx, ny, n) => { if (n === E.WATER && this.rnd() < .25) this.set(nx, ny, E.PLANT); });
          break;
        case E.ICE:
          this.neighbors(x, y, (nx, ny, n) => { if ((n === E.FIRE || n === E.LAVA) && this.rnd() < .05) this.set(x, y, E.WATER); });
          break;
      }
    }
  };

  const api = { E, INFO, World };
  if (typeof module !== "undefined") module.exports = api; else root.Sim = api;
})(this);
