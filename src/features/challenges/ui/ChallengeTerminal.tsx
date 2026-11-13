import { useMemo, useRef, useState } from "react";
import { CalendarClock, ClipboardPaste, FileSearch, ShieldCheck } from "lucide-react";
import type { ChallengeConfig } from "../../../shared/types";
import { challengeId, today, parseDate } from "../lib/daily";
import { generateChallenge } from "../lib/config";
import { encodeChallenge } from "../lib/codec";
import { reviewResultText } from "../lib/results";
import type { ReviewOutcome } from "../lib/results";

type Tab = "daily" | "import" | "review";

export interface ChallengeTerminalProps {
  onClose: () => void;
  onLaunch: (challenge: ChallengeConfig) => void;
  onImportError: (raw: string) => { kind: "ok" | "corrupt" | "unsupported"; text: string };
  onFreePlay: () => void;
  currentChallenge?: ChallengeConfig;
}

const inputClass = "challenge-input";

export function ChallengeTerminal({
  onClose,
  onLaunch,
  onImportError,
  onFreePlay,
  currentChallenge,
}: ChallengeTerminalProps) {
  const [tab, setTab] = useState<Tab>("daily");
  const [date, setDate] = useState(today());
  const [code, setCode] = useState("NEON-07");
  const [message, setMessage] = useState<{
    kind: "ok" | "corrupt" | "unsupported";
    text: string;
  } | null>(null);

  const generated = useMemo(
    () =>
      parseDate(date) && code.trim()
        ? generateChallenge({ date, code })
        : null,
    [date, code],
  );

  const importRef = useRef<HTMLTextAreaElement>(null);
  const reviewRef = useRef<HTMLTextAreaElement>(null);
  const [review, setReview] = useState<ReviewOutcome | null>(null);

  const launchDaily = () => {
    if (!parseDate(date)) {
      setMessage({ kind: "corrupt", text: "日期格式应为 YYYY-MM-DD" });
      return;
    }
    if (!code.trim()) {
      setMessage({ kind: "corrupt", text: "请填写挑战码" });
      return;
    }
    const challenge = generateChallenge({ date, code });
    onLaunch(challenge);
  };

  const runImport = () => {
    const raw = importRef.current?.value ?? "";
    const outcome = onImportError(raw);
    if (outcome.kind === "ok") onClose();
    else setMessage(outcome);
  };

  const runReview = () => {
    const raw = reviewRef.current?.value ?? "";
    setReview(reviewResultText(raw));
  };

  return (
    <div className="overlay help-overlay">
      <div className="history-dialog challenge-terminal">
        <button className="close" onClick={onClose}>
          关闭 ✕
        </button>
        <div className="eyebrow">DAILY PROTOCOL</div>
        <h2>每日挑战终端</h2>
        <p>
          日期与挑战码共同决定敌潮、武器候选、掉落概率与场地限制；规则版本随码固定，更新后仍是同一局。
        </p>

        <div className="challenge-tabs">
          <button
            className={tab === "daily" ? "active" : ""}
            onClick={() => setTab("daily")}
          >
            <CalendarClock size={14} /> 生成挑战
          </button>
          <button
            className={tab === "import" ? "active" : ""}
            onClick={() => setTab("import")}
          >
            <ClipboardPaste size={14} /> 导入挑战码
          </button>
          <button
            className={tab === "review" ? "active" : ""}
            onClick={() => setTab("review")}
          >
            <FileSearch size={14} /> 复核结果
          </button>
        </div>

        {tab === "daily" && (
          <div className="challenge-body">
            <label>
              挑战日期（本地）
              <input
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </label>
            <label>
              挑战码
              <input
                className={inputClass}
                value={code}
                onChange={(e) => setCode(e.target.value.slice(0, 32))}
                placeholder="例如 NEON-07"
              />
            </label>
            {generated && (
              <div className="challenge-preview">
                <div className="challenge-preview-head">
                  <ShieldCheck size={15} />
                  <span>
                    编号 {challengeId(generated.date, generated.code)} · 规则 v
                    {generated.rulesVersion}
                  </span>
                </div>
                <ConstraintGrid challenge={generated} />
                <div className="challenge-code-box">
                  <small>分享码（整段发送给好友）</small>
                  <code>{encodeChallenge(generated)}</code>
                </div>
              </div>
            )}
            <div className="result-actions">
              <button className="primary" onClick={launchDaily}>
                接入此挑战 ↗
              </button>
              <button
                className="outline"
                onClick={() => {
                  onFreePlay();
                  onClose();
                }}
              >
                返回自由行动
              </button>
            </div>
          </div>
        )}

        {tab === "import" && (
          <div className="challenge-body">
            <p className="tiny">
              粘贴好友的 <b>VS1.*</b> 挑战码。损坏或版本不受支持时，当前行动不会被打断或替换。
            </p>
            <textarea
              ref={importRef}
              className="challenge-textarea"
              rows={4}
              placeholder="VS1.xxxxxxxx.xxxxxxxx"
            />
            <button className="primary" onClick={runImport}>
              校验并接入
            </button>
            {currentChallenge && (
              <p className="tiny">
                当前进行中的挑战：{currentChallenge.title}（{currentChallenge.date}）
              </p>
            )}
          </div>
        )}

        {tab === "review" && (
          <div className="challenge-body">
            <p className="tiny">
              粘贴好友导出的结算 JSON。复核会区分真实失败与“规则版本不受支持”，并校验约束与种子。
            </p>
            <textarea
              ref={reviewRef}
              className="challenge-textarea"
              rows={6}
              placeholder='{ "artifact": "void-signal.challenge-result", ... }'
            />
            <button className="primary" onClick={runReview}>
              本地复核
            </button>
            {review && <ReviewCard outcome={review} />}
          </div>
        )}

        {message && tab !== "review" && (
          <p className={`challenge-message ${message.kind}`}>{message.text}</p>
        )}
      </div>
    </div>
  );
}

export function ConstraintGrid({ challenge }: { challenge: ChallengeConfig }) {
  const k = challenge.constraints;
  const rows: [string, string][] = [
    ["波次", `${k.totalWaves} 波 · 每波 ${k.waveDuration}s`],
    ["场地", `${k.arenaWidth} × ${k.arenaHeight}`],
    ["武器候选", k.weaponPool.join(" / ")],
    ["掉落概率", `治疗 ${(k.healChance * 100).toFixed(1)}% · 磁铁 ${(k.magnetChance * 100).toFixed(1)}%`],
    ["可选强化", `${k.allowedUpgrades.length} 项（含紧急修复）`],
    ["种子", `0x${challenge.seed.toString(16).padStart(8, "0")}`],
  ];
  return (
    <div className="constraint-grid">
      {rows.map(([label, value]) => (
        <div key={label}>
          <small>{label}</small>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function ReviewCard({ outcome }: { outcome: ReviewOutcome }) {
  return (
    <div className={`review-card ${outcome.status}`}>
      <strong>
        {outcome.status === "verified-victory"
          ? "✓ 撤离成功（已验证）"
          : outcome.status === "verified-defeat"
            ? "✗ 信号中断 · 真实失败（已验证）"
            : outcome.status === "unsupported"
              ? "⚠ 规则版本不受支持"
              : "✕ 结果损坏或被篡改"}
      </strong>
      <p>{outcome.reason}</p>
      {outcome.result && <ConstraintGrid challenge={outcome.result.challenge} />}
    </div>
  );
}
