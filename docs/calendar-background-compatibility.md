# Совместимость календаря и фоновых проверок

## Календарь SDK 57

SDK 57 exposes the new object API from the root `expo-calendar` entry point. Calendar access uses `requestCalendarPermissions`, calendars use `getCalendars` and `createCalendar`, and events are created through an `ExpoCalendar` instance returned by `ExpoCalendar.get` or `getDefaultCalendarSync().createEvent`. Deprecated `*Async` calendar methods and the `expo-calendar/legacy` entry point are not used.

Calendar config plugin remains `expo-calendar`, as does the native module. Because the object API is backed by the `CalendarNext` native module, install a freshly prebuilt/rebuilt development or release app after this migration; Metro reload and OTA updates cannot add that native module to an existing binary. Expo Go is not a substitute for testing the rebuilt native configuration.

## Background Fetch

`app.json` уже содержит `ios.infoPlist.UIBackgroundModes: ['remote-notification', 'fetch']`; добавлен также явный plugin `expo-background-fetch`, который применяет нужные настройки при prebuild.

Ошибка `BackgroundFetchDisabled ... add fetch to UIBackgroundModes` относится к **установленному нативному бинарнику**, не к JS-настройкам. Ни Metro reload, ни OTA не изменят Info.plist. Необходимо пересобрать и установить development/release приложение; Expo Go не является проверкой пользовательской конфигурации Info.plist.

Сервис распознаёт именно отсутствие native-конфигурации, сообщает о необходимости пересборки один раз за запуск и не повторяет заведомо неуспешную регистрацию при каждом AppState/settings событии. Выключение уведомлений по-прежнему снимает существующую задачу, другие временные ошибки допускают повторную попытку. Проверки новостей в открытом приложении работают отдельно.

Это не гарантирует частоту фоновых запусков: время определяет ОС. Для надёжной доставки новых событий при закрытом приложении нужен серверный push.

Проверка: `npx expo config --type introspect` — у итогового Info.plist присутствует fetch; после нативной пересборки регистрация не выдаёт BackgroundFetchDisabled. Доступ календаря проверить из onboarding и при реальном экспорте расписания.
