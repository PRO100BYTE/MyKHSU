<div align="center">
  <a href="https://myiti.pro100byte.ru/">
    <img src="https://raw.githubusercontent.com/PRO100BYTE/MyKHSU/master/.github/images/mykhsu.png" alt="Мой ИТИ ХГУ" width="100%">
  </a>

   <p></p>

  <p>
    <a href="https://github.com/PRO100BYTE/MyKHSU/releases">
      <img src="https://img.shields.io/badge/версия-2.2.9-blue?style=for-the-badge" alt="Версия" />
    </a>
    <a href="https://www.gnu.org/licenses/lgpl-3.0.ru.html">
      <img src="https://img.shields.io/badge/лицензия-LGPL%20v3-green?style=for-the-badge" alt="Лицензия" />
    </a>
    <a href="https://reactnative.dev/">
      <img src="https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?style=for-the-badge&logo=react" alt="React Native" />
    </a>
    <a href="https://expo.dev/">
      <img src="https://img.shields.io/badge/Expo-54.0.25-000020?style=for-the-badge&logo=expo" alt="Expo" />
    </a>
    <a href="https://developer.mozilla.org/ru/docs/Web/JavaScript">
      <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
    </a>
  </p>
</div>

---

#

# Мой ИТИ ХГУ - Твой университет в кармане

## 📖 О проекте

**Мой ИТИ ХГУ** — это официальное мобильное приложение для студентов и преподавателей Инженерно-технологического института Хакасского государственного университета им. Н. Ф. Катанова. Приложение создано для того, чтобы сделать доступ к расписанию, новостям и навигации по университету максимально удобным и быстрым.

## ✨ Основные возможности

### 🎓 Для студентов

- **Расписание**: Просмотр расписания занятий по группам.
- **Режимы**: Дневной и недельный просмотр.
- **Первокурснику**: Специальный раздел с полезной информацией, ссылками и гайдами.

### 👨‍🏫 Для преподавателей

- **Персональное расписание**: Поиск по ФИО.
- **Детализация**: Отображение групп для каждой пары.
- **Навигация**: Удобный просмотр расписания на неделю.

### 🚀 Общие функции

- **Офлайн-доступ**: Кэширование расписания и новостей.
- **Новости**: Актуальные события университета.
- **Карта**: Интерактивная схема корпусов.
- **Персонализация**: Темы (светлая/тёмная) и цветовые акценты.
- **Уведомления**: Оповещения об изменениях и важных новостях.

## 🛠 Технический стек

Проект построен с использованием современных технологий:

- **Framework**: [React Native](https://reactnative.dev/)
- **Platform**: [Expo](https://expo.dev/)
- **Language**: [JavaScript (ES6+)](https://developer.mozilla.org/ru/docs/Web/JavaScript)
- **Navigation**: Expo Router (File-based routing)

## 🗒️ Структура проекта

```mermaid
flowchart TD
    A0["Application Core & Global State
"]
    A1["API Communication & Caching
"]
    A2["User Interface Components
"]
    A3["Schedule Management Logic
"]
    A4["Notifications & Background Tasks
"]
    A5["Theming & Visual Customization
"]
    A6["Campus Map & Building Data
"]
    A0 -- "Configures styling" --> A5
    A0 -- "Initializes notifications" --> A4
    A0 -- "Displays screens" --> A2
    A1 -- "Accesses app settings" --> A0
    A2 -- "Updates global settings" --> A0
    A2 -- "Interacts with logic" --> A3
    A2 -- "Requests news data" --> A1
    A3 -- "Fetches schedule data" --> A1
    A3 -- "Schedules lesson alerts" --> A4
    A4 -- "Retrieves news updates" --> A1
    A4 -- "Persists notification settings" --> A0
    A5 -- "Applies visual themes" --> A2
    A6 -- "Provides map data" --> A2
```

## 👀 Как приложение работает с API для отображения расписания и кэширования?

```mermaid
sequenceDiagram
    participant UIComponent["UI Component (e.g. ScheduleScreen)"]
    participant UseHook["useScheduleLogic (Brain)"]
    participant ApiService["ApiService (Data Retriever)"]
    participant NetInfo["NetInfo (Network Status)"]
    participant AsyncStorage["AsyncStorage (Local Cache)"]
    participant RemoteServer["University API Server"]

    UIComponent->>UseHook: Needs schedule data (group, date)
    UseHook->>ApiService: Calls getSchedule(group, date)
    ApiService->>NetInfo: Checks internet connection
    NetInfo-->>ApiService: Returns isOnline (true/false)

    alt Cached Data Available & Valid
        ApiService->>AsyncStorage: Checks for schedule data in cache
        AsyncStorage-->>ApiService: Returns valid cached data
        ApiService-->>UseHook: Returns cached data
        UseHook-->>UIComponent: Displays cached schedule
    else No Valid Cache OR Offline
        ApiService->>AsyncStorage: Checks for *any* cached data (even stale)
        AsyncStorage-->>ApiService: Returns stale data (if any) or null

        alt Is Online & No Valid Cache
            ApiService->>RemoteServer: Requests latest schedule data
            RemoteServer-->>ApiService: Returns fresh schedule data
            ApiService->>AsyncStorage: Saves fresh data to cache
            AsyncStorage-->>ApiService: Confirms save
            ApiService-->>UseHook: Returns fresh data
            UseHook-->>UIComponent: Displays fresh schedule
        else Is Offline & Stale Cache Available
            ApiService-->>UseHook: Returns stale cached data (with 'offline' note)
            UseHook-->>UIComponent: Displays stale schedule
        else Is Offline & No Cache At All
            ApiService--xUseHook: Throws 'NO_INTERNET' error
            UseHook--xUIComponent: Shows 'No Internet' message
        end
    end
```

## 🛜 Работа приложения в фоне (для работы службы уведомлений)

```mermaid
sequenceDiagram
    participant User
    participant App["App.js (Setup)"]
    participant backgroundService["backgroundService.js"]
    participant notificationService["notificationService.js"]
    participant ApiService["ApiService (Data)"]
    participant Cache["Cache (last_notified_news)"]

    App->>notificationService: Initializes permissions
    App->>backgroundService: Registers BACKGROUND_NEWS_CHECK task
    Note over App: App goes to background or is closed

    User->>backgroundService: OS triggers BACKGROUND_NEWS_CHECK periodically
    backgroundService->>notificationService: Calls getNotificationSettings()
    notificationService-->>backgroundService: Returns news notification enabled (true)
    backgroundService->>ApiService: Calls getNews()
    ApiService-->>backgroundService: Returns latest news data
    backgroundService->>notificationService: Calls checkForNewNews(latestNews)
    notificationService->>Cache: Gets 'last_notified_news'
    Cache-->>notificationService: Returns previous news or null
    notificationService->>notificationService: Compares latestNews with previous news
    Note over notificationService: Finds truly new news
    notificationService->>notificationService: Calls showNewsNotification(newNews)
    notificationService->>User: Sends "Новая новость" notification
    notificationService->>Cache: Saves latestNews as 'last_notified_news'
```

## 🚀 Запуск и разработка

### Предварительные требования

- Node.js
- npm
- Git

### Установка и запуск

1. **Склонируйте репозиторий**

   ```bash
   git clone https://github.com/PRO100BYTE/MyKHSU.git
   cd MyKHSU
   ```

2. **Установите зависимости**

   ```bash
   npm install
   ```

3. **Запустите сервер разработки**

   ```bash
   npx expo start
   ```

В результате, вы получите варианты запуска приложения в:

- [тестовой сборке](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android эмуляторе](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS симуляторе](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go)

## 📦 Сборка приложения

### Android

Для начала нужно создать prebuild:

```bash
npx expo prebuild
```

Затем выполните одну из команд:

```bash
# APK (Release)
npx eas build --platform android --profile release-apk --local

# AAB (Google Play)
npx eas build --platform android --profile release --local

# Development APK
npx eas build --platform android --profile development --local
```

> [!WARNING]
> Для локальной сборки под Android требуется Linux или macOS.

> [!NOTE]
> **Комментарий TheDayG0ne:**
> *Лично я для сборки приложения использую виртуальную машину с ОС Ubuntu Server 24.04. В качестве окружения устанавливал git, nodejs, jdk, а также android-sdk.*

### iOS

Для начала нужно создать prebuild:

```bash
npx expo prebuild
```

Затем выполните одну из команд:

```bash
# Release (IPA)
npx eas build --platform ios --profile release --local

# Development (Device)
npx eas build --platform ios --profile development --local
```

> [!WARNING]
> Для локальной сборки под iOS требуется macOS с установленным Xcode.

## 📚 Полезные ресурсы

- [Документация Expo](https://docs.expo.dev/)
- [Учебное пособие Expo](https://docs.expo.dev/tutorial/introduction/)

## 🤝 Вклад в развитие

Мы приветствуем вклад сообщества! Пожалуйста, ознакомьтесь с [CONTRIBUTING.md](CONTRIBUTING.md) и [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) перед началом работы.

## 📄 Лицензия

Этот проект распространяется под лицензией LGPL v3. Подробнее см. в файле [LICENSE.md](LICENSE.md).

---
<div align="center">
  <sub>Разработано с ❤️ командой PRO100BYTE</sub>
</div>
