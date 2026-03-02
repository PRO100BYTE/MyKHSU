import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';

const TabButton = ({ icon, label, isActive, onPress, theme, accentColor, showLabels = true, fontSize = 'medium', onLayout }) => {
  const colors = ACCENT_COLORS[accentColor];
  
  const iconColor = isActive ? 
    colors.primary : 
    '#8e8e93';
  
  const textColor = isActive ? 
    colors.primary : 
    '#8e8e93';

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
      <Icon name={icon} size={22} color={iconColor} />
      {showLabels && (
        <Text style={[styles.tabText, { 
          color: textColor, 
          fontFamily: isActive ? 'Montserrat_600SemiBold' : 'Montserrat_500Medium',
          fontSize: getFontSize(),
          marginTop: 3,
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
  tabText: {
    fontSize: 10,
    marginTop: 3,
  }
});

export default TabButton;