import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PlaceholderScreen = ({ title, theme }) => {
  const messages = {
    'Карта': 'Данный раздел находится в разработке и скоро будет доступен.',
    'Первокурснику': 'Полезная информация для первокурсников появится здесь в ближайшее время.'
  };

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';

  return (
    <View style={[styles.flexCenter, { backgroundColor: bgColor, padding: 20 }]}>
      <Text style={[styles.placeholderTitle, { color: textColor, fontFamily: 'Montserrat_600SemiBold' }]}>
        {title}
      </Text>
      <Text style={[styles.placeholderText, { color: placeholderColor, fontFamily: 'Montserrat_400Regular' }]}>
        {messages[title] || ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  flexCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16
  },
  placeholderText: {
    textAlign: 'center'
  }
});

export default PlaceholderScreen;