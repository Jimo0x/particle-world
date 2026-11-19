"use strict";
const test = require("node:test"), assert = require("node:assert"), { E, World } = require("../sim.js");
const run = (w, n) => { for (let i = 0; i < n; i++) w.step(); return w; };

test("le sable tombe et s'empile ; la masse est conservée", () => {
  const w = new World(40, 40); w.paint(20, 5, 3, E.SAND); const n0 = w.count()[E.SAND];
  run(w, 200); assert.strictEqual(w.count()[E.SAND], n0);
  for (let x = 0; x < 40; x++) for (let y = 0; y < 39; y++) if (w.get(x, y) === E.SAND) assert.notStrictEqual(w.get(x, y + 1), E.EMPTY, "aucun grain en l'air");
});

test("l'eau s'étale à l'horizontale", () => {
  const w = new World(60, 20); w.paint(30, 3, 3, E.WATER); run(w, 400);
  const row = [...Array(60).keys()].filter(x => w.get(x, 19) === E.WATER); assert.ok(row.length >= 18, String(row.length));
});

test("le bois brûle puis disparaît en fumée", () => {
  const w = new World(30, 30); for (let x = 5; x < 25; x++) w.set(x, 25, E.WOOD); w.set(5, 24, E.FIRE); run(w, 1500);
  assert.ok((w.count()[E.WOOD] || 0) < 5);
});

test("lave + eau → vapeur et pierre", () => {
  const w = new World(30, 30); for (let x = 0; x < 30; x++) for (let y = 20; y < 30; y++) w.set(x, y, E.WATER); w.paint(15, 10, 3, E.LAVA); run(w, 300);
  const c = w.count(); assert.ok((c[E.STONE] || 0) > 0 && ((c[E.STEAM] || 0) + (c[E.WATER] || 0)) > 0);
});

test("la poudre explose au contact du feu", () => {
  const w = new World(30, 30); w.paint(15, 25, 4, E.POWDER); run(w, 40);
  let top = 0; while (w.get(15, top) !== E.POWDER) top++; w.set(15, top - 1, E.FIRE); run(w, 60);
  assert.ok((w.count()[E.POWDER] || 0) < 10);
});
