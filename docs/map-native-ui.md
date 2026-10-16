# Map native UI

## Filter button and menu

`components/MapFilterButton.js` wraps the filter button itself in the real `@react-native-menu/menu` `MenuView` on iOS, opening on a normal tap. Like `HeaderToolbar`, it checks `UIManager.hasViewManagerConfig('MenuView')` before rendering the native view. No filter `Modal`, custom sheet, custom backdrop, Apply button, or filter animation remains.

`App.js` now renders `mapScreenRef.current?.renderFilterButton()` **as the action control** through `HeaderToolbar`'s primary `render`, without another touchable. `onFilterControlChange` refreshes the header after mount and each selection/theme change so the ref-rendered control does not retain stale checked states. The ref renderer supplies current map state and toggle/reset handlers, a 44-point button, and a selected-category badge. `MapFilterButton` can also wrap header-provided `children`. The imperative `openFilters()` method remains available for legacy callers, but opens the native fallback, not an anchored menu. Thus callers using only `openFilters()` must migrate to the renderer to obtain the anchored menu.

Menu items have independent native checked states, not mutually exclusive selection. Changes apply immediately and persist when the menu closes. “Показать всё” clears category selection. An empty selection means **all objects**, preserving existing behavior; selecting categories restricts markers to their union. `5ka`, `sausage`, `shop`, `cafe`, `coffee`, and `garden` still belong to “Прочее”. The badge counts explicit selected categories, not visible markers.

Native menus normally dismiss after one selection. Reopen the button to toggle another category; this implementation does not promise an always-open multi-select popover or use `keepsMenuPresented`. On iOS builds without the native view, `ActionSheetIOS` presents category toggles with explicit “выбрано / не выбрано” labels, reset, and Cancel. It also dismisses after one choice. Any fallback dimming/presentation is system-owned, not an application overlay.

Android retains its intentionally unavailable map. If invoked independently, the fallback uses native `Alert` dialogs with at most three buttons (Android's limit): reset or browse categories, then explicitly add/remove a category. It is not an iOS-style popup or an enabled Android map.

## Route sheets and map behavior

`components/NativeSheet.js` remains in use for routing details only within `MapScreen`:

- `visible`: controls presentation;
- `onRequestClose`: handles close/back/dismiss;
- `children`: sheet content;
- `contentStyle` and `accessibilityLabel`: presentation and accessibility customization;
- `presentationStyle`: optional iOS `Modal` style override.

Routing retains the real React Native `Modal` presentation (`pageSheet` by default) and opens Yandex Maps or 2GIS externally. Filter replacement does not change routing or remove the shared sheet component, which other screens may use.

iOS requests location permission as an optional enhancement; denied or unavailable permission leaves the map and building markers usable without the user-location indicator.

## Device verification

Check a native iOS build with `MenuView` registered, an iOS build without it, and VoiceOver. Verify anchor position, checked state after reopening, selecting several categories sequentially, reset, cancel, badge counts, and unchanged marker/route behavior. Windows-only syntax/lint/tests cannot verify UIKit presentation, iPad fallback anchoring, or device interaction.
