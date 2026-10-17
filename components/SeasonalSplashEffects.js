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
        // An unavailable accessibility query must not silently disable decoration motion.
        if (active && !changed) setReduceMotion(false);
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

// Keep the movement gentle, but give each season a recognisable motion language.
export const SEASONAL_MOTION = {
  autumn: { drift: 34, rotation: 220, direction: 'down', scale: [0.82, 1, 0.9] },
  winter: { drift: 24, rotation: 55, direction: 'down', scale: [0.9, 1.08, 0.94] },
  spring: { drift: 30, rotation: 70, direction: 'down', scale: [0.88, 1, 0.94] },
  summer: { drift: 18, rotation: 28, direction: 'up', scale: [0.72, 1.18, 0.76] },
  holiday: { drift: 22, rotation: 90, direction: 'down', scale: [0.86, 1.04, 0.9] },
};

const getMotion = key => SEASONAL_MOTION[key] || SEASONAL_MOTION.holiday;

const Particle = ({ particle, width, height, season }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const motion = getMotion(season);
  const startOffset = particle.y * height;
  const direction = motion.direction === 'up' ? -1 : 1;

  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.loop(Animated.timing(progress, {
      toValue: 1,
      duration: Math.min(particle.duration, 3000),
      easing: Easing.linear,
      useNativeDriver: true,
      isInteraction: false,
    }));
    animation.start();
    return () => {
      animation.stop();
      progress.stopAnimation();
    };
  }, [particle.duration, progress]);

  const sway = motion.drift * (particle.drift < 0 ? -1 : 1);
  return (
    <Animated.View style={{
      position: 'absolute',
      left: particle.x * width,
      top: -40,
      opacity: progress.interpolate({
        inputRange: [0, 0.06, 0.84, 1],
        outputRange: [0, 0.9, 0.82, 0],
      }),
      transform: [
        { translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: direction > 0 ? [startOffset, height + 48] : [height - startOffset, -48],
        }) },
        { translateX: progress.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, sway, -sway, 0] }) },
        { rotate: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', `${motion.rotation * (particle.drift < 0 ? -1 : 1)}deg`, '0deg'] }) },
        { scale: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: motion.scale }) },
      ],
    }}>
      <Icon name={particle.icon} size={particle.size + 4} color={particle.color} />
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
      {reduceMotion !== true ? particles.map(particle => (
        <Particle
          key={`${decoration.key}-${particle.id}`}
          particle={particle}
          width={width}
          height={height}
          season={decoration.kind === 'season' ? decoration.key : 'holiday'}
        />
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
  overlay: { ...StyleSheet.absoluteFillObject, overflow: 'visible', zIndex: 999, elevation: 999 },
});

export default SeasonalSplashEffects;
