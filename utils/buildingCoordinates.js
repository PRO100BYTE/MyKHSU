export const buildings = [
  {
    id: 1,
    name: 'Корпус №2 (ИТИ)',
    latitude: 53.722143,
    longitude: 91.439183,
    description: 'ул. Ленина, 92/1',
    type: 'academic'
  },
  {
    id: 2,
    name: 'Административный корпус',
    latitude: 53.722127,
    longitude: 91.438486,
    description: 'ул. Ленина, 92',
    type: 'main'
  },
  {
    id: 3,
    name: 'Корпус №1 (ИЕНиМ)',
    latitude: 53.722481,
    longitude: 91.441737,
    description: 'ул. Ленина, 90',
    type: 'academic'
  },
  {
    id: 4,
    name: 'Корпус №3 (ИФИиМК)',
    latitude: 53.7215,
    longitude: 91.4385,
    description: 'ул. Ленина, 94',
    type: 'academic'
  },
  {
    id: 5,
    name: 'Спортивный комплекс',
    latitude: 53.7210,
    longitude: 91.4370,
    description: 'ул. Ленина, 96',
    type: 'sports'
  },
  {
    id: 6,
    name: 'Библиотека',
    latitude: 53.7220,
    longitude: 91.4400,
    description: 'ул. Ленина, 92',
    type: 'library'
  }
];

// Центральная точка кампуса для начального отображения карты
export const initialRegion = {
  latitude: 53.7213,
  longitude: 91.4400,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};