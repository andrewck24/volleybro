import { ImageResponse } from "next/og";
import { isSupportedSize } from "../devices";
import {
  V_ARM_LEFT,
  V_ARM_RIGHT,
  V_VIEWBOX,
  V_CORAL,
  V_IVORY,
} from "@/components/brand/logo-symbol";
import {
  TYPE_ARM_LEFT,
  TYPE_ARM_RIGHT,
  TYPE_LETTERS,
  TYPE_LETTERS_SHIFT,
  TYPE_VIEWBOX,
} from "@/components/brand/logo-type";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  const [w, h] = size.split("x").map(Number);

  if (!w || !h || !isSupportedSize(w, h)) {
    return new Response(null, { status: 404 });
  }

  const svgSize = Math.round(0.25 * Math.min(w, h));

  // TYPE_VIEWBOX is a fixed 4-part "minX minY width height" constant
  const [, , typeVbWidth, typeVbHeight] = TYPE_VIEWBOX.split(" ").map(
    Number,
  ) as [number, number, number, number];
  const typeWidth = Math.round(0.4 * Math.min(w, h));
  const typeHeight = Math.round((typeWidth * typeVbHeight) / typeVbWidth);
  const typeBottomInset = Math.round(0.06 * h);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#10687E",
        position: "relative",
      }}
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={V_VIEWBOX}
        style={{ display: "block" }}
      >
        <path d={V_ARM_LEFT} fill={V_IVORY} />
        <path d={V_ARM_RIGHT} fill={V_CORAL} />
      </svg>
      <svg
        width={typeWidth}
        height={typeHeight}
        viewBox={TYPE_VIEWBOX}
        style={{
          display: "block",
          position: "absolute",
          left: (w - typeWidth) / 2,
          bottom: typeBottomInset,
        }}
      >
        <path d={TYPE_ARM_LEFT} fill={V_IVORY} />
        <path d={TYPE_ARM_RIGHT} fill={V_CORAL} />
        <g transform={`translate(${TYPE_LETTERS_SHIFT} 0)`} fill={V_IVORY}>
          {TYPE_LETTERS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </svg>
    </div>,
    {
      width: w,
      height: h,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  );
}
