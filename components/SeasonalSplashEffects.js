import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { createSplashParticles } from '../utils/splashSeason';

export const useSplashReduceMotion = () => {
  const [reduceMotion, setReduceMotion] = useState(null);
  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      if (active) setReduceMotion(value);
    });
    const check = async () => {
      try {
        const value = await AccessibilityInfo.isReduceMotionEnabled();
        if (active && !changed) setReduceMotion(value);
      } catch {
        if (active && !changed) setReduceMotion(true);
      }
    };
    check();
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);
  return reduceMotion;
};

const Particle = ({ particle, width, height, summer }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const phase = useMemo(() => Animated.modulo(Animated.add(progress, particle.y), 1), [progress, particle.y]);
  useEffect(() => {
    const animation = Animated.loop(Animated.timing(progress, {
      toValue: 1,
      duration: particle.duration,
      easing: Easing.linear,
      useNativeDriver: true,
      isInteraction: false,
    }));
    animation.start();
    return () => {
      animation.stop();
      progress.stopAnimation();
    };
  }, [particle, progress]);

  return (
    <Animated.View style={{
      position: 'absolute',
      left: particle.x * width,
      top: -28,
      opacity: phase.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.34, 0.28, 0] }),
      transform: [
        { translateY: phase.interpolate({ inputRange: [0, 1], outputRange: summer ? [height + 56, 0] : [0, height + 56] }) },
        { translateX: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, particle.drift, 0] }) },
        { rotate: phase.interpolate({ inputRange: [0, 1], outputRange: ['0deg', summer ? '30deg' : '160deg'] }) },
      ],
    }}>
      <Icon name={particle.icon} size={particle.size} color={particle.color} />
    </Animated.View>
  );
};

const SeasonalSplashEffects = ({ decoration, reduceMotion }) => {
  const { width, height } = useWindowDimensions();
  const particles = useMemo(() => createSplashParticles(decoration), [decoration]);
  if (!decoration) return null;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.overlay}
    >
      {reduceMotion === false ? particles.map(particle => (
        <Particle key={`${decoration.key}-${particle.id}`} particle={particle} width={width} height={height} summer={decoration.key === 'summer'} />
      )) : decoration.icons.map((icon, index) => (
        <Icon key={index} name={icon} color={decoration.colors[index]} size={20} style={{
          position: 'absolute',
          left: index === 1 ? width * 0.87 : width * 0.07,
          top: height * (0.12 + index * 0.32),
          opacity: 0.25,
        }} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
});

export default SeasonalSplashEffects;
