import type { GameDoc } from "../../../shared/types";
export function xpRequired(level: number, doc?: GameDoc): number {
  const g = doc ? doc.rules.progression : { xpBase: 12, xpPerLevel: 7 };
  return g.xpBase + (level - 1) * g.xpPerLevel;
}
export function grantExperience(doc: GameDoc, value: number): void {
  doc.xp += value;
  while (doc.xp >= xpRequired(doc.level, doc)) {
    doc.xp -= xpRequired(doc.level, doc);
    doc.level++;
    doc.pendingLevels++;
  }
}
