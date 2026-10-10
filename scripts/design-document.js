#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fromMarkdown } from "mdast-util-from-markdown";
import postcss from "postcss";
import { parse } from "yaml";
import { format, resolveConfig } from "prettier";

const headings = [
  "Overview",
  "Colors",
  "Typography",
  "Layout",
  "Elevation & Depth",
  "Shapes",
  "Components",
  "Do's and Don'ts",
];
const text = (node) => node.value ?? node.children?.map(text).join("") ?? "";

function parseDesignDocument(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error("DESIGN.md must start with YAML frontmatter");
  const tokens = parse(match[1]);
  const body = source.slice(match[0].length);
  const nodes = fromMarkdown(body).children;
  const titles = nodes
    .filter((n) => n.type === "heading" && n.depth === 2)
    .map(text);
  if (JSON.stringify(titles) !== JSON.stringify(headings))
    throw new Error(
      "DESIGN.md must have the eight canonical sections in order",
    );
  const sections = {};
  const extensions = {};
  let section;
  for (const node of nodes) {
    if (node.type === "heading" && node.depth === 2) section = text(node);
    if (section) (sections[section] ??= []).push(node);
    if (node.type === "code" && node.lang === "yaml") {
      const block = parse(node.value);
      for (const [key, value] of Object.entries(block)) {
        if (
          !["shadows", "motion", "breakpoints"].includes(key) ||
          key in extensions
        )
          throw new Error(`Invalid or duplicate design extension: ${key}`);
        extensions[key] = value;
      }
    }
  }
  return { tokens, sections, extensions };
}

function checkDesignColors(tokens, stylesheet) {
  const light = {},
    overrides = {};
  postcss.parse(stylesheet).walkRules((rule) => {
    const target = rule.selectors.includes(":root")
      ? light
      : rule.selectors.includes(".dark")
        ? overrides
        : undefined;
    if (target)
      rule.walkDecls(/^--/, (decl) => {
        target[decl.prop.slice(2)] = decl.value;
      });
  });
  const dark = { ...light, ...overrides };
  const resolve = (values, key, seen = new Set()) => {
    if (!(key in values) || seen.has(key))
      throw new Error(`Invalid CSS token reference: ${key}`);
    seen.add(key);
    const alias = values[key].match(/^var\(--([\w-]+)\)$/)?.[1];
    return alias ? resolve(values, alias, seen) : values[key];
  };
  const expected = Object.fromEntries(
    Object.keys(light)
      .filter((key) => /^(hsl\(|var\(--)/.test(light[key]))
      .map((key) => [key, resolve(light, key)]),
  );
  for (const key of Object.keys(overrides))
    if (/^(hsl\(|var\(--)/.test(overrides[key]))
      expected[`dark-${key}`] = resolve(dark, key);
  const normalize = (value) => value.replace(/[\s,]+/g, " ").trim();
  for (const key of new Set([
    ...Object.keys(expected),
    ...Object.keys(tokens.colors),
  ])) {
    if (
      !expected[key] ||
      typeof tokens.colors[key] !== "string" ||
      normalize(expected[key]) !== normalize(tokens.colors[key])
    )
      throw new Error(`DESIGN.md colors.${key} differs from globals.css`);
  }
}

function resolveRef(tokens, value) {
  if (typeof value !== "string") return value;
  const ref = value.match(/^\{(.+)\}$/)?.[1];
  if (!ref) return value;
  const resolved = ref.split(".").reduce((part, key) => part?.[key], tokens);
  if (resolved === undefined)
    throw new Error(`Unknown design token reference: ${ref}`);
  return resolved;
}

export function buildDesignSidecar(document, generatedAt) {
  const { tokens, sections, extensions } = document;
  const declarations = {
    backgroundColor: "background",
    textColor: "color",
    rounded: "border-radius",
    padding: "padding",
    height: "height",
    width: "width",
  };
  const components = Object.entries(tokens.components).map(([name, props]) => {
    const kind = name.startsWith("button-")
      ? "button"
      : name === "navigation"
        ? "nav"
        : name;
    const tag =
      kind === "button"
        ? "button"
        : kind === "input"
          ? "input"
          : kind === "nav"
            ? "nav"
            : "div";
    const css = Object.entries(props)
      .flatMap(([key, value]) => {
        const resolved = resolveRef(tokens, value);
        if (key === "typography")
          return [
            `font-family:${resolved.fontFamily}`,
            `font-size:${resolved.fontSize}`,
            `font-weight:${resolved.fontWeight}`,
          ];
        return declarations[key] ? [`${declarations[key]}:${resolved}`] : [];
      })
      .join(";");
    return {
      name,
      kind,
      refersTo: name,
      description:
        "Static light-theme token specimen; interaction rules and adopted future sizes are documented separately.",
      html:
        tag === "input"
          ? `<input class="ds-${name}" aria-label="Player name" placeholder="Player name" />`
          : `<${tag} class="ds-${name}"${tag === "button" ? ' type="button"' : ""}>${name === "navigation" ? "Team · Record · Stats" : name}</${tag}>`,
      css: `.ds-${name}{${css}}`,
    };
  });
  const list = (title) => {
    const nodes = sections["Do's and Don'ts"];
    const start = nodes.findIndex(
      (n) => n.type === "heading" && text(n) === title,
    );
    return nodes[start + 1]?.children?.map(text) ?? [];
  };
  const overview = sections.Overview.filter((n) => n.type === "paragraph");
  const characteristics = sections.Overview.findIndex(
    (n) => text(n) === "Key Characteristics:",
  );
  const colorMeta = Object.fromEntries(
    ["primary", "court", "destructive", "away", "error"].map((name) => {
      const canonical = tokens.colors[name];
      const [, hue, saturation] =
        canonical.match(/^hsl\(\s*([\d.]+)[ ,]+([\d.]+)%/) ?? [];
      return [
        name,
        {
          displayName: name,
          canonical,
          tonalRamp: [15, 25, 35, 45, 55, 65, 80, 95].map(
            (lightness) => `hsl(${hue} ${saturation}% ${lightness}%)`,
          ),
        },
      ];
    }),
  );
  return {
    schemaVersion: 2,
    generatedAt,
    title: `Design System: ${tokens.name}`,
    extensions: { colorMeta, ...extensions },
    components,
    narrative: {
      northStar: text(overview[0]).replace(/^Creative North Star: \"|\"$/g, ""),
      overview: text(
        overview.find(
          (n) =>
            !text(n).startsWith("Creative North Star:") &&
            text(n) !== "Key Characteristics:",
        ),
      ),
      keyCharacteristics:
        sections.Overview[characteristics + 1].children.map(text),
      dos: list("Do"),
      donts: list("Don't"),
    },
  };
}

export async function checkDesignDocument(root, { write = false } = {}) {
  const document = parseDesignDocument(
    await readFile(path.join(root, "DESIGN.md"), "utf8"),
  );
  checkDesignColors(
    document.tokens,
    await readFile(path.join(root, "src/app/globals.css"), "utf8"),
  );
  const destination = path.join(root, ".impeccable/design.json");
  let existing;
  try {
    existing = JSON.parse(await readFile(destination, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const generatedAt = write ? new Date().toISOString() : existing?.generatedAt;
  if (!generatedAt || !Number.isFinite(Date.parse(generatedAt)))
    throw new Error(
      "Missing or invalid design sidecar; run node scripts/design-document.js --write",
    );
  const result = buildDesignSidecar(document, generatedAt);
  if (write) {
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(
      destination,
      await format(JSON.stringify(result), {
        ...(await resolveConfig(destination)),
        parser: "json",
      }),
    );
  } else if (JSON.stringify(existing) !== JSON.stringify(result))
    throw new Error(
      "Design sidecar is stale; run node scripts/design-document.js --write",
    );
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  await checkDesignDocument(root, { write: process.argv.includes("--write") });
  console.log("Design document tokens and sidecar are consistent");
}
