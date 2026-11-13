import type {
  ChallengeConfig,
  ChallengeResult,
  ChallengeSummary,
  GameDoc,
  RunStats,
} from "../../../shared/types";
import { isSupportedRuleVersion } from "../../../shared/rules";
import { dailySeed } from "./daily";
import { deriveRuleset, validateChallengeShape } from "./config";

/** Extract the run-end summary that friends re-check locally. */
export function buildSummary(doc: GameDoc): ChallengeSummary {
  const stats: RunStats = doc.stats;
  return {
    outcome: doc.victory ? "victory" : "defeat",
    time: Number(doc.time.toFixed(3)),
    wave: doc.wave,
    level: doc.level,
    kills: stats.kills,
    damage: Math.round(stats.damage),
    taken: Math.round(stats.taken),
    collected: stats.collected,
    shots: stats.shots,
    byWeapon: {
      pulse: Math.round(stats.byWeapon.pulse),
      orbit: Math.round(stats.byWeapon.orbit),
      nova: Math.round(stats.byWeapon.nova),
    },
    weapons: doc.weapons.map((w) => `${w.id}:${w.level}`),
  };
}

/** Build the exportable artifact for a finished challenge run. */
export function buildChallengeResult(doc: GameDoc): ChallengeResult | null {
  if (!doc.challenge || doc.phase !== "ended") return null;
  return {
    artifact: "void-signal.challenge-result",
    formatVersion: 1,
    challenge: doc.challenge,
    summary: buildSummary(doc),
  };
}

export type ReviewStatus =
  | "verified-victory"
  | "verified-defeat"
  | "corrupt"
  | "unsupported";

export interface ReviewOutcome {
  status: ReviewStatus;
  reason: string;
  result?: ChallengeResult;
}

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

function validateResultShape(value: unknown): value is ChallengeResult {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<ChallengeResult>;
  if (
    r.artifact !== "void-signal.challenge-result" ||
    r.formatVersion !== 1 ||
    !validateChallengeShape(r.challenge)
  )
    return false;
  const s = r.summary as Partial<ChallengeSummary> | undefined;
  if (!s || (s.outcome !== "victory" && s.outcome !== "defeat")) return false;
  const numeric: (keyof ChallengeSummary)[] = [
    "time",
    "wave",
    "level",
    "kills",
    "damage",
    "taken",
    "collected",
    "shots",
  ];
  if (numeric.some((key) => !isFiniteNumber(s[key] as number))) return false;
  const byWeapon = s.byWeapon;
  if (
    !byWeapon ||
    (["pulse", "orbit", "nova"] as const).some(
      (id) => !isFiniteNumber(byWeapon[id]) || byWeapon[id] < 0,
    ) ||
    !Array.isArray(s.weapons) ||
    s.weapons.some((w) => typeof w !== "string")
  )
    return false;
  return true;
}

/**
 * Verify an exported result locally without trusting its sender.
 *
 * Order matters: an unknown rulesVersion is reported as "unsupported" rather
 * than as a defeat, so a failed run and an un-runnable file are never confused.
 * Structural or constraint tampering is "corrupt". A self-consistent artifact
 * resolves to the player's actual outcome, verified-victory or verified-defeat.
 */
export function reviewResult(value: unknown): ReviewOutcome {
  if (!validateResultShape(value))
    return { status: "corrupt", reason: "结果文件结构损坏或字段缺失" };
  const result = value;
  const { challenge, summary } = result;

  if (!isSupportedRuleVersion(challenge.rulesVersion))
    return {
      status: "unsupported",
      reason: `规则版本 ${challenge.rulesVersion} 不受当前客户端支持，无法判定胜负`,
      result,
    };

  // The claimed seed and constraints must re-derive from (date, code), so a
  // sender cannot quietly retune the challenge or only relabel it.
  if (dailySeed(challenge.date, challenge.code) !== challenge.seed)
    return { status: "corrupt", reason: "种子与日期/挑战码不一致，结果不可信" };
  let expectedRules;
  try {
    expectedRules = deriveRuleset(challenge);
  } catch {
    return { status: "corrupt", reason: "挑战约束无法解析为有效规则集" };
  }
  const c = challenge.constraints;
  if (
    c.totalWaves !== expectedRules.waves.totalWaves ||
    c.waveDuration !== expectedRules.waves.duration ||
    c.arenaWidth !== expectedRules.arena.width ||
    c.arenaHeight !== expectedRules.arena.height
  )
    return { status: "corrupt", reason: "挑战约束与派生规则不一致" };

  // Internal invariants: weapon/level strings must stay inside the pool.
  const pool = new Set(c.weaponPool);
  for (const entry of summary.weapons) {
    const [id, level] = entry.split(":");
    if (!pool.has(id as never) || !Number.isInteger(Number(level)))
      return { status: "corrupt", reason: "结算摘要包含未授权武器" };
  }

  const minimumRunLength = c.totalWaves * c.waveDuration;
  if (summary.outcome === "victory") {
    // Victory is only reachable after the final wave completes.
    if (summary.wave < c.totalWaves)
      return { status: "corrupt", reason: "未抵达最终波次却标记为胜利" };
    if (summary.time + 0.5 < minimumRunLength)
      return { status: "corrupt", reason: "胜利耗时短于波次总时长" };
    return {
      status: "verified-victory",
      reason: "结果自洽：该挑战确认为撤离成功",
      result,
    };
  }

  // A real defeat happens before the final wave finishes and requires damage.
  if (summary.wave > c.totalWaves)
    return { status: "corrupt", reason: "波次超出挑战上限" };
  if (summary.taken <= 0)
    return { status: "corrupt", reason: "未受到伤害却标记为失败" };
  if (summary.time >= minimumRunLength + 0.5)
    return {
      status: "corrupt",
      reason: "已打满全部波次，应判定为胜利而非失败",
    };
  return {
    status: "verified-defeat",
    reason: "结果自洽：该挑战确认为信号中断（真实失败）",
    result,
  };
}

/** Convenience parser for an imported result file's raw text. */
export function reviewResultText(text: string): ReviewOutcome {
  try {
    return reviewResult(JSON.parse(text));
  } catch {
    return { status: "corrupt", reason: "结果文件不是合法 JSON" };
  }
}
