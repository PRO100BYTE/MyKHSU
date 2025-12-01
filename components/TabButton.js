import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';

const TabButton = ({ icon, label, isActive, onPress, theme, accentColor, showLabels = true, fontSize = 'medium' }) => {
  const colors = ACCENT_COLORS[accentColor];
  const iconColor = isActive ? 
    (theme === 'light' ? colors.primary : colors.dark) : 
    (theme === 'light' ? '#6b7280' : '#9ca3af');
  
  const textColor = isActive ? 
    (theme === 'light' ? colors.primary : colors.dark) : 
    (theme === 'light' ? '#6b7280' : '#9ca3af');

  // Определяем размер шрифта
  const getFontSize = () => {
    switch (fontSize) {
      case 'small': return 8;
      case 'medium': return 10;
      case 'large': return 12;
      default: return 10;
    }
  };

  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[styles.tabButton, { 
        backgroundColor: isActive ? (theme === 'light' ? colors.light : 'rgba(96, 165, 250, 0.1)') : 'transparent'
      }]}
    >
      <Icon name={icon} size={24} color={iconColor} />
      {showLabels && (
        <Text style={[styles.tabText, { 
          color: textColor, 
          fontFamily: 'Montserrat_500Medium',
          fontSize: getFontSize(),
          marginTop: 4
        }]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: Platform.OS === 'android' ? 60 : 50
  },
  tabText: {
    fontSize: 10,
    marginTop: 4
  }
});

export default TabButton;