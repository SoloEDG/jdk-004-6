import type { GameDoc, WeaponId, Vec } from "../../../shared/types";

/** Spawn a projectile. Radius and lifetime come from the pinned weapon rules. */
export function fire(
  doc: GameDoc,
  weapon: WeaponId,
  angle: number,
  damage: number,
  speed: number,
  pierce: number,
  origin: Vec = doc.player,
): void {
  const spec = doc.rules.weapons[weapon];
  doc.bullets.push({
    id: doc.nextId++,
    x: origin.x,
    y: origin.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: spec.projectileRadius,
    damage,
    life: spec.projectileLife,
    owner: "player",
    weapon,
    pierce,
    hit: [],
  });
}
export function nearestTarget(doc: GameDoc): Vec | undefined {
  let best: Vec | undefined,
    bestSquared = Infinity;
  for (const e of doc.enemies) {
    if (e.hp <= 0) continue;
    const n = (e.x - doc.player.x) ** 2 + (e.y - doc.player.y) ** 2;
    if (n < bestSquared) {
      best = e;
      bestSquared = n;
    }
  }
  return best;
}
