import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { createSplashParticles } from '../utils/splashSeason';

export const useSplashReduceMotion = () => {
  const [reduceMotion, setReduceMotion] = useState(null);
  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      if (active) setReduceMotion(value);
    });
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (active) setReduceMotion(value);
      })
      .catch(() => {
        if (active) setReduceMotion(false);
      });
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);
  return reduceMotion;
};

export const SEASONAL_MOTION = {
  autumn: { drift: 34, rotation: 220, upward: false, scale: [0.88, 1.08, 0.92] },
  winter: { drift: 24, rotation: 55, upward: false, scale: [0.92, 1.12, 0.96] },
  spring: { drift: 30, rotation: 70, upward: false, scale: [0.9, 1.08, 0.94] },
  summer: { drift: 18, rotation: 28, upward: true, scale: [0.78, 1.2, 0.8] },
  holiday: { drift: 22, rotation: 90, upward: false, scale: [0.9, 1.1, 0.94] },
};

const getMotion = key => SEASONAL_MOTION[key] || SEASONAL_MOTION.holiday;

const Particle = ({ particle, width, height, kind }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const motion = getMotion(kind);
  const direction = motion.upward ? -1 : 1;
  const startY = motion.upward
    ? height - particle.y * height
    : particle.y * height;

  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 2400 + (particle.id % 4) * 180,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      }),
      { resetBeforeIteration: true },
    );
    animation.start();
    return () => {
      animation.stop();
      progress.stopAnimation();
    };
  }, [particle.id, progress]);

  const sway = motion.drift * (particle.drift < 0 ? -1 : 1);
  return (
    <Animated.View
      collapsable={false}
      style={[
        styles.particle,
        {
          left: particle.x * width,
          opacity: progress.interpolate({
            inputRange: [0, 0.08, 0.86, 1],
            outputRange: [0, 0.9, 0.82, 0],
          }),
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [startY, direction > 0 ? height + 56 : -56],
              }),
            },
            {
              translateX: progress.interpolate({
                inputRange: [0, 0.25, 0.75, 1],
                outputRange: [0, sway, -sway, 0],
              }),
            },
            {
              rotate: progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: ['0deg', `${motion.rotation * (particle.drift < 0 ? -1 : 1)}deg`, '0deg'],
              }),
            },
            { scale: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: motion.scale }) },
          ],
        },
      ]}
    >
      <Icon name={particle.icon} size={particle.size + 5} color={particle.color} />
    </Animated.View>
  );
};

const SeasonalSplashEffects = ({ decoration }) => {
  const { width, height } = useWindowDimensions();
  const particles = useMemo(() => createSplashParticles(decoration), [decoration]);
  if (!decoration) return null;

  return (
    <View
      pointerEvents="none"
      collapsable={false}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.overlay}
    >
      {particles.map(particle => (
        <Particle
          key={`${decoration.key}-${particle.id}`}
          particle={particle}
          width={width}
          height={height}
          kind={decoration.kind === 'season' ? decoration.key : 'holiday'}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    top: -28,
  },
});

export default SeasonalSplashEffects;
