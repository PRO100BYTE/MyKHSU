# Native iOS tabs

`components/NativeTabBar.js` uses `Tabs.Host` / `Tabs.Screen` exported by
`react-native-screens` 4.30.x (Expo SDK 58 / React Native 0.88).
These are native `UITabBarController` / `UITabBar` views, not GlassView overlays.
No React Navigation container is required. The system chooses Liquid Glass on
supported iOS versions and its classic tab bar on older versions. Do not gate
this component behind `supportsSystemGlass` or the application's glass preference.
The appearance on future OS versions is controlled by UIKit, not emulated here.

## App integration

Import `NativeTabBar` from `./components/NativeTabBar`. Provide these tab definitions
in existing `TAB_ORDER` order (keys must be the existing `SCREENS` values):

```jsx
const nativeTabs = [
  { key: SCREENS.SCHEDULE, label: SCREENS.SCHEDULE, sfSymbol: 'calendar' },
  { key: SCREENS.MAP, label: SCREENS.MAP, sfSymbol: 'map', selectedSfSymbol: 'map.fill' },
  { key: SCREENS.FRESHMAN, label: SCREENS.FRESHMAN, sfSymbol: 'book', selectedSfSymbol: 'book.fill' },
  { key: SCREENS.NEWS, label: SCREENS.NEWS, sfSymbol: 'newspaper', selectedSfSymbol: 'newspaper.fill' },
  { key: SCREENS.SETTINGS, label: SCREENS.SETTINGS, sfSymbol: 'gearshape', selectedSfSymbol: 'gearshape.fill' },
];
```

Replace the content region (not just the visual bottom bar) on iOS:

```jsx
<View style={{ flex: 1 }}>
  {Platform.OS === 'ios' ? (
    <NativeTabBar
      activeScreen={activeScreen}
      onTabPress={handleTabPress}
      tabs={nativeTabs}
      renderScreen={renderScreen}
      theme={effectiveTheme}
      accentColor={colors.primary}
      showLabels={showTabbarLabels}
      labelFontSize={tabbarFontSize}
    />
  ) : renderScreen(activeScreen)}
</View>
{Platform.OS !== 'ios' && renderTabBar()}
```

Keep the header outside the native hierarchy as a sibling overlay with its
existing absolute positioning and higher `zIndex`. Do not move it into each
`Tabs.Screen`. Do not leave the previous custom iOS bar rendered alongside this
component, add bottom padding around the host, or render the screen separately
outside it: the native controller must own the screen content.

`renderScreen(key)` returns the existing component with all its props and
`refreshKey` key intact. Only the active screen's callback is evaluated; inactive
native screen shells remain mounted with no React content. This preserves the
old remount-on-switch behavior and avoids background screen refs/callbacks
replacing active handlers. As an alternative to `renderScreen`, `children` may be
an object mapping tab keys to React nodes; use the callback form to avoid
constructing inactive content. Empty or invalid tab collections render nothing;
an unknown active key falls back to the first valid tab.

`onTabPress(key)` fires for user selection including repeated taps. Keep the
existing `handleTabPress`: repeated tap refreshes/pops via `refreshKey`, changed
tab updates `activeScreen`. UIKit's own repeated-tap pop/scroll effects are
explicitly disabled to avoid competing with this handler. Programmatic selection
acknowledgements do not invoke the handler again. The native provenance is tracked
to base subsequent JS selection requests on the last acknowledged native state.

`accentColor` is a resolved native color (`colors.primary`), not a palette key
such as `green`. `theme === 'light'` selects the light native appearance; other
application themes select dark. The default background is transparent to retain
the parent's theme/Matrix background. Optional `backgroundColor` sets the native
content-container background, not the tab bar material. SF Symbols are native
icons: no Ionicons font rasterization or extra icon dependency is needed.

Scroll-view inset auto-overrides are disabled because the existing screens own
their insets. Check bottom content clearance on device; do not combine UIKit's
automatic adjustment with the application's manual tab-bar clearance. UIKit
controls native bar dimensions and margins; the old custom pill geometry and
pan responder are not applicable.

## Build and manual validation

The added native dependency requires a new development/EAS binary (or an Expo Go
build containing the SDK-matched screens module); an OTA JS update alone cannot
add native views to an older binary. Build with an iOS 26+ SDK and without
`UIDesignRequiresCompatibility` to obtain the OS's Liquid Glass design.

Verify on a physical iPhone or simulator running iOS 26+, plus a supported older
iOS release: native pill/classic appearance, all five selections, fast consecutive
taps, repeated-tab refresh/pop behavior, programmatic tab changes, theme/accent
changes, labels on/off, VoiceOver, rotation/iPad layout, screen/header overlap,
and last scrollable item clearance. Verify Android keeps its existing bar.
Windows Metro bundle validation checks JS imports/transforms only; it cannot
validate UIKit layout or native linking.
