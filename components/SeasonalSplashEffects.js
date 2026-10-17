import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { createSplashParticles } from '../utils/splashSeason';

export const useSplashReduceMotion = () => false;

export const SEASONAL_MOTION = {
  autumn: { drift: 28, rotation: 18, lift: 34 },
  winter: { drift: 16, rotation: 8, lift: 24 },
  spring: { drift: 24, rotation: 12, lift: 30 },
  summer: { drift: 18, rotation: 6, lift: 38 },
  holiday: { drift: 22, rotation: 14, lift: 28 },
};

const getMotion = key => SEASONAL_MOTION[key] || SEASONAL_MOTION.holiday;

const Particle = ({ particle, width, height, kind }) => {
  const motion = getMotion(kind);
  const animation = useRef(new Animated.Value(0)).current;
  const phase = (particle.id % 4) * 280;
  const left = particle.x * width;
  const top = particle.y * Math.max(height - 40, 1);
  const direction = particle.id % 2 === 0 ? 1 : -1;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(phase),
        Animated.parallel([
          Animated.timing(animation, {
            toValue: 1,
            duration: 1300 + (particle.id % 3) * 180,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.timing(animation, {
            toValue: 1,
            duration: 1300 + (particle.id % 3) * 180,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
            isInteraction: false,
          }),
        ]),
        Animated.timing(animation, {
          toValue: 0,
          duration: 1300 + (particle.id % 3) * 180,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      animation.stopAnimation();
    };
  }, [animation, particle.id, phase]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left,
          top,
          opacity: animation.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.42, 1, 0.42] }),
          transform: [
            {
              translateX: animation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, motion.drift * direction, 0],
              }),
            },
            {
              translateY: animation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, -motion.lift, 0],
              }),
            },
            {
              rotate: animation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: ['0deg', `${motion.rotation * direction}deg`, '0deg'],
              }),
            },
            { scale: animation.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.82, 1.18, 0.82] }) },
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
    <View pointerEvents="none" style={styles.overlay}>
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
  },
});

export default SeasonalSplashEffects;
