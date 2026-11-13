import type { GameDoc, WeaponId } from "../../../shared/types";
const names: Record<WeaponId, [string, string, string]> = {
  pulse: ["脉冲射线", "PULSE RIFLE", "⌁"],
  orbit: ["轨道刃", "ORBITAL BLADE", "◎"],
  nova: ["新星爆发", "NOVA BURST", "✳"],
};
const ALL: WeaponId[] = ["pulse", "orbit", "nova"];
export function ArsenalPanel({ doc }: { doc: GameDoc }) {
  const pool = doc.rules.arsenal.pool;
  return (
    <section className="panel">
      <div className="section-caption">
        <span>武器系统</span>
        <span className="mono muted">
          {doc.weapons.length} / {pool.length}
        </span>
      </div>
      <div className="weapons">
        {ALL.map((id) => {
          const allowed = pool.includes(id);
          const w = doc.weapons.find((w) => w.id === id);
          return (
            <div
              className={`weapon ${w ? "" : "locked"}`}
              key={id}
              data-banned={!allowed}
            >
              <div className={`weapon-icon ${id}`}>{names[id][2]}</div>
              <div>
                <strong>{names[id][0]}</strong>
                <small>{names[id][1]}</small>
              </div>
              <span className="weapon-level">
                {!allowed
                  ? "挑战禁用"
                  : w
                    ? `Lv.${w.level}`
                    : "未装配"}
              </span>
              {w && (
                <div className="level-pips">
                  {Array.from({ length: 5 }, (_, i) => (
                    <i key={i} className={i < w.level ? "active" : ""} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="hint">
        ↗ 自动锁定最近目标
        <br />
        <span>
          {doc.challenge
            ? "本挑战武器候选已固定，禁用武器不会出现。"
            : "升级时选择新武器，构筑你的火力组合。"}
        </span>
      </div>
    </section>
  );
}
