import { Radio, Upload, CalendarClock } from "lucide-react";
import type { GameDoc } from "../../../shared/types";
import { challengeId } from "../lib/daily";
import { encodeChallenge } from "../lib/codec";

export function ChallengePanel({
  doc,
  onOpen,
}: {
  doc: GameDoc;
  onOpen: () => void;
}) {
  const challenge = doc.challenge;
  return (
    <section className="panel challenge-panel">
      <div className="section-caption">
        <span>每日挑战</span>
        <span className={`status-dot ${challenge ? "" : "idle"}`} />
      </div>
      {challenge ? (
        <>
          <div className="challenge-id mono">
            {challengeId(challenge.date, challenge.code)}
          </div>
          <p className="tiny">
            {challenge.title}
            <br />
            规则 v{challenge.rulesVersion} 已固定 · 种子{" "}
            {challenge.seed.toString(16).padStart(8, "0")}
          </p>
          <div className="challenge-constraints">
            <span>{challenge.constraints.totalWaves} 波</span>
            <span>
              {challenge.constraints.arenaWidth}×
              {challenge.constraints.arenaHeight}
            </span>
            <span>{challenge.constraints.weaponPool.length} 武器</span>
          </div>
          <code className="challenge-inline-code">{encodeChallenge(challenge)}</code>
        </>
      ) : (
        <p className="tiny">
          <Radio size={14} /> 当前为自由行动，使用默认平衡规则。
        </p>
      )}
      <div className="challenge-actions">
        <button onClick={onOpen}>
          <CalendarClock size={14} /> 挑战终端
        </button>
        <button onClick={onOpen}>
          <Upload size={14} /> 导入 / 复核
        </button>
      </div>
    </section>
  );
}
