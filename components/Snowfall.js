import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const Snowfall = ({ theme, intensity = 1 }) => {
  const snowflakes = useRef([]);
  const animations = useRef([]);

  // Количество снежинок в зависимости от интенсивности
  const snowflakeCount = Math.floor(20 * intensity);
  
  // Инициализация снежинок
  useEffect(() => {
    snowflakes.current = [];
    animations.current = [];
    
    for (let i = 0; i < snowflakeCount; i++) {
      const size = Math.random() * 6 + 2; // 2-8px
      const x = Math.random() * width;
      const y = -Math.random() * 100; // Начинают выше экрана
      const duration = Math.random() * 8000 + 7000; // 7-15 секунд
      const delay = Math.random() * 3000; // Задержка до 3 секунд
      const opacity = Math.random() * 0.7 + 0.3; // 0.3-1
      const sway = Math.random() * 100 - 50; // Случайное отклонение по X
      
      snowflakes.current.push({
        id: i,
        size,
        x,
        y,
        duration,
        delay,
        opacity,
        sway,
        xAnim: new Animated.Value(x),
        yAnim: new Animated.Value(y),
        swayAnim: new Animated.Value(0)
      });
    }
  }, [snowflakeCount]);

  // Запуск анимаций
  useEffect(() => {
    snowflakes.current.forEach((flake) => {
      // Анимация падения вниз
      const fallAnimation = Animated.sequence([
        Animated.delay(flake.delay),
        Animated.timing(flake.yAnim, {
          toValue: height + 50,
          duration: flake.duration,
          useNativeDriver: true,
        })
      ]);

      // Анимация качания из стороны в сторону
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

      // Запуск анимаций
      animations.current.push(fallAnimation.start());
      animations.current.push(swayAnimation.start());

      // Циклическое повторение падения
      fallAnimation.start(() => {
        flake.yAnim.setValue(-50);
        fallAnimation.start();
      });
    });

    // Очистка анимаций при размонтировании
    return () => {
      animations.current.forEach(anim => {
        if (anim && anim.stop) anim.stop();
      });
    };
  }, [snowflakeCount]);

  return (
    <View style={[styles.container, { pointerEvents: 'none' }]}>
      {snowflakes.current.map((flake) => {
        const translateX = flake.swayAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, flake.sway]
        });

        return (
          <Animated.View
            key={flake.id}
            style={[
              styles.snowflake,
              {
                width: flake.size,
                height: flake.size,
                borderRadius: flake.size / 2,
                backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.8)',
                opacity: flake.opacity,
                transform: [
                  { translateX: flake.xAnim },
                  { translateY: flake.yAnim },
                  { translateX: translateX }
                ]
              }
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    overflow: 'hidden',
  },
  snowflake: {
    position: 'absolute',
  },
});

export default Snowfall;