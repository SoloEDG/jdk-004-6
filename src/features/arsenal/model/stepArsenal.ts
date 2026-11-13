import type { GameDoc, Input, WeaponId } from "../../../shared/types";
import { fire, nearestTarget } from "../lib/projectiles";

export function stepArsenal(doc: GameDoc, input: Input, dt: number): number {
  let shots = 0;
  const target = nearestTarget(doc),
    aim = input.firing ? input.aim : target || input.aim;
  const angle = Math.atan2(aim.y - doc.player.y, aim.x - doc.player.x);
  const power = 1 + (doc.upgrades.power || 0) * 0.2,
    haste = 1 + (doc.upgrades.haste || 0) * 0.13;
  for (const weapon of doc.weapons) {
    const spec = doc.rules.weapons[weapon.id];
    weapon.cooldown -= dt;
    if (weapon.cooldown > 0) continue;
    weapon.cooldown = Math.max(
      0.08,
      spec.interval / haste / (1 + (weapon.level - 1) * 0.12),
    );
    const damage =
      spec.baseDamage * power * (1 + (weapon.level - 1) * 0.3);
    if (weapon.id === "pulse") {
      const count = weapon.level >= 4 ? 3 : weapon.level >= 2 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        fire(
          doc,
          "pulse",
          angle + (i - (count - 1) / 2) * 0.12,
          damage,
          spec.projectileSpeed,
          spec.pierce + (doc.upgrades.pierce || 0),
        );
        shots++;
      }
    } else {
      const count =
        weapon.id === "orbit" ? 4 + weapon.level : 10 + weapon.level * 2;
      for (let i = 0; i < count; i++) {
        fire(
          doc,
          weapon.id,
          doc.time * 0.8 + (i * Math.PI * 2) / count,
          damage,
          spec.projectileSpeed,
          spec.pierce,
        );
        shots++;
      }
    }
  }
  return shots;
}

/** Weapons a challenge allows but the run has not unlocked yet. */
export function lockedWeapons(doc: GameDoc): WeaponId[] {
  return doc.rules.arsenal.pool.filter(
    (id) => !doc.weapons.some((w) => w.id === id),
  );
}
