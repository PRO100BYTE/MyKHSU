import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LIQUID_GLASS } from '../utils/constants';

const PlaceholderScreen = ({ title, theme }) => {
  const messages = {
    'Карта': 'Данный раздел находится в разработке и скоро будет доступен.',
    'Первокурснику': 'Полезная информация для первокурсников появится здесь в ближайшее время.'
  };

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;

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