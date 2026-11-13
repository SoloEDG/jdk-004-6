import type { GameDoc, RunRecord, ChallengeConfig } from "./types";
import { DEFAULT_RULES_V1, cloneRuleset } from "./rules";
import type { RulesetV1 } from "./rules";
import { deriveRuleset } from "../features/challenges/lib/config";

export interface CreateRunOptions {
  seed?: number;
  records?: RunRecord[];
  rules?: RulesetV1;
  challenge?: ChallengeConfig;
}

/**
 * Build a fresh run. Challenge runs resolve their own pinned ruleset so the
 * simulation is tied to the challenge's rulesVersion rather than the client's
 * current balance.
 */
export function createRun(options: CreateRunOptions = {}): GameDoc {
  const {
    seed = 204004,
    records = [],
    challenge,
    rules = challenge
      ? deriveRuleset(challenge)
      : cloneRuleset(DEFAULT_RULES_V1),
  } = options;
  return {
    version: 1,
    seed,
    initialSeed: seed,
    nextId: 1,
    phase: "ready",
    time: 0,
    player: {
      x: rules.player.startX,
      y: rules.player.startY,
      hp: rules.player.hp,
      maxHp: rules.player.hp,
      speed: rules.player.speed,
      radius: rules.player.radius,
      invincible: 0,
    },
    enemies: [],
    bullets: [],
    drops: [],
    weapons: [{ id: "pulse", level: 1, cooldown: 0 }],
    upgrades: {},
    choices: [],
    xp: 0,
    level: 1,
    pendingLevels: 0,
    wave: 0,
    waveTime: 0,
    spawnBudget: 0,
    stats: {
      kills: 0,
      damage: 0,
      taken: 0,
      collected: 0,
      shots: 0,
      byWeapon: { pulse: 0, orbit: 0, nova: 0 },
    },
    records,
    notice: challenge
      ? `每日挑战 · ${challenge.date}`
      : "等待接入战场",
    victory: false,
    rules,
    challenge,
  };
}
