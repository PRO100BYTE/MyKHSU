# Схема базы данных — MyKHSU Backend

Бэкенд "Мой ИТИ ХГУ" использует две отдельные базы данных SQLite для хранения различных типов информации:

*   **`pairs.sqlite`**: Основная база данных для хранения расписания занятий, новостей и каталогов курсов/групп.
*   **`users.sqlite`**: База данных для управления администраторами, их ролями и историей входов.

Обе базы данных инициализируются и, при необходимости, мигрируют при запуске сервера с помощью логики, определённой в `src/db/database.js`.

## pairs.sqlite

Основная база данных расписания и связанных данных.

### Таблица `pairs`

Хранит информацию о занятиях.

| Колонка | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Уникальный идентификатор занятия |
| `week_number` | INTEGER | Номер учебной недели (например, 1-18) |
| `weekday` | INTEGER | День недели (1=Понедельник … 7=Воскресенье) |
| `course` | INTEGER | Номер курса (-1 для магистратуры) |
| `group_name` | TEXT | Название группы (например, ИТ-21) |
| `date` | TEXT | Дата занятия в формате `YYYY-MM-DD` |
| `time` | INTEGER FK | Номер пары (ссылка на `times.id`) |
| `type` | TEXT | Тип занятия (например, "Лекция", "Практика", "Лабораторная работа") |
| `subject` | TEXT | Название дисциплины |
| `teacher` | TEXT | ФИО преподавателя |
| `auditory` | TEXT | Номер аудитории |
| `date_start` | TEXT | Дата начала недели в формате `YYYY-MM-DD` |
| `date_end` | TEXT | Дата конца недели в формате `YYYY-MM-DD` |

**Индексы:** `week_number`, `date`, `date_start`, `date_end`, `course`, `group_name`, `teacher`, `auditory`, `subject` для оптимизации поиска.

---

### Таблица `times`

Хранит расписание звонков (время начала и окончания каждой пары).

| Колонка | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Уникальный идентификатор номера пары |
| `time` | INTEGER | Порядковый номер пары (например, 1, 2, 3) |
| `time_start` | TEXT | Время начала пары в формате `ЧЧ:MM` |
| `time_end` | TEXT | Время окончания пары в формате `ЧЧ:MM` |

---

### Таблица `news`

Хранит новости, отображаемые в приложении.

| Колонка | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Уникальный идентификатор новости |
| `content` | TEXT NOT NULL | Полный текст новости |
| `date` | TEXT NOT NULL | Дата и время создания новости в формате `YYYY-MM-DD HH:MM:SS` |
| `last_change` | TEXT | Дата и время последнего редактирования новости (NULL, если не редактировалась) |

---

### Таблица `course_catalog`

Каталог курсов, используемый для админского ручного ввода расписания и для синхронизации.

| Колонка | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Уникальный идентификатор записи |
| `course` | INTEGER NOT NULL UNIQUE | Номер курса (уникальный) |
| `created_at` | TEXT | Дата создания записи |

---

### Таблица `group_catalog`

Каталог групп, используемый для админского ручного ввода расписания и для синхронизации.

| Колонка | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Уникальный идентификатор записи |
| `course` | INTEGER NOT NULL | Номер курса, к которому относится группа |
| `group_name` | TEXT NOT NULL | Название группы (например, ИТ-21) |
| `created_at` | TEXT | Дата создания записи |

**Ограничение уникальности:** `(course, group_name)` гарантирует, что комбинация курса и названия группы уникальна.

**Индексы:** `group_catalog(course)`, `group_catalog(group_name)` для быстрого поиска.

**Синхронизация каталогов:** При старте сервера модуль `src/db/database.js` автоматически синхронизирует эти каталоги:

*   В `course_catalog` добавляются все отсутствующие уникальные значения `course` из таблицы `pairs`.
*   В `group_catalog` добавляются все отсутствующие уникальные пары `(course, group_name)` из таблицы `pairs`.

---

### Таблица `unified_window_tickets`

Хранит информацию об обращениях в модуле "Единое окно".

| Колонка | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Уникальный идентификатор обращения |
| `requester_role` | TEXT NOT NULL DEFAULT `visitor` | Роль заявителя (`visitor`, `student`, `teacher`) |
| `subject` | TEXT NOT NULL | Тема обращения (для старых записей, не зашифровано) |
| `contact_email` | TEXT | Email заявителя (для старых записей, не зашифровано) |
| `contact_name` | TEXT | Имя заявителя (для старых записей, не зашифровано) |
| `encrypted_subject_iv/tag/data` | TEXT | Зашифрованная тема обращения (AES-256-GCM) |
| `encrypted_contact_email_iv/tag/data` | TEXT | Зашифрованный email заявителя (AES-256-GCM) |
| `encrypted_contact_name_iv/tag/data` | TEXT | Зашифрованное имя заявителя (AES-256-GCM) |
| `contact_email_hash` | TEXT | SHA-256 хеш email для поиска истории обращений по email |
| `status` | TEXT NOT NULL DEFAULT `open` | Текущий статус обращения (`open`, `in_progress`, `resolved`, `closed`) |
| `priority` | TEXT NOT NULL DEFAULT `normal` | Приоритет обращения (`low`, `normal`, `high`, `urgent`) |
| `access_token` | TEXT UNIQUE | Уникальный токен для доступа пользователя к своему обращению |
| `due_at` | TEXT | Дата и время дедлайна SLA (Service Level Agreement) |
| `first_response_at` | TEXT | Дата и время первого ответа агента |
| `resolved_at` | TEXT | Дата и время решения обращения |
| `user_hidden_at` | TEXT | Дата и время скрытия обращения пользователем из своей истории (soft-delete для пользовательского интерфейса) |
| `user_last_read_at` | TEXT | Дата и время последнего прочтения переписки пользователем |
| `agent_last_read_at` | TEXT | Дата и время последнего прочтения переписки агентом |
| `created_at` | TEXT NOT NULL | Дата и время ��оз��ания обращения |
| `updated_at` | TEXT NOT NULL | Дата и время последнего изменения обращения |

**Индексы:** `status`, `priority`, `access_token`, `contact_email_hash` для оптимизации поиска и доступа.

**Миграции:** Для старых баз данных колонки `contact_email_hash`, `user_hidden_at` и соответствующий индекс добавляются автоматически при старте сервера.

---

### Таблица `unified_window_messages`

Хранит сообщения, связанные с обращениями в модуле "Единое окно".

| Колонка | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Уникальный идентификатор сообщения |
| `ticket_id` | INTEGER NOT NULL FK | Ссылка на `unified_window_tickets.id` (ON DELETE CASCADE) |
| `author_role` | TEXT NOT NULL | Роль автора сообщения (`user` или `agent`) |
| `author_name` | TEXT | Имя автора сообщения |
| `encrypted_text_iv/tag/data` | TEXT | Зашифрованный текст сообщения (AES-256-GCM) |
| `created_at` | TEXT NOT NULL | Дата и время создания сообщения |

---

### Таблица `unified_window_files`

Хранит информацию о файлах-вложениях к обращениям в модуле "Единое окно".

| Колонка | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Уникальный идентификатор файла |
| `ticket_id` | INTEGER NOT NULL FK | Ссылка на `unified_window_tickets.id` (ON DELETE CASCADE) |
| `message_id` | INTEGER FK NULL | Ссылка на `unified_window_messages.id` (если файл привязан к конкретному сообщению) |
| `original_name` | TEXT NOT NULL | Исходное имя файла |
| `mime_type` | TEXT NOT NULL | MIME-тип файла (например, `image/png`, `application/pdf`) |
| `size_bytes` | INTEGER NOT NULL | Размер файла в байтах |
| `encrypted_blob_iv/tag/data` | TEXT | Зашифрованный бинарный контент файла (AES-256-GCM) |
| `created_at` | TEXT NOT NULL | Дата и время создания записи о файле |

---

### Таблица `unified_window_status_history`

Хранит историю изменений статусов обращений в модуле "Единое окно".

| Колонка | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Уникальный идентификатор записи истории |
| `ticket_id` | INTEGER NOT NULL FK | Ссылка на `unified_window_tickets.id` (ON DELETE CASCADE) |
| `from_status` | TEXT NOT NULL | Предыдущий статус обращения |
| `to_status` | TEXT NOT NULL | Новый статус обращения |
| `changed_by` | TEXT | Имя или ID пользователя/агента, изменившего статус |
| `comment` | TEXT | Комментарий к изменению статуса (если есть) |
| `created_at` | TEXT NOT NULL | Дата и время изменения статуса |

---

## users.sqlite

База данных для управления администраторами и их активностью.

### Таблица `users`

Хранит информацию о пользователях административной панели.

| Колонка | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Уникальный идентификатор пользователя |
| `username` | TEXT NOT NULL UNIQUE | Логин пользователя (уникальный) |
| `password` | TEXT NOT NULL | ��еш пароля пользователя (используется Argon2id) |
| `is_active` | INTEGER NOT NULL DEFAULT 1 | Статус учётной записи (1=активен, 0=отключён) |
| `role` | TEXT NOT NULL DEFAULT `admin` | Роль пользователя в системе (например, `admin`) |
| `first_name` | TEXT | Имя пользователя |
| `middle_name` | TEXT | Отчество пользователя (может быть NULL) |
| `last_name` | TEXT | Фамилия пользователя |
| `position` | TEXT | Должность пользователя |
| `email` | TEXT | Email пользователя для уведомлений или восстановления доступа |
| `created_at` | TEXT NOT NULL | Дата и время создания пользователя |
| `updated_at` | TEXT NOT NULL | Дата и время последнего изменения профиля пользователя |

**Миграции:** При старте сервера выполняется автоматическая миграция для добавления новых колонок, если они отсутствуют в старой таблице `users`.

---

### Таблица `login_history`

Хранит историю входов администраторов в систему для целей аудита и безопасности.

| Колонка | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Уникальный идентификатор записи входа |
| `user_id` | INTEGER NOT NULL FK | ID пользователя, совершившего вход (ссылка на `users.id`, при удалении пользователя записи удаляются каскадно) |
| `ip_address` | TEXT | IP-адрес, с которого был выполнен вход (поддерживает `X-Forwarded-For` для работы через прокси) |
| `user_agent` | TEXT | Полная строка User-Agent браузера/клиента |
| `device_model` | TEXT | Модель устройства (например, `MacBook Pro`, `iPhone`) |
| `device_os` | TEXT | Операционная система (например, `Windows`, `macOS`, `Linux`, `iOS`, `Android`) |
| `device_os_version` | TEXT | Версия операционной системы |
| `browser_name` | TEXT | Название браузера (например, `Chrome`, `Safari`, `Firefox`, `Edge`) |
| `browser_version` | TEXT | Версия браузера |
| `login_timestamp` | TEXT NOT NULL | Дата и время успешного входа в формате `YYYY-MM-DD HH:MM:SS` |
| `created_at` | TEXT NOT NULL | Дата и время записи события в БД |

**Индексы:** `user_id`, `login_timestamp`, `ip_address` для оптимизации поиска.

**Парсинг User-Agent:** Информация об устройстве и браузере извлекается из заголовка User-Agent с помощью библиотеки `ua-parser-js`.

---

## Начальные данные

При первом запуске скрипта `scripts/create-admin.js` (или командой `npm run seed`) создаются два начальных администратора:

| Логин | Описание |
|---|---|
| `admin` | Основной администратор системы |
| `TheDayG0ne` | Администратор-разработчик |

Пароли для этих учётных записей могут быть заданы интерактивно при запуске скрипта или через переменные окружения `SEED_ADMIN_PASSWORD` и `SEED_THEDAYG0NE_PASSWORD` (удобно для CI/CD).

---

## Служебные скрипты и их влияние на БД

*   **`scripts/build-frontend.js`**: Этот скрипт отвечает за сборку единого фронтенд-бандла, который включает веб-версию приложения (`mykhsu-web/`) и админ-панель (`admin-panel/`). Он использует `mykhsu-web/` как git submodule. Скрипт определяет корень проекта по пути собственного файла, что обеспечивает корректную работу в различных окружениях (например, Linux/systemd), где текущая рабочая директория может отличаться от каталога репозитория. **Напрямую не изменяет схему БД, но влияет на пути доступа к UI, через который выполняются административные операции с данными.**

*   **`scripts/sync-build-info.js`**: Автоматически синхронизирует метаданные сборки (версии из `src/constants.js`, git-хеш, дата сборки в часовом поясе `Asia/Krasnoyarsk`) перед сборкой бэкенда, админ-панели и веб-версии. Он обновляет служебные файлы сборки (`src/build-info.generated.js`, `.env.production.local` для фронтенд-приложений). Для `mykhsu-web` версия приложения не перезаписывается скриптом (остаётся ручной), синхронизируются только поля build-хеша и даты (`DD.MM.YYYY`). **Не меняет схему БД, но обновляет служебные файлы, влияющие на отображение информации о версии в UI.**

---

## Примеры SQL-запросов

### Получить количество пар

```sql
SELECT COUNT(*) FROM pairs;
```

### Получить все группы 2 курса

```sql
SELECT DISTINCT group_name FROM pairs WHERE course = 2 ORDER BY group_name;
```

### Получить расписание для ИТ-21 на неделе 15

```sql
SELECT p.*, t.time_start, t.time_end
FROM pairs p
LEFT JOIN times t ON p.time = t.id
WHERE p.group_name = 'ИТ-21' AND p.week_number = 15
ORDER BY p.weekday, p.time;
```

### Управление администраторами через CLI-скрипты

Эти команды запускаются из корневой директории бэкенд-проекта.

```bash
# Создать нового администратора (или обновить пароль существующего)
node scripts/create-admin.js <username> <password>

# Пример: Создать пользователя 'newadmin' с паролем 'securepassword'
node scripts/create-admin.js newadmin securepassword

# Запустить интерактивное создание начальных администраторов (из .env)
npm run seed

# Создать начальных администраторов через переменные окружения (для CI/CD)
SEED_ADMIN_PASSWORD=secret1 SEED_THEDAYG0NE_PASSWORD=secret2 npm run seed

# Показать список всех пользователей админ-панели
npm run users:list

# Создать нового пользователя через manage-users.js
npm run users:create -- <username> <password> <is_active> <role> <first_name> <middle_name> <last_name> <position> <email>
# Пример: npm run users:create -- newuser pass123 true admin "Иван" "Иванович" "Иванов" "Разработчик" "ivan@example.com"

# Редактировать пользователя по ID (логин и пароль опциональны)
npm run users:edit -- <id> [new_username] [new_password] [is_active] [role] [first_name] [middle_name] [last_name] [position] [email]
# Пример: npm run users:edit -- 3 newlogin newpassword

# Отключить пользователя по ID
npm run users:disable -- <id>

# Включить пользователя по ID
npm run users:enable -- <id>

# Удалить пользователя по ID
npm run users:delete -- <id>
```

