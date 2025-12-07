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
  
  // Анимации для фоновых элементов
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
  
  // Анимации для новогодних элементов
  const treeScale = useRef(new Animated.Value(0)).current;
  const treeRotate = useRef(new Animated.Value(0)).current;
  const snowflakeAnimations = useRef([]).current;
  const newYearTextAnim = useRef(new Animated.Value(0)).current;

  // Позиции для новогодней елки
  const treePositions = [
    { x: width * 0.2, y: height * 0.3, size: 40 },
    { x: width * 0.8, y: height * 0.4, size: 30 },
    { x: width * 0.15, y: height * 0.7, size: 35 },
    { x: width * 0.85, y: height * 0.6, size: 25 }
  ];

  // Снежинки для новогоднего режима
  const createSnowflakes = () => {
    const flakes = [];
    const flakeCount = isNewYearMode ? 50 : 8; // Больше снежинок в новогоднем режиме
    
    for (let i = 0; i < flakeCount; i++) {
      const size = isNewYearMode ? Math.random() * 8 + 4 : 40; // Снежинки меньше в новогоднем режиме
      const x = Math.random() * width;
      const y = -Math.random() * 100;
      const duration = Math.random() * 5000 + 5000;
      const delay = Math.random() * 2000;
      const sway = Math.random() * 100 - 50;
      
      flakes.push({
        id: i,
        x,
        y,
        size,
        duration,
        delay,
        sway,
        xAnim: new Animated.Value(x),
        yAnim: new Animated.Value(y),
        swayAnim: new Animated.Value(0),
        rotateAnim: new Animated.Value(0),
        opacityAnim: new Animated.Value(0.8)
      });
    }
    return flakes;
  };

  useEffect(() => {
    // Инициализация снежинок
    const initialSnowflakes = createSnowflakes();
    snowflakeAnimations.length = 0;
    initialSnowflakes.forEach(flake => snowflakeAnimations.push(flake));

    // Анимация фоновых элементов
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

    // Анимация новогодней елки
    const treeAnimation = isNewYearMode ? Animated.parallel([
      Animated.spring(treeScale, {
        toValue: 1,
        tension: 10,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(treeRotate, {
            toValue: 0.1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(treeRotate, {
            toValue: -0.1,
            duration: 2000,
            useNativeDriver: true,
          })
        ])
      )
    ]) : Animated.delay(0);

    // Анимация снежинок
    const snowflakeAnimationsArray = snowflakeAnimations.map((flake) => {
      const rotateInterpolate = flake.rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
      });

      // Запуск вращения
      Animated.loop(
        Animated.timing(flake.rotateAnim, {
          toValue: 1,
          duration: flake.duration * 0.5,
          useNativeDriver: true,
        })
      ).start();

      // Анимация падения
      const fallAnimation = Animated.sequence([
        Animated.delay(flake.delay),
        Animated.timing(flake.yAnim, {
          toValue: height + 50,
          duration: flake.duration,
          useNativeDriver: true,
        })
      ]);

      // Анимация качания
      const swayAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(flake.swayAnim, {
            toValue: 1,
            duration: 2000 + Math.random() * 3000,
            useNativeDriver: true,
          }),
          Animated.timing(flake.swayAnim, {
            toValue: 0,
            duration: 2000 + Math.random() * 3000,
            useNativeDriver: true,
          })
        ])
      );

      swayAnimation.start();
      
      // Циклическое падение
      const startFall = () => {
        fallAnimation.start(() => {
          flake.yAnim.setValue(-50);
          flake.xAnim.setValue(Math.random() * width);
          startFall();
        });
      };
      
      startFall();

      return fallAnimation;
    });

    // Анимация новогоднего текста
    const newYearTextAnimation = isNewYearMode && newYearText ? Animated.sequence([
      Animated.delay(1500),
      Animated.spring(newYearTextAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
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
      treeAnimation,
      Animated.delay(300),
      ...snowflakeAnimationsArray,
      newYearTextAnimation,
      logoAnimation
    ]).start();
  }, [isNewYearMode]);

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
      
      {/* Новогодние элементы */}
      {isNewYearMode && (
        <>
          {/* Новогодние елки */}
          {treePositions.map((position, index) => {
            const rotate = treeRotate.interpolate({
              inputRange: [-0.1, 0, 0.1],
              outputRange: ['-5deg', '0deg', '5deg']
            });
            
            return (
              <Animated.View
                key={`tree-${index}`}
                style={[
                  styles.treeContainer,
                  {
                    left: position.x,
                    top: position.y,
                    transform: [
                      { scale: treeScale },
                      { rotate }
                    ]
                  }
                ]}
              >
                <Icon name="tree" size={position.size} color="#2E7D32" />
                <View style={[styles.treeStar, { top: -5 }]}>
                  <Icon name="star" size={position.size * 0.3} color="#FFD700" />
                </View>
              </Animated.View>
            );
          })}

          {/* Снежинки */}
          {snowflakeAnimations.map((flake) => {
            const swayTranslate = flake.swayAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, flake.sway]
            });

            const rotate = flake.rotateAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg']
            });

            return (
              <Animated.View
                key={flake.id}
                style={[
                  styles.snowflake,
                  {
                    left: flake.x,
                    top: flake.y,
                    width: flake.size,
                    height: flake.size,
                    borderRadius: flake.size / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    opacity: flake.opacityAnim,
                    transform: [
                      { translateX: flake.xAnim },
                      { translateY: flake.yAnim },
                      { translateX: swayTranslate },
                      { rotate }
                    ]
                  }
                ]}
              />
            );
          })}

          {/* Новогодний текст */}
          {newYearText && (
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
        </>
      )}

      {/* Фоновые иконки (только если не новогодний режим) */}
      {!isNewYearMode && iconPositions.map((position, index) => {
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
  treeContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  treeStar: {
    position: 'absolute',
  },
  snowflake: {
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
    transform: [{ rotate: '0deg' }],
  },
  firework2: {
    marginHorizontal: 5,
    transform: [{ rotate: '45deg' }],
  },
  firework3: {
    marginHorizontal: 5,
    transform: [{ rotate: '90deg' }],
  },
});

export default SplashScreen;