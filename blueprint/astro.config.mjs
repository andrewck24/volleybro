import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import path from "node:path";
import { designSections } from "./src/lib/design-sections.mjs";
import {
  rehypeCode,
  remarkCodeTab,
  remarkHeading,
  remarkNpm,
  remarkStructure,
} from "fumadocs-core/mdx-plugins";

function orderReviewSections() {
  const orderedNames = [
    "ActionItems",
    "ReviewFocus",
    "Deviations",
    "ScenarioResults",
    "TestPlan",
    "AfterRelease",
    "ReviewDetails",
  ];
  return (tree, file) => {
    const sourcePath = file.path?.replaceAll("\\", "/") ?? "";
    const filename = sourcePath.split("/").at(-1) ?? "";
    if (
      !sourcePath.includes("/content/changes/") ||
      !/^review(?:-s[1-9]\d*)?\.mdx$/u.test(filename)
    )
      return;

    const slots = [];
    const sections = [];
    tree.children.forEach((node, index) => {
      if (node.type !== "mdxJsxFlowElement") return;
      const rank = orderedNames.indexOf(node.name ?? "");
      if (rank < 0) return;
      slots.push(index);
      sections.push({ rank, node });
    });
    sections.sort((a, b) => a.rank - b.rank);
    slots.forEach((slot, index) => {
      tree.children[slot] = sections[index].node;
    });
  };
}

function retainedDesignExports() {
  const additions = new Map([
    [
      "sync-recording",
      "export { ConflictSimulator as RetainedConflictSimulator };",
    ],
    [
      "game-positional-writes",
      `export function RetainedWriteFlow() {
        return <InteractiveFlowchart nodes={FLOW_NODES} edges={FLOW_EDGES} details={FLOW_DETAILS} />;
      }
      export {
        WRITE_PATHS as RetainedWritePaths,
        FLOW_STEPS as RetainedFlowSteps,
        INTERFACE_DIFF as RetainedInterfaceDiff,
        USECASE_DIFF as RetainedUsecaseDiff,
      };`,
    ],
    [
      "elevation-depth-system",
      `export function RetainedElevationLabA() {
        const [kind, setKind] = useState<OverlayKind>("drawer");
        const [surface, setSurface] = useState<Surface>("card");
        const [hasRing, setHasRing] = useState(false);
        return (
          <div className="flex flex-col gap-3">
            <Segmented label="元件" value={kind} onChange={setKind} options={[
              { value: "drawer", label: "Drawer" },
              { value: "dialog", label: "Dialog" },
              { value: "alert", label: "AlertDialog" },
            ]} />
            <Segmented label="表面" value={surface} onChange={setSurface} options={[
              { value: "background", label: "bg-background" },
              { value: "card", label: "bg-card" },
            ]} />
            <Segmented label="ring" value={hasRing ? "on" : "off"} onChange={(value) => setHasRing(value === "on")} options={[
              { value: "off", label: "無 ring" },
              { value: "on", label: "有 ring" },
            ]} />
            <div className="grid grid-cols-2 gap-4">
              <PhoneFrame scope="light" label="Light" kind={kind} surface={surface} ring={hasRing} />
              <PhoneFrame scope="dark" label="Dark" kind={kind} surface={surface} ring={hasRing} />
            </div>
          </div>
        );
      }

      export function RetainedElevationLabB() {
        const [hasRing, setHasRing] = useState(true);
        return (
          <div className="flex flex-col gap-3">
            <Segmented label="ring" value={hasRing ? "on" : "off"} onChange={(value) => setHasRing(value === "on")} options={[
              { value: "off", label: "無 ring" },
              { value: "on", label: "有 ring" },
            ]} />
            <div className="grid grid-cols-2 gap-4">
              <NonOverlayFrame scope="light" label="Light" ring={hasRing} />
              <NonOverlayFrame scope="dark" label="Dark" ring={hasRing} />
            </div>
          </div>
        );
      }`,
    ],
  ]);

  return {
    name: "blueprint-retained-design-exports",
    enforce: "pre",
    transform(code, id) {
      const filename = path.normalize(id.split("?")[0]).replaceAll("\\", "/");
      const match = filename.match(
        /\/content\/changes\/([^/]+)\/design\.tsx$/u,
      );
      const addition = match ? additions.get(match[1]) : undefined;
      return addition ? `${code}\n${addition}\n` : null;
    },
  };
}

const astroConfig = {
  output: "static",
  outDir: "./out",
  build: { format: "file" },
  trailingSlash: "never",
  markdown: {
    processor: unified({
      syntaxHighlight: false,
      remarkPlugins: [
        remarkHeading,
        remarkCodeTab,
        remarkNpm,
        orderReviewSections,
        designSections,
        [remarkStructure, { exportAs: "structuredData" }],
      ],
      rehypePlugins: [rehypeCode],
    }),
  },
  integrations: [
    react(),
    mdx({ extendMarkdownConfig: true, syntaxHighlight: false }),
  ],
  vite: {
    plugins: [retainedDesignExports(), tailwindcss()],
  },
};

export default astroConfig;
