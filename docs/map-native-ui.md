# Map native UI

## Filters

The map header continues to obtain its action with `mapScreenRef.current?.renderFilterButton()`. The rendered `MapFilterButton` is now only an accessible trigger; both the header action and the legacy imperative `openFilters()` method open the same custom bottom sheet rendered by `MapScreen`.

The sheet uses `NativeSheet` with `bounded`, so iOS and Android receive the same bottom-aligned surface and a modal backdrop. It is capped dynamically at `Math.min(windowHeight * 0.4, 400)`. The category list scrolls inside that cap, while the Reset and Apply actions remain available. Category rows are independently toggleable checkboxes, so multiple selections can be made before applying. Apply closes the sheet; Reset clears all categories and closes it.

An empty selection still means all map objects are visible. Otherwise markers are filtered by the union of selected categories. `5ka`, `sausage`, `shop`, `cafe`, `coffee`, and `garden` remain part of “Прочее”. The header badge counts selected categories, not markers. There is no ActionSheet, Alert, native menu, or filter fallback.

## Route sheets and map behavior

Selecting a building opens the map route chooser in the same bounded `NativeSheet` mode. Its maximum height follows the same dynamic 40% / 400-point cap rather than using an iOS page or full sheet. The options continue to open Yandex Maps or 2GIS externally.

Android map availability is unchanged: Android continues to display the intentionally unavailable-map state. On iOS, location permission is optional; denied or unavailable permission leaves the map and building markers usable without the user-location indicator.

## Device verification

Verify on iOS and Android that the filter trigger opens a dimmed, bottom-aligned sheet; checkbox selection remains open for multiple changes; Apply and Reset close it; and long category lists scroll without exceeding 40% of the window height. Verify VoiceOver/TalkBack announces the trigger, each checkbox state, and sheet controls. Also verify selecting a map building presents the compact route sheet and that route links still open externally.
