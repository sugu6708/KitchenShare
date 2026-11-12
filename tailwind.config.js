/*
 * KitchenShare design tokens
 * Single source of truth for "Modern Tactile Minimalism".
 * Mirrors DESIGN.md (colors / typography / rounded / spacing).
 * Loaded via the Tailwind Play CDN on every page.
 */
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-container-lowest": "#ffffff",
        "secondary-container": "#ecddd1",
        "primary-fixed-dim": "#b4cdb1",
        "on-primary": "#ffffff",
        "on-surface": "#191c1a",
        "surface-variant": "#e1e3e0",
        "inverse-surface": "#2e312f",
        "error": "#ba1a1a",
        "tertiary-fixed-dim": "#c9c6c0",
        "tertiary-fixed": "#e5e2db",
        "inverse-on-surface": "#f0f1ee",
        "surface-bright": "#f8faf6",
        "on-tertiary-fixed": "#1c1c18",
        "on-primary-fixed": "#0b200e",
        "outline-variant": "#c3c8bf",
        "tertiary": "#54534e",
        "tertiary-container": "#6c6b66",
        "on-background": "#191c1a",
        "primary-container": "#5a7159",
        "secondary-fixed-dim": "#d2c4b8",
        "inverse-primary": "#b4cdb1",
        "on-secondary": "#ffffff",
        "surface": "#f8faf6",
        "background": "#f8faf6",
        "secondary-fixed": "#efe0d4",
        "surface-container-high": "#e7e9e5",
        "on-tertiary-container": "#efede6",
        "primary-fixed": "#d0eacc",
        "on-surface-variant": "#434841",
        "error-container": "#ffdad6",
        "surface-container-highest": "#e1e3e0",
        "surface-dim": "#d9dad7",
        "outline": "#737971",
        "on-secondary-container": "#6b6157",
        "on-tertiary-fixed-variant": "#474742",
        "on-primary-fixed-variant": "#364c36",
        "on-error": "#ffffff",
        "on-tertiary": "#ffffff",
        "surface-container": "#edeeeb",
        "on-secondary-fixed": "#221a13",
        "on-error-container": "#93000a",
        "primary": "#425842",
        "on-primary-container": "#daf4d6",
        "on-secondary-fixed-variant": "#4f453c",
        "secondary": "#675c53",
        "surface-tint": "#4d644d",
        "surface-container-low": "#f2f4f1"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px"
      },
      spacing: {
        "stack-gap-md": "16px",
        "stack-gap-sm": "8px",
        "container-margin": "24px",
        "gutter": "16px",
        "touch-target-min": "48px",
        "unit": "8px",
        "stack-gap-lg": "32px"
      },
      fontFamily: {
        "display-lg": ["Plus Jakarta Sans", "sans-serif"],
        "headline-md": ["Plus Jakarta Sans", "sans-serif"],
        "headline-lg": ["Plus Jakarta Sans", "sans-serif"],
        "headline-lg-mobile": ["Plus Jakarta Sans", "sans-serif"],
        "metric-xl": ["Plus Jakarta Sans", "sans-serif"],
        "body-md": ["Work Sans", "sans-serif"],
        "body-lg": ["Work Sans", "sans-serif"],
        "label-caps": ["Work Sans", "sans-serif"]
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-lg-mobile": ["28px", { lineHeight: "34px", fontWeight: "700" }],
        "metric-xl": ["40px", { lineHeight: "40px", letterSpacing: "-0.03em", fontWeight: "800" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "700" }]
      }
    }
  }
};
