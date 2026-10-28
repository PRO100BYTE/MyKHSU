# Архитектура проекта — MyKHSU Backend

## Обзор

```
                    ┌─────────────────────────────────────┐
                    │           Express Server             │
                    │           src/index.js              │
                    ├──────────┬──────────────────────────┤
                    │ /api/*   │ /adminapi/*              │
                    │ Публичный│ Административный         │
                    │ API      │ API (JWT-защита)         │
                    ├──────────┴──────────────────────────┤
                    │         SQLite (better-sqlite3)     │
                    │  pairs.sqlite  │  users.sqlite      │
                    └─────────────────────────────────────┘
                         ▲
              ┌──────────┴────────────────────────────────────┐
              │        Единый frontend bundle (web-build)     │
              │  MyKHSU-web (/) + Admin Panel (/admin-panel/) │
              └───────────────────────────────────────────────┘
```

## Слои приложения

### 1. Сервер (`src/`)

Директория `src/` содержит основной код бэкенд-сервиса.

*   **`src/index.js`**: Главный файл приложения. Инициализирует Express-сервер, подключает все маршруты (публичные и административные), middleware и начинает прослушивание входящих HTTP-запросов. Также отвечает за раздачу статических файлов единого фронтенд-бандла (веб-версии и админ-панели).
*   **`src/config.js`**: Модуль для загрузки и валидации конфигурации приложения из файла `.env`. Определяет такие параметры, как порт сервера, секретный ключ JWT, данные администратора по умолчанию и пути к базам данных.
*   **`src/constants.js`**: Содержит централизованные константы, такие как версии приложения, номер билда и другие служебные метаданные, используемые в различных частях сервера.
*   **`src/db/`**: Модули для работы с базами данных SQLite.
    *   `src/db/database.js`: Отвечает за создание и управление соединениями с базами данных `pairs.sqlite` (для расписания) и `users.sqlite` (для пользователей). Включает логику инициализации схемы БД при первом запуске.
*   **`src/middleware/`**: Функции-посредники (middleware) для обработки HTTP-запросов.
    *   `src/middleware/auth.js`: Реализует проверку JWT-токенов для защищённых административных маршрутов. Проверяет валидность токена, существование пользователя и его активность.
    *   `src/middleware/noStore.js`: Устанавливает HTTP-заголовки `Cache-Control: no-store` для предотвращения кэширования ответов.
*   **`src/parsers/`**: Модули для парсинга данных.
    *   `src/parsers/timetable.js`: Содержит логику для парсинга JSON-файлов расписания, приведённых к формату ХГСУ, и импорта их в базу данных.
*   **`src/routes/`**: Определения всех API-маршрутов.
    *   `src/routes/user.js`: Определяет все публичные GET-эндпоинты, доступные для мобильного приложения и веб-версии (например, получение расписания, новостей).
    *   `src/routes/admin.js`: Определяет административные эндпоинты, защищённые JWT-аутентификацией (например, управление расписанием, новостями, пользователями).
*   **`src/utils/`**: Вспомогательные утилиты.
    *   `src/utils/dates.js`: Функции для работы с датами, например, вычисление дат по номеру недели.
    *   `src/utils/env.js`: Простой парсер файла `.env` без использования сторонних библиотек.
    *   `src/utils/logger.js`: Модуль для файлового логирования запросов и ошибок в `logs/server.log`, а также вывода в консоль.


### 2. Admin Panel (admin-panel/src/)

| Файл / Папка | Роль |
|---|---|
| `App.js` | Роутинг, layout с сайдбаром и шапкой |
| `styles.css` | CSS-переменные и компоненты в стилистике MyKHSU |
| `api.js` | HTTP-клиент с авторизацией через JWT |
| `context/AuthContext.js` | Глобальное состояние аутентификации |
| `context/ThemeContext.js` | Переключение тем light/dark |
| `screens/LoginScreen.js` | Экран входа |
| `screens/DashboardScreen.js` | Главный экран с метриками |
| `screens/ScheduleScreen.js` | Загрузка / очистка расписания |
| `screens/NewsScreen.js` | CRUD для новостей |
| `screens/TimesScreen.js` | Редактор расписания звонков |
| `screens/UsersScreen.js` | Управление пользователями админки |

### 3. Скрипты (scripts/)

| Файл | Запуск | Описание |
|---|---|---|
| `create-admin.js` | `npm run seed` | Создание начальных администраторов |
| `manage-users.js` | `npm run users:*` | CLI управление пользователями (list/edit/disable/delete) |
| `build-frontend.js` | `npm run build:web` | Сборка MyKHSU-web |

## Поток данных

### Запрос публичного API

```
Client → GET /api/getpairs?type=group&group=ИТ-21&date=22.04.2026
  → middleware/noStore.js (устанавливает заголовки)
  → routes/user.js#handler
  → db/database.js (pairsDb.prepare().all())
  → rows → mapLesson()
  → JSON response
```

### Запрос административного API

```
Client → POST /adminapi/createtable  {Authorization: Bearer <token>}
  → middleware/noStore.js
  → middleware/auth.js (jwt.verify + user.exists + user.is_active)
  → routes/admin.js#handler
  → multer (парсинг multipart)
  → parsers/timetable.js (importTimetable)
  → db/database.js (sqlite transaction)
  → JSON response
```

## Аутентификация

Алгоритм `argon2id` для хранения паролей:
```
password → argon2.hash(password) → stored in users.sqlite
login → argon2.verify(stored_hash, password) → JWT(HS256, 24h)
```

JWT payload:
```json
{ "uid": 1, "username": "admin", "auth": true, "iat": ..., "exp": ... }
```

Middleware поддерживает два заголовка:
- `Authorization: Bearer <token>`
- `Token: <token>` (совместимость с Go-версией)

Дополнительно middleware проверяет:
- пользователь существует в `users.sqlite`
- поле `is_active = 1`

## Структура БД

Подробно: см. [database.md](database.md)

## Фронтенд

Подробно: см. [frontend.md](frontend.md)

## Взаимосвязь с Go-оригиналом (raspisanie/)

| Аспект | Go-версия | Node.js-версия |
|---|---|---|
| HTTP роутер | gorilla/mux | Express |
| JWT | golang-jwt/jwt/v5 | jsonwebtoken |
| Пароли | argon2.IDKey (hex) | argon2 (npm) |
| SQLite | mattn/go-sqlite3 | better-sqlite3 |
| Конфиг | собственный парсер | .env |
| Логирование | xlogger (GitFlic) | `logs/server.log` + console |
| Фронтенд | WebAssembly (wasm_frontend) | React (MyKHSU-web) |
| Admin UI | Go templates (experimental) | React |

Схема таблиц и формат API **полностью совместимы** с Go-версией.
