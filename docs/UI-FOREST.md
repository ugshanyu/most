# Forest game UI — 2026-10-29

Original illustrated forest scene, parchment cards, wooden buttons, shield emblems,
framed player portraits and a gold question-progress meter. The supplied fantasy
RPG screenshot informed materials and color; this remains the existing social
question game. No extra game modes, scores, inventory or fictional progression.

## References read

- Game UI designer: references/ui-patterns.md — yes.
- Checklists game-ui-quality, hud-readability, responsive-ui-fit, mobile-input — yes.
- Imagegen SKILL.md — yes. Built-in image generation used.
- The referenced threejs-image-generator skill was absent; the available imagegen
  skill and built-in tool supplied the original raster artwork instead.

## Asset

`public/forest-clearing-20261029.webp`, 1024 × 1536, about 219 KiB.
Generated using the built-in image tool; converted to WebP at quality 82.
CSS references the versioned asset directly. No external image service at runtime.

Prompt: Create a production game background asset, portrait 1024x1536. Original
cozy hand-drawn 2D cartoon fantasy woodland clearing viewed from elevated
three-quarter perspective, like a polished playful mobile RPG. Thick warm dark
brown ink outlines, flat cel shading, moss green trees and rounded rocks around
edges, a little purple magical glow in a stone arch at upper left edge, golden
sunlit sandy clearing through center, small flowers and mushrooms at lower
corners. Restrained cheerful greens, warm parchment tan, warm amber accents.
Composition intended behind UI: center 65 percent is a quiet open sandy path
with extremely little detail; richly illustrated scenery only framing outer
edges. Clear charming shapes, graphic storybook drawing, no photorealism or 3D
rendering. No text, logos, characters, UI panels, buttons or watermark. Edge-to-edge.

## Verification

- Unit tests, production build and bundle check passed.
- Browser interaction suite: pack creation, both voter modes, results, Records,
  saved votes, retries, independent play, EN/MN.
- Solo browser suite: name input, save failure/retry, resume, replay, room promotion.
- Visual check: actual Mongolian packs/questions at 320, 390, 1024 and 1440px.
  Group voting at 390 and 1440px. No horizontal overflow or page errors;
  visible buttons have at least 44px height. Form remove controls are 44px.
- Safe-area padding, keyboard focus, disabled and selected states, reduced-motion
  support. Screenshot review includes pack catalog, selection, solo, voting,
  results and pack creation. Screenshots are under ignored artifacts/.
- These are browser previews with test identities, not a native-device screenshot
  or verification of the Usions host. Existing persistence/API code is unchanged.
