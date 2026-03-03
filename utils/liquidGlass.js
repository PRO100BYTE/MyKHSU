import { Platform, StyleSheet } from 'react-native';
import { LIQUID_GLASS, ACCENT_COLORS } from './constants';

/**
 * Утилиты для Liquid Glass дизайна (iOS 26 style)
 * Предоставляет стили стеклянных поверхностей, карточек, навигации
 */

// Получить тему Liquid Glass по текущей теме
export const getGlassTheme = (theme) => {
  return LIQUID_GLASS[theme] || LIQUID_GLASS.light;
};

// Стили стеклянной карточки
export const getGlassCardStyle = (theme, accentColor) => {
  const glass = getGlassTheme(theme);
  const colors = ACCENT_COLORS[accentColor];

  return {
    backgroundColor: glass.surfaceSecondary,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    // iOS shadow
    shadowColor: glass.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    // Android elevation
    elevation: 2,
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  };
};

// Стили стеклянной карточки настроек (с chevron)
export const getGlassSettingsCardStyle = (theme) => {
  const glass = getGlassTheme(theme);

  return {
    backgroundColor: glass.surfaceSecondary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    shadowColor: glass.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  };
};

// Стили стеклянного header
export const getGlassHeaderStyle = (theme) => {
  const glass = getGlassTheme(theme);

  return {
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : glass.headerGlass,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: glass.border,
  };
};

// Стили стеклянного tab bar
export const getGlassTabBarStyle = (theme) => {
  const glass = getGlassTheme(theme);

  return {
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      // Glass-стиль с плавающим отступом на iOS
      ...(Platform.OS === 'ios' ? {
        marginHorizontal: 12,
        marginBottom: 28,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: glass.borderStrong,
        shadowColor: glass.shadowStrong,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 20,
      } : {
        backgroundColor: glass.tabBarGlass,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: glass.border,
        elevation: 8,
      }),
    },
    inner: {
      flexDirection: 'row',
      paddingHorizontal: 8,
      paddingVertical: 6,
      ...(Platform.OS === 'android' ? {
        paddingBottom: 8,
      } : {}),
    },
    // Настройки BlurView для iOS
    blurIntensity: glass.blurIntensity,
    blurTint: glass.blurTint,
  };
};

// Стиль иконки акцента в настройках
export const getGlassIconBadgeStyle = (theme, accentColor) => {
  const colors = ACCENT_COLORS[accentColor];
  
  return {
    width: 42,
    height: 42,
    backgroundColor: colors.glass,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  };
};

// Стили фона экрана
export const getGlassScreenBackground = (theme) => {
  const glass = getGlassTheme(theme);
  return {
    flex: 1,
    backgroundColor: glass.background,
  };
};

// Стили для модальных окон (glass backdrop)
export const getGlassModalStyle = (theme) => {
  const glass = getGlassTheme(theme);
  
  return {
    backdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    content: {
      backgroundColor: glass.backgroundElevated,
      borderRadius: 24,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: glass.border,
      shadowColor: glass.shadowStrong,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 32,
      elevation: 10,
      overflow: 'hidden',
    },
  };
};

// Предоставляет все цвета текста для glass-темы
export const getGlassTextColors = (theme) => {
  const glass = getGlassTheme(theme);
  return {
    primary: glass.text,
    secondary: glass.textSecondary,
    tertiary: glass.textTertiary,
  };
};

// Стили для разделителей (separator)
export const getGlassSeparatorStyle = (theme) => {
  const glass = getGlassTheme(theme);
  return {
    height: StyleSheet.hairlineWidth,
    backgroundColor: glass.border,
    marginVertical: 4,
  };
};

// Стили табов/сегментов (pill-shaped)
export const getGlassSegmentStyle = (theme, accentColor, isActive) => {
  const glass = getGlassTheme(theme);
  const colors = ACCENT_COLORS[accentColor];
  
  if (isActive) {
    return {
      backgroundColor: colors.glass,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.glassBorder,
    };
  }

  return {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  };
};

// Стили кнопки (pill-shaped, filled)
export const getGlassPillButtonStyle = (theme, accentColor) => {
  const colors = ACCENT_COLORS[accentColor];
  
  return {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  };
};

// Конфигурация blur для BlurView
export const getBlurConfig = (theme) => {
  const glass = getGlassTheme(theme);
  return {
    intensity: glass.blurIntensity,
    tint: glass.blurTint,
  };
};
