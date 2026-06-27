import { ImageResponse } from "next/og";
import { isSupportedSize } from "../devices";

// Saira Stencil One "V" glyph paths extracted from the font at 512px scale.
// The stencil design produces two separate sub-paths so each arm can be
// coloured independently without clipping tricks.
const LEFT_ARM =
  "M107.01 581.12L102.40 566.27Q95.74 545.79 90.62 526.34L90.62 526.34" +
  "L74.24 470.02Q66.05 442.37 61.44 428.54L61.44 428.54Q57.34 413.18 54.78 405.50" +
  "L54.78 405.50L2.56 228.86L107.01 228.86L202.75 581.12L107.01 581.12Z";

const RIGHT_ARM =
  "M225.28 581.12L182.78 424.96L234.50 228.86L336.90 228.86L284.67 405.50" +
  "L265.73 470.02Q256.51 499.71 248.83 526.34L248.83 526.34Q243.71 545.79 237.06 566.27" +
  "L237.06 566.27L232.45 581.12L225.28 581.12Z";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  const [w, h] = size.split("x").map(Number);

  if (!w || !h || !isSupportedSize(w, h)) {
    return new Response(null, { status: 404 });
  }

  const svgSize = Math.round(0.25 * Math.min(w, h));

  return new ImageResponse(
    (
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
          <path d={LEFT_ARM} fill="#F6F4F5" />
          <path d={RIGHT_ARM} fill="#FC7A56" />
        </svg>
      </div>
    ),
    {
      width: w,
      height: h,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }
  );
}
