import { ImageResponse } from "next/og";
import { isSupportedSize } from "../devices";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  const [w, h] = size.split("x").map(Number);

  if (!w || !h || !isSupportedSize(w, h)) {
    return new Response(null, { status: 404 });
  }

  const svgSize = Math.round(0.4 * Math.min(w, h));

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
          viewBox="0 0 512 512"
          style={{ display: "block" }}
        >
          <polygon points="88,98 208,98 285,405 168,405" fill="#F6F4F5" />
          <polygon points="308,98 422,98 338,405 312,392" fill="#FC7A56" />
        </svg>
      </div>
    ),
    { width: w, height: h }
  );
}
