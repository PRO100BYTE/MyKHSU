import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

/**
 * Переиспользуемые компоненты для Settings и подэкранов
 * Обеспечивают единый стиль во всём приложении
 */

/**
 * GlassCard — нативный Liquid Glass на iOS, обычный View на Android.
 *
 * На iOS:
 *   - Использует BlurView с тинтом 'systemMaterial' — автоматически адаптируется
 *     к светлой/тёмной теме, не требует кастомных цветов. Система сама управляет
 *     степенью прозрачности и эффектом размытия.
 *   - Для специальных тем (matrix, legend) использует 'dark' — единственный
 *     корректный вариант для тёмных нестандартных фонов.
 *   - Полностью убирает backgroundColor из стилей — стекло управляется системой.
 * На Android:
 *   - Обычный View с оригинальными стилями, без изменений.
 */
export const GlassCard = ({ glass, style, children }) => {
  if (Platform.OS === 'ios') {
    const flatStyle = StyleSheet.flatten(style) || {};
    // Убираем backgroundColor — система управляет внешним видом через tint
    const { backgroundColor, ...iosStyle } = flatStyle;

    // Для специальных тёмных тем — 'dark', для стандартных — 'systemMaterial'
    // 'systemMaterial' адаптируется автоматически (light/dark), не нужно конфигурировать
    const tint = glass?.isSpecialTheme ? 'dark' : 'systemMaterial';

    return (
      <BlurView tint={tint} style={iosStyle}>
        {children}
      </BlurView>
    );
  }
  return <View style={style}>{children}</View>;
};

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
  <GlassCard
    glass={glass}
    style={[
      {
        backgroundColor: glass?.surfaceSecondary || '#f3f4f6',
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
    ]}
  >
    {children}
  </GlassCard>
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
      backgroundColor: Platform.OS === 'ios' ? 'transparent' : (glass?.surfaceSecondary || '#f3f4f6'),
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
