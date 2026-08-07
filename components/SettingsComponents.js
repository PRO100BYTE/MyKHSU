import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';

/**
 * Переиспользуемые компоненты для Settings и подэкранов
 * Обеспечивают единый стиль во всём приложении
 */

export const SectionHeader = ({ title, style, textStyle, placeholderColor }) => (
  <Text style={[
    {
      fontSize: 13,
      fontFamily: 'Montserrat_600SemiBold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 14,
      marginBottom: 6,
      paddingHorizontal: 4,
      color: placeholderColor,
    },
    textStyle,
  ]}>
    {title}
  </Text>
);

export const SettingsGroup = ({ children, style, glass }) => (
  <View style={[
    {
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: glass?.border || '#e5e7eb',
      shadowColor: glass?.shadowColor || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    style,
  ]}>
    {children}
  </View>
);

export const SettingsRow = ({
  icon,
  title,
  subtitle,
  onPress,
  isFirst,
  isLast,
  rightElement,
  destructive,
  colors,
  glass,
  textColor,
  placeholderColor,
  glassIconBadge,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    disabled={!onPress}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      backgroundColor: glass?.surfaceSecondary || '#f3f4f6',
      borderTopLeftRadius: isFirst ? 14 : 0,
      borderTopRightRadius: isFirst ? 14 : 0,
      borderBottomLeftRadius: isLast ? 14 : 0,
      borderBottomRightRadius: isLast ? 14 : 0,
      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
      borderBottomColor: glass?.border || '#e5e7eb',
    }}
  >
    {icon && (
      <View style={glassIconBadge || {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: colors?.primary + '15' || '#10b98115',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 2,
      }}>
        <Icon
          name={icon}
          size={20}
          color={destructive ? '#ef4444' : colors?.primary || '#10b981'}
        />
      </View>
    )}
    <View style={{ flex: 1, marginLeft: icon ? 2 : 0 }}>
      <Text style={{
        color: destructive ? '#ef4444' : textColor,
        fontSize: 15,
        fontFamily: 'Montserrat_500Medium'
      }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{
          color: placeholderColor,
          fontSize: 12,
          marginTop: 2,
          fontFamily: 'Montserrat_400Regular',
          lineHeight: 17
        }}>
          {subtitle}
        </Text>
      )}
    </View>
    {rightElement || (onPress && (
      <Icon name="chevron-forward" size={18} color={placeholderColor} />
    ))}
  </TouchableOpacity>
);
