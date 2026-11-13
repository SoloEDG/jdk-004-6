import type { GameDoc, FrameEvents } from "../../../shared/types";
import { random, distance, normalize } from "../../../shared/math";
import { grantExperience } from "./experience";

export function generateDrops(doc: GameDoc, events: FrameEvents): void {
  const { drops } = doc.rules;
  for (const { enemy } of events.kills) {
    doc.drops.push({
      id: doc.nextId++,
      x: enemy.x,
      y: enemy.y,
      kind: "xp",
      value: drops.xp[enemy.kind],
      life: drops.dropLife,
    });
    const roll = random(doc);
    if (roll < drops.healChance)
      doc.drops.push({
        id: doc.nextId++,
        x: enemy.x + 8,
        y: enemy.y,
        kind: "heal",
        value: drops.healValue,
        life: drops.healLife,
      });
    else if (roll < drops.healChance + drops.magnetChance)
      doc.drops.push({
        id: doc.nextId++,
        x: enemy.x - 8,
        y: enemy.y,
        kind: "magnet",
        value: 1,
        life: drops.magnetLife,
      });
  }
}
export function collectDrops(
  doc: GameDoc,
  events: FrameEvents,
  dt: number,
): void {
  const radius =
    doc.rules.drops.pickupRadius +
    (doc.upgrades.magnet || 0) * doc.rules.drops.magnetRangeExtra;
  let magnet = false;
  for (const drop of doc.drops) {
    drop.life -= dt;
    if (drop.life < 0) continue;
    const range = distance(drop, doc.player);
    if (range < radius) {
      const toward = normalize(doc.player.x - drop.x, doc.player.y - drop.y),
        travel = Math.min(range, 360 * dt);
      drop.x += toward.x * travel;
      drop.y += toward.y * travel;
    }
    if (distance(drop, doc.player) > doc.player.radius + 9) continue;
    drop.life = -1;
    events.collected++;
    if (drop.kind === "xp") grantExperience(doc, drop.value);
    if (drop.kind === "heal")
      doc.player.hp = Math.min(doc.player.maxHp, doc.player.hp + drop.value);
    if (drop.kind === "magnet") magnet = true;
  }
  if (magnet) {
    for (const drop of doc.drops) {
      if (drop.life >= 0 && drop.kind === "xp") {
        grantExperience(doc, drop.value);
        drop.life = -1;
        events.collected++;
      }
    }
  }
  doc.drops = doc.drops.filter((d) => d.life >= 0);
}
