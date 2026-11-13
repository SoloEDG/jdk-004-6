import type {
  ChallengeConfig,
  ChallengeConstraints,
  WeaponId,
} from "../../../shared/types";
import {
  DEFAULT_RULES_V1,
  DEFAULT_WEAPON_POOL,
  cloneRuleset,
  validateRuleset,
  type RulesetV1,
} from "../../../shared/rules";
import { DEFAULT_ALLOWED_UPGRADES } from "../../../shared/rules";
import { dailySeed } from "./daily";

/** Independent LCG stream so constraint rolls never consume the gameplay seed. */
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const pick = <T>(rng: () => number, values: readonly T[]): T =>
  values[Math.floor(rng() * values.length)];

/**
 * Derive the full challenge constraints from (date, code). Every dimension the
 * task names is rolled here: waves, weapon candidates, drop probabilities and
 * arena limits. Two codes can never resolve to identical constraints by
 * construction — even the title is metadata, not an input to the simulation.
 */
export function generateConstraints(seed: number): ChallengeConstraints {
  const rng = makeRng(seed);
  const totalWaves = 4 + Math.floor(rng() * 6); // 4..9 waves
  const waveDuration = 20 + Math.floor(rng() * 4) * 5; // 20..35s in 5s steps

  // Weapon pool always keeps the starter pulse; orbit/nova may be restricted.
  const weaponPool: WeaponId[] = ["pulse"];
  for (const id of ["orbit", "nova"] as const)
    if (rng() < 0.75) weaponPool.push(id);

  // Drop probabilities move inside a tight, fully valid window.
  const healChance = 0.03 + rng() * 0.05;
  const magnetChance = 0.005 + rng() * 0.02;

  // Arena limits: 720..1000 wide, 480..650 tall, in 40px grid steps.
  const arenaWidth = 720 + Math.floor(rng() * 8) * 40;
  const arenaHeight = 480 + Math.floor(rng() * 5) * 40;

  // Upgrades: remove zero to three non-recovery entries; recovery always remains.
  const optional = DEFAULT_ALLOWED_UPGRADES.filter((id) => id !== "recovery");
  const removedCount = Math.floor(rng() * 4);
  const removed = new Set<number>();
  while (removed.size < removedCount)
    removed.add(Math.floor(rng() * optional.length));
  const allowedUpgrades = optional.filter((_, index) => !removed.has(index));
  allowedUpgrades.push("recovery");

  return {
    totalWaves,
    waveDuration,
    weaponPool,
    allowedUpgrades: [...new Set(allowedUpgrades)],
    healChance: Number(healChance.toFixed(4)),
    magnetChance: Number(magnetChance.toFixed(4)),
    arenaWidth,
    arenaHeight,
  };
}

export interface GenerateChallengeInput {
  date: string;
  code: string;
  title?: string;
}

/** Build a complete, self-contained challenge for a given day and code. */
export function generateChallenge(input: GenerateChallengeInput): ChallengeConfig {
  const code = input.code.trim();
  const seed = dailySeed(input.date, code);
  return {
    date: input.date,
    code,
    rulesVersion: 1,
    seed,
    title: input.title?.trim() || `每日挑战 · ${input.date}`,
    constraints: generateConstraints(seed),
  };
}

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/**
 * Structural validation that is independent of the rules version. It lets the
 * codec tell a well-formed-but-unsupported payload apart from a corrupt one:
 * a foreign rulesVersion passes the shape check, then the codec reports
 * "unsupported" instead of "corrupt".
 */
export function validateChallengeShape(value: unknown): value is ChallengeConfig {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<ChallengeConfig>;
  if (
    typeof c.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(c.date) ||
    typeof c.code !== "string" ||
    c.code.length === 0 ||
    c.code.length > 32 ||
    typeof c.title !== "string" ||
    !Number.isInteger(c.rulesVersion) ||
    (c.rulesVersion as number) < 1 ||
    !isFiniteNumber(c.seed)
  )
    return false;
  return validateConstraintShape(c.constraints);
}

function validateConstraintShape(k: unknown): boolean {
  if (!k || typeof k !== "object") return false;
  const c = k as Partial<ChallengeConstraints>;
  if (
    !Number.isInteger(c.totalWaves) ||
    (c.totalWaves as number) < 1 ||
    (c.totalWaves as number) > 16 ||
    !isFiniteNumber(c.waveDuration) ||
    (c.waveDuration as number) < 10 ||
    (c.waveDuration as number) > 120 ||
    !isFiniteNumber(c.healChance) ||
    (c.healChance as number) < 0 ||
    (c.healChance as number) > 1 ||
    !isFiniteNumber(c.magnetChance) ||
    (c.magnetChance as number) < 0 ||
    (c.healChance as number) + (c.magnetChance as number) > 1 ||
    !Number.isInteger(c.arenaWidth) ||
    (c.arenaWidth as number) < 320 ||
    (c.arenaWidth as number) > 1200 ||
    !Number.isInteger(c.arenaHeight) ||
    (c.arenaHeight as number) < 240 ||
    (c.arenaHeight as number) > 900
  )
    return false;
  if (
    !Array.isArray(c.weaponPool) ||
    c.weaponPool.length < 1 ||
    !c.weaponPool.includes("pulse") ||
    c.weaponPool.some((id) => !DEFAULT_WEAPON_POOL.includes(id)) ||
    new Set(c.weaponPool).size !== c.weaponPool.length
  )
    return false;
  if (
    !Array.isArray(c.allowedUpgrades) ||
    c.allowedUpgrades.length < 1 ||
    !c.allowedUpgrades.includes("recovery") ||
    c.allowedUpgrades.some((id) => typeof id !== "string")
  )
    return false;
  return true;
}

/**
 * Strict validation for a challenge this build can actually run. Combines the
 * version-independent shape check with the supported rulesVersion.
 */
export function validateChallenge(value: unknown): value is ChallengeConfig {
  if (!validateChallengeShape(value)) return false;
  return value.rulesVersion === 1;
}

/**
 * Resolve a challenge into the full immutable ruleset the engine will run.
 * Starting from the pinned rulesVersion snapshot (NOT live balance), each
 * constraint is applied to a private copy, then the result is re-validated.
 */
export function deriveRuleset(challenge: ChallengeConfig): RulesetV1 {
  const base = cloneRuleset(DEFAULT_RULES_V1);
  const { constraints: k } = challenge;
  base.rulesVersion = challenge.rulesVersion;
  base.waves.totalWaves = k.totalWaves;
  base.waves.duration = k.waveDuration;
  base.arsenal.pool = [...k.weaponPool];
  base.progression.allowedUpgrades = [...k.allowedUpgrades];
  base.drops.healChance = k.healChance;
  base.drops.magnetChance = k.magnetChance;
  base.arena.width = k.arenaWidth;
  base.arena.height = k.arenaHeight;
  // Keep the spawn centred inside whatever field the challenge pinned.
  base.player.startX = k.arenaWidth / 2;
  base.player.startY = k.arenaHeight / 2;
  if (!validateRuleset(base))
    throw new Error("challenge resolved to an invalid ruleset");
  return base;
}
