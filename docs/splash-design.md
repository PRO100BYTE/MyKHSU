# Splash: Institute Paper-Glass Studio

The splash is an asymmetric editorial desk rather than a centered emblem or orbit. A tilted translucent course sheet anchors the left of the screen, while a narrow reading ribbon crosses it like a bookmarked page. The institute name is set as the page heading; a small folded corner, rule lines, and side notes make the screen feel made for reading instead of like a product template.

## Visual system

- The course sheet and loading ribbon use `GlassView` on iOS where the native glass APIs are available. Every other environment receives the same translucent, bordered `View` fallback.
- Accent color is reserved for the sheet edge, the folded corner, status mark, and rule details. Theme-specific background and contrast behavior is retained for light, dark, Matrix, and Legend states.
- `theme` and `accentColor` remain optional: omitted values use the green accent and light glass palette.
- The version stays at the bottom. This redesign adds no timeout, delay, or loading behavior.

## Motion and accessibility

The `useSplashReduceMotion` behavior is retained. With reduced motion enabled, all paper elements are immediately settled and seasonal decoration uses its static treatment. Otherwise the sheet arrives with a short lateral reveal, the ribbon enters after it, and background paper strips drift slowly using non-interaction animations.

## Seasonal and special designs

`getSplashDecoration` and `SeasonalSplashEffects` continue to provide every existing seasonal and holiday treatment. Holiday text and its mapped icons remain visible in the page header. Matrix and Legend still suppress added decoration through the existing helper, while retaining their backgrounds and contrast. No dependency or onboarding effect was added.
