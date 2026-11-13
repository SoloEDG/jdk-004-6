import type { EnemyKindId } from "../../../shared/rules";

/**
 * Presentation-only enemy metadata. All numeric balance lives in the pinned
 * ruleset (shared/rules.ts); colours and labels never affect simulation.
 */
export const ENEMY_LABELS: Record<
  EnemyKindId,
  { color: string; label: string }
> = {
  chaser: { color: "#fb7185", label: "追猎者" },
  shooter: { color: "#fbbf24", label: "游击者" },
  elite: { color: "#c084fc", label: "精英体" },
};
