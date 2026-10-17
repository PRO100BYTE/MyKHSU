import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { createSplashParticles } from '../utils/splashSeason';

const EMOJIS = ['🎉', '✨', '🌟', '⭐', '🎊', '🥳', '🎁', '🎈', '💫', '🔥', '💥', '🎇', '🎆', '🪅', '🪩'];

export const useSplashReduceMotion = () => {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (active) setReduceMotion(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      if (active) setReduceMotion(value);
    });
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);
  return reduceMotion;
};

const EmojiParticle = ({ particle, width, height }) => {
  const fall = useRef(new Animated.Value(0)).current;
  const swing = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const duration = 2600 + (particle.id % 5) * 260;
  const startDelay = (particle.id % 10) * 90;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(startDelay),
        Animated.parallel([
          Animated.timing(fall, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
          Animated.timing(rotate, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true, isInteraction: false }),
            Animated.delay(duration - 680),
            Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true, isInteraction: false }),
          ]),
          Animated.sequence([
            Animated.timing(swing, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
            Animated.timing(swing, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(fall, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
      fall.stopAnimation();
      swing.stopAnimation();
      rotate.stopAnimation();
      opacity.stopAnimation();
    };
  }, [duration, fall, opacity, rotate, startDelay, swing]);

  const y = -80 - (particle.id % 6) * 45;
  const x = (particle.id * 41 % 100) / 100 * width;
  return (
    <Animated.View style={[styles.particle, {
      left: x,
      top: y,
      opacity,
      transform: [
        { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, height + 180] }) },
        { translateX: swing.interpolate({ inputRange: [0, 1], outputRange: [0, particle.id % 2 ? -34 : 34] }) },
        { rotate: rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${particle.id % 2 ? -720 : 720}deg`] }) },
      ],
    }]}>
      <Text style={styles.emoji}>{EMOJIS[particle.id % EMOJIS.length]}</Text>
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
        <EmojiParticle key={`${decoration.key}-${particle.id}`} particle={particle} width={width} height={height} />
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
  particle: { position: 'absolute' },
  emoji: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export default SeasonalSplashEffects;
