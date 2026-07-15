import { ImageResponse } from "next/og";
import { isSupportedSize } from "../devices";
import {
  V_ARM_LEFT,
  V_ARM_RIGHT,
  V_CORAL,
  V_IVORY,
} from "@/components/brand/logo-symbol";

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

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#10687E",
      }}
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="-10 225 360 360"
        style={{ display: "block" }}
      >
        <path d={V_ARM_LEFT} fill={V_IVORY} />
        <path d={V_ARM_RIGHT} fill={V_CORAL} />
      </svg>
    </div>,
    {
      width: w,
      height: h,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  );
}
