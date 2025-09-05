import YaMap from 'react-native-yamap';

// Инициализация Яндекс Карт с API ключом
YaMap.init('YOUR_YANDEX_MAPS_API_KEY');

// Дополнительные настройки
YaMap.setLocale('ru_RU'); // Установка языка
YaMap.setNightMode(false); // По умолчанию дневной режим

export default YaMap;