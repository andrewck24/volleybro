import type { ReactNode } from "react";

// PROTOTYPE: our half of the court, 9 × 9 m: centre line
// (half its 5 cm on this side) on top, attack line with its rear edge 3 m from
// the centre axis, end line at the bottom, attack-line extensions and the
// service zone marks outside. Position zones carry no lines on a real court,
// so the six features sit in them unmarked. Drawn at every width.

const LW = 0.05;
const RECTS: [number, number, number, number][] = [
  [0, -LW / 2, 9, LW], // centre line
  [0, 3 - LW, 9, LW], // attack line
  [0, 9 - LW, 9, LW], // end line
  [0, 0, LW, 9], // side lines
  [9 - LW, 0, LW, 9],
  [0, 9.2, LW, 0.15], // service zone marks
  [9 - LW, 9.2, LW, 0.15],
  ...[0, 1, 2, 3, 4].flatMap((i): [number, number, number, number][] => [
    [-(0.2 + i * 0.35) - 0.15, 3 - LW, 0.15, LW],
    [9 + 0.2 + i * 0.35, 3 - LW, 0.15, LW],
  ]),
];

export const HalfCourt = ({ children }: { children: ReactNode }) => (
  <div className="v2-half">
    <svg
      aria-hidden
      viewBox="0 0 9 9"
      overflow="visible"
      className="absolute inset-0 size-full"
    >
      <rect width={9} height={9} className="fill-(--v2-in)" />
      {RECTS.map(([x, y, w, h], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={w}
          height={h}
          className="fill-(--v2-line)"
        />
      ))}
    </svg>
    {children}
  </div>
);
