import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Animated, Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

const COLUMN_WIDTH = 18;
const NUM_COLUMNS = Math.floor(width / COLUMN_WIDTH);
const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';

const MatrixColumn = ({ index, speed, initialDelay }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  
  const chars = useMemo(() => {
    const length = Math.floor(Math.random() * 12) + 8;
    return Array.from({ length }, () => CHARS[Math.floor(Math.random() * CHARS.length)]);
  }, []);

  useEffect(() => {
    const startAnimation = () => {
      animValue.setValue(0);
      Animated.timing(animValue, {
        toValue: 1,
        duration: speed,
        useNativeDriver: true,
      }).start(() => startAnimation());
    };

    const timer = setTimeout(startAnimation, initialDelay);
    return () => clearTimeout(timer);
  }, []);

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-chars.length * 20, height + 50],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 0.8, 0.6, 0],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: index * COLUMN_WIDTH,
        transform: [{ translateY }],
        opacity,
      }}
    >
      {chars.map((char, i) => (
        <Text
          key={i}
          style={[
            styles.char,
            {
              color: i === 0 ? '#FFFFFF' : i < 3 ? '#00FF41' : '#00AA2A',
              opacity: i === 0 ? 1 : Math.max(0.15, 1 - i * 0.08),
              textShadowColor: i === 0 ? '#00FF41' : 'transparent',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: i === 0 ? 8 : 0,
            },
          ]}
        >
          {char}
        </Text>
      ))}
    </Animated.View>
  );
};

const MatrixRain = ({ intensity = 0.85 }) => {
  const columns = useMemo(() => {
    const count = Math.floor(NUM_COLUMNS * intensity);
    const indices = [];
    const used = new Set();
    
    while (indices.length < count) {
      const idx = Math.floor(Math.random() * NUM_COLUMNS);
      if (!used.has(idx)) {
        used.add(idx);
        indices.push({
          index: idx,
          speed: Math.random() * 3000 + 2000,
          initialDelay: Math.random() * 3000,
        });
      }
    }
    return indices;
  }, [intensity]);

  return (
    <View style={styles.container} pointerEvents="none">
      {columns.map((col, i) => (
        <MatrixColumn
          key={`${col.index}-${i}`}
          index={col.index}
          speed={col.speed}
          initialDelay={col.initialDelay}
        />
      ))}
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
    zIndex: 0,
    overflow: 'hidden',
  },
  char: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 20,
    textAlign: 'center',
    width: COLUMN_WIDTH,
  },
});

export default MatrixRain;
