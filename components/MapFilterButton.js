import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';

export const MAP_FILTER_CATEGORIES = [
  { id: 'main', name: 'Административный корпус' },
  { id: 'academic', name: 'Учебные корпуса' },
  { id: 'dormitory', name: 'Общежития' },
  { id: 'library', name: 'Библиотеки ХГУ' },
  { id: 'cafeteria', name: 'Столовые ХГУ' },
  { id: 'cardatm', name: 'Банкоматы' },
  { id: 'sports', name: 'Спортивные площадки' },
  { id: 'other', name: 'Прочее' },
];

export default function MapFilterButton({ selectedFilters = [], onPress, color, children, style }) {
  const label = selectedFilters.length ? `Фильтры карты (${selectedFilters.length})` : 'Фильтры карты: все объекты';
  const content = children || (
    <View style={styles.button}>
      <Icon name="options-outline" size={22} color={color} />
      {selectedFilters.length > 0 && (
        <View style={[styles.badge, { backgroundColor: color }]}><Text style={styles.badgeText}>{selectedFilters.length}</Text></View>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      style={style}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Открывает фильтры карты"
      onPress={onPress}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', right: 0, top: 2, borderRadius: 8, minWidth: 16, paddingHorizontal: 3, alignItems: 'center' },
  badgeText: { color: '#fff', fontFamily: 'Montserrat_600SemiBold', fontSize: 10 },
});
