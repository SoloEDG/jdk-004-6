import { useEffect, useRef, useState } from "react";
import { createRun } from "../shared/createRun";
import type { ChallengeConfig, GameDoc, Input } from "../shared/types";
import { simulate } from "./simulate";
import { chooseUpgrade } from "../features/progression";
import { loadRecords, saveRecords } from "../features/results";
import {
  createChallengeRun,
  decodeChallenge,
} from "../features/challenges";

export interface ChallengeNotice {
  kind: "ok" | "corrupt" | "unsupported";
  text: string;
}

const FREE_SEED = 204004;

export function useGame() {
  const game = useRef<GameDoc>(createRun({ seed: FREE_SEED, records: loadRecords() }));
  const input = useRef<Input>({
    x: 0,
    y: 0,
    aim: { x: 500, y: 0 },
    firing: false,
  });
  const keys = useRef(new Set<string>());
  const [, render] = useState(0);
  const [notice, setNotice] = useState<ChallengeNotice | null>(null);
  const rerender = () => render((n) => n + 1);

  /**
   * Start a brand-new isolated run for a validated challenge. A new doc is always
   * constructed, so re-loading the same code never carries over the previous
   * run's upgrades, weapons or stats.
   */
  const launchChallenge = (challenge: ChallengeConfig) => {
    saveRecords(game.current.records);
    game.current = createChallengeRun(challenge, game.current.records);
    keys.current.clear();
    input.current.firing = false;
    setNotice({
      kind: "ok",
      text: `已接入挑战「${challenge.title}」，规则版本 v${challenge.rulesVersion} 已固定`,
    });
    rerender();
  };

  useEffect(() => {
    let raf = 0,
      last = 0,
      acc = 0,
      paint = 0;
    const tick = (now: number) => {
      const elapsed = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      const d = game.current;
      input.current.x =
        Number(keys.current.has("d") || keys.current.has("arrowright")) -
        Number(keys.current.has("a") || keys.current.has("arrowleft"));
      input.current.y =
        Number(keys.current.has("s") || keys.current.has("arrowdown")) -
        Number(keys.current.has("w") || keys.current.has("arrowup"));
      if (d.phase === "playing") {
        acc += elapsed;
        while (acc >= 1 / 60) {
          simulate(d, input.current, 1 / 60);
          acc -= 1 / 60;
          if (d.phase !== "playing") {
            acc = 0;
            break;
          }
        }
      } else acc = 0;
      if (now - paint > 32) {
        render((n) => n + 1);
        paint = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const pause = () => {
      if (game.current.phase === "playing") game.current.phase = "paused";
      keys.current.clear();
      input.current.firing = false;
    };
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
        e.preventDefault();
      keys.current.add(k);
      if ((k === "escape" || k === "p") && !e.repeat) {
        const d = game.current;
        if (d.phase === "playing") d.phase = "paused";
        else if (d.phase === "paused") d.phase = "playing";
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const hidden = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);

  return {
    game,
    input,
    notice,
    clearNotice: () => setNotice(null),
    start: () => {
      game.current.phase = "playing";
    },
    toggle: () => {
      const d = game.current;
      if (d.phase === "playing") d.phase = "paused";
      else if (d.phase === "paused") d.phase = "playing";
    },
    choose: (id: string) => chooseUpgrade(game.current, id),
    /** Launch an already-validated challenge (daily generation or terminal preview). */
    launch: (challenge: ChallengeConfig) => launchChallenge(challenge),
    /**
     * Import a share code. On any failure the current run is left completely
     * untouched and the caller receives the precise reason; only an "ok" decode
     * replaces the active run.
     */
    importCode: (raw: string): ChallengeNotice => {
      const result = decodeChallenge(raw);
      if (result.status !== "ok") {
        const message: ChallengeNotice = {
          kind: result.status,
          text: result.reason,
        };
        setNotice(message);
        return message;
      }
      launchChallenge(result.challenge);
      return { kind: "ok", text: "挑战码已通过校验并接入" };
    },
    /** Return to the untethered free-play run. */
    startFree: () => {
      saveRecords(game.current.records);
      game.current = createRun({ seed: FREE_SEED, records: game.current.records });
      keys.current.clear();
      input.current.firing = false;
      setNotice({ kind: "ok", text: "已返回自由行动（默认规则）" });
      rerender();
    },
    restart: () => {
      const previous = game.current;
      saveRecords(previous.records);
      game.current = previous.challenge
        ? createChallengeRun(previous.challenge, previous.records)
        : createRun({ seed: FREE_SEED, records: previous.records });
      keys.current.clear();
      input.current.firing = false;
      game.current.phase = "playing";
    },
  };
}
