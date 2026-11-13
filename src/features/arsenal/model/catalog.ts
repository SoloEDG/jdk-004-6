import type { WeaponId } from "../../../shared/types";

/**
 * Presentation-only weapon metadata. Firing interval, damage, speed and pierce
 * are pinned in the run's ruleset so balance updates cannot change a challenge.
 */
export const WEAPON_CATALOG: Record<
  WeaponId,
  { name: string; description: string; color: string }
> = {
  pulse: {
    name: "脉冲步枪",
    description: "自动锁定最近目标，精准连续打击",
    color: "#67e8f9",
  },
  orbit: {
    name: "环轨飞刃",
    description: "向四周释放穿透飞刃",
    color: "#c084fc",
  },
  nova: {
    name: "新星爆发",
    description: "周期性向周围发射能量星环",
    color: "#fbbf24",
  },
};
