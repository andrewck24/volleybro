import { cn } from "@/lib/utils";

// The regulation court plan in metres (FIVB rules 1.1-1.4), every line 5 cm
// and inside the court's area.
const LINE_WIDTH = 0.05;
const COURT_LENGTH = 18;
const COURT_WIDTH = 9;
const ATTACK_LINE_FROM_END_LINE = 6;

type Rect = [along: number, across: number, length: number, width: number];

const SIDE_LINES: Rect[] = [
  [0, 0, COURT_LENGTH, LINE_WIDTH],
  [0, COURT_WIDTH - LINE_WIDTH, COURT_LENGTH, LINE_WIDTH],
];
const END_LINES: Rect[] = [
  [0, 0, LINE_WIDTH, COURT_WIDTH],
  [COURT_LENGTH - LINE_WIDTH, 0, LINE_WIDTH, COURT_WIDTH],
];
const CENTRE_LINE: Rect = [
  COURT_LENGTH / 2 - LINE_WIDTH / 2,
  0,
  LINE_WIDTH,
  COURT_WIDTH,
];
// the rear edge of each attack line is 3 m from the centre line's axis
const ATTACK_LINES: Rect[] = [
  [ATTACK_LINE_FROM_END_LINE, 0, LINE_WIDTH, COURT_WIDTH],
  [
    COURT_LENGTH - ATTACK_LINE_FROM_END_LINE - LINE_WIDTH,
    0,
    LINE_WIDTH,
    COURT_WIDTH,
  ],
];
const SERVICE_ZONE_MARKS: Rect[] = [0, COURT_WIDTH - LINE_WIDTH].flatMap(
  (across): Rect[] => [
    [-0.35, across, 0.15, LINE_WIDTH],
    [COURT_LENGTH + 0.2, across, 0.15, LINE_WIDTH],
  ],
);
const ATTACK_LINE_EXTENSIONS: Rect[] = ATTACK_LINES.flatMap(([along]) =>
  [0, 1, 2, 3, 4].flatMap((dash): Rect[] => [
    [along, -(0.2 + dash * 0.35) - 0.15, LINE_WIDTH, 0.15],
    [along, COURT_WIDTH + 0.2 + dash * 0.35, LINE_WIDTH, 0.15],
  ]),
);

const RECTS: Rect[] = [
  ...SIDE_LINES,
  ...END_LINES,
  CENTRE_LINE,
  ...ATTACK_LINES,
  ...SERVICE_ZONE_MARKS,
  ...ATTACK_LINE_EXTENSIONS,
];

const upTo = (span: number) =>
  RECTS.filter(([along]) => along < span).map(
    ([along, across, length, width]): Rect => [
      along,
      across,
      Math.min(length, span - along),
      width,
    ],
  );

export const CourtPlan = ({
  portrait = false,
  span = COURT_LENGTH,
  className,
}: {
  portrait?: boolean;
  span?: number;
  className?: string;
}) => (
  <svg
    aria-hidden
    viewBox={
      portrait ? `0 0 ${COURT_WIDTH} ${span}` : `0 0 ${span} ${COURT_WIDTH}`
    }
    overflow="visible"
    className={cn("absolute inset-0 size-full", className)}
  >
    <g transform={portrait ? "matrix(0 1 1 0 0 0)" : undefined}>
      <rect width={span} height={COURT_WIDTH} className="fill-court" />
      {(span < COURT_LENGTH ? upTo(span) : RECTS).map(
        ([along, across, length, width], i) => (
          <rect
            key={i}
            x={along}
            y={across}
            width={length}
            height={width}
            className="fill-(--court-line)"
          />
        ),
      )}
    </g>
  </svg>
);

export const Court = ({ className }: { className?: string }) => (
  <>
    <CourtPlan portrait className={cn("lg:hidden", className)} />
    <CourtPlan className={cn("hidden lg:block", className)} />
  </>
);
