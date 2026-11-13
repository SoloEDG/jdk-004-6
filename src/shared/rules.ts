import type { WeaponId } from "./types";
export type EnemyKindId = "chaser" | "shooter" | "elite";

/** Playable field. A challenge can shrink the field, never reposition it off-axis. */
export interface ArenaRules {
  width: number;
  height: number;
}

export interface PlayerRules {
  hp: number;
  speed: number;
  radius: number;
  invincibility: number;
  startX: number;
  startY: number;
}

/** Per-species balance table. Chasers never shoot, so their firing fields stay zero. */
export interface EnemyKindRules {
  hp: number;
  speed: number;
  radius: number;
  contactDamage: number;
  shootCooldown: number;
  bulletDamage: number;
  bulletSpeed: number;
  bulletLife: number;
  bulletRadius: number;
  spread: number[];
}

export interface WaveRules {
  totalWaves: number;
  duration: number;
  spawnBase: number;
  spawnPerWave: number;
  spawnMultiplier: number;
  maxEnemies: number;
  spawnOffset: number;
  eliteWave: number;
  shooterWave: number;
  eliteChance: number;
  shooterChance: number;
  hpScalePerWave: number;
  speedScalePerWave: number;
}

export interface WeaponRules {
  interval: number;
  baseDamage: number;
  projectileSpeed: number;
  pierce: number;
  projectileLife: number;
  projectileRadius: number;
}

export interface DropRules {
  /** Probability of a healing drop on kill. */
  healChance: number;
  /** Additional probability window (after heal) for a magnet drop. */
  magnetChance: number;
  pickupRadius: number;
  magnetRangeExtra: number;
  xp: Record<EnemyKindId, number>;
  healValue: number;
  dropLife: number;
  healLife: number;
  magnetLife: number;
}

export interface ProgressionRules {
  xpBase: number;
  xpPerLevel: number;
  choices: number;
  /** Upgrade ids this run is allowed to offer. Constrained by challenges. */
  allowedUpgrades: string[];
}

export interface ArsenalRules {
  /** Weapons that can appear in this run. Pulse is always the starter. */
  pool: WeaponId[];
}

/**
 * A complete, immutable balance snapshot. Every numeric parameter the simulation
 * reads lives here, so pinning rulesVersion + seed reproduces the exact same run
 * even after later releases ship new balance values.
 */
export interface RulesetV1 {
  rulesVersion: 1;
  arena: ArenaRules;
  player: PlayerRules;
  waves: WaveRules;
  enemies: Record<EnemyKindId, EnemyKindRules>;
  weapons: Record<WeaponId, WeaponRules>;
  drops: DropRules;
  progression: ProgressionRules;
  arsenal: ArsenalRules;
}

export const SUPPORTED_RULE_VERSIONS = [1] as const;
export type SupportedRuleVersion = (typeof SUPPORTED_RULE_VERSIONS)[number];

export function isSupportedRuleVersion(
  version: number,
): version is SupportedRuleVersion {
  return (SUPPORTED_RULE_VERSIONS as readonly number[]).includes(version);
}

/** Upgrade ids exposed by rule set 1. Descriptions/max levels live in the engine catalog. */
export const DEFAULT_ALLOWED_UPGRADES: string[] = [
  "recovery",
  "power",
  "haste",
  "speed",
  "vitality",
  "armor",
  "magnet",
  "pierce",
  "pulse",
  "orbit",
  "nova",
];

export const DEFAULT_WEAPON_POOL: WeaponId[] = ["pulse", "orbit", "nova"];

/**
 * The frozen balance snapshot for rulesVersion 1. This is the exact behaviour the
 * shipped engine had when challenge sharing was introduced; later balance work
 * must create a NEW ruleset instead of mutating this one, so old challenge codes
 * keep resolving to the same run.
 */
export const DEFAULT_RULES_V1: RulesetV1 = {
  rulesVersion: 1,
  arena: { width: 1000, height: 650 },
  player: {
    hp: 100,
    speed: 190,
    radius: 12,
    invincibility: 0.65,
    startX: 500,
    startY: 325,
  },
  waves: {
    totalWaves: 8,
    duration: 30,
    spawnBase: 1.05,
    spawnPerWave: 0.27,
    spawnMultiplier: 1,
    maxEnemies: 180,
    spawnOffset: 28,
    eliteWave: 3,
    shooterWave: 2,
    eliteChance: 0.08,
    shooterChance: 0.28,
    hpScalePerWave: 0.22,
    speedScalePerWave: 0.035,
  },
  enemies: {
    chaser: {
      hp: 18,
      speed: 62,
      radius: 12,
      contactDamage: 12,
      shootCooldown: 0,
      bulletDamage: 0,
      bulletSpeed: 0,
      bulletLife: 0,
      bulletRadius: 0,
      spread: [],
    },
    shooter: {
      hp: 28,
      speed: 40,
      radius: 14,
      contactDamage: 12,
      shootCooldown: 2.6,
      bulletDamage: 10,
      bulletSpeed: 160,
      bulletLife: 5,
      bulletRadius: 5,
      spread: [0],
    },
    elite: {
      hp: 100,
      speed: 45,
      radius: 22,
      contactDamage: 25,
      shootCooldown: 1.8,
      bulletDamage: 16,
      bulletSpeed: 160,
      bulletLife: 5,
      bulletRadius: 5,
      spread: [-0.24, 0, 0.24],
    },
  },
  weapons: {
    pulse: {
      interval: 0.48,
      baseDamage: 16,
      projectileSpeed: 440,
      pierce: 0,
      projectileLife: 2.1,
      projectileRadius: 4,
    },
    orbit: {
      interval: 1.7,
      baseDamage: 13,
      projectileSpeed: 150,
      pierce: 3,
      projectileLife: 1.25,
      projectileRadius: 4,
    },
    nova: {
      interval: 3.2,
      baseDamage: 12,
      projectileSpeed: 240,
      pierce: 1,
      projectileLife: 2.1,
      projectileRadius: 6,
    },
  },
  drops: {
    healChance: 0.055,
    magnetChance: 0.015,
    pickupRadius: 65,
    magnetRangeExtra: 35,
    xp: { chaser: 2, shooter: 3, elite: 10 },
    healValue: 18,
    dropLife: 45,
    healLife: 20,
    magnetLife: 20,
  },
  progression: {
    xpBase: 12,
    xpPerLevel: 7,
    choices: 3,
    allowedUpgrades: [...DEFAULT_ALLOWED_UPGRADES],
  },
  arsenal: {
    pool: [...DEFAULT_WEAPON_POOL],
  },
};

const finiteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/**
 * Structural validation for an untrusted ruleset. A malformed snapshot means the
 * challenge payload was tampered with or comes from an incompatible build.
 */
export function validateRuleset(value: unknown): value is RulesetV1 {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<RulesetV1>;
  if (r.rulesVersion !== 1) return false;
  if (!r.arena || !finiteNumber(r.arena.width) || !finiteNumber(r.arena.height))
    return false;
  if (r.arena.width < 320 || r.arena.height < 240) return false;
  const p = r.player;
  if (
    !p ||
    !finiteNumber(p.hp) ||
    p.hp <= 0 ||
    !finiteNumber(p.speed) ||
    p.speed <= 0 ||
    !finiteNumber(p.radius) ||
    p.radius <= 0 ||
    !finiteNumber(p.invincibility) ||
    !finiteNumber(p.startX) ||
    !finiteNumber(p.startY) ||
    p.startX < 0 ||
    p.startY < 0 ||
    p.startX > r.arena.width ||
    p.startY > r.arena.height
  )
    return false;
  const w = r.waves;
  if (
    !w ||
    !Number.isInteger(w.totalWaves) ||
    w.totalWaves < 1 ||
    !finiteNumber(w.duration) ||
    w.duration <= 0 ||
    !finiteNumber(w.spawnBase) ||
    w.spawnBase < 0 ||
    !finiteNumber(w.spawnPerWave) ||
    w.spawnPerWave < 0 ||
    !finiteNumber(w.spawnMultiplier) ||
    w.spawnMultiplier <= 0 ||
    !Number.isInteger(w.maxEnemies) ||
    w.maxEnemies < 1 ||
    !finiteNumber(w.spawnOffset) ||
    !Number.isInteger(w.eliteWave) ||
    !Number.isInteger(w.shooterWave) ||
    !finiteNumber(w.eliteChance) ||
    w.eliteChance < 0 ||
    w.eliteChance > 1 ||
    !finiteNumber(w.shooterChance) ||
    w.shooterChance < 0 ||
    w.shooterChance > 1 ||
    !finiteNumber(w.hpScalePerWave) ||
    w.hpScalePerWave < 0 ||
    !finiteNumber(w.speedScalePerWave) ||
    w.speedScalePerWave < 0
  )
    return false;
  const kinds: EnemyKindId[] = ["chaser", "shooter", "elite"];
  if (!r.enemies) return false;
  for (const kind of kinds) {
    const e = r.enemies[kind];
    if (
      !e ||
      !finiteNumber(e.hp) ||
      e.hp <= 0 ||
      !finiteNumber(e.speed) ||
      e.speed < 0 ||
      !finiteNumber(e.radius) ||
      e.radius <= 0 ||
      !finiteNumber(e.contactDamage) ||
      e.contactDamage < 0 ||
      !finiteNumber(e.shootCooldown) ||
      e.shootCooldown < 0 ||
      !Array.isArray(e.spread)
    )
      return false;
  }
  if (!r.weapons) return false;
  for (const id of ["pulse", "orbit", "nova"] as WeaponId[]) {
    const weapon = r.weapons[id];
    if (
      !weapon ||
      !finiteNumber(weapon.interval) ||
      weapon.interval <= 0 ||
      !finiteNumber(weapon.baseDamage) ||
      weapon.baseDamage <= 0 ||
      !finiteNumber(weapon.projectileSpeed) ||
      weapon.projectileSpeed <= 0 ||
      !Number.isInteger(weapon.pierce) ||
      weapon.pierce < 0 ||
      !finiteNumber(weapon.projectileLife) ||
      weapon.projectileLife <= 0 ||
      !finiteNumber(weapon.projectileRadius) ||
      weapon.projectileRadius <= 0
    )
      return false;
  }
  const d = r.drops;
  if (
    !d ||
    !finiteNumber(d.healChance) ||
    d.healChance < 0 ||
    d.healChance > 1 ||
    !finiteNumber(d.magnetChance) ||
    d.magnetChance < 0 ||
    d.healChance + d.magnetChance > 1 ||
    !finiteNumber(d.pickupRadius) ||
    d.pickupRadius <= 0 ||
    !finiteNumber(d.magnetRangeExtra) ||
    d.magnetRangeExtra < 0 ||
    !finiteNumber(d.healValue) ||
    d.healValue <= 0 ||
    !d.xp ||
    kinds.some((kind) => !finiteNumber(d.xp[kind]) || d.xp[kind] <= 0)
  )
    return false;
  const g = r.progression;
  if (
    !g ||
    !finiteNumber(g.xpBase) ||
    g.xpBase <= 0 ||
    !finiteNumber(g.xpPerLevel) ||
    g.xpPerLevel < 0 ||
    !Number.isInteger(g.choices) ||
    g.choices < 1 ||
    !Array.isArray(g.allowedUpgrades) ||
    !g.allowedUpgrades.includes("recovery") ||
    g.allowedUpgrades.some((id) => typeof id !== "string")
  )
    return false;
  if (
    !r.arsenal ||
    !Array.isArray(r.arsenal.pool) ||
    !r.arsenal.pool.includes("pulse") ||
    r.arsenal.pool.some((id) => !["pulse", "orbit", "nova"].includes(id))
  )
    return false;
  return true;
}

/** Deep-copy a ruleset so a run can never mutate the shared default snapshot. */
export function cloneRuleset(rules: RulesetV1): RulesetV1 {
  if (typeof structuredClone === "function") return structuredClone(rules);
  return JSON.parse(JSON.stringify(rules)) as RulesetV1;
}
