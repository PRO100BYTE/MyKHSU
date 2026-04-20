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

    User->>Screen: Выбирает группу/режим/дату
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
    Empty --> Loading: Изменен фильтр
```

## 4) Карта предметных областей

```mermaid
mindmap
  root((MyKHSU))
    Расписание
      группы и курсы
      день/неделя
      преподаватель
      аудитория
      экспорт и заметки
    Новости
      лента
      дедупликация
      кэш и оффлайн
      уведомления о новых
    Карта
      корпуса
      фильтры
      маршруты
    Настройки
      тема
      акцент
      уведомления
      формат расписания
    Платформенные сервисы
      SecureStore
      AsyncStorage
      Notifications
      BackgroundFetch
```

## 5) Зависимости ключевых сущностей

```mermaid
classDiagram
    class App
    class ScheduleScreen
    class NewsScreen
    class MapScreen
    class SettingsScreen
    class useScheduleLogic
    class ApiService
    class NotificationService
    class BackgroundService
    class Cache

    App --> ScheduleScreen
    App --> NewsScreen
    App --> MapScreen
    App --> SettingsScreen
    ScheduleScreen --> useScheduleLogic
    useScheduleLogic --> ApiService
    NewsScreen --> ApiService
    NewsScreen --> Cache
    App --> NotificationService
    App --> BackgroundService
    BackgroundService --> ApiService
    BackgroundService --> NotificationService
```

## Как использовать этот документ
1. Для быстрого онбординга: читать сверху вниз.
2. Для анализа изменений в расписании: использовать схемы 1, 2 и 3.
3. Для изменений уведомлений: сверяться с [notifications-and-background.md](notifications-and-background.md).
4. Для анализа архитектурного воздействия: сверяться с [architecture.md](architecture.md).
