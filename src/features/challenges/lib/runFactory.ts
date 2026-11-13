import type { ChallengeConfig, GameDoc, RunRecord } from "../../../shared/types";
import { createRun } from "../../../shared/createRun";
import { deriveRuleset } from "./config";

/**
 * Materialise a challenge into a brand-new run. The resolved ruleset is owned
 * exclusively by this doc, so loading a challenge again never inherits the
 * previous run's weapons, upgrades or stats — every load starts from scratch.
 */
export function createChallengeRun(
  challenge: ChallengeConfig,
  records: RunRecord[] = [],
): GameDoc {
  return createRun({
    seed: challenge.seed,
    records,
    rules: deriveRuleset(challenge),
    challenge,
  });
}
