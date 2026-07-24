---
name: Trak
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2eb'
  on-surface-variant: '#b9ccb2'
  inverse-surface: '#e1e2eb'
  inverse-on-surface: '#2e3037'
  outline: '#84967e'
  outline-variant: '#3b4b37'
  surface-tint: '#00e639'
  primary: '#ebffe2'
  on-primary: '#003907'
  primary-container: '#00ff41'
  on-primary-container: '#007117'
  inverse-primary: '#006e16'
  secondary: '#adc6ff'
  on-secondary: '#002e69'
  secondary-container: '#4b8eff'
  on-secondary-container: '#00285c'
  tertiary: '#fbf7ff'
  on-tertiary: '#1000a9'
  tertiary-container: '#dad9ff'
  on-tertiary-container: '#4b4dd9'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#72ff70'
  primary-fixed-dim: '#00e639'
  on-primary-fixed: '#002203'
  on-primary-fixed-variant: '#00530e'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a41'
  on-secondary-fixed-variant: '#004493'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#10131a'
  on-background: '#e1e2eb'
  surface-variant: '#32353c'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  mono-label:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  mono-code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin: 20px
  touch-target: 44px
---

## Brand & Style
The design system is engineered for developers who value precision, speed, and technical clarity. The brand personality is "Industrial Digital"—utilitarian, high-performance, and focused. It avoids decorative fluff in favor of a sharp, tool-like aesthetic that mimics high-end IDEs and deployment dashboards.

The visual style is a hybrid of **Minimalism** and **Glassmorphism**. It utilizes a deep, nocturnal palette to reduce eye strain during long sessions, punctuated by vibrant, functional accents. The interface relies on structural integrity through subtle 1px borders rather than heavy shadows, creating a sophisticated, layered environment that feels both expansive and information-dense.

## Colors
The color palette is rooted in a deep charcoal base (`#0B0E14`) to provide a high-contrast foundation for technical data. **Terminal Green** is the primary signal color, used for high-intent actions and "Active" states, evoking a classic CLI environment. **Electric Blue** serves as the secondary accent for interactive elements and navigation.

Status colors are strictly functional:
- **Green:** Active/Healthy states.
- **Yellow:** In-progress/Warning states.
- **Red:** Blocked/Critical errors.
- **Gray:** Completed/Archived states.

Surface colors use incremental shifts in lightness to create hierarchy, with borders defined by a low-opacity white (`#FFFFFF10`) to maintain a "blueprint" feel.

## Typography
This design system employs a dual-font strategy. **Inter** handles all primary UI labels, headings, and body text to ensure maximum legibility and a modern, professional tone. **JetBrains Mono** is reserved for technical metadata, repository paths, commit hashes, and status tags, providing a clear visual distinction between content and "system" data.

Headings use tight letter-spacing and heavy weights to appear impactful. Technical labels use the monospaced font at smaller sizes to maximize horizontal space in information-dense views without sacrificing clarity.

## Layout & Spacing
The layout follows a strict 4px grid system to maintain mathematical alignment. On mobile, we utilize a 16px gutter with 20px side margins. While the aesthetic is "dense," we maintain usability by ensuring every interactive element meets a minimum **44px touch target**.

Layout components should prioritize vertical stacking for technical lists, using "Gap" properties (16px between cards, 8px between inner elements) to define relationships. Information density is achieved by reducing vertical padding in rows while maintaining generous horizontal margins to avoid visual clutter.

## Elevation & Depth
Depth in this design system is achieved through **Tonal Layering** and **Glassmorphism** rather than traditional drop shadows. 

1.  **Base Layer:** The deepest background (`#0B0E14`).
2.  **Surface Layer:** Raised cards use a slightly lighter fill (`#161B22`) with a 1px border.
3.  **Overlay Layer:** Modals and bottom navigation bars utilize a high-density background blur (30px) with a semi-transparent fill (`#0B0E14CC`) to create a "glass" effect that maintains context of the content underneath.
4.  **Active State:** Elements being interacted with may use a subtle glow effect using the Primary Accent color with a very wide, low-opacity blur.

## Shapes
The shape language is "Calculated Softness." Standard components like cards and input fields use an **8px corner radius** (Level 2). This provides a professional, modern feel that isn't as aggressive as sharp corners but avoids the "bubbly" appearance of consumer apps. 

Small utility elements like status dots and tags may use a full-pill radius to distinguish them as discrete metadata units.

## Components
-   **Project Cards:** Use a `#161B22` background with a 1px `#FFFFFF10` border. Include a slim (4px height) progress bar at the bottom or top of the card using the Terminal Green accent.
-   **Status Badges:** Compact pills with a JetBrains Mono label. Each badge is preceded by a 6px solid circular "status dot" colored by the status logic.
-   **Buttons:**
    -   *Primary:* Solid Terminal Green background with black text for maximum contrast.
    -   *Secondary:* Ghost style with a 1px border and Electric Blue text.
-   **Input Fields:** Darker than the card background, using a subtle inner stroke. Focus states should trigger a 1px Electric Blue border.
-   **Bottom Navigation:** A glassmorphic bar with 30px backdrop blur. Active icons use a "solid" variant with a small 4px indicator dot below, while inactive icons remain "outline" at 50% opacity.
-   **Tech Stack Pills:** Small, monochromatic tags (`#FFFFFF10` background) using JetBrains Mono to denote languages (e.g., `TS`, `PY`, `GO`).