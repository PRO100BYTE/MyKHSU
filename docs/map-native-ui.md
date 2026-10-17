# Map native UI

## Filters

The map header continues to obtain its action with `mapScreenRef.current?.renderFilterButton()`. The rendered `MapFilterButton` is an accessible trigger; both the header action and legacy imperative `openFilters()` open the same filter sheet in `MapScreen`.

Filters and route selection use the shared bounded `NativeSheet` with `minHeight={0.5}` and `expandable`. They open at half the current window height, can be dragged upward to fill the window, and can be dragged downward from the collapsed position to dismiss. Tapping outside the surface also dismisses either sheet. `NativeSheet` measures the current window with `useWindowDimensions`, so its bounds adapt to rotation and window-size changes.

The dimmer is an independent animated backdrop beneath the panel. Its opacity fades on open and close without being translated along with the draggable panel, preventing moving-backdrop artifacts.

The category list scrolls within the sheet while Reset and Apply remain available. Category rows are independently toggleable checkboxes, so multiple selections can be made before applying. Apply closes the sheet; Reset clears all categories and closes it.

An empty selection still means all map objects are visible. Otherwise markers are filtered by the union of selected categories. `5ka`, `sausage`, `shop`, `cafe`, `coffee`, and `garden` remain part of “Прочее”. The header badge counts selected categories, not markers. There is no ActionSheet, Alert, native menu, or filter fallback.

## Route sheets and map behavior

Selecting a building opens the route chooser in the same bounded sheet. The panel owns all show/hide and drag animation; the route content has no additional opacity or translate animation. The options continue to open Yandex Maps or 2GIS externally.

Android map availability is unchanged: Android continues to display the intentionally unavailable-map state. On iOS, location permission is optional; denied or unavailable permission leaves the map and building markers usable without the user-location indicator.

## Device verification

Verify on iOS and Android that the filter trigger and building selection open a dimmed half-height sheet. Drag the handle upward to expand it, drag it down from the half-height position to close it, and tap outside to close it. During each gesture, ensure the backdrop remains stationary and only the panel moves. Verify checkbox selection, Apply, Reset, route links, and TalkBack/VoiceOver labels.
