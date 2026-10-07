---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Landing (public front door)

Scope: the public landing page `/`. Visitor mode: Persuade.

Audience and job: sideline recorders of school and amateur club teams (see PRODUCT.md). Action: start recording (`開始記錄` → `/home`, platform-aware install path kept). Proof: real app components rendered with demo data only (no visible demo labels, see Developer decisions); no testimonials, team names, counts or ratings exist and none may be invented. Planned features appear only with an `開發中` badge, styled exactly like shipped ones.

Constraints: zh-TW only; app fonts only (Saira, Noto Sans TC; Saira Stencil One as already used by the V mark); no JS animation library (ADR-0104); mobile-first on old iPhones; WCAG AA (text on the coral court uses `--court-foreground`; near-white on coral fails at ~2.4:1); no gradients, glow or wood-grain texture; glass only on floating chrome.

Design authority: until the DESIGN.md migration, the layer, radius and type rules live in ADR-0106 and `docs/design-system.md`; this brief records only the surface's direction and the developer's decisions.

## Direction contract

THESIS: The landing is the court the visitor will tap. One flat regulation court plan — coral court, teal free zone, white court lines — carries every section, so the page and the recording screen are the same place. It refuses the SaaS split hero with feature cards and the dark neon sports dashboard.

OWN-WORLD: The free zone (`--free-zone`, teal) is the page ground; the court (`--court`, the brand coral) is where content and action live; white court lines at one line width are the only dividers — side lines, end lines, centre line (the net), attack lines. No wood, no surface texture, no gradients, no glow. Recognisable with every word removed: a coral rectangle with white lines on teal.

LAYERS: L0 court, L1 objects, L2 floating chrome, as ADR-0106 defines them. The court gives an object its position (it sits in a zone, lands on a line, crosses the net); the object keeps the app's own form.

STORY: The visitor sees rallies landing on a court, understands each rally is three taps on that same court, believes the statistics come out by themselves, and taps 開始記錄.

FIRST VIEWPORT: Desktop: the court seen from above in landscape, the net vertical at the page centre. Our half holds the four-line headline, the description and the primary action; the opponent half holds the app's Entry rows, vertically centred, receiving one rally at a time; the running set score sits at the net post. Mobile: the court turns portrait, net horizontal, headline and action on our half above, Entry rows on the half below. The header floats above the end line, transparent until the page scrolls.

FORM: Court plan (seed key 36ef2498). Signature interaction: each rally lands as a mark in the zone where the play happened, then files into the first Entry row; the walkthrough is the app's real recording components on a court field, with a finger dot tapping each target as the visitor scrolls. Motion grammar: one rally beat (2.2 s), transform and opacity only, paused off-screen, static under reduced motion.

## Developer decisions

- No rotation-position numerals (their order is not intuitive).
- No visible 「示範比分」/「示範數據」 labels on the animated demo.
- Header CTA at rest: black background and white text in light mode, white background and black text in dark mode (`foreground` / `background`); primary once scrolled. The theme switcher lives in the footer in the header's pill language.
- Walkthrough: mandatory snap while pinned, one wheel notch per step, captions switch discretely; the finger dot taps and rests at 75% across and 50% down the target, starting outside the components.
- The real components sit in a free-zone tray (`p-2`, concentric radius) on the coral field; the field shares `--court-max-width` with every other court below lg.
- Stats court: a carousel of app stats components (skill stats, rally list, point-difference chart marked `開發中`); descriptions in the opponent zone, top-aligned below lg.
- Supporting features: one column, icon figure plus title and description.
- Closing: full-bleed court with the opponent attack zone at lg, a full half court below lg.
