import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';

const SplashScreen = ({ accentColor, theme }) => {
  const colors = ACCENT_COLORS[accentColor];
  
  // Определяем цвет фона в зависимости от темы
  const backgroundColor = theme === 'dark' ? '#111827' : '#f3f4f6';
  // Определяем цвет иконки и текста в зависимости от темы
  const iconColor = theme === 'dark' ? colors.light : colors.primary;
  const textColor = theme === 'dark' ? '#ffffff' : colors.primary;
  
  return (
    <View style={[styles.flexCenter, { backgroundColor }]}>
      <Icon name="school-outline" size={120} color={iconColor} />
      <Text style={[styles.title, { color: textColor, marginTop: 20, fontFamily: 'Montserrat_700Bold' }]}>
        Мой ИТИ ХГУ
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
  title: {
    fontSize: 32,
    fontWeight: 'bold'
  }
});

export default SplashScreen;