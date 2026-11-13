import type { GameDoc, Enemy } from "../../../shared/types";
import { random } from "../../../shared/math";

/**
 * Spawn one enemy using the run's pinned ruleset. Composition thresholds and
 * the hp/speed scaling are all challenge-constrained, so the same seed produces
 * the same enemy tide on every machine.
 */
export function spawnEnemy(doc: GameDoc): Enemy {
  const { waves: w, enemies: table, arena } = doc.rules;
  const roll = random(doc);
  const kind: Enemy["kind"] =
    doc.wave >= w.eliteWave && roll < w.eliteChance
      ? "elite"
      : doc.wave >= w.shooterWave && roll < w.shooterChance
        ? "shooter"
        : "chaser";
  const data = table[kind];
  const side = Math.floor(random(doc) * 4);
  const along = random(doc);
  const offset = w.spawnOffset;
  const x =
    side === 0 ? -offset : side === 1 ? arena.width + offset : along * arena.width;
  const y =
    side === 2 ? -offset : side === 3 ? arena.height + offset : along * arena.height;
  const hp = Math.round(data.hp * (1 + (doc.wave - 1) * w.hpScalePerWave));
  return {
    id: doc.nextId++,
    kind,
    x,
    y,
    hp,
    maxHp: hp,
    radius: data.radius,
    cooldown: 1 + random(doc),
  };
}
