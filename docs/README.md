# Документация MyKHSU

## О чем эта документация
Этот раздел описывает устройство мобильного приложения MyKHSU, ключевые пользовательские сценарии, правила безопасных изменений и минимальную валидацию. Документация также включает подробное описание бэкенд-сервиса.

Документация составлена с учетом рабочих принципов проекта:
*   безопасность и корректность важнее скорости;
*   минимальный дифф важнее широкого рефакторинга;
*   обратная совместимость и стабильность пользовательских сценариев обязательны.

## Быстрый старт для разработчика
1.  Установить зависимости: `npm install`.
2.  Запустить проект: `npm run start`.
3.  Для платформ:
    *   Android: `npm run android`
    *   iOS: `npm run ios`
    *   Web: `npm run web`

## Карта документации
*   [architecture.md](architecture.md): архитектура приложения и связи между модулями.
*   [screens.md](screens.md): экраны, режимы и пользовательские сценарии.
*   [data-and-storage.md](data-and-storage.md): API, кэш, локальное хранилище и устойчивость к ошибкам.
*   [notifications-and-background.md](notifications-and-background.md): уведомления и фоновые задачи.
*   [development-guidelines.md](development-guidelines.md): регламент изменений, стандарты качества и чеклисты.
*   [diagrams.md](diagrams.md): концентрированный набор диаграмм, графов и схем проекта.
*   [map-native-ui.md](map-native-ui.md): нативные листы карты, геолокация и поведение маршрутизации.
*   [onboarding.md](onboarding.md): процесс первого знакомства пользователя с приложением.
*   [splash-design.md](splash-design.md): дизайн и поведение сплэш-экрана.
*   [calendar-background-compatibility.md](calendar-background-compatibility.md): совместимость с календарём и фоновыми проверками.
*   [gallery-export.md](gallery-export.md): экспорт расписания в галерею.
*   [modal-native-ui.md](modal-native-ui.md): нативный UI модальных окон.
*   [native-tabs.md](native-tabs.md): нативные вкладки iOS.
*   [native-ui-verification.md](native-ui-verification.md): проверка нативного UI.
*   [notification-navigation.md](notification-navigation.md): навигация по уведомлениям.
*   [notifications-improvements.md](notifications-improvements.md): доработки уведомлений.
*   [pr-quality-checks.md](pr-quality-checks.md): проверки Pull Request.
*   [privacy-notice.md](privacy-notice.md): текущая реализация конфиденциальности.
*   [schedule-tools.md](schedule-tools.md): инструменты расписания.
*   [screen-underlap.md](screen-underlap.md): перекрытие экрана.
*   [search-context-actions.md](search-context-actions.md): действия контекста поиска.
*   [settings-native-ui.md](settings-native-ui.md): нативный UI настроек.
*   [snake.md](snake.md): игра «Змейка».
*   [splash-seasons.md](splash-seasons.md): сезонные эффекты сплэш-экрана.
*   [toolbar-direct-actions.md](toolbar-direct-actions.md): прямые действия на панели инструментов.

## Документация по слоям

### Уровень приложения
*   Инициализация и композиция экранов: [architecture.md](architecture.md)
*   Логика запуска и жизненный цикл: [diagrams.md](diagrams.md)

### Уровень пользовательских сценариев
*   Поведение экранов и режимов: [screens.md](screens.md)
*   Ключевые сценарии для `smoke-test`: [development-guidelines.md](development-guidelines.md)

### Уровень данных и интеграций
*   API, кэш, локальное хранилище: [data-and-storage.md](data-and-storage.md)
*   Уведомления и фоновые задачи: [notifications-and-background.md](notifications-and-background.md)

## Как чит��ть документацию
1.  Начать с [architecture.md](architecture.md), чтобы понять общую картину.
2.  Перейти в [screens.md](screens.md) для пользовательских потоков.
3.  Изучить [data-and-storage.md](data-and-storage.md) и [notifications-and-background.md](notifications-and-background.md) для сервисной логики.
4.  Открыть [diagrams.md](diagrams.md) для визуального представления связей и состояний.
5.  Перед внесением правок свериться с [development-guidelines.md](development-guidelines.md).

## Ключевые инварианты проекта
*   Экран расписания всегда должен оставаться рабочим и отзывчивым.
*   Навигация между ключевыми экранами не должна ломаться.
*   Настройки пользователя и локальные данные должны сохраняться корректно.
*   При ошибках сети приложение обязано показывать понятный `fallback`.
*   Нативный UI iOS должен быть отполирован и согласован с системными ��лементами.

## Краткая структура проекта
*   `App.js`: инициализация приложения, тема, табы, интеграция сервисов.
*   `components/`: экраны и UI-компоненты.
*   `hooks/`: переиспользуемая логика состояния экранов.
*   `utils/`: API, кэш, хранилище, уведомления, фоновые процессы, календарь, галерея.

## Когда обновлять документацию
Обновляйте `docs` при изменении:
*   навигации, основных экранов или пользовательских режимов;
*   формата данных API, схем кэширования, ключей хранения;
*   логики уведомлений и фоновых задач;
*   регламента тестирования и критериев приемки;
*   нативного UI iOS и его взаимодействия с системными элементами;
*   интеграции с календарём или галереей.