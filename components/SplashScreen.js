import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS, APP_VERSION } from '../utils/constants';
import MatrixRain from './MatrixRain';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ accentColor, theme, holidayInfo }) => {
  const safeAccentColor = accentColor || 'green';
  const colors = ACCENT_COLORS[safeAccentColor] || ACCENT_COLORS.green;
  const safeColors = colors || { primary: '#10b981', light: '#d1fae5' };
  
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const isMatrix = theme === 'matrix';
  const backgroundColor = isMatrix ? (glass.backgroundSolid || '#0D0208') : glass.background;
  const iconColor = (theme === 'dark' || isMatrix) ? safeColors.light : safeColors.primary;
  const textColor = (theme === 'dark' || isMatrix) ? '#ffffff' : '#1c1c1e';
  const subtextColor = (theme === 'dark' || isMatrix) ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';

  // Цвета праздников
  const getHolidayColors = (type) => {
    const isDark = theme === 'dark';
    const holidayColorMap = {
      'new-year':         { text: isDark ? '#FFD700' : '#D32F2F', icons: ['#FFD700', '#FF5722', '#2196F3'] },
      'student-day':      { text: isDark ? '#64B5F6' : '#1565C0', icons: ['#1565C0', '#FFD700', '#1565C0'] },
      'valentines-day':   { text: isDark ? '#F48FB1' : '#C62828', icons: ['#E91E63', '#FF5252', '#E91E63'] },
      'defender-day':     { text: isDark ? '#81C784' : '#2E7D32', icons: ['#2E7D32', '#FF8F00', '#2E7D32'] },
      'womens-day':       { text: isDark ? '#F48FB1' : '#AD1457', icons: ['#E91E63', '#FF80AB', '#E91E63'] },
      'cosmonautics-day': { text: isDark ? '#90CAF9' : '#1A237E', icons: ['#1A237E', '#FFD700', '#1A237E'] },
      'may-day':          { text: isDark ? '#A5D6A7' : '#2E7D32', icons: ['#FFD700', '#2E7D32', '#FFD700'] },
      'victory-day':      { text: isDark ? '#FFCC80' : '#BF360C', icons: ['#FF6F00', '#212121', '#FF6F00'] },
      'children-day':     { text: isDark ? '#FFF176' : '#F57F17', icons: ['#FF5722', '#4CAF50', '#2196F3'] },
      'knowledge-day':    { text: isDark ? '#90CAF9' : '#1565C0', icons: ['#FF6F00', '#1565C0', '#FF6F00'] },
      'september-3':      { text: isDark ? '#FFCC80' : '#BF360C', icons: ['#FF8F00', '#D84315', '#FF8F00'] },
      'programmer-day':   { text: isDark ? '#A5D6A7' : '#1B5E20', icons: ['#4CAF50', '#00E676', '#4CAF50'] },
      'sysadmin-day':     { text: isDark ? '#90CAF9' : '#0D47A1', icons: ['#0D47A1', '#2196F3', '#0D47A1'] },
      'teacher-day':      { text: isDark ? '#FFF176' : '#E65100', icons: ['#FF6F00', '#FFD700', '#FF6F00'] },
      'unity-day':        { text: isDark ? '#EF9A9A' : '#B71C1C', icons: ['#FFFFFF', '#1565C0', '#D32F2F'] },
      'intl-student-day': { text: isDark ? '#90CAF9' : '#1565C0', icons: ['#1565C0', '#FFD700', '#1565C0'] },
    };
    return holidayColorMap[type] || { text: isDark ? '#FFD700' : '#D32F2F', icons: ['#FFD700', '#FF5722', '#2196F3'] };
  };

  // Декоративные иконки для праздников
  const getHolidayDecorIcons = (type) => {
    const decorMap = {
      'new-year':         [{ name: 'sparkles', size: 18 }, { name: 'sparkles', size: 14 }, { name: 'sparkles', size: 16 }],
      'student-day':      [{ name: 'school', size: 16 }, { name: 'star', size: 14 }, { name: 'school', size: 16 }],
      'valentines-day':   [{ name: 'heart', size: 16 }, { name: 'heart', size: 12 }, { name: 'heart', size: 16 }],
      'defender-day':     [{ name: 'shield', size: 16 }, { name: 'star', size: 14 }, { name: 'shield', size: 16 }],
      'womens-day':       [{ name: 'flower', size: 16 }, { name: 'heart', size: 14 }, { name: 'flower', size: 16 }],
      'cosmonautics-day': [{ name: 'rocket', size: 16 }, { name: 'star', size: 14 }, { name: 'planet', size: 16 }],
      'may-day':          [{ name: 'sunny', size: 16 }, { name: 'flower', size: 14 }, { name: 'sunny', size: 16 }],
      'victory-day':      [{ name: 'star', size: 16 }, { name: 'ribbon', size: 14 }, { name: 'star', size: 16 }],
      'children-day':     [{ name: 'balloon', size: 16 }, { name: 'happy', size: 14 }, { name: 'balloon', size: 16 }],
      'knowledge-day':    [{ name: 'book', size: 16 }, { name: 'pencil', size: 14 }, { name: 'book', size: 16 }],
      'september-3':      [{ name: 'musical-notes', size: 16 }, { name: 'calendar', size: 14, rotate: true }, { name: 'musical-notes', size: 16 }],
      'programmer-day':   [{ name: 'code-slash', size: 16 }, { name: 'terminal', size: 14 }, { name: 'code-slash', size: 16 }],
      'sysadmin-day':     [{ name: 'server', size: 16 }, { name: 'construct', size: 14 }, { name: 'server', size: 16 }],
      'teacher-day':      [{ name: 'easel', size: 16 }, { name: 'book', size: 14 }, { name: 'easel', size: 16 }],
      'unity-day':        [{ name: 'people', size: 16 }, { name: 'flag', size: 14 }, { name: 'people', size: 16 }],
      'intl-student-day': [{ name: 'earth', size: 16 }, { name: 'school', size: 14 }, { name: 'earth', size: 16 }],
    };
    return decorMap[type] || [{ name: 'sparkles', size: 18 }, { name: 'sparkles', size: 14 }, { name: 'sparkles', size: 16 }];
  };

  // Анимации для плавающих блобов
  const blobAnims = useRef(
    Array.from({ length: 6 }, () => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  // Анимации логотипа
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  // Анимации текста
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const versionOpacity = useRef(new Animated.Value(0)).current;

  // Анимация праздничного текста
  const holidayAnim = useRef(new Animated.Value(0)).current;

  // Параметры блобов
  const blobs = [
    { x: width * 0.12, y: height * 0.12, size: 130, opacity: 0.07 },
    { x: width * 0.75, y: height * 0.08, size: 170, opacity: 0.05 },
    { x: width * 0.88, y: height * 0.42, size: 110, opacity: 0.07 },
    { x: width * 0.05, y: height * 0.58, size: 150, opacity: 0.04 },
    { x: width * 0.65, y: height * 0.78, size: 190, opacity: 0.06 },
    { x: width * 0.18, y: height * 0.88, size: 120, opacity: 0.05 },
  ];

  useEffect(() => {
    // Запускаем плавающие анимации блобов
    blobAnims.forEach((blob, index) => {
      const duration = 3000 + Math.random() * 4000;
      const amplitude = 15 + Math.random() * 25;

      // Появление блоба
      Animated.timing(blob.scale, {
        toValue: 1,
        duration: 800 + index * 150,
        useNativeDriver: true,
      }).start();

      // Плавное дрейфование по Y
      Animated.loop(
        Animated.sequence([
          Animated.timing(blob.translateY, {
            toValue: -amplitude,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(blob.translateY, {
            toValue: amplitude,
            duration,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Плавное дрейфование по X
      Animated.loop(
        Animated.sequence([
          Animated.timing(blob.translateX, {
            toValue: amplitude * 0.6,
            duration: duration * 1.2,
            useNativeDriver: true,
          }),
          Animated.timing(blob.translateX, {
            toValue: -amplitude * 0.6,
            duration: duration * 1.2,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // Пульсирующее свечение
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.4,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Появление логотипа
    const logoAnimation = Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 18,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    // Появление заголовка
    const titleAnimation = Animated.parallel([
      Animated.spring(titleTranslateY, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    // Появление подзаголовка
    const subtitleAnimation = Animated.parallel([
      Animated.spring(subtitleTranslateY, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    // Loader
    const loaderAnimation = Animated.timing(loaderOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    });

    // Версия
    const versionAnimation = Animated.timing(versionOpacity, {
      toValue: 0.4,
      duration: 800,
      useNativeDriver: true,
    });

    // Праздничный текст
    const holidayAnimation = holidayInfo
      ? Animated.sequence([
          Animated.delay(600),
          Animated.spring(holidayAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ])
      : Animated.delay(0);

    // Последовательный запуск анимаций
    Animated.stagger(180, [
      logoAnimation,
      titleAnimation,
      subtitleAnimation,
      loaderAnimation,
      versionAnimation,
      holidayAnimation,
    ]).start();
  }, [holidayInfo]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={backgroundColor}
      />

      {/* Плавающие блобы / Matrix Rain */}
      {isMatrix ? (
        <MatrixRain intensity={0.85} />
      ) : (
        blobs.map((blob, index) => (
          <Animated.View
            key={`blob-${index}`}
            style={{
              position: 'absolute',
              left: blob.x - blob.size / 2,
              top: blob.y - blob.size / 2,
              width: blob.size,
              height: blob.size,
              borderRadius: blob.size / 2,
              backgroundColor: safeColors.primary,
              opacity: blob.opacity,
              transform: [
                { translateX: blobAnims[index].translateX },
                { translateY: blobAnims[index].translateY },
                { scale: blobAnims[index].scale },
              ],
            }}
          />
        ))
      )}

      {/* Центральный контент */}
      <View style={styles.contentContainer}>
        {/* Праздничный текст (над логотипом) */}
        {holidayInfo && (
          <Animated.View
            style={{
              marginBottom: 24,
              opacity: holidayAnim,
              transform: [
                {
                  scale: holidayAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
                {
                  translateY: holidayAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: 'bold',
                fontFamily: 'Montserrat_700Bold',
                color: getHolidayColors(holidayInfo.type).text,
                textAlign: 'center',
                textShadowColor: 'rgba(0, 0, 0, 0.15)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              {holidayInfo.text}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
              {getHolidayDecorIcons(holidayInfo.type).map((icon, idx) => (
                <Icon
                  key={idx}
                  name={icon.name}
                  size={icon.size}
                  color={getHolidayColors(holidayInfo.type).icons[idx]}
                  style={{
                    marginHorizontal: 4,
                    ...(icon.rotate ? { transform: [{ rotate: '180deg' }] } : {}),
                  }}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {/* Логотип с кольцом свечения */}
        <Animated.View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          }}
        >
          {/* Внешнее кольцо свечения */}
          <Animated.View
            style={{
              width: 160,
              height: 160,
              borderRadius: 42,
              backgroundColor: safeColors.primary + '0A',
              borderWidth: 1,
              borderColor: safeColors.primary + '15',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: glowOpacity,
            }}
          >
            {/* Внутренняя стеклянная карточка */}
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 32,
                backgroundColor: theme === 'dark'
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(255,255,255,0.7)',
                borderWidth: 1,
                borderColor: theme === 'dark'
                  ? 'rgba(255,255,255,0.12)'
                  : safeColors.primary + '20',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: safeColors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 8,
              }}
            >
              <Icon name="school" size={56} color={iconColor} />
            </View>
          </Animated.View>
        </Animated.View>

        {/* Заголовок */}
        <Animated.View
          style={{
            marginTop: 28,
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          }}
        >
          <Text
            style={[
              styles.title,
              {
                color: textColor,
                fontFamily: 'Montserrat_700Bold',
              },
            ]}
          >
            Мой ИТИ ХГУ
          </Text>
        </Animated.View>

        {/* Подзаголовок */}
        <Animated.View
          style={{
            marginTop: 6,
            opacity: subtitleOpacity,
            transform: [{ translateY: subtitleTranslateY }],
          }}
        >
          <Text
            style={[
              styles.subtitle,
              {
                color: subtextColor,
                fontFamily: 'Montserrat_500Medium',
              },
            ]}
          >
            Твой университет в кармане
          </Text>
        </Animated.View>

        {/* Индикатор загрузки */}
        <Animated.View style={{ marginTop: 40, opacity: loaderOpacity }}>
          <ActivityIndicator size="small" color={safeColors.primary} />
        </Animated.View>
      </View>

      {/* Версия внизу */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 50,
          alignSelf: 'center',
          opacity: versionOpacity,
        }}
      >
        <Text
          style={{
            color: subtextColor,
            fontSize: 12,
            fontFamily: 'Montserrat_400Regular',
            letterSpacing: 0.5,
          }}
        >
          v{APP_VERSION}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});

export default SplashScreen;