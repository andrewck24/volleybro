import { cn } from "@/lib/utils";

// PROTOTYPE: the regulation court plan, drawn in metres (FIVB rules 1.1-1.4):
// playing court 18 × 9, every line 5 cm wide and inside the court's area,
// centre line under the net, attack lines with their rear edge 3 m from the
// centre line's axis, attack-line extensions (five 15 cm dashes, 20 cm apart)
// outside the side lines, and the service zone's two 15 cm marks 20 cm behind
// each end line. In-court = coral, lines = white; the free zone is the page.
// `along` runs from our end line (0) to theirs (18); `across` is 0..9.

const LW = 0.05;

type R = [along: number, across: number, len: number, wid: number];

const RECTS: R[] = [
  [0, 0, 18, LW], // side lines
  [0, 9 - LW, 18, LW],
  [0, 0, LW, 9], // end lines
  [18 - LW, 0, LW, 9],
  [9 - LW / 2, 0, LW, 9], // centre line
  [6, 0, LW, 9], // attack lines (rear edge 3 m from the centre axis)
  [12 - LW, 0, LW, 9],
  // service zone marks, 20 cm behind each end line, on the side-line axes
  ...[0, 9 - LW].flatMap((c): R[] => [
    [-0.35, c, 0.15, LW],
    [18.2, c, 0.15, LW],
  ]),
  // attack-line extensions: 5 × 15 cm dashes, 20 cm gaps, both sides
  ...[6, 12 - LW].flatMap((a) =>
    [0, 1, 2, 3, 4].flatMap((i): R[] => [
      [a, -(0.2 + i * 0.35) - 0.15, LW, 0.15],
      [a, 9 + 0.2 + i * 0.35, LW, 0.15],
    ]),
  ),
];

// the first `span` metres from our end line (9 = our half, 12 = plus
// their attack zone), lines clipped at the cut
const upTo = (span: number) =>
  RECTS.filter(([x]) => x < span).map(([x, y, w, h]): R => [
    x,
    y,
    Math.min(w, span - x),
    h,
  ]);

/**
 * The court as one SVG at its box's size. `portrait` turns it a quarter so the
 * net runs horizontally (along → down, across → right); lines are symmetric
 * across the court, so the transpose reads as the same court. `span` draws
 * only the first metres from our end line (9 = our half, 12 = plus their
 * attack zone).
 */
export const CourtPlan = ({
  portrait = false,
  span = 18,
  className,
}: {
  portrait?: boolean;
  span?: number;
  className?: string;
}) => (
  <svg
    aria-hidden
    viewBox={portrait ? `0 0 9 ${span}` : `0 0 ${span} 9`}
    overflow="visible"
    className={cn("absolute inset-0 size-full", className)}
  >
    <g transform={portrait ? "matrix(0 1 1 0 0 0)" : undefined}>
      <rect width={span} height={9} className="fill-(--v2-in)" />
      {(span < 18 ? upTo(span) : RECTS).map(([x, y, w, h], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={w}
          height={h}
          className="fill-(--v2-line)"
        />
      ))}
    </g>
  </svg>
);

/** Both orientations: portrait below lg, landscape from lg. */
export const Court = ({ className }: { className?: string }) => (
  <>
    <CourtPlan portrait className={cn("lg:hidden", className)} />
    <CourtPlan className={cn("hidden lg:block", className)} />
  </>
);
