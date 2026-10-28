# Диаграммы и схемы проекта

Этот документ содержит визуальные схемы высокого уровня для быстрого понимания архитектуры, потоков данных и жизненных циклов ключевых подсистем.

## 1) Системная карта модулей

```mermaid
flowchart TB
    subgraph Entry[Entry Layer]
      App[App.js]
      Index[index.js]
    end

    subgraph UI[UI Layer]
      Schedule[ScheduleScreen]
      News[NewsScreen]
      Map[MapScreen]
      Settings[SettingsScreen]
      Freshman[FreshmanScreen]
      Onboarding[OnboardingScreen]
      DeveloperMenu[DeveloperMenuScreen]
      NativeSheet[NativeSheet]
      IOSEdgeSwipeBack[IOSEdgeSwipeBack]
      SplashScreen[SplashScreen]
      RefreshStatusHint[RefreshStatusHint]
      AppearanceSettingsSheet[AppearanceSettingsSheet]
      SeasonalSplashEffects[SeasonalSplashEffects]
    end

    subgraph Logic[Logic Layer]
      UseSchedule[useScheduleLogic]
    end

    subgraph Services[Services Layer]
      Api[api.js]
      Cache[cache.js]
      Dates[dateUtils.js]
      SUtils[scheduleUtils.js]
      Notes[notesStorage.js]
      Notify[notificationService.js]
      Bg[backgroundService.js]
      Constants[constants.js]
      CalendarAccess[calendarAccess.js]
      CalendarExport[calendarExport.js]
      GalleryExport[galleryExport.js]
      LiquidGlass[liquidGlass.js]
    end

    Entry --> UI
    UI --> Logic
    Logic --> Services
    UI --> Services
    App --> Notify
    App --> Bg
    Bg --> Api
    Notify --> Cache
    Schedule --> Notes
    Schedule --> SUtils
    Logic --> Dates
    UI --> Constants
    UI --> LiquidGlass
    Onboarding --> CalendarAccess
    Onboarding --> GalleryExport
    Schedule --> CalendarExport
    Schedule --> GalleryExport
```

## 2) Путь данных для экрана расписания

```mermaid
sequenceDiagram
    participant User as Пользователь
    participant Screen as ScheduleScreen
    participant Hook as useScheduleLogic
    participant Api as ApiService
    participant Storage as Cache/Storage
    participant Remote as API Server

    User->>Screen: Выбирает группу/режим/��ату
    Screen->>Hook: Обновляет параметры
    Hook->>Api: Запрашивает данные
    alt Онлайн
        Api->>Remote: HTTP запрос
        Remote-->>Api: Свежие данные
        Api->>Storage: Обновляет кэш
        Api-->>Hook: Возвращает данные
    else Оффлайн
        Api->>Storage: Берет кэш
        Storage-->>Api: Кэш или пусто
        Api-->>Hook: Кэш или ошибка
    end
    Hook-->>Screen: Состояние и данные
    Screen-->>User: Интерфейс результата
```

## 3) Машина состояний экрана данных

```mermaid
stateDiagram-v2
    [*] --> Initial
    Initial --> Loading: Старт запроса
    Loading --> Success: Данные получены
    Loading --> Empty: Данные пусты
    Loading --> Error: Ошибка без кэша
    Loading --> Cached: Ошибка сети, есть кэш
    Cached --> Loading: Повторная попытка
    Error --> Loading: Повторная попытка
    Success --> Refreshing: Pull-to-refresh
    Refreshing --> Success: Успех
    Refreshing --> Cached: Сеть недоступна
    Empty --> Loading: Изменен фильт��
```

## 4) Карта п��едметных областей

```mermaid
mindmap
  root((MyKHSU))
    Расписание
      группы и курсы
      день/неделя
      преподаватель
      аудитория
      экспорт и заметки
      дедлайны ДЗ
      посещаемость
    Новости
      лента
      дедупликация
      кэш и оффлайн
      уведомления о новых
    Карта
      корпуса
      фильтры
      маршруты
      нативный UI
    Настройки
      тема
      акцент
      уведомления
      формат расписания
      сплэш-экран
      конфетти
    Платформенные сервисы
      SecureStore
      AsyncStorage
      Notifications
      BackgroundFetch
      Calendar (SDK 57)
      MediaLibrary (только добавление)
      Liquid Glass (iOS)
    Онбординг
      пятистраничный
      нативные переходы
      конфетти
      разрешения (галерея)
      листы конфиденциальности/функций
```

## 5) Зависимости ключ��вых сущностей

```mermaid
classDiagram
    class App
    class ScheduleScreen
    class NewsScreen
    class MapScreen
    class SettingsScreen
    class OnboardingScreen
    class AcademicCalendarScreen
    class useScheduleLogic
    class ApiService
    class NotificationService
    class BackgroundService
    class CalendarAccessService
    class CalendarExportService
    class GalleryExportService
    class Cache

    App --> ScheduleScreen
    App --> NewsScreen
    App --> MapScreen
    App --> SettingsScreen
    App --> OnboardingScreen
    App --> AcademicCalendarScreen

    ScheduleScreen --> useScheduleLogic
    ScheduleScreen --> CalendarExportService
    ScheduleScreen --> GalleryExportService

    useScheduleLogic --> ApiService

    NewsScreen --> ApiService
    NewsScreen --> Cache

    OnboardingScreen --> GalleryExportService
    OnboardingScreen --> CalendarAccessService

    AcademicCalendarScreen --> CalendarAccessService
    AcademicCalendarScreen --> CalendarExportService

    App --> NotificationService
    App --> BackgroundService

    BackgroundService --> ApiService
    BackgroundService --> NotificationService

    NotificationService --> Cache

    Cache --|> ApiService
```

## Как использо��ать этот документ
1.  Для быстрого онбординга: читать сверху вниз.
2.  Для анализа изменений в расписании: использовать схемы 1, 2 и 3.
3.  Для изменений уведомлений: сверяться с [notifications-and-background.md](notifications-and-background.md).
4.  Для анализа архитектурного воздействия: сверяться с [architecture.md](architecture.md).
