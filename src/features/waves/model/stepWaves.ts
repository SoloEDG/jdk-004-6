import type { GameDoc } from "../../../shared/types";
import { distance, normalize } from "../../../shared/math";
import { spawnEnemy } from "../lib/spawn";

export function stepWaves(doc: GameDoc, dt: number): void {
  const { waves } = doc.rules;
  if (doc.victory) return;
  if (doc.wave === 0) {
    doc.wave = 1;
    doc.spawnBudget = 1;
    doc.notice = "第 1 波 · 信号已连接";
  }
  doc.waveTime += dt;
  while (doc.waveTime >= waves.duration) {
    doc.waveTime -= waves.duration;
    if (doc.wave >= waves.totalWaves) {
      doc.victory = true;
      doc.notice = "全部波次已清除";
      return;
    }
    doc.wave++;
    doc.notice = `第 ${doc.wave} 波 · 威胁升级`;
  }
  doc.spawnBudget +=
    dt * (waves.spawnBase + doc.wave * waves.spawnPerWave) * waves.spawnMultiplier;
  while (doc.spawnBudget >= 1) {
    doc.spawnBudget--;
    if (doc.enemies.length < waves.maxEnemies) doc.enemies.push(spawnEnemy(doc));
  }
  for (const enemy of doc.enemies) {
    const toward = normalize(doc.player.x - enemy.x, doc.player.y - enemy.y),
      range = distance(enemy, doc.player);
    const standOff =
      enemy.kind === "shooter" ? (range < 170 ? -1 : range < 245 ? 0 : 1) : 1;
    const speed =
      doc.rules.enemies[enemy.kind].speed *
      (1 + doc.wave * waves.speedScalePerWave);
    enemy.x += toward.x * speed * standOff * dt;
    enemy.y += toward.y * speed * standOff * dt;
    enemy.cooldown -= dt;
    const kindRules = doc.rules.enemies[enemy.kind];
    if (enemy.kind !== "chaser" && enemy.cooldown <= 0) {
      enemy.cooldown = kindRules.shootCooldown;
      const angle = Math.atan2(toward.y, toward.x);
      for (const offset of kindRules.spread) {
        doc.bullets.push({
          id: doc.nextId++,
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle + offset) * kindRules.bulletSpeed,
          vy: Math.sin(angle + offset) * kindRules.bulletSpeed,
          radius: kindRules.bulletRadius,
          damage: kindRules.bulletDamage,
          life: kindRules.bulletLife,
          owner: "enemy",
          weapon: "enemy",
          pierce: 0,
          hit: [],
        });
      }
    }
  }
}
