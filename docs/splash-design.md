# Splash: Institute Signal Grid

The splash is an original identity screen built around the supplied institute mark: a rotated logo frame, crosshair accents, editorial metadata, and a restrained signal halo. It is intentionally distinct from the previous paper/glass composition while retaining the existing theme, accent, holiday, season, Matrix, Legend, and reduced-motion behavior.

## Visual system

- The course sheet and loading ribbon use `GlassView` on iOS where the native glass APIs are available. Every other environment receives the same translucent, bordered `View` fallback.
- Accent color is reserved for the sheet edge, the folded corner, status mark, and rule details. Theme-specific background and contrast behavior is retained for light, dark, Matrix, and Legend states.
- `theme` and `accentColor` remain optional: omitted values use the green accent and light glass palette.
- The version stays at the bottom. This redesign adds no timeout, delay, or loading behavior.

## Motion and accessibility

The `useSplashReduceMotion` behavior is retained. With reduced motion enabled, all paper elements are immediately settled and seasonal decoration uses its static treatment. Otherwise the sheet arrives with a short lateral reveal, the ribbon enters after it, and background paper strips drift slowly using non-interaction animations.

## Seasonal and special designs

`getSplashDecoration` and `SeasonalSplashEffects` continue to provide every existing seasonal and holiday treatment. Holiday text and its mapped icons remain visible in the page header. Matrix and Legend still suppress added decoration through the existing helper, while retaining their backgrounds and contrast. No dependency or onboarding effect was added.
