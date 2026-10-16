import React from 'react';
import { ActionSheetIOS, Alert, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { MenuView } from '@react-native-menu/menu';
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

export function openMapFilterFallback({ selectedFilters, onToggleFilter, onClearFilters }) {
  const actions = [
    { title: `${selectedFilters.length === 0 ? '✓ ' : ''}Показать всё (сбросить фильтры)`, onPress: onClearFilters },
    ...MAP_FILTER_CATEGORIES.map(category => ({
      title: `${category.name}: ${selectedFilters.includes(category.id) ? 'выбрано' : 'не выбрано'}`,
      onPress: () => onToggleFilter(category.id),
    })),
  ];
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions({
      title: 'Фильтры карты',
      message: 'Выберите категории. Без выбранных категорий показаны все объекты.',
      options: [...actions.map(action => action.title), 'Отмена'],
      cancelButtonIndex: actions.length,
    }, index => actions[index]?.onPress());
  } else {
    // Android Alert supports at most three buttons, so choose a category first.
    const chooseCategory = index => {
      const category = MAP_FILTER_CATEGORIES[index];
      if (!category) return;
      const selected = selectedFilters.includes(category.id);
      Alert.alert(category.name, selected ? 'Категория выбрана' : 'Категория не выбрана', [
        { text: 'Отмена', style: 'cancel' },
        { text: selected ? 'Убрать из фильтра' : 'Добавить в фильтр', onPress: () => onToggleFilter(category.id) },
      ]);
    };
    const choosePage = (index = 0) => {
      Alert.alert('Фильтры карты', actions[index + 1].title, [
        { text: 'Закрыть', style: 'cancel' },
        { text: 'Выбрать', onPress: () => chooseCategory(index) },
        { text: 'Следующая категория', onPress: () => choosePage((index + 1) % MAP_FILTER_CATEGORIES.length) },
      ]);
    };
    Alert.alert('Фильтры карты', selectedFilters.length ? `Выбрано категорий: ${selectedFilters.length}` : 'Показаны все объекты', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Показать всё', onPress: onClearFilters },
      { text: 'Категории', onPress: () => choosePage() },
    ]);
  }
}

export default function MapFilterButton({ selectedFilters = [], onToggleFilter, onClearFilters, color, theme, children, style }) {
  const menuProps = { selectedFilters, onToggleFilter, onClearFilters };
  const label = selectedFilters.length ? `Фильтры карты (${selectedFilters.length})` : 'Фильтры карты: все объекты';
  const content = children || (
    <View style={styles.button}>
      <Icon name="options-outline" size={22} color={color} />
      {selectedFilters.length > 0 && (
        <View style={[styles.badge, { backgroundColor: color }]}><Text style={styles.badgeText}>{selectedFilters.length}</Text></View>
      )}
    </View>
  );
  const nativeMenuAvailable = Platform.OS === 'ios' && !!UIManager.hasViewManagerConfig('MenuView');
  if (!nativeMenuAvailable) {
    return <TouchableOpacity style={style} accessibilityRole="button" accessibilityLabel={label} onPress={() => openMapFilterFallback(menuProps)}>{content}</TouchableOpacity>;
  }
  return (
    <MenuView
      style={style}
      title="Фильтры карты"
      themeVariant={theme}
      shouldOpenOnLongPress={false}
      accessibilityRole="button"
      accessibilityLabel={label}
      actions={[
        { id: 'all', title: 'Показать всё', state: selectedFilters.length === 0 ? 'on' : 'off' },
        ...MAP_FILTER_CATEGORIES.map(category => ({
          id: category.id,
          title: category.name,
          state: selectedFilters.includes(category.id) ? 'on' : 'off',
        })),
      ]}
      onPressAction={({ nativeEvent }) => {
        if (nativeEvent.event === 'all') onClearFilters();
        else if (MAP_FILTER_CATEGORIES.some(category => category.id === nativeEvent.event)) onToggleFilter(nativeEvent.event);
      }}
    >
      {content}
    </MenuView>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', right: 0, top: 2, borderRadius: 8, minWidth: 16, paddingHorizontal: 3, alignItems: 'center' },
  badgeText: { color: '#fff', fontFamily: 'Montserrat_600SemiBold', fontSize: 10 },
});
