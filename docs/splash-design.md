# Splash: Signal Glass Observatory

The splash screen is designed as a small **signal glass observatory**, rather than a generic centered logo. The academic badge is the instrument at the center: two restrained orbit lines, a signal node, and the ITI/KHSU mark establish a structured composition that reads as an institute interface. The `SIGNAL / 2026` eyebrow and synchronization capsule make the loading state feel intentional without inventing a new loading phase.

## Visual system

- The central badge is a transparent glass surface. On iOS with the native glass APIs it uses `GlassView`; on other platforms, or when the API is unavailable, it falls back to a transparent-tinted bordered surface.
- Orbit lines, signal node, badge border, and ambient blobs all derive from the selected `accentColor`. Light, dark, Matrix, and Legend states retain their existing contrast rules and special backgrounds.
- `theme` and `accentColor` remain optional for backward compatibility. The current parent already supplies both; if another caller omits them, the component falls back to the green accent and light glass palette.
- The version remains visible at the bottom and no timeout, delay, or data-loading behavior was added.

## Motion and accessibility

The existing `useSplashReduceMotion` path is preserved. When reduced motion is enabled, the observatory is shown in its settled state, orbit animation and blob movement are disabled, and seasonal effects use their static treatment. Normal motion is deliberately slow and uses non-interaction animations so it does not delay app work.

## Seasonal and special designs

`getSplashDecoration` and `SeasonalSplashEffects` remain the source of seasonal decoration. Existing holiday text, icon mappings, particles, and season behavior are retained. Matrix and Legend decorations continue to be suppressed by the existing decoration helper. The holiday banner stays above the observatory, so special designs remain recognizable without disrupting the new composition.

No onboarding confetti or new dependency is used.
