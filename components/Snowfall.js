import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const Snowfall = ({ theme, intensity = 1 }) => {
  const [snowflakes, setSnowflakes] = useState([]);

  // Количество снежинок в зависимости от интенсивности
  const snowflakeCount = Math.floor(80 * intensity);
  
  // Инициализация снежинок
  useEffect(() => {
    const newSnowflakes = [];
    
    for (let i = 0; i < snowflakeCount; i++) {
      const size = Math.random() * 8 + 3; // 3-11px
      const x = Math.random() * width;
      const y = -Math.random() * 100;
      const duration = Math.random() * 10000 + 10000; // 10-20 секунд
      const delay = Math.random() * 5000;
      const sway = Math.random() * 100 - 50;
      const opacity = Math.random() * 0.7 + 0.3;
      
      const flake = {
        id: i,
        size,
        x,
        y,
        duration,
        delay,
        sway,
        opacity,
        xAnim: new Animated.Value(x),
        yAnim: new Animated.Value(y),
        swayAnim: new Animated.Value(0),
        rotateAnim: new Animated.Value(0)
      };
      
      newSnowflakes.push(flake);
      
      // Запуск анимации с задержкой
      setTimeout(() => {
        // Анимация вращения
        Animated.loop(
          Animated.timing(flake.rotateAnim, {
            toValue: 1,
            duration: flake.duration * 0.5,
            useNativeDriver: true,
          })
        ).start();

        // Анимация качания
        const swayAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(flake.swayAnim, {
              toValue: 1,
              duration: 3000 + Math.random() * 4000,
              useNativeDriver: true,
            }),
            Animated.timing(flake.swayAnim, {
              toValue: 0,
              duration: 3000 + Math.random() * 4000,
              useNativeDriver: true,
            })
          ])
        );
        swayAnimation.start();

        // Функция для падения
        const startFall = () => {
          Animated.sequence([
            Animated.delay(flake.delay),
            Animated.timing(flake.yAnim, {
              toValue: height + 100,
              duration: flake.duration,
              useNativeDriver: true,
            })
          ]).start(() => {
            // Сброс наверх
            flake.yAnim.setValue(-100);
            flake.xAnim.setValue(Math.random() * width);
            startFall();
          });
        };
        
        startFall();
      }, flake.delay);
    }
    
    setSnowflakes(newSnowflakes);
    
    // Очистка при размонтировании
    return () => {
      newSnowflakes.forEach(flake => {
        flake.yAnim.stopAnimation();
        flake.xAnim.stopAnimation();
        flake.swayAnim.stopAnimation();
        flake.rotateAnim.stopAnimation();
      });
    };
  }, [snowflakeCount]);

  if (snowflakes.length === 0) return null;

  return (
    <View style={[styles.container]} pointerEvents="none">
      {snowflakes.map((flake) => {
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
                backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                opacity: flake.opacity,
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
    zIndex: -1,
    overflow: 'hidden',
  },
  snowflake: {
    position: 'absolute',
  },
});

export default Snowfall;