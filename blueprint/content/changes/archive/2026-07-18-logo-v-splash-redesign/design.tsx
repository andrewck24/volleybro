"use client";

import { useState } from "react";

// New mark geometry — Saira Stencil (variable family, wdth 100) lowercase `v`,
// scaled to cap height, extracted per weight via fonttools varLib.instancer +
// opentype.js. The chosen weight's constants land in src/components/brand as
// the single source of truth.
type WeightData = {
  aspect: number;
  symViewBox: string;
  symL: string;
  symR: string;
  typeL: string;
  typeR: string;
  lettersShift: number;
  typeW: number;
};

const WEIGHTS: Record<number, WeightData> = {
  300: {
    aspect: 0.91,
    symViewBox: "10 2.5 505 505",
    symL: "M285 510L227 510L30 0L95 0L285 510",
    symR: "M495 0L313 474L285 391L432 0L495 0",
    typeL: "M46.14 90L36.75 90L4.86 7.44L15.38 7.44L46.14 90",
    typeR: "M80.13 7.44L50.67 84.17L46.14 70.74L69.93 7.44L80.13 7.44",
    lettersShift: -0.21,
    typeW: 539.43,
  },
  400: {
    aspect: 0.93,
    symViewBox: "7 -3 516 516",
    symL: "M291 510L214 510L27 0L112 0L291 510",
    symR: "M503 0L324 486L287 371L419 0L503 0",
    typeL: "M47.11 90L34.64 90L4.37 7.44L18.13 7.44L47.11 90",
    typeR: "M81.43 7.44L52.45 86.11L46.46 67.5L67.83 7.44L81.43 7.44",
    lettersShift: 1.09,
    typeW: 540.73,
  },
  500: {
    aspect: 0.96,
    symViewBox: "2 -10 530 530",
    symL: "M298 510L199 510L22 0L133 0L298 510",
    symR: "M512 0L338 502L290 347L403 0L512 0",
    typeL: "M48.24 90L32.21 90L3.56 7.44L21.53 7.44L48.24 90",
    typeR: "M82.88 7.44L54.72 88.7L46.95 63.61L65.24 7.44L82.88 7.44",
    lettersShift: 2.54,
    typeW: 542.18,
  },
  600: {
    aspect: 0.99,
    symViewBox: "-2 -17.5 545 545",
    symL: "M313 510L188 510L18 0L155 0L313 510",
    symR: "M523 0L353 503L293 310L389 0L523 0",
    typeL: "M50.67 90L30.43 90L2.91 7.44L25.09 7.44L50.67 90",
    typeR: "M84.66 7.44L57.14 88.87L47.43 57.62L62.97 7.44L84.66 7.44",
    lettersShift: 4.32,
    typeW: 543.96,
  },
  700: {
    aspect: 1.03,
    symViewBox: "-7 -27 564 564",
    symL: "M340 510L184 510L13 0L177 0L340 510",
    symR: "M537 0L372 488L298 258L377 0L537 0",
    typeL: "M55.04 90L29.79 90L2.1 7.44L28.65 7.44L55.04 90",
    typeR: "M86.93 7.44L60.22 86.44L48.24 49.21L61.03 7.44L86.93 7.44",
    lettersShift: 6.59,
    typeW: 546.23,
  },
  800: {
    aspect: 1.06,
    symViewBox: "-11 -35.5 581 581",
    symL: "M366 510L180 510L9 0L199 0L366 510",
    symR: "M550 0L391 472L303 206L365 0L550 0",
    typeL: "M59.25 90L29.14 90L1.46 7.44L32.21 7.44L59.25 90",
    typeR: "M89.04 7.44L63.3 83.85L49.05 40.79L59.09 7.44L89.04 7.44",
    lettersShift: 8.7,
    typeW: 548.34,
  },
  900: {
    aspect: 1.09,
    symViewBox: "-15 -43.5 597 597",
    symL: "M389 510L176 510L5 0L219 0L389 510",
    symR: "M562 0L407 459L307 161L354 0L562 0",
    typeL: "M62.97 90L28.49 90L0.81 7.44L35.45 7.44L62.97 90",
    typeR: "M90.98 7.44L65.89 81.74L49.7 33.5L57.31 7.44L90.98 7.44",
    lettersShift: 10.64,
    typeW: 550.28,
  },
};

const WEIGHT_KEYS = [300, 400, 500, 600, 700, 800, 900];
const DEFAULT_WEIGHT = 700;

// Previous mark — Saira Stencil One uppercase `V` (for comparison only)
const OLD_SYM_VIEWBOX = "-10 225 360 360";
const OLD_SYM_LEFT =
  "M107.01 581.12L102.40 566.27Q95.74 545.79 90.62 526.34L90.62 526.34L74.24 470.02Q66.05 442.37 61.44 428.54L61.44 428.54Q57.34 413.18 54.78 405.50L54.78 405.50L2.56 228.86L107.01 228.86L202.75 581.12L107.01 581.12Z";
const OLD_SYM_RIGHT =
  "M225.28 581.12L182.78 424.96L234.50 228.86L336.90 228.86L284.67 405.50L265.73 470.02Q256.51 499.71 248.83 526.34L248.83 526.34Q243.71 545.79 237.06 566.27L237.06 566.27L232.45 581.12L225.28 581.12Z";

// `olleyBro` letter paths — unchanged from the current wordmark
const LETTERS = [
  "M115.01 90.9601C109.89 90.9601 105.61 90.6401 102.17 90.0001C98.8101 89.3601 96.1301 88.3601 94.1301 87.0001C92.2101 85.5601 90.7701 83.6401 89.8101 81.2401C88.9301 78.8401 88.3301 75.8401 88.0101 72.2401C87.7701 68.6401 87.6501 64.3201 87.6501 59.2801C87.6501 54.3201 87.7701 50.0401 88.0101 46.4401C88.3301 42.8401 88.9301 39.8401 89.8101 37.4401C90.7701 35.0401 92.2101 33.1601 94.1301 31.8001C96.1301 30.3601 98.8101 29.3601 102.17 28.8001C105.61 28.1601 109.89 27.8401 115.01 27.8401C120.21 27.8401 124.49 28.1601 127.85 28.8001C131.29 29.3601 133.97 30.3601 135.89 31.8001C137.89 33.1601 139.33 35.0401 140.21 37.4401C141.17 39.8401 141.77 42.8401 142.01 46.4401C142.33 50.0401 142.49 54.3201 142.49 59.2801C142.49 64.3201 142.33 68.6401 142.01 72.2401C141.77 75.8401 141.17 78.8401 140.21 81.2401C139.33 83.6401 137.89 85.5601 135.89 87.0001C133.97 88.3601 131.29 89.3601 127.85 90.0001C124.49 90.6401 120.21 90.9601 115.01 90.9601ZM115.01 80.2801C118.69 80.2801 121.53 80.0401 123.53 79.5601C125.53 79.0801 126.93 78.1201 127.73 76.6801C128.61 75.2401 129.13 73.1201 129.29 70.3201C129.53 67.5201 129.65 63.8401 129.65 59.2801C129.65 54.7201 129.53 51.0801 129.29 48.3601C129.13 45.5601 128.61 43.4401 127.73 42.0001C126.93 40.5601 125.53 39.6401 123.53 39.2401C121.53 38.7601 118.69 38.5201 115.01 38.5201C111.41 38.5201 108.61 38.7601 106.61 39.2401C104.61 39.6401 103.17 40.5601 102.29 42.0001C101.49 43.4401 100.97 45.5601 100.73 48.3601C100.57 51.0801 100.49 54.7201 100.49 59.2801C100.49 63.8401 100.57 67.5201 100.73 70.3201C100.97 73.1201 101.49 75.2401 102.29 76.6801C103.17 78.1201 104.61 79.0801 106.61 79.5601C108.61 80.0401 111.41 80.2801 115.01 80.2801Z",
  "M159.074 90.0001V0.840088H171.794V90.0001H159.074Z",
  "M190.714 90.0001V0.840088H203.434V90.0001H190.714Z",
  "M248.395 90.9601C243.195 90.9601 238.875 90.6401 235.435 90.0001C231.995 89.2801 229.235 88.1601 227.155 86.6401C225.075 85.0401 223.515 83.0401 222.475 80.6401C221.435 78.1601 220.755 75.2001 220.435 71.7601C220.115 68.2401 219.955 64.1601 219.955 59.5201C219.955 54.0001 220.235 49.2401 220.795 45.2401C221.355 41.2401 222.515 37.9601 224.275 35.4001C226.035 32.7601 228.755 30.8401 232.435 29.6401C236.195 28.4401 241.195 27.8401 247.435 27.8401C252.315 27.8401 256.315 28.2401 259.435 29.0401C262.555 29.7601 264.995 30.9201 266.755 32.5201C268.595 34.1201 269.915 36.2001 270.715 38.7601C271.595 41.2401 272.155 44.2401 272.395 47.7601C272.635 51.2001 272.755 55.1201 272.755 59.5201V63.6001H232.795C232.795 67.2001 232.955 70.1201 233.275 72.3601C233.595 74.5201 234.315 76.2001 235.435 77.4001C236.635 78.5201 238.475 79.3201 240.955 79.8001C243.515 80.2001 246.955 80.4001 251.275 80.4001C253.115 80.4001 255.115 80.3601 257.275 80.2801C259.515 80.2001 261.795 80.0401 264.115 79.8001C266.435 79.5601 268.515 79.3601 270.355 79.2001V89.1601C268.595 89.4801 266.475 89.7601 263.995 90.0001C261.515 90.3201 258.915 90.5601 256.195 90.7201C253.475 90.8801 250.875 90.9601 248.395 90.9601ZM260.515 56.7601V54.4801C260.515 50.8801 260.275 48.0401 259.795 45.9601C259.395 43.8001 258.675 42.2001 257.635 41.1601C256.675 40.0401 255.315 39.3201 253.555 39.0001C251.875 38.6001 249.755 38.4001 247.195 38.4001C243.995 38.4001 241.435 38.6401 239.515 39.1201C237.675 39.5201 236.275 40.3201 235.315 41.5201C234.355 42.7201 233.675 44.4001 233.275 46.5601C232.955 48.6401 232.795 51.4001 232.795 54.8401H262.675L260.515 56.7601Z",
  "M313.509 114.72C311.189 114.72 308.749 114.64 306.189 114.48C303.709 114.4 301.309 114.28 298.989 114.12C296.749 113.96 294.749 113.76 292.989 113.52V103.56C295.869 103.64 298.349 103.72 300.429 103.8C302.589 103.88 304.509 103.92 306.189 103.92C307.869 104 309.349 104.04 310.629 104.04C314.949 104.04 318.349 103.76 320.829 103.2C323.309 102.64 325.149 101.68 326.349 100.32C327.549 98.9601 328.269 97.0801 328.509 94.6801C328.829 92.3601 328.989 89.4001 328.989 85.8001V82.0801H328.269C327.469 83.8401 326.269 85.3601 324.669 86.6401C323.149 87.8401 321.109 88.8001 318.549 89.5201C316.069 90.1601 312.989 90.4801 309.309 90.4801C305.069 90.4801 301.589 90.0001 298.869 89.0401C296.229 88.0001 294.189 86.5201 292.749 84.6001C291.389 82.6001 290.469 80.1201 289.989 77.1601C289.509 74.2001 289.269 70.7601 289.269 66.8401V28.8001H301.989V61.8001C301.989 65.8001 302.109 69.0001 302.349 71.4001C302.669 73.7201 303.269 75.4401 304.149 76.5601C305.029 77.6801 306.309 78.4401 307.989 78.8401C309.749 79.1601 312.069 79.3201 314.949 79.3201C318.149 79.3201 320.709 78.9201 322.629 78.1201C324.549 77.3201 325.949 76.1201 326.829 74.5201C327.789 72.9201 328.389 70.9201 328.629 68.5201C328.869 66.1201 328.989 63.3201 328.989 60.1201V28.8001H341.829V82.8001C341.829 88.4801 341.509 93.3201 340.869 97.3201C340.309 101.4 339.069 104.72 337.149 107.28C335.309 109.84 332.509 111.72 328.749 112.92C324.989 114.12 319.909 114.72 313.509 114.72Z",
  "M362.313 90.0001V7.44009H401.553C406.993 7.44009 411.353 8.28009 414.633 9.96008C417.913 11.5601 420.313 13.9201 421.833 17.0401C423.353 20.0801 424.113 23.8001 424.113 28.2001C424.113 31.8801 423.593 35.0401 422.553 37.6801C421.593 40.3201 420.073 42.4801 417.993 44.1601C415.913 45.7601 413.233 46.9201 409.953 47.6401V48.1201C413.793 48.8401 416.793 50.0801 418.953 51.8401C421.193 53.6001 422.753 55.8401 423.633 58.5601C424.513 61.2801 424.953 64.4801 424.953 68.1601C424.953 71.2801 424.593 74.2001 423.873 76.9201C423.153 79.5601 421.913 81.8401 420.153 83.7601C418.473 85.6801 416.113 87.2001 413.073 88.3201C410.033 89.4401 406.153 90.0001 401.433 90.0001H362.313ZM375.873 78.6001H397.353C401.033 78.6001 403.873 78.2401 405.873 77.5201C407.873 76.7201 409.273 75.4401 410.073 73.6801C410.953 71.8401 411.393 69.4001 411.393 66.3601C411.393 63.2401 410.953 60.8001 410.073 59.0401C409.193 57.2001 407.713 55.9201 405.633 55.2001C403.633 54.4001 400.873 54.0001 397.353 54.0001H375.873V78.6001ZM375.873 42.4801H396.873C400.153 42.4801 402.753 42.0801 404.673 41.2801C406.673 40.4801 408.153 39.2401 409.113 37.5601C410.073 35.8001 410.553 33.5601 410.553 30.8401C410.553 27.8001 410.153 25.4401 409.353 23.7601C408.553 22.0001 407.193 20.7601 405.273 20.0401C403.353 19.3201 400.553 18.9601 396.873 18.9601H375.873V42.4801Z",
  "M442.199 90.0001V28.8001H453.839L454.319 39.8401H455.279C456.319 36.6401 457.759 34.1601 459.599 32.4001C461.439 30.6401 463.679 29.4401 466.319 28.8001C468.959 28.1601 471.959 27.8401 475.319 27.8401V40.3201C469.879 40.3201 465.679 41.1201 462.719 42.7201C459.839 44.3201 457.799 46.8801 456.599 50.4001C455.479 53.8401 454.919 58.3601 454.919 63.9601V90.0001H442.199Z",
  "M512.159 90.9601C507.039 90.9601 502.759 90.6401 499.319 90.0001C495.959 89.3601 493.279 88.3601 491.279 87.0001C489.359 85.5601 487.919 83.6401 486.959 81.2401C486.079 78.8401 485.479 75.8401 485.159 72.2401C484.919 68.6401 484.799 64.3201 484.799 59.2801C484.799 54.3201 484.919 50.0401 485.159 46.4401C485.479 42.8401 486.079 39.8401 486.959 37.4401C487.919 35.0401 489.359 33.1601 491.279 31.8001C493.279 30.3601 495.959 29.3601 499.319 28.8001C502.759 28.1601 507.039 27.8401 512.159 27.8401C517.359 27.8401 521.639 28.1601 524.999 28.8001C528.439 29.3601 531.119 30.3601 533.039 31.8001C535.039 33.1601 536.479 35.0401 537.359 37.4401C538.319 39.8401 538.919 42.8401 539.159 46.4401C539.479 50.0401 539.639 54.3201 539.639 59.2801C539.639 64.3201 539.479 68.6401 539.159 72.2401C538.919 75.8401 538.319 78.8401 537.359 81.2401C536.479 83.6401 535.039 85.5601 533.039 87.0001C531.119 88.3601 528.439 89.3601 524.999 90.0001C521.639 90.6401 517.359 90.9601 512.159 90.9601ZM512.159 80.2801C515.839 80.2801 518.679 80.0401 520.679 79.5601C522.679 79.0801 524.079 78.1201 524.879 76.6801C525.759 75.2401 526.279 73.1201 526.439 70.3201C526.679 67.5201 526.799 63.8401 526.799 59.2801C526.799 54.7201 526.679 51.0801 526.439 48.3601C526.279 45.5601 525.759 43.4401 524.879 42.0001C524.079 40.5601 522.679 39.6401 520.679 39.2401C518.679 38.7601 515.839 38.5201 512.159 38.5201C508.559 38.5201 505.759 38.7601 503.759 39.2401C501.759 39.6401 500.319 40.5601 499.439 42.0001C498.639 43.4401 498.119 45.5601 497.879 48.3601C497.719 51.0801 497.639 54.7201 497.639 59.2801C497.639 63.8401 497.719 67.5201 497.879 70.3201C498.119 73.1201 498.639 75.2401 499.439 76.6801C500.319 78.1201 501.759 79.0801 503.759 79.5601C505.759 80.0401 508.559 80.2801 512.159 80.2801Z",
];

const CORAL = "#FC7A56";
const IVORY = "#F6F4F5";
const TEAL = "#10687E";

function NewSymbol({
  data,
  neutral,
  className,
  sizePx,
}: {
  data: WeightData;
  neutral: string;
  className?: string;
  /* Explicit pixel size — use inside the phone frames, where percentage CSS
     widths on an inline <svg> proved unreliable (see splash size explorer). */
  sizePx?: number;
}) {
  return (
    <svg
      viewBox={data.symViewBox}
      width={sizePx}
      height={sizePx}
      className={className}
    >
      <path d={data.symL} fill={neutral} />
      <path d={data.symR} fill={CORAL} />
    </svg>
  );
}

function NewType({
  data,
  neutral,
  className,
  widthPx,
}: {
  data: WeightData;
  neutral: string;
  className?: string;
  widthPx?: number;
}) {
  return (
    <svg
      viewBox={`0 0 ${data.typeW} 115`}
      width={widthPx}
      height={widthPx ? (widthPx / data.typeW) * 115 : undefined}
      className={className}
    >
      <path d={data.typeL} fill={neutral} />
      <path d={data.typeR} fill={CORAL} />
      <g transform={`translate(${data.lettersShift} 0)`} fill={neutral}>
        {LETTERS.map((d) => (
          <path key={d.slice(0, 24)} d={d} />
        ))}
      </g>
    </svg>
  );
}

type Ground = {
  label: string;
  scope: string;
  bgClass: string;
  neutral: string; // "currentColor" for adaptive, IVORY for brand
  variant: "adaptive" | "brand";
};

const GROUNDS: Ground[] = [
  {
    label: "Light",
    scope: "light",
    bgClass: "bg-background text-foreground",
    neutral: "currentColor",
    variant: "adaptive",
  },
  {
    label: "Dark",
    scope: "dark",
    bgClass: "bg-background text-foreground",
    neutral: "currentColor",
    variant: "adaptive",
  },
  {
    label: "Teal",
    scope: "light",
    bgClass: "bg-[#10687E]",
    neutral: IVORY,
    variant: "brand",
  },
];

function Tile({
  ground,
  children,
}: {
  ground: Ground;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`${ground.scope} ${ground.bgClass} flex h-30 items-center justify-center rounded-lg border border-border p-6`}
      >
        {children}
      </div>
      <span className="text-xs text-muted-foreground">
        {ground.label} · {ground.variant}
      </span>
    </div>
  );
}

function PhoneFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="shrink-0 text-center">
      <div
        className="relative mx-auto flex h-65 w-30 flex-col items-center justify-center overflow-hidden rounded-[20px] border-[5px] border-black"
        style={{ backgroundColor: TEAL }}
      >
        {children}
      </div>
      <div className="mt-1.5 text-[11px] text-[#9aa0ad]">{label}</div>
    </div>
  );
}

export const toc = [
  { title: "Weight explorer", url: "#weight-explorer", depth: 2 },
  { title: "Old vs New", url: "#old-vs-new", depth: 2 },
  { title: "Logo-symbol variants", url: "#symbol-variants", depth: 2 },
  { title: "Logo-type variants", url: "#type-variants", depth: 2 },
  { title: "Splash mockups", url: "#splash-mockups", depth: 2 },
  { title: "Geometry facts", url: "#geometry-facts", depth: 2 },
];

// Phone-frame mock screen: w-30/h-65 outer minus the 5px border each side
const SCREEN_SHORT_PX = 110;

const SPLASH_PCTS = [15, 20, 25, 30];
const PINNED_SPLASH_PCT = 25;

export default function Design() {
  const [weight, setWeight] = useState(DEFAULT_WEIGHT);
  const [splashPct, setSplashPct] = useState(PINNED_SPLASH_PCT);
  const data = WEIGHTS[weight];
  // The percentage parameterizes only the iOS image we draw; Chrome fixes the
  // icon size on the Android splash, so that frame ignores the selector.
  const iosMarkPx = Math.round((splashPct / 100) * SCREEN_SHORT_PX);
  const androidMarkPx = Math.round((PINNED_SPLASH_PCT / 100) * SCREEN_SHORT_PX);
  const wordmarkPx = Math.round(0.4 * SCREEN_SHORT_PX);
  return (
    <div>
      <p>
        The V mark moves from the Saira Stencil One <strong>uppercase</strong>{" "}
        <code>V</code> (single-weight family) to the <strong>lowercase</strong>{" "}
        <code>v</code> of the variable <strong>Saira Stencil</strong> family,
        scaled up to cap height. The lowercase glyph is nearly square at the
        heavier weights, keeps the identical two-arm stencil anatomy, and gives
        the standalone symbol a balanced footprint in icons and splash screens.
        Full rationale in the change&apos;s design.md.
      </p>

      <h2 id="weight-explorer">Weight explorer</h2>
      <p>
        Every mockup below renders the selected weight. Aspect ratio (w/h) of
        the bare glyph:{" "}
        {WEIGHT_KEYS.map((w) => `${w} → ${WEIGHTS[w].aspect}`).join(", ")}.
      </p>
      <div className="my-4 flex flex-wrap gap-2">
        {WEIGHT_KEYS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWeight(w)}
            className={`rounded-md border px-3 py-1.5 font-mono text-sm ${
              w === weight
                ? "border-[#10687E] bg-[#10687E] text-white"
                : "border-border bg-transparent text-muted-foreground hover:border-[#10687E]"
            }`}
          >
            {w}
            {w === DEFAULT_WEIGHT ? " ✓ pinned" : ""}
          </button>
        ))}
      </div>

      <h2 id="old-vs-new">Old vs New</h2>
      <div className="my-4 flex flex-wrap items-end gap-8">
        <div className="text-center">
          <div
            className="flex size-36 items-center justify-center rounded-xl"
            style={{ backgroundColor: TEAL }}
          >
            <svg viewBox={OLD_SYM_VIEWBOX} className="h-24">
              <path d={OLD_SYM_LEFT} fill={IVORY} />
              <path d={OLD_SYM_RIGHT} fill={CORAL} />
            </svg>
          </div>
          <div className="mt-1.5 text-[11px] text-[#9aa0ad]">
            old — uppercase V (0.95)
          </div>
        </div>
        <div className="text-center">
          <div
            className="flex size-36 items-center justify-center rounded-xl"
            style={{ backgroundColor: TEAL }}
          >
            <NewSymbol data={data} neutral={IVORY} className="h-24" />
          </div>
          <div className="mt-1.5 text-[11px] text-[#9aa0ad]">
            new — lowercase v @{weight} ({data.aspect})
          </div>
        </div>
      </div>

      <h2 id="symbol-variants">Logo-symbol variants</h2>
      <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
        {GROUNDS.map((g) => (
          <Tile key={`symbol-${g.label}`} ground={g}>
            <NewSymbol data={data} neutral={g.neutral} className="h-16" />
          </Tile>
        ))}
      </div>

      <h2 id="type-variants">Logo-type variants</h2>
      <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {GROUNDS.map((g) => (
          <Tile key={`type-${g.label}`} ground={g}>
            <NewType data={data} neutral={g.neutral} className="h-10 w-auto" />
          </Tile>
        ))}
      </div>

      <h2 id="splash-mockups">Splash mockups</h2>
      <p>
        iOS renders the generated launch screen: the mark centered at the
        selected percentage of the shorter device dimension, plus the full
        wordmark (logo-type, 40% wide) centered near the bottom — the route
        draws the PNG itself, so the wordmark is the real logo geometry. Android
        composes its splash from the manifest: <code>background_color</code>{" "}
        teal field, the centered maskable icon (same teal field → bare V), and
        the app name text drawn by Chrome — that text is not stylable, so
        Android approximates the iOS layout rather than embedding logo-type. The
        size percentage below only parameterizes the iOS image; Chrome fixes the
        icon size on the Android splash itself, so the Android frame does not
        respond to the selector.
      </p>
      <div className="my-4 flex flex-wrap gap-2">
        {SPLASH_PCTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setSplashPct(p)}
            className={`rounded-md border px-3 py-1.5 font-mono text-sm ${
              p === splashPct
                ? "border-[#10687E] bg-[#10687E] text-white"
                : "border-border bg-transparent text-muted-foreground hover:border-[#10687E]"
            }`}
          >
            {p}%{p === PINNED_SPLASH_PCT ? " ✓ selected" : ""}
          </button>
        ))}
      </div>
      <div className="my-4 flex flex-wrap gap-6">
        <PhoneFrame label="iOS — apple-splash route">
          <NewSymbol data={data} neutral={IVORY} sizePx={iosMarkPx} />
          <NewType
            data={data}
            neutral={IVORY}
            widthPx={wordmarkPx}
            className="absolute bottom-4"
          />
        </PhoneFrame>
        <PhoneFrame label="Android — manifest splash (fixed by Chrome)">
          <NewSymbol data={data} neutral={IVORY} sizePx={androidMarkPx} />
          <span
            className="absolute bottom-4 text-[9px] font-medium"
            style={{ color: IVORY }}
          >
            VolleyBro
          </span>
        </PhoneFrame>
      </div>

      <h2 id="geometry-facts">Geometry facts</h2>
      <div className="mb-6 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
        <span className="text-[#9aa0ad]">Glyph</span>
        <span className="font-mono">
          Saira Stencil (variable, wdth 100) lowercase v @ wght {weight}
        </span>
        <span className="text-[#9aa0ad]">Symbol viewBox</span>
        <span className="font-mono">
          {data.symViewBox} (square, aspect {data.aspect})
        </span>
        <span className="text-[#9aa0ad]">Type viewBox</span>
        <span className="font-mono">
          0 0 {data.typeW} 115 (v at cap height 82.56, letters{" "}
          {data.lettersShift >= 0 ? "+" : ""}
          {data.lettersShift})
        </span>
        <span className="text-[#9aa0ad]">Right arm</span>
        <span className="flex items-center gap-1.5 font-mono">
          <span
            className="inline-block size-2.75 rounded-[3px]"
            style={{ backgroundColor: CORAL }}
          />
          {CORAL} (fixed coral, every theme)
        </span>
        <span className="text-[#9aa0ad]">Neutral parts</span>
        <span className="font-mono">
          currentColor (adaptive) / {IVORY} (brand ground)
        </span>
        <span className="text-[#9aa0ad]">Splash field</span>
        <span className="flex items-center gap-1.5 font-mono">
          <span
            className="inline-block size-2.75 rounded-[3px]"
            style={{ backgroundColor: TEAL }}
          />
          {TEAL} (--primary), iOS route + Android manifest
        </span>
        <span className="text-[#9aa0ad]">Splash mark size</span>
        <span className="font-mono">
          {splashPct}% of shorter dimension (selected: {PINNED_SPLASH_PCT}%, iOS
          image only)
        </span>
      </div>
    </div>
  );
}
