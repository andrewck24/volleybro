---
version: 1
slug: "src-app-auth-sign-in-page-tsx"
primary_target: "src/app/auth/sign-in/page.tsx"
related_targets:
  [
    "src/app/auth/error/page.tsx",
    "src/app/auth/layout.tsx",
    "src/components/auth/sign-in/form.tsx",
    "src/components/auth/error.tsx",
    "src/components/auth/sheet.tsx",
  ]
---

# Sign-in and auth error

Scope: `/auth/sign-in` and `/auth/error`, sharing `src/app/auth/layout.tsx`. Visitor mode: Operate.

Audience and job: a sideline recorder (or teammate following an invitation) arriving unauthenticated, usually on a phone, sometimes from the installed PWA right after the launch splash. Task: continue with Google, the only provider. States: idle, submitting (button busy), OAuth error returned as `?error=` (alert in the sheet), auth error route (sheet explains and returns to sign-in).

Constraints: zh-TW only; Google is the only provider and nothing may imply others; no terms or privacy pages exist, so the consent line names them without links; Google button follows Google's identity branding (standard G, approved 「使用 Google 帳戶繼續」 label, neutral fill with a hairline edge); HIG touch targets, Dynamic-Type-style enlargement to 200% without clipping, safe areas, reduced motion.

## Direction contract

THESIS: Sign-in is the moment after the launch splash: the teal brand ground stays, and a single sheet rises from the bottom carrying the one action. It refuses the centred login card on a grey page and the split marketing hero.

OWN-WORLD: Teal `primary` ground with the ivory-and-coral wordmark (brand variant); one `card` sheet, top corners 16px, no grabber because it cannot be dragged or dismissed; inside it only standard controls: an h2, the Google button at `lg` size, an inline error Alert, the consent meta line.

STORY: The visitor recognises VolleyBro, reads what one tap of recording gives them, understands that Google sign-in also creates the account, and taps the button with the thumb.

FIRST VIEWPORT: Phone: wordmark, headline and promise stacked left on a 24px gutter, anchored to the bottom of the teal field directly above the sheet (pinned to the bottom edge, content above the home-indicator safe area), so reading runs straight into the button in the thumb zone; the teal above stays empty. sm: the same stack above a floating card (max-w-md) with a bottom margin. lg: the sheet docks full height to the right edge (w-md, w-lg from xl, its content-facing left corners rounded like the phone sheet's top corners and its screen-edge side square, content top-anchored with the wordmark), the brand stack vertically centred in the teal field on the left; the page drops the reserved scrollbar gutter so the panel meets the viewport edge.

FORM: Bottom sheet (structure 2 of 7 in the grounded list); seed key 76b4d111. Signature move: the sheet presents from the edge it docks to, like an iOS sheet: rising 24px (sliding 24px from the right at lg) with a fade over 500ms ease-out on first paint, static under reduced motion. Developer decisions: bottom sheet over net-split and half-court structures; bottom-anchored brand stack (N3) over splash-centred V, split logo/headline and vertically centred stack; edge-docked full-height panel (W1) over an inset rounded panel, with the left corners rounded so the panel keeps the sheet's language.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
