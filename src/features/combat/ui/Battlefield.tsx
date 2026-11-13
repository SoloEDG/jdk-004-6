import { useEffect, useRef } from "react";
import type { GameDoc, Input } from "../../../shared/types";
import { renderScene } from "../lib/renderScene";
export function Battlefield({
  doc,
  input,
}: {
  doc: GameDoc;
  input: React.RefObject<Input>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { width, height } = doc.rules.arena;
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (ctx) renderScene(ctx, doc);
  });
  return (
    <canvas
      ref={canvas}
      width={width}
      height={height}
      style={{ aspectRatio: `${width} / ${height}` }}
      aria-label="弹幕战场，使用 WASD 或方向键移动"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        input.current.aim = {
          x: ((e.clientX - r.left) * width) / r.width,
          y: ((e.clientY - r.top) * height) / r.height,
        };
      }}
      onPointerDown={(e) => {e.currentTarget.setPointerCapture(e.pointerId); input.current.firing = true;}}
      onPointerUp={() => (input.current.firing = false)}
      onPointerCancel={() => (input.current.firing = false)}
      onLostPointerCapture={() => (input.current.firing = false)}
    />
  );
}
