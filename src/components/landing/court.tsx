import { cn } from "@/lib/utils";

// The regulation court plan in metres (FIVB rules 1.1-1.4), every line 5 cm
// and inside the court's area.
const LINE_WIDTH = 0.05;

type Rect = [along: number, across: number, length: number, width: number];

const RECTS: Rect[] = [
  [0, 0, 18, LINE_WIDTH], // side lines
  [0, 9 - LINE_WIDTH, 18, LINE_WIDTH],
  [0, 0, LINE_WIDTH, 9], // end lines
  [18 - LINE_WIDTH, 0, LINE_WIDTH, 9],
  [9 - LINE_WIDTH / 2, 0, LINE_WIDTH, 9], // centre line
  [6, 0, LINE_WIDTH, 9], // attack lines (rear edge 3 m from the centre axis)
  [12 - LINE_WIDTH, 0, LINE_WIDTH, 9],
  // service zone marks, 20 cm behind each end line, on the side-line axes
  ...[0, 9 - LINE_WIDTH].flatMap((across): Rect[] => [
    [-0.35, across, 0.15, LINE_WIDTH],
    [18.2, across, 0.15, LINE_WIDTH],
  ]),
  // attack-line extensions: 5 × 15 cm dashes, 20 cm gaps, both sides
  ...[6, 12 - LINE_WIDTH].flatMap((along) =>
    [0, 1, 2, 3, 4].flatMap((i): Rect[] => [
      [along, -(0.2 + i * 0.35) - 0.15, LINE_WIDTH, 0.15],
      [along, 9 + 0.2 + i * 0.35, LINE_WIDTH, 0.15],
    ]),
  ),
];

// the first `span` metres from our end line (9 = our half, 12 = plus their
// attack zone), lines clipped at the cut
const upTo = (span: number) =>
  RECTS.filter(([along]) => along < span).map(
    ([along, across, length, width]): Rect => [
      along,
      across,
      Math.min(length, span - along),
      width,
    ],
  );

/** The court as one SVG at its box's size. `portrait` transposes it so the net runs horizontally. */
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
      <rect width={span} height={9} className="fill-court" />
      {(span < 18 ? upTo(span) : RECTS).map(([x, y, w, h], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={w}
          height={h}
          className="fill-(--court-line)"
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
