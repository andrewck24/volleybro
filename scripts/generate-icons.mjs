#!/usr/bin/env node
/*
 * Regenerates every raster icon under public/ from the brand mark geometry
 * in public/brand/logo-symbol.svg (Requirement: Raster icons derive from
 * the mark). The mark's viewBox and two arm paths are parsed out of that
 * SVG at run time — nothing about the glyph is hardcoded here, so a future
 * mark change only needs a re-run of this script.
 *
 * Standard icons compose the mark at 60% of the canvas height, centered, on
 * a full-bleed #10687E (brand teal) background. Maskable icons use 45% so
 * the whole mark stays inside the 80% maskable safe zone (Requirement:
 * Maskable splash icon reads as a bare V). favicon.ico is built from the
 * same 60% composition at 32x32 and 16x16.
 *
 * Run: node scripts/generate-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SYMBOL_SVG = path.join(ROOT, "public/brand/logo-symbol.svg");
const PUBLIC_DIR = path.join(ROOT, "public");
const BACKGROUND = "#10687E";

// --- Parse the mark geometry out of the source SVG -------------------------

function extractArm(svg, groupId) {
  const groupMatch = svg.match(new RegExp(`<g id="${groupId}">(.*?)</g>`, "s"));
  if (!groupMatch) throw new Error(`could not find <g id="${groupId}">`);
  const pathMatch = groupMatch[1].match(/<path d="([^"]+)" fill="([^"]+)"/);
  if (!pathMatch) throw new Error(`could not find <path> inside ${groupId}`);
  return { d: pathMatch[1], fill: pathMatch[2] };
}

// The stencil arms are simple straight-line polygons (M/L/Z only), so their
// bounding box is just the min/max of their M/L coordinate pairs.
function bboxOfPaths(paths) {
  const xs = [];
  const ys = [];
  for (const d of paths) {
    const nums = d
      .replace(/[MLZ]/gi, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      xs.push(nums[i]);
      ys.push(nums[i + 1]);
    }
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

const symbolSvg = readFileSync(SYMBOL_SVG, "utf8");
const leftArm = extractArm(symbolSvg, "left-arm");
const rightArm = extractArm(symbolSvg, "right-arm");
const bbox = bboxOfPaths([leftArm.d, rightArm.d]);

// --- Compose an SVG for a given canvas size and mark-height fraction -------

function composeSvg(canvas, heightFraction) {
  const scale = (canvas * heightFraction) / bbox.height;
  const tx = canvas / 2 - scale * (bbox.minX + bbox.width / 2);
  const ty = canvas / 2 - scale * (bbox.minY + bbox.height / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}">
  <rect width="${canvas}" height="${canvas}" fill="${BACKGROUND}"/>
  <g transform="translate(${tx} ${ty}) scale(${scale})">
    <path d="${leftArm.d}" fill="${leftArm.fill}"/>
    <path d="${rightArm.d}" fill="${rightArm.fill}"/>
  </g>
</svg>`;
}

async function renderPng(canvas, heightFraction, outFile) {
  const svg = composeSvg(canvas, heightFraction);
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  writeFileSync(path.join(PUBLIC_DIR, outFile), buffer);
  console.log(`generate-icons: wrote ${outFile} (${canvas}x${canvas})`);
  return buffer;
}

// --- Output list -------------------------------------------------------

const STANDARD_FRACTION = 0.6;
const MASKABLE_FRACTION = 0.45;

const standardSizes = [
  { size: 192, file: "icon-192x192.png" },
  { size: 256, file: "icon-256x256.png" },
  { size: 384, file: "icon-384x384.png" },
  { size: 512, file: "icon-512x512.png" },
  { size: 192, file: "android-chrome-192x192.png" },
  { size: 512, file: "android-chrome-512x512.png" },
  { size: 180, file: "apple-touch-icon.png" },
  { size: 76, file: "apple-touch-icon-76x76.png" },
  { size: 114, file: "apple-touch-icon-114x114.png" },
  { size: 120, file: "apple-touch-icon-120x120.png" },
  { size: 144, file: "apple-touch-icon-144x144.png" },
  { size: 152, file: "apple-touch-icon-152x152.png" },
  { size: 167, file: "apple-touch-icon-167x167.png" },
  { size: 180, file: "apple-touch-icon-180x180.png" },
];

const maskableSizes = [
  { size: 192, file: "maskable-icon-192x192.png" },
  { size: 512, file: "maskable-icon-512x512.png" },
];

async function main() {
  for (const { size, file } of standardSizes) {
    await renderPng(size, STANDARD_FRACTION, file);
  }
  for (const { size, file } of maskableSizes) {
    await renderPng(size, MASKABLE_FRACTION, file);
  }

  const favicon32 = await renderPng(32, STANDARD_FRACTION, "__favicon-32.png");
  const favicon16 = await renderPng(16, STANDARD_FRACTION, "__favicon-16.png");
  const icoBuffer = await pngToIco([favicon32, favicon16]);
  writeFileSync(path.join(PUBLIC_DIR, "favicon.ico"), icoBuffer);
  console.log("generate-icons: wrote favicon.ico (32x32 + 16x16)");
  // pngToIco takes buffers directly; the intermediate PNGs on disk are
  // scratch files only, remove them.
  const fs = await import("node:fs/promises");
  await fs.unlink(path.join(PUBLIC_DIR, "__favicon-32.png"));
  await fs.unlink(path.join(PUBLIC_DIR, "__favicon-16.png"));

  console.log(
    `generate-icons: done, ${standardSizes.length + maskableSizes.length + 1} files written`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
