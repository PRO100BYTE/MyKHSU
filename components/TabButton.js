import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';

const TabButton = ({ icon, label, isActive, onPress, theme, accentColor, showLabels = true, fontSize = 'medium', glassAvailable = false, onLayout }) => {
  const colors = ACCENT_COLORS[accentColor];
  const isDarkTheme = theme !== 'light';
  const inactiveColor = isDarkTheme ? '#f2f2f7' : '#3a3a3c';
  const activeColor = glassAvailable ? (isDarkTheme ? '#ffffff' : '#1c1c1e') : colors.primary;
  const iconColor = isActive ? activeColor : inactiveColor;
  const textColor = isActive ? activeColor : inactiveColor;

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
      style={styles.tabButton}
      activeOpacity={0.7}
      onLayout={onLayout}
    >
      <View style={[
        styles.iconContrast,
        {
          backgroundColor: isActive
            ? (glassAvailable ? 'rgba(255,255,255,0.88)' : colors.glass)
            : (isDarkTheme ? 'rgba(20,20,22,0.68)' : 'rgba(255,255,255,0.78)'),
          borderColor: isActive && !glassAvailable ? colors.glassBorder : (isDarkTheme ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.08)'),
        },
      ]}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      {showLabels && (
        <Text style={[styles.tabText, { 
          color: textColor, 
          fontFamily: isActive ? 'Montserrat_600SemiBold' : 'Montserrat_500Medium',
          fontSize: getFontSize(),
          marginTop: 3,
          textShadowColor: isDarkTheme ? 'rgba(0,0,0,0.48)' : 'rgba(255,255,255,0.72)',
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
    paddingVertical: 6,
    marginHorizontal: 2,
    minHeight: Platform.OS === 'android' ? 56 : 48,
    zIndex: 2,
  },
  iconContrast: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 10,
    marginTop: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  }
});

export default TabButton;