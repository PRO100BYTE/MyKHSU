# Архитектура приложения

## Технологический стек

- React Native 0.81
- Expo 54
- React 19
- AsyncStorage и SecureStore для локальных данных
- Expo Notifications и Expo Background Fetch для уведомлений и фоновых задач
- Sentry для мониторинга ошибок

## Точка входа и композиция приложения

- Точка входа: `App.js` + `index.js`.
- `App.js` отвечает за:
  - загрузку шрифтов и первичный загрузочный экран;
  - управление темой и акцентным цветом;
  - переключение основных экранов через таб-бар;
  - инициализацию уведомлений, фоновой логики и интеграции Sentry.

Основной порядок вкладок определяется константой `TAB_ORDER` в `App.js`:

- расписание;
- карта;
- первокурснику / студенту;
- новости;
- настройки.

## Слои ответственности

### 1. UI-слой: `components/`

Компоненты отвечают за:

- рендер интерфейса;
- интеракции пользователя;
- локальные анимации и визуальное состояние.

Критичные экраны:

- `ScheduleScreen.js`: расписание, экспорт, заметки, дедлайны ДЗ, избранное, посещаемость, свободные аудитории с выбором недели/дня/пары.
- `NewsScreen.js`: лента новостей, пагинация, refresh, поиск, fallback на кэш.
- `MapScreen.js`: карта корпусов, фильтры, маршруты и список объектов.
- `SettingsScreen.js`: параметры темы, уведомлений, учебного профиля, истории изменений и системных функций.
- `AcademicCalendarScreen.js`: учебные события, добавление из панели действий фильтров, редактирование и экспорт в календарь и ICS.
- `AcademicEventModal.js`: модальное окно создания и редактирования учебного события.
- `ScheduleChangesHistoryScreen.js`: отдельная история изменений расписания с diff-представлением.

### 2. Логический слой: `hooks/`

- `useScheduleLogic.js` инкапсулирует состояние расписания:
  - курс, группы, текущая неделя или дата;
  - онлайн или оффлайн статус;
  - загрузка расписания и времени пар;
  - переходы по датам и обновление данных.

Принцип: экран остается тонким, бизнес-логика выносится в хук или утилиты.

### 3. Сервисный слой: `utils/`

- `api.js`: сетевые вызовы и адаптация ответов.
- `cache.js`: TTL-кэш с валидацией и очисткой поврежденных записей.
- `notificationService.js`: разрешения, настройки и логика уведомлений.
- `backgroundService.js`: регистрация и выполнение фоновой проверки новостей.
- `favoritesStorage.js`: избранные сущности расписания.
- `attendanceStorage.js`: хранение и агрегирование посещаемости с ключом по дате и типу пары.
- `academicEventsStorage.js`: локальное хранилище учебных событий.
- `studyProfileStorage.js`: локальное хранилище учебного профиля.
- `dateUtils.js`, `scheduleUtils.js`: вспомогательные вычисления дат и состояний расписания.
- `constants.js`: централизованные константы приложения.

## Потоки данных

### Поток расписания

1. Пользователь выбирает режим и фильтры на экране расписания.
2. `ScheduleScreen.js` использует `useScheduleLogic.js`.
3. Хук запрашивает данные через `utils/api.js`.
4. При сетевых проблемах используется fallback на кэш или локальные данные.
5. Экран показывает статус загрузки, ошибки и состояние кэша.

### Поток новостей

1. `NewsScreen.js` запрашивает новости через API.
2. Новости очищаются, нормализуются и дедуплицируются.
3. При недоступной сети применяется кэш, статус передается в хедер.
4. Фоновая задача может проверить наличие новых новостей и вызвать уведомление.

### Поток настроек

1. Пользователь меняет настройки темы, уведомлений и режима отображения.
2. Значения сохраняются в локальное хранилище.
3. При повторном запуске настройки загружаются и применяются до основных сценариев.

## Архитектурные ограничения

- Не переносить тяжелую доменную логику в JSX-компоненты.
- Не изменять формат локального хранилища без совместимого перехода.
- Не вносить широкие изменения сразу в UI, hooks и utils без необходимости.
- Любой новый асинхронный поток должен иметь явный путь ошибки.

## Что проверять после архитектурных изменений

- Запуск приложения: `npm run start`.
- Отсутствие ошибок импорта в затронутых файлах.
- Базовые сценарии: расписание, новости, карта, настройки.
- Поведение при отсутствии сети и при восстановлении соединения.

## Визуальная схема слоев

```mermaid
flowchart TB
    App[App.js: инициализация и табы]

    subgraph UI[UI слой: components]
      Schedule[ScheduleScreen]
      News[NewsScreen]
      Map[MapScreen]
      Settings[SettingsScreen]
      Freshman[FreshmanScreen]
    end

    subgraph Hooks[Логика: hooks]
      UseSchedule[useScheduleLogic]
    end

    subgraph Services[Сервисный слой: utils]
      Api[api.js]
      Cache[cache.js]
      Dates[dateUtils.js]
      ScheduleUtils[scheduleUtils.js]
      Notifications[notificationService.js]
      Background[backgroundService.js]
      Constants[constants.js]
    end

    App --> UI
    Schedule --> UseSchedule
    UseSchedule --> Api
    UseSchedule --> Dates
    Schedule --> ScheduleUtils
    News --> Api
    News --> Cache
    Settings --> Notifications
    App --> Notifications
    App --> Background
    Background --> Api
    Notifications --> Cache
    UI --> Constants
```

## Схема запуска приложения

```mermaid
sequenceDiagram
    participant User as Пользователь
    participant App as App.js
    participant Fonts as expo-font
    participant Storage as SecureStore/AsyncStorage
    participant Notif as notificationService
    participant Bg as backgroundService
    participant Screen as Активный экран

    User->>App: Открывает приложение
    App->>Fonts: Загружает шрифты
    App->>Storage: Читает тему и настройки
    App->>Notif: Инициализирует уведомления
    App->>Bg: Регистрирует фоновую задачу
    App->>Screen: Рендерит первую вкладку
    Screen-->>User: Показывает актуальное состояние
```

## Карта ключевых модулей

```mermaid
classDiagram
    class App {
      +activeScreen
      +theme
      +accentColor
      +refresh()
    }

    class ScheduleScreen {
      +viewMode
      +selectedGroup
      +handleExportAction()
    }

    class NewsScreen {
      +news[]
      +refresh()
      +loadMore()
    }

    class MapScreen {
      +selectedFilters[]
      +showBuildingsList
    }

    class SettingsScreen {
      +saveSettings()
      +openNotificationSettings()
    }

    class useScheduleLogic {
      +fetchGroupsForCourse()
      +fetchScheduleData()
      +navigateDate()
    }

    class ApiService {
      +getNews()
      +getWeekNumbers()
      +getSchedule()
    }

    class NotificationService {
      +requestPermissions()
      +getNotificationSettings()
      +checkForNewNews()
    }

    class BackgroundService {
      +registerBackgroundNewsCheck()
    }

    App --> ScheduleScreen
    App --> NewsScreen
    App --> MapScreen
    App --> SettingsScreen
    ScheduleScreen --> useScheduleLogic
    useScheduleLogic --> ApiService
    NewsScreen --> ApiService
    App --> NotificationService
    App --> BackgroundService
    BackgroundService --> ApiService
    BackgroundService --> NotificationService
```
