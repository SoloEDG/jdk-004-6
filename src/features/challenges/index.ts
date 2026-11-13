export { generateChallenge, deriveRuleset, validateChallenge } from "./lib/config";
export type { GenerateChallengeInput } from "./lib/config";
export type { ChallengeConfig, ChallengeConstraints, ChallengeResult, ChallengeSummary } from "../../shared/types";
export { encodeChallenge, decodeChallenge } from "./lib/codec";
export type { DecodeResult, DecodeStatus } from "./lib/codec";
export {
  buildChallengeResult,
  buildSummary,
  reviewResult,
  reviewResultText,
} from "./lib/results";
export type { ReviewOutcome, ReviewStatus } from "./lib/results";
export { createChallengeRun } from "./lib/runFactory";
export {
  today,
  parseDate,
  formatDate,
  dailySeed,
  challengeId,
} from "./lib/daily";
export { ChallengeTerminal } from "./ui/ChallengeTerminal";
export { ChallengePanel } from "./ui/ChallengePanel";
