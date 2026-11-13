import { test } from "node:test";
import assert from "node:assert/strict";
import { createRun } from "../src/shared/createRun";
import { simulate } from "../src/app/simulate";
import type { Input } from "../src/shared/types";
import {
  generateChallenge,
  deriveRuleset,
  encodeChallenge,
  decodeChallenge,
  createChallengeRun,
  reviewResultText,
  buildChallengeResult,
  dailySeed,
  challengeId,
  parseDate,
} from "../src/features/challenges";
import { chooseUpgrade } from "../src/features/progression";
import { rollChoices } from "../src/features/progression/model/choices";
import type { ChallengeConfig, ChallengeResult } from "../src/shared/types";

const idleInput: Input = {
  x: 0,
  y: 0,
  aim: { x: 700, y: 325 },
  firing: false,
};

/** Advance a run for a fixed number of simulation frames, auto-picking upgrades. */
function burnFrames(doc: ReturnType<typeof createRun>, frames: number) {
  for (let i = 0; i < frames; i++) {
    if (doc.phase === "ended") break;
    if (doc.phase === "upgrade") {
      while (doc.phase === "upgrade") chooseUpgrade(doc, doc.choices[0]);
    }
    if (doc.phase === "playing") simulate(doc, idleInput, 1 / 60);
  }
}

test("same date and code always produce the same seed, constraints and id", () => {
  const a = generateChallenge({ date: "2026-11-13", code: "NEON-07" });
  const b = generateChallenge({ date: "2026-11-13", code: "NEON-07" });
  assert.equal(a.seed, b.seed);
  assert.deepEqual(a.constraints, b.constraints);
  assert.equal(challengeId(a.date, a.code), challengeId(b.date, b.code));
  // A different day or code must change the run.
  const otherDay = generateChallenge({ date: "2026-11-14", code: "NEON-07" });
  const otherCode = generateChallenge({ date: "2026-11-13", code: "NEON-08" });
  assert.notEqual(a.seed, otherDay.seed);
  assert.notEqual(a.seed, otherCode.seed);
});

test("constraints cover waves, weapons, drops, upgrades and arena — never title alone", () => {
  const challenge = generateChallenge({ date: "2026-11-13", code: "WIDE" });
  const k = challenge.constraints;
  assert.ok(k.totalWaves >= 4 && k.totalWaves <= 9);
  assert.ok(k.waveDuration >= 20 && k.waveDuration <= 35);
  assert.ok(k.weaponPool.includes("pulse"));
  assert.ok(k.healChance > 0 && k.magnetChance > 0);
  assert.ok(k.healChance + k.magnetChance <= 1);
  assert.ok(k.arenaWidth >= 720 && k.arenaHeight >= 480);
  assert.ok(k.allowedUpgrades.includes("recovery"));

  // Two challenges with the same constraints but different titles still share
  // every simulation input; the title is pure presentation metadata.
  const renamed: ChallengeConfig = { ...challenge, title: "完全不同的标题" };
  assert.deepEqual(deriveRuleset(renamed), deriveRuleset(challenge));
});

test("resolved ruleset applies every constraint to the engine inputs", () => {
  const challenge = generateChallenge({ date: "2026-11-13", code: "LOCK" });
  const rules = deriveRuleset(challenge);
  const k = challenge.constraints;
  assert.equal(rules.rulesVersion, 1);
  assert.equal(rules.waves.totalWaves, k.totalWaves);
  assert.equal(rules.waves.duration, k.waveDuration);
  assert.equal(rules.arena.width, k.arenaWidth);
  assert.equal(rules.arena.height, k.arenaHeight);
  assert.deepEqual(rules.arsenal.pool, k.weaponPool);
  assert.deepEqual(rules.progression.allowedUpgrades, k.allowedUpgrades);
  assert.equal(rules.drops.healChance, k.healChance);
  assert.equal(rules.drops.magnetChance, k.magnetChance);
});

test("identical challenge code replays the same enemy tide frame for frame", () => {
  const challenge = generateChallenge({ date: "2026-11-13", code: "TIDE" });
  const runA = createChallengeRun(challenge);
  const runB = createChallengeRun(challenge);
  runA.phase = "playing";
  runB.phase = "playing";
  burnFrames(runA, 600);
  burnFrames(runB, 600);
  assert.equal(runA.wave, runB.wave);
  assert.equal(runA.enemies.length, runB.enemies.length);
  assert.deepEqual(
    runA.enemies.map((e) => ({ kind: e.kind, x: e.x, y: e.y, hp: e.hp })),
    runB.enemies.map((e) => ({ kind: e.kind, x: e.x, y: e.y, hp: e.hp })),
  );
  assert.equal(runA.stats.kills, runB.stats.kills);
});

test("a second load starts clean and never inherits the previous run's upgrades", () => {
  const challenge = generateChallenge({ date: "2026-11-13", code: "RELOAD" });
  const first = createChallengeRun(challenge);
  first.phase = "playing";
  first.upgrades.power = 5;
  first.upgrades.armor = 3;
  first.weapons.push({ id: "orbit", level: 2, cooldown: 0 });
  first.stats.kills = 42;
  burnFrames(first, 120);

  const second = createChallengeRun(challenge);
  assert.deepEqual(second.upgrades, {});
  assert.deepEqual(
    second.weapons.map((w) => w.id),
    ["pulse"],
  );
  assert.equal(second.stats.kills, 0);
  assert.equal(second.time, 0);
  assert.equal(second.phase, "ready");
  // The same seed is retained, but the RNG stream restarts from the beginning.
  assert.equal(second.seed, challenge.seed);
});

test("importing a valid code launches an equivalent run", () => {
  const challenge = generateChallenge({ date: "2026-11-13", code: "SHARE" });
  const code = encodeChallenge(challenge);
  const decoded = decodeChallenge(code);
  assert.equal(decoded.status, "ok");
  if (decoded.status !== "ok") throw new Error("expected ok");
  const run = createChallengeRun(decoded.challenge);
  assert.equal(run.challenge?.seed, challenge.seed);
  assert.deepEqual(run.rules, deriveRuleset(challenge));
});

test("corrupt challenge codes are rejected without a usable challenge", () => {
  const good = encodeChallenge(
    generateChallenge({ date: "2026-11-13", code: "OK" }),
  );
  const tampered = good.slice(0, -2) + (good.endsWith("aa") ? "bb" : "aa");
  assert.equal(decodeChallenge(tampered).status, "corrupt");
  assert.equal(decodeChallenge("not-a-real-code").status, "corrupt");
  assert.equal(decodeChallenge("VS1.@@@.abcd").status, "corrupt");
  assert.equal(decodeChallenge("VS1.abcd.deadbeef").status, "corrupt");
});

test("a malformed import leaves the current run completely untouched", () => {
  const challenge = generateChallenge({ date: "2026-11-13", code: "KEEP" });
  const active = createChallengeRun(challenge);
  active.phase = "playing";
  active.upgrades.haste = 2;
  const snapshot = JSON.stringify({
    seed: active.seed,
    upgrades: active.upgrades,
    phase: active.phase,
    rules: active.rules,
  });
  const result = decodeChallenge("VS1.broken.payload");
  assert.equal(result.status, "corrupt");
  // The caller only replaces the run on status "ok"; here nothing changed.
  assert.equal(active.phase, "playing");
  assert.equal(active.upgrades.haste, 2);
  assert.equal(
    JSON.stringify({
      seed: active.seed,
      upgrades: active.upgrades,
      phase: active.phase,
      rules: active.rules,
    }),
    snapshot,
  );
});

test("an unsupported rules version is reported separately from corruption", () => {
  const challenge = generateChallenge({ date: "2026-11-13", code: "FUTURE" });
  const future = { ...challenge, rulesVersion: 99 } as unknown as ChallengeConfig;
  const code = encodeChallenge(future);
  const result = decodeChallenge(code);
  assert.equal(result.status, "unsupported");
});

test("a running challenge keeps its pinned rules even when the day rolls over", () => {
  // The ruleset snapshot is captured on the doc; a later calendar change cannot
  // reach into it because no step reads the live clock or default balance.
  const yesterday = generateChallenge({ date: "2026-11-12", code: "CROSS" });
  const doc = createChallengeRun(yesterday);
  doc.phase = "playing";
  const pinned = JSON.stringify(doc.rules);
  const seedBefore = doc.seed;
  burnFrames(doc, 300);
  // Simulate "today" changing underneath the in-flight run.
  const todayChallenge = generateChallenge({ date: "2026-11-13", code: "CROSS" });
  assert.notEqual(todayChallenge.seed, yesterday.seed);
  assert.equal(JSON.stringify(doc.rules), pinned);
  assert.notEqual(doc.seed, seedBefore); // RNG advances, but rules stay fixed
  assert.equal(doc.challenge?.date, "2026-11-12");
});

test("free play uses the default ruleset and is independent of challenges", () => {
  const free = createRun();
  assert.equal(free.rules.rulesVersion, 1);
  assert.equal(free.rules.waves.totalWaves, 8);
  assert.equal(free.challenge, undefined);
  assert.equal(free.rules.arena.width, 1000);
});

test("review distinguishes a real defeat from an unsupported version", () => {
  const challenge = generateChallenge({ date: "2026-11-13", code: "REVIEW" });
  const run = createChallengeRun(challenge);
  run.phase = "playing";
  // Park the player on the bottom edge so chasers reliably make contact.
  run.player.x = run.rules.arena.width / 2;
  run.player.y = run.rules.arena.height - 20;
  run.player.invincible = 0;
  for (let i = 0; i < 60 * 45 && run.phase !== "ended"; i++) {
    if (run.phase === "upgrade")
      while (run.phase === "upgrade") chooseUpgrade(run, run.choices[0]);
    if (run.phase === "playing") simulate(run, idleInput, 1 / 60);
  }
  assert.equal(run.phase, "ended");
  assert.equal(run.victory, false);
  assert.ok(run.stats.taken > 0, "a real defeat must involve damage taken");
  const artifact = buildChallengeResult(run);
  assert.ok(artifact);
  if (!artifact) return;
  const verified = reviewResultText(JSON.stringify(artifact));
  assert.equal(verified.status, "verified-defeat");

  const future: ChallengeResult = {
    ...artifact,
    challenge: {
      ...artifact.challenge,
      rulesVersion: 77,
    } as ChallengeConfig,
  };
  const unsupported = reviewResultText(JSON.stringify(future));
  assert.equal(unsupported.status, "unsupported");
  assert.notEqual(unsupported.status, "verified-defeat");
});

test("review rejects a tampered seed or an impossible victory", () => {
  const challenge = generateChallenge({ date: "2026-11-13", code: "TAMPER" });
  const run = createChallengeRun(challenge);
  run.phase = "playing";
  burnFrames(run, 30);
  const artifact = buildChallengeResult({ ...run, phase: "ended", victory: true });
  assert.ok(artifact);
  if (!artifact) return;

  const tamperedSeed: ChallengeResult = {
    ...artifact,
    challenge: { ...artifact.challenge, seed: artifact.challenge.seed + 1 },
  };
  assert.equal(reviewResultText(JSON.stringify(tamperedSeed)).status, "corrupt");

  // Claiming victory before the final wave is internally impossible.
  const earlyVictory: ChallengeResult = {
    ...artifact,
    summary: { ...artifact.summary, outcome: "victory", wave: 1, time: 5 },
  };
  assert.equal(reviewResultText(JSON.stringify(earlyVictory)).status, "corrupt");

  // A defeat with zero damage taken is impossible.
  const fakeDefeat: ChallengeResult = {
    ...artifact,
    summary: {
      ...artifact.summary,
      outcome: "defeat",
      taken: 0,
      time: 10,
      wave: 1,
    },
  };
  assert.equal(reviewResultText(JSON.stringify(fakeDefeat)).status, "corrupt");
});

test("review rejects malformed JSON and foreign artifacts", () => {
  assert.equal(reviewResultText("{not json").status, "corrupt");
  assert.equal(
    reviewResultText(JSON.stringify({ artifact: "something-else" })).status,
    "corrupt",
  );
});

test("date parsing accepts only real YYYY-MM-DD calendar days", () => {
  assert.ok(parseDate("2026-11-13"));
  assert.equal(parseDate("2026-02-31"), null);
  assert.equal(parseDate("2026-13-01"), null);
  assert.equal(parseDate("13-11-2026"), null);
  assert.equal(parseDate("not-a-date"), null);
});

test("daily seed helper is stable across calls", () => {
  assert.equal(
    dailySeed("2026-11-13", "X"),
    dailySeed("2026-11-13", "X"),
  );
  assert.notEqual(
    dailySeed("2026-11-13", "X"),
    dailySeed("2026-11-13", "Y"),
  );
});

test("a weapon outside the challenge pool is never offered as an upgrade", () => {
  const base = generateChallenge({ date: "2026-11-13", code: "POOL" });
  // Force the tightest possible pool: pulse only, and strip every weapon upgrade.
  const challenge: ChallengeConfig = {
    ...base,
    constraints: {
      ...base.constraints,
      weaponPool: ["pulse"],
      allowedUpgrades: ["recovery", "power", "haste"],
    },
  };
  const run = createChallengeRun(challenge);
  run.phase = "playing";
  run.pendingLevels = 4;
  const offered = new Set<string>();
  while (run.pendingLevels > 0) {
    rollChoices(run);
    run.choices.forEach((id) => offered.add(id));
    chooseUpgrade(run, run.choices[0]);
  }
  assert.ok(!offered.has("orbit"));
  assert.ok(!offered.has("nova"));
  for (const id of offered)
    assert.ok(challenge.constraints.allowedUpgrades.includes(id));
  assert.deepEqual(
    run.weapons.map((w) => w.id),
    ["pulse"],
  );
});

test("challenge arena dimensions actually clamp the play field", () => {
  const base = generateChallenge({ date: "2026-11-13", code: "ARENA" });
  const challenge: ChallengeConfig = {
    ...base,
    constraints: { ...base.constraints, arenaWidth: 400, arenaHeight: 300 },
  };
  const run = createChallengeRun(challenge);
  assert.equal(run.rules.arena.width, 400);
  assert.equal(run.rules.arena.height, 300);
  assert.equal(run.player.x, 200);
  assert.equal(run.player.y, 150);
});
