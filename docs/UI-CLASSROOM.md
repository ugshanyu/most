# Classroom game theme — 2026-10-29

Supersedes the forest theme at the user's request. Classroom illustration,
chalkboard-green primary buttons, wooden secondary buttons, ruled notebook
cards, book-shaped pack badges, and framed classmate portraits. Existing solo,
group, voter privacy, creation, and results behavior is unchanged.

Reference ledger: game UI patterns, game-ui-quality, hud-readability,
responsive-ui-fit, mobile-input and imagegen instructions were read during the
UI redesign. The same layout checks apply to this classroom revision.

Asset: `public/classroom-20261029.webp`, generated with the built-in image tool,
then encoded as WebP quality 82. The forest asset is no longer referenced by UI.

Prompt: Original production mobile game background, portrait 1024x1536,
cheerful hand-drawn 2D cartoon classroom with thick warm brown outlines and simple
cel shading. Elevated front-facing view into a cozy classroom. Dark green blank
chalkboard with wooden frame at the top, small colorful triangular bunting above.
Around outer edges: left sunlit window and bookshelf, right stacked books and
pencil cup, lower corners wooden desk edges with notebook and oversized pencils,
tiny paper airplane. Center 70 percent is quiet light warm cream classroom wall
and pale wooden floor with very little detail for UI overlays. Rich details only
at perimeter. Warm honey wood, chalkboard green, paper cream, small coral and blue
accents. Cute casual mobile game illustration, clean graphic shapes. No people,
text, letters, numbers, logos, UI panels or buttons. No photorealism or 3D.

Verification: unit/build/bundle checks, group browser interactions and solo
save/resume tests; `scripts/classroom-ui-check.mjs` checks real Mongolian text,
44px minimum buttons and horizontal fit at 320/390/1024/1440px. Screenshots cover
pack selection, solo questions, group voting, creation and results. Browser
previews use test identities; native-device visual verification is not claimed.

## Generated action buttons

Primary actions now use `public/button-chalkboard-20261029.webp`; secondary
actions use `public/button-wood-20261029.webp`. Both were generated with the
built-in image tool on transparent backgrounds, then encoded as WebP quality 85.
Labels remain actual localized button text, not pixels. Focus rings, press-down,
hover and disabled states remain functional; reduced motion is respected.

Wood prompt: One blank wide horizontal wooden classroom button, straight-on
orthographic cutout, hand-illustrated cartoon game art. Honey-gold wood face,
rounded irregular bevelled corners, dark brown outline, carved lower rim, subtle
edge-only wood grain, clean empty center for dark text, brass screw at each end,
small shadow, no words/icons/objects/ropes. Transparent background.

Chalkboard prompt: One blank wide horizontal chalkboard button, orthographic
transparent cutout, thick rounded honey-gold wooden frame, hand-painted carved
bevel, raised lower edge, subtle shadow. Deep teal-green chalkboard inset with
subtle texture and clean uniform center for cream live text, small brass end
fasteners and tiny corner chalk dash. No lettering, objects, icons, or ropes.

Verified the generated plates in pack selection, group voting, solo and forms.
Unit/build/bundle, responsive 320–1440px, group privacy/Records interactions and
solo save/resume suites pass. CSS references these versioned files directly.
