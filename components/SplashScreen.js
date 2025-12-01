import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';

const SplashScreen = ({ accentColor, theme }) => {
  // Защита от undefined - если accentColor не передан, используем green по умолчанию
  const safeAccentColor = accentColor || 'green';
  const colors = ACCENT_COLORS[safeAccentColor] || ACCENT_COLORS.green;
  
  // Защита на случай, если colors все еще undefined
  const safeColors = colors || { primary: '#10b981', light: '#d1fae5' };
  
  const backgroundColor = theme === 'dark' ? '#111827' : '#f3f4f6';
  const iconColor = theme === 'dark' ? safeColors.light : safeColors.primary;
  const textColor = theme === 'dark' ? '#ffffff' : safeColors.primary;
  const bgIconColor = theme === 'dark' ? safeColors.light + '40' : safeColors.primary + '40';
  
  // Анимации для фоновых иконок
  const iconAnimations = useRef(
    Array(8).fill().map(() => ({
      scale: new Animated.Value(0.3),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0)
    }))
  ).current;

  // Анимация для основного логотипа
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Анимация фоновых иконок
    const iconAnimationsArray = iconAnimations.map((anim, index) => {
      return Animated.parallel([
        Animated.timing(anim.scale, {
          toValue: 1,
          duration: 1000,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(anim.opacity, {
          toValue: 0.7,
          duration: 800,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(anim.rotate, {
          toValue: 1,
          duration: 2000,
          delay: index * 100,
          useNativeDriver: true,
        })
      ]);
    });

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
      Animated.delay(300),
      logoAnimation
    ]).start();
  }, []);

  // Позиции фоновых иконок (в процентах)
  const iconPositions = [
    { top: '10%', left: '15%', icon: 'calendar-outline' },
    { top: '25%', left: '75%', icon: 'newspaper-outline' },
    { top: '40%', left: '10%', icon: 'map-outline' },
    { top: '55%', left: '80%', icon: 'person-outline' },
    { top: '70%', left: '20%', icon: 'settings-outline' },
    { top: '85%', left: '70%', icon: 'information-circle-outline' },
    { top: '15%', left: '85%', icon: 'book-outline' },
    { top: '80%', left: '5%', icon: 'school-outline' }
  ];

  return (
    <View style={[styles.flexCenter, { backgroundColor }]}>
      <StatusBar 
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={backgroundColor}
      />
      
      {/* Фоновые иконки */}
      {iconPositions.map((position, index) => {
        const anim = iconAnimations[index];
        const rotate = anim.rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg']
        });
        
        return (
          <Animated.View
            key={index}
            style={[
              styles.backgroundIcon,
              {
                top: position.top,
                left: position.left,
                transform: [
                  { scale: anim.scale },
                  { rotate }
                ],
                opacity: anim.opacity
              }
            ]}
          >
            <Icon 
              name={position.icon} 
              size={40} 
              color={bgIconColor} 
            />
          </Animated.View>
        );
      })}
      
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
  loadingDots: {
    flexDirection: 'row',
    marginTop: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    opacity: 0.6,
  },
});

export default SplashScreen;