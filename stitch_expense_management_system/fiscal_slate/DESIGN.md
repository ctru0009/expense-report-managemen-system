```markdown
# Design System Document: The Precision Ledger

## 1. Overview & Creative North Star: "The Architectural Anchor"
In the world of high-stakes finance, "minimalism" is often mistaken for "emptiness." This design system rejects that notion. Our Creative North Star is **The Architectural Anchor**. 

We move away from the "generic SaaS dashboard" by treating the UI as a series of intentional, structural voids and weighted masses. Instead of separating data with lines—which create visual noise and cognitive load—we use tonal depth and "negative tension." The goal is a high-end editorial feel that conveys authority, stability, and absolute clarity. The design system prioritizes the "quiet" moments, ensuring that when data does appear, it carries maximum significance.

---

## 2. Colors: Tonal Architecture
We utilize a sophisticated palette of deep navy and structural grays to establish a sense of institutional trust.

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. We define space through **Background Shifts**. 
*   **The Foundation:** Use `surface` (`#f6fafe`) for the main canvas.
*   **The Content Layer:** Use `surface_container_low` (`#f0f4f8`) for secondary content zones.
*   **The Interactive Layer:** Use `surface_container_lowest` (`#ffffff`) for primary cards and data entry areas to create a "lifted" feel.

### Surface Hierarchy & Nesting
Nesting is our primary tool for information architecture. 
1.  **Level 0 (Navigation/Sidebar):** `surface_container_high` (`#e4e9ed`) provides a grounded, architectural starting point.
2.  **Level 1 (Main Workspace):** `surface` (`#f6fafe`).
3.  **Level 2 (Data Containers):** `surface_container_lowest` (`#ffffff`).

### The "Glass & Gradient" Rule
To prevent the UI from feeling "flat" or "cheap," use subtle gradients on primary actions. 
*   **Primary CTA:** A linear gradient from `primary` (`#00429d`) to `primary_container` (`#0a58ca`) at 135 degrees.
*   **Glassmorphism:** Use `surface_container_lowest` with 80% opacity and a `20px` backdrop blur for floating modals or dropdown menus. This allows the structural colors to bleed through, maintaining a cohesive atmosphere.

---

## 3. Typography: Editorial Utility
We use **Inter** not just for readability, but as a graphic element.

*   **Display (The Overview):** Use `display-sm` (2.25rem) for high-level totals or balance summaries. Tighten letter-spacing to `-0.02em` for an authoritative, "printed" feel.
*   **Headlines & Titles:** Use `title-lg` (1.375rem) for section headers. Ensure there is significant `surface-sm` (0.125rem) padding below titles to let the data breathe.
*   **Labels (The Metadata):** Use `label-md` (0.75rem) in `on_surface_variant` (`#424653`) for table headers. These should always be uppercase with `0.05em` letter-spacing to distinguish "data about data" from the data itself.

---

## 4. Elevation & Depth: Tonal Layering
We avoid the "floating card" cliché. Depth is achieved through light, not shadow.

*   **The Layering Principle:** Rather than shadows, achieve depth by placing a `surface_container_lowest` card on top of a `surface_container_low` background. The subtle shift in hex code creates a "soft lift."
*   **Ambient Shadows:** If a shadow is required for a floating state (e.g., a dragged row or a tooltip), use an extra-diffused shadow: `0px 12px 32px rgba(23, 28, 31, 0.06)`. Note the use of `on_surface` (`#171c1f`) at a very low opacity rather than pure black.
*   **The "Ghost Border" Fallback:** In high-density data tables where separation is critical, use a "Ghost Border": 1px solid `outline_variant` (`#c3c6d6`) at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Precision Primitives

### Data Tables (The Core)
*   **No Vertical Dividers:** Use horizontal "Ghost Borders" only.
*   **Row States:** Hover states should use `surface_container_high` (`#e4e9ed`) with a `0.25rem` (DEFAULT) corner radius.
*   **Typography:** All numerical data must use tabular lining (monospaced numbers) for perfect vertical alignment.

### Status Badges (Semantic Indicators)
Avoid heavy, saturated blocks of color. Use a "Subtle Pill" approach:
*   **DRAFT:** `secondary_container` background with `on_secondary_container` text.
*   **SUBMITTED (Primary):** `primary_fixed` background with `on_primary_fixed_variant` text.
*   **APPROVED (Success):** Use a custom green tint: `#e6f4ea` background with `#137333` text.
*   **REJECTED (Error):** `error_container` (`#ffdad6`) background with `on_error_container` text.

### Buttons & Inputs
*   **Primary Button:** Gradient-filled (Primary to Primary Container), `0.375rem` (md) radius.
*   **Form Fields:** Background set to `surface_container_low`. On focus, the background shifts to `surface_container_lowest` with a 2px `primary` bottom-border only. This "underlined" look feels more like a financial ledger than a generic box.
*   **Sidebar Navigation:** The active state should not be a "box." It should be a vertical 4px bar of `primary` color on the far left, with the text shifting to `primary` weight.

---

## 6. Do's and Don'ts

### Do
*   **DO** use whitespace as a separator. If you think you need a line, try adding 16px of padding instead.
*   **DO** use `surface_container_highest` for "empty states" to make them feel integrated into the architecture.
*   **DO** align all text to a strict 4px baseline grid to maintain the "Architectural" feel.

### Don't
*   **DON'T** use 100% black for text. Always use `on_surface` (`#171c1f`) to maintain a premium, ink-on-paper look.
*   **DON'T** use "Standard" shadows. If the shadow looks like it's from 2015, it's too dark.
*   **DON'T** crowd the sidebar. It is the "Anchor" of the application; give its items significant `body-md` vertical breathing room.