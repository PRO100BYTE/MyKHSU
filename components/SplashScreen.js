import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated, Dimensions } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ accentColor, theme, isNewYearMode, newYearText }) => {
  // Защита от undefined - если accentColor не передан, используем green по умолчанию
  const safeAccentColor = accentColor || 'green';
  const colors = ACCENT_COLORS[safeAccentColor] || ACCENT_COLORS.green;
  
  // Защита на случай, если colors все еще undefined
  const safeColors = colors || { primary: '#10b981', light: '#d1fae5' };
  
  const backgroundColor = theme === 'dark' ? '#111827' : '#f3f4f6';
  const iconColor = theme === 'dark' ? safeColors.light : safeColors.primary;
  const textColor = theme === 'dark' ? '#ffffff' : safeColors.primary;
  const bgIconColor = theme === 'dark' ? safeColors.light + '40' : safeColors.primary + '40';
  const newYearTextColor = theme === 'dark' ? '#FFD700' : '#D32F2F';
  
  // Анимации для основного логотипа
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  
  // Анимации для новогодних элементов
  const newYearTextAnim = useRef(new Animated.Value(0)).current;
  const holidayIconAnim = useRef(new Animated.Value(0)).current;

  // Анимированные иконки для новогоднего режима
  const holidayIcons = [
    { icon: 'snow-outline', x: width * 0.2, y: height * 0.2, size: 35, delay: 0 },
    { icon: 'star-outline', x: width * 0.8, y: height * 0.3, size: 40, delay: 300 },
    { icon: 'gift-outline', x: width * 0.15, y: height * 0.6, size: 38, delay: 600 },
    { icon: 'sparkles-outline', x: width * 0.85, y: height * 0.5, size: 32, delay: 900 },
    { icon: 'happy-outline', x: width * 0.3, y: height * 0.75, size: 36, delay: 1200 },
    { icon: 'wine-outline', x: width * 0.7, y: height * 0.7, size: 34, delay: 1500 },
  ];

  // Обычные фоновые иконки
  const regularIcons = [
    { icon: 'calendar-outline', x: width * 0.15, y: height * 0.1, size: 40, delay: 0 },
    { icon: 'newspaper-outline', x: width * 0.85, y: height * 0.25, size: 35, delay: 200 },
    { icon: 'map-outline', x: width * 0.1, y: height * 0.4, size: 38, delay: 400 },
    { icon: 'person-outline', x: width * 0.9, y: height * 0.55, size: 36, delay: 600 },
    { icon: 'settings-outline', x: width * 0.2, y: height * 0.7, size: 34, delay: 800 },
    { icon: 'information-circle-outline', x: width * 0.8, y: height * 0.8, size: 32, delay: 1000 },
    { icon: 'book-outline', x: width * 0.9, y: height * 0.15, size: 37, delay: 1200 },
    { icon: 'school-outline', x: width * 0.05, y: height * 0.85, size: 42, delay: 1400 },
  ];

  const iconsToShow = isNewYearMode ? holidayIcons : regularIcons;
  const iconAnimations = useRef(iconsToShow.map(() => ({
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0),
    rotate: new Animated.Value(0)
  }))).current;

  useEffect(() => {
    // Анимация фоновых иконок
    const iconAnimationsArray = iconsToShow.map((icon, index) => {
      const anim = iconAnimations[index];
      return Animated.sequence([
        Animated.delay(icon.delay),
        Animated.parallel([
          Animated.spring(anim.scale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0.6,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: 1,
            duration: 2000 + Math.random() * 2000,
            useNativeDriver: true,
          })
        ])
      ]);
    });

    // Анимация новогоднего текста (если есть)
    const newYearTextAnimation = isNewYearMode && newYearText ? 
      Animated.sequence([
        Animated.delay(2000),
        Animated.parallel([
          Animated.spring(newYearTextAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(holidayIconAnim, {
            toValue: 1,
            tension: 40,
            friction: 6,
            useNativeDriver: true,
          })
        ])
      ]) : Animated.delay(0);

    // Анимация основного логотипа
    const logoAnimation = Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 10,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]);

    // Запускаем все анимации
    Animated.stagger(100, [
      ...iconAnimationsArray,
      newYearTextAnimation,
      Animated.delay(500),
      logoAnimation
    ]).start();
  }, [isNewYearMode]);

  return (
    <View style={[styles.flexCenter, { backgroundColor }]}>
      <StatusBar 
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={backgroundColor}
      />
      
      {/* Фоновые иконки */}
      {iconsToShow.map((icon, index) => {
        const anim = iconAnimations[index];
        const rotate = anim.rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg']
        });
        
        return (
          <Animated.View
            key={`icon-${index}`}
            style={[
              styles.backgroundIcon,
              {
                left: icon.x,
                top: icon.y,
                transform: [
                  { scale: anim.scale },
                  { rotate }
                ],
                opacity: anim.opacity
              }
            ]}
          >
            <Icon 
              name={icon.icon} 
              size={icon.size} 
              color={bgIconColor} 
            />
          </Animated.View>
        );
      })}
      
      {/* Новогодний текст (только в новогоднем режиме и если есть текст) */}
      {isNewYearMode && newYearText && (
        <Animated.View
          style={[
            styles.newYearContainer,
            {
              opacity: newYearTextAnim,
              transform: [
                { 
                  scale: newYearTextAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1]
                  }) 
                },
                {
                  translateY: holidayIconAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0]
                  })
                }
              ]
            }
          ]}
        >
          <Text style={[styles.newYearText, { color: newYearTextColor }]}>
            {newYearText}
          </Text>
          <View style={styles.fireworks}>
            <Icon name="sparkles" size={24} color="#FFD700" style={styles.firework1} />
            <Icon name="sparkles" size={20} color="#FF5722" style={styles.firework2} />
            <Icon name="sparkles" size={18} color="#2196F3" style={styles.firework3} />
          </View>
        </Animated.View>
      )}
      
      {/* Основной логотип */}
      <Animated.View style={{
        transform: [{ scale: logoScale }],
        opacity: logoOpacity,
        alignItems: 'center'
      }}>
        <Icon name="school-outline" size={120} color={iconColor} />
        <Text style={[styles.title, { color: textColor, marginTop: 20, fontFamily: 'Montserrat_700Bold' }]}>
          Мой ИТИ ХГУ
        </Text>
        <Text style={[styles.subtitle, { color: textColor, opacity: 0.8, fontFamily: 'Montserrat_500Medium' }]}>
          Твой университет в кармане
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  flexCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  backgroundIcon: {
    position: 'absolute',
  },
  newYearContainer: {
    position: 'absolute',
    top: '15%',
    alignItems: 'center',
  },
  newYearText: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Montserrat_700Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  fireworks: {
    flexDirection: 'row',
    marginTop: 10,
  },
  firework1: {
    marginHorizontal: 5,
  },
  firework2: {
    marginHorizontal: 5,
  },
  firework3: {
    marginHorizontal: 5,
  },
});

export default SplashScreen;