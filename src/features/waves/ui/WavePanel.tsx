import type { GameDoc } from "../../../shared/types";
export function WavePanel({ doc }: { doc: GameDoc }) {
  const { totalWaves, duration } = doc.rules.waves;
  const current = Math.max(1, doc.wave);
  return (
    <section className="panel">
      <div className="section-caption">
        <span>波次进程</span>
        <span className="badge">{totalWaves} WAVES</span>
      </div>
      <div className="wave-num mono">
        {current.toString().padStart(2, "0")}
        <span>
          / {totalWaves.toString().padStart(2, "0")}
        </span>
      </div>
      <div className="wave-steps">
        {Array.from({ length: totalWaves }, (_, i) => (
          <i key={i} className={i < current ? "active" : ""} />
        ))}
      </div>
      <div className="section-caption muted">
        <span>
          {doc.wave < totalWaves * 0.4
            ? "外围侦察群"
            : doc.wave < totalWaves * 0.7
              ? "重装突击群"
              : "深空精英群"}
        </span>
        <span className="mono">
          {Math.max(0, duration - doc.waveTime).toFixed(0)}s
        </span>
      </div>
      <div className="bar">
        <i style={{ width: `${(doc.waveTime / duration) * 100}%` }} />
      </div>
      <p className="tiny">
        每 {duration} 秒进入新波次。撑过第 {totalWaves} 波，完成撤离。
      </p>
    </section>
  );
}
