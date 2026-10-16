# Map native UI

## Shared sheet API

`components/NativeSheet.js` provides the shared modal contract used by map filters and routing details:

- `visible`: controls presentation;
- `onRequestClose`: handles close/back/dismiss;
- `children`: sheet content;
- `contentStyle` and `accessibilityLabel`: presentation and accessibility customization.

On iOS it uses the real React Native `Modal` `pageSheet` presentation. Android uses a transparent native `Modal` with a bottom-aligned fallback surface; this is not presented as a native iOS sheet.

## Map behavior

Map access remains intentionally disabled on Android. iOS requests location permission as an optional enhancement; denied or unavailable permission leaves the map and building markers usable without the user-location indicator. Filters and route choices are accessible modal actions, while routes open Yandex Maps or 2GIS externally.
