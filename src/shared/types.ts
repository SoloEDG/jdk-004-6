import type { RulesetV1, EnemyKindId } from "./rules";

export type Vec = { x: number; y: number };
export type Phase = "ready" | "playing" | "paused" | "upgrade" | "ended";
export type WeaponId = "pulse" | "orbit" | "nova";
export interface Player extends Vec {
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  invincible: number;
}
export interface Enemy extends Vec {
  id: number;
  kind: EnemyKindId;
  hp: number;
  maxHp: number;
  radius: number;
  cooldown: number;
}
export interface Bullet extends Vec {
  id: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  owner: "player" | "enemy";
  weapon: WeaponId | "enemy";
  pierce: number;
  hit: number[];
}
export interface Drop extends Vec {
  id: number;
  kind: "xp" | "heal" | "magnet";
  value: number;
  life: number;
}
export interface Weapon {
  id: WeaponId;
  level: number;
  cooldown: number;
}
export interface Upgrade {
  id: string;
  name: string;
  description: string;
  category: string;
  max: number;
}
export interface RunStats {
  kills: number;
  damage: number;
  taken: number;
  collected: number;
  shots: number;
  byWeapon: Record<WeaponId, number>;
}
export interface RunRecord {
  id: string;
  duration: number;
  wave: number;
  level: number;
  kills: number;
  damage: number;
  weapons: string[];
  victory: boolean;
  /** Challenge code when this record came from a shared challenge. */
  challengeCode?: string;
}

/**
 * Immutable constraints of a shared daily challenge. Every field changes the
 * resolved ruleset, so two challenges cannot differ by title alone. The resolved
 * ruleset is derived from these constraints at load time and validated against
 * the pinned rulesVersion.
 */
export interface ChallengeConfig {
  /** Calendar day the challenge belongs to, local date formatted YYYY-MM-DD. */
  date: string;
  /** Public short code chosen by the sender; feeds the deterministic seed. */
  code: string;
  /** Pinned ruleset version — never replaced by the client's current balance. */
  rulesVersion: 1;
  seed: number;
  title: string;
  constraints: ChallengeConstraints;
}

export interface ChallengeConstraints {
  totalWaves: number;
  waveDuration: number;
  weaponPool: WeaponId[];
  /** Upgrade ids that may be offered during the run. */
  allowedUpgrades: string[];
  healChance: number;
  magnetChance: number;
  arenaWidth: number;
  arenaHeight: number;
}

/** Snapshot summary emitted at run end, used for friend-side verification. */
export interface ChallengeSummary {
  outcome: "victory" | "defeat";
  time: number;
  wave: number;
  level: number;
  kills: number;
  damage: number;
  taken: number;
  collected: number;
  shots: number;
  byWeapon: Record<WeaponId, number>;
  weapons: string[];
}

/** Exportable artifact: the original challenge plus a self-describing result. */
export interface ChallengeResult {
  artifact: "void-signal.challenge-result";
  formatVersion: 1;
  challenge: ChallengeConfig;
  summary: ChallengeSummary;
}

export interface GameDoc {
  version: 1;
  seed: number;
  initialSeed: number;
  nextId: number;
  phase: Phase;
  time: number;
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  drops: Drop[];
  weapons: Weapon[];
  upgrades: Record<string, number>;
  choices: string[];
  xp: number;
  level: number;
  pendingLevels: number;
  wave: number;
  waveTime: number;
  spawnBudget: number;
  stats: RunStats;
  records: RunRecord[];
  notice: string;
  victory: boolean;
  /** Resolved immutable balance snapshot this run is simulated against. */
  rules: RulesetV1;
  /** Present only when this run is a shared daily challenge. */
  challenge?: ChallengeConfig;
}
export interface Input {
  x: number;
  y: number;
  aim: Vec;
  firing: boolean;
}
export interface KillEvent {
  enemy: Enemy;
  weapon: WeaponId;
}
export interface FrameEvents {
  weaponDamage?: Partial<Record<WeaponId, number>>;
  kills: KillEvent[];
  damage: number;
  taken: number;
  shots: number;
  collected: number;
}
