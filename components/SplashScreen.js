import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS, APP_VERSION } from '../utils/constants';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ accentColor, theme, isNewYearMode, newYearText }) => {
  const safeAccentColor = accentColor || 'green';
  const colors = ACCENT_COLORS[safeAccentColor] || ACCENT_COLORS.green;
  const safeColors = colors || { primary: '#10b981', light: '#d1fae5' };
  
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const backgroundColor = glass.background;
  const iconColor = theme === 'dark' ? safeColors.light : safeColors.primary;
  const textColor = theme === 'dark' ? '#ffffff' : '#1c1c1e';
  const subtextColor = theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';

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

  // Новогодний текст
  const newYearAnim = useRef(new Animated.Value(0)).current;

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

    // Новогодний текст
    const newYearAnimation = isNewYearMode && newYearText
      ? Animated.sequence([
          Animated.delay(600),
          Animated.spring(newYearAnim, {
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
      newYearAnimation,
    ]).start();
  }, [isNewYearMode]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={backgroundColor}
      />

      {/* Плавающие блобы */}
      {blobs.map((blob, index) => (
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
      ))}

      {/* Центральный контент */}
      <View style={styles.contentContainer}>
        {/* Новогодний текст (над логотипом) */}
        {isNewYearMode && newYearText && (
          <Animated.View
            style={{
              marginBottom: 24,
              opacity: newYearAnim,
              transform: [
                {
                  scale: newYearAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
                {
                  translateY: newYearAnim.interpolate({
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
                color: theme === 'dark' ? '#FFD700' : '#D32F2F',
                textAlign: 'center',
                textShadowColor: 'rgba(0, 0, 0, 0.15)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              {newYearText}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
              <Icon name="sparkles" size={18} color="#FFD700" style={{ marginHorizontal: 4 }} />
              <Icon name="sparkles" size={14} color="#FF5722" style={{ marginHorizontal: 4 }} />
              <Icon name="sparkles" size={16} color="#2196F3" style={{ marginHorizontal: 4 }} />
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