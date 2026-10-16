# Map native UI

## Shared sheet API

`components/NativeSheet.js` provides the shared modal contract used by map filters and routing details:

- `visible`: controls presentation;
- `onRequestClose`: handles close/back/dismiss;
- `children`: sheet content;
- `contentStyle` and `accessibilityLabel`: presentation and accessibility customization;
- `presentationStyle`: optional iOS `Modal` style override for native route sheets; bounded map filters intentionally do not use a page/form sheet.

Routing uses the real React Native `Modal` presentation (`pageSheet` by default). Map filters deliberately use a transparent bounded modal instead of `pageSheet`/`formSheet`: the map remains visible behind a moderately dimmed backdrop and the bottom panel has an explicit height capped at 65% of the window or 560 dp (whichever is smaller), with the category list scrolling inside that fixed panel. Android uses the same bounded transparent modal surface.

## Map behavior

Map access remains intentionally disabled on Android. iOS requests location permission as an optional enhancement; denied or unavailable permission leaves the map and building markers usable without the user-location indicator. Filters and route choices are accessible modal actions, while routes open Yandex Maps or 2GIS externally.
