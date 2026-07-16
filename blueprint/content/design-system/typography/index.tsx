// Type roles named by application context (not raw Tailwind vars), each mapped
// to the real Tailwind class it uses in src/. Roles and samples mirror the
// approved design-system artifact. Specimens name their intended font: Latin
// content renders in Saira, CJK in Noto Sans TC (the app's --font-sans stack).

type Role = {
  role: string;
  tw: string;
  size: string;
  px: string;
  weight: number;
  tnum?: boolean;
  muted?: boolean;
  sample: string;
};

const roles: Role[] = [
  {
    role: "display",
    tw: "text-5xl font-bold uppercase",
    size: "3rem",
    px: "48px",
    weight: 700,
    sample: "VolleyBro — landing hero headline",
  },
  {
    role: "score",
    tw: "text-5xl leading-none font-bold",
    size: "3rem",
    px: "48px",
    weight: 700,
    tnum: true,
    sample: "9 – 8 · recording header set score",
  },
  {
    role: "stat-figure",
    tw: "text-3xl font-bold tabular-nums",
    size: "1.875rem",
    px: "30px",
    weight: 700,
    tnum: true,
    sample: "24 · big figures in 數據統計",
  },
  {
    role: "heading",
    tw: "text-xl font-semibold",
    size: "1.25rem",
    px: "20px",
    weight: 600,
    sample: "隊伍管理 · 比賽設定 — screen & dialog titles",
  },
  {
    role: "subheading",
    tw: "text-lg font-medium",
    size: "1.125rem",
    px: "18px",
    weight: 500,
    sample: "數據統計 · 逐球紀錄 — accordion / section headers",
  },
  {
    role: "entry",
    tw: "text-2xl font-medium tabular-nums",
    size: "1.375rem",
    px: "22px",
    weight: 500,
    tnum: true,
    sample: "15 MB · 攔網 — 逐球紀錄 row",
  },
  {
    role: "body",
    tw: "text-base font-normal",
    size: "1rem",
    px: "16px",
    weight: 400,
    sample: "Body copy: descriptions, form help, long-form prose.",
  },
  {
    role: "label",
    tw: "text-sm font-medium",
    size: "0.875rem",
    px: "14px",
    weight: 500,
    sample: "選擇球員或對方失誤 — prompts, buttons, list rows",
  },
  {
    role: "meta",
    tw: "text-xs text-muted-foreground",
    size: "0.75rem",
    px: "12px",
    weight: 400,
    muted: true,
    sample: "recordedBy · 12:04 — timestamps & captions",
  },
];

function fontFor(sample: string): string {
  const cjk = /[一-鿿]/.test(sample);
  const lat = /[A-Za-z0-9]/.test(sample);
  return cjk ? (lat ? "Saira + Noto Sans TC" : "Noto Sans TC") : "Saira";
}

export default function TypographyPage() {
  return (
    <div>
      <h1>Typography</h1>
      <p>
        Type is named by <strong>where it is used</strong> in the app, not by
        raw size. Each role lists the real Tailwind class it maps to
        (pure-number scale, no bracket syntax) and the font that actually
        renders it — Latin in <strong>Saira</strong>, CJK in{" "}
        <strong>Noto Sans TC</strong>, the two faces in the{" "}
        <code>--font-sans</code> stack.
      </p>
      <h2 id="roles">Roles</h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          margin: "24px 0",
        }}
      >
        {roles.map((r) => (
          <div
            key={r.role}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(180px, 220px) 1fr",
              gap: "20px",
              alignItems: "baseline",
              borderTop: "1px solid rgba(128,128,128,0.2)",
              paddingTop: "16px",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                {r.role}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  opacity: 0.65,
                  lineHeight: 1.6,
                  marginTop: "4px",
                }}
              >
                <code>{r.tw}</code>
                <br />
                {r.px} · {r.weight}
                {r.tnum ? " · tabular" : ""}
                <br />
                {fontFor(r.sample)}
              </div>
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: "Saira, 'Noto Sans TC', sans-serif",
                fontSize: r.size,
                fontWeight: r.weight,
                lineHeight: 1.15,
                textTransform: r.tw.includes("uppercase")
                  ? "uppercase"
                  : "none",
                fontVariantNumeric: r.tnum ? "tabular-nums" : "normal",
                opacity: r.muted ? 0.6 : 1,
              }}
            >
              {r.sample}
            </p>
          </div>
        ))}
      </div>
      <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>
        Note: specimens use the app&apos;s font stack where available; on the
        blueprint site Saira may fall back to the local sans-serif, but sizes,
        weights, and numeric styling are exact.
      </p>
    </div>
  );
}

export const toc = [{ title: "Roles", url: "#roles", depth: 2 }];
