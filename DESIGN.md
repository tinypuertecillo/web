# Design System Document

## 1. Overview & Creative North Star: "The Coastal Curator"
This design system is built to evoke the hushed exclusivity of a private architectural retreat. We are moving away from the "app-like" feel of standard digital products toward a high-end editorial experience. 

**The Creative North Star: The Coastal Curator.**
The interface should feel like a well-appointed boutique hotel—quiet, intentional, and expensive. We achieve this through "Organic Brutalism": using a rigid, sophisticated grid but breaking it with asymmetrical image placements, overlapping typography, and a rejection of traditional UI "boxes." Every element must feel like it was placed by hand, not by an algorithm.

---

## 2. Color & Tonal Depth
Our palette is rooted in the landscape of Puertecillo: the deep shadows of the forest, the warmth of the sand, and the oxidized earth of the cliffs.

### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders are prohibited for sectioning. We define boundaries through "Tonal Carving." To separate a section, shift the background color from `surface` (#fff9ef) to `surface-container-low` (#f9f3ea). This creates a sophisticated, seamless transition that mimics natural light hitting different architectural planes.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to create nested depth:
- **Base Layer:** `surface` (#fff9ef) for the widest expanses of whitespace.
- **Sectioning:** `surface-container` (#f3ede4) for content blocks.
- **Floating Cards:** `surface-container-lowest` (#ffffff) to create a subtle "lift" against a warmer background.

### The Glass & Gradient Rule
To avoid a flat "template" look, utilize **Glassmorphism** for navigation bars and floating action elements. Use a semi-transparent `surface` color with a `backdrop-filter: blur(20px)`. 
For high-impact CTAs or Hero sections, apply a **Signature Gradient**: a subtle linear transition from `primary` (#001f14) to `primary_container` (#163428). This adds a "velvet" texture that flat hex codes lack.

---

## 3. Typography: The Editorial Voice
The contrast between an authoritative Serif and a functional Sans-serif is the heartbeat of this system.

*   **Display & Headlines (Noto Serif):** Use `display-lg` (3.5rem) with tight tracking (-2%) and generous leading. Headlines should feel like title cards in a high-end architectural digest. Don't be afraid of "orphaned" headlines that sit asymmetrically to the left of a center-aligned body block.
*   **Body & Labels (Manrope):** The Sans-serif provides the "Coastal Elegance"—clean, airy, and highly legible. Use `body-lg` (1rem) for descriptions to maintain a premium feel.
*   **Hierarchy Tip:** Use `secondary` (#964828) in `label-md` for small, all-caps sub-headers to ground the layout with a terracotta "earthiness."

---

## 4. Elevation & Depth
In this design system, shadows are atmospheric, not structural.

*   **Tonal Layering:** 90% of hierarchy must be achieved by stacking. A `surface-container-highest` (#e7e2d9) element on top of a `surface` background provides enough contrast to signify importance without visual clutter.
*   **Ambient Shadows:** If a shadow is required (e.g., for a booking card), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(29, 27, 22, 0.05)`. The color is a tint of our `on-surface` (#1d1b16), mimicking a natural shadow on sand.
*   **The Ghost Border:** If accessibility requires a stroke, use `outline_variant` at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** Solid `primary_container` (#163428) with `on_primary` text. Use `xl` (1.5rem) padding on the horizontal axis to give the button "breath."
*   **Secondary:** Ghost style. No background, no border. Use `title-sm` with a bottom-border of 2px using the `secondary` (#964828) color, offset by `spacing.1`.
*   **Shape:** Always use `DEFAULT` (0.5rem/8px) corner radius to balance organic softness with architectural precision.

### Cards & Content Blocks
*   **Forbid Dividers:** Do not use lines to separate list items or card content. Use `spacing.6` or `spacing.8` to let the negative space do the work.
*   **Imagery:** Images within cards should use the `md` (0.75rem) corner radius. For a "Signature Look," allow images to slightly bleed outside their container's padding.

### Inputs & Forms
*   **Style:** Minimalist. Only a bottom-border (Ghost Border style) using `outline`. On focus, the border transitions to `primary` (#001f14) and the label (Manrope) floats upward using `label-sm`.

### Additional Component: The "Curator's Gallery"
A bespoke horizontal scroll component for properties or features. It uses asymmetrical sizing—the first item is 20% larger than the following items, breaking the standard grid and forcing the eye to "explore" rather than just scan.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace Whitespace:** If you think a section has enough space, add `spacing.4` more. 
*   **Mix Alignments:** Pair a left-aligned headline with a right-aligned image to create a sophisticated editorial rhythm.
*   **Use Tonal Shifts:** Rely on the `surface-container` tokens to differentiate content before reaching for a shadow.

### Don't:
*   **Don't use 100% Black:** Always use `primary` (#001f14) or `on_surface` (#1d1b16) for text to maintain the organic, soft-luxury feel.
*   **Don't use Standard Shadows:** Avoid the "fuzzy grey" drop shadow. It breaks the "Coastal Elegance" and feels like a generic SaaS app.
*   **Don't Over-decorate:** Avoid icons where text can suffice. Let the Noto Serif typography be the "decoration."