import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const EMOJIS = ['🎉', '✨', '🌟', '⭐', '🎊', '🥳', '🎁', '🎈', '💫', '🔥', '💥', '🎇', '🎆', '🪅', '🪩'];
const PARTICLE_COUNT = 80;

export const useSplashReduceMotion = () => false;

const EmojiParticle = ({ index, width, height, decorationKey }) => {
  const fall = useRef(new Animated.Value(0)).current;
  const swing = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const x = ((index * 47) % 100) / 100 * width;
  const y = -80 - (index % 8) * 38;
  const size = 20 + (index % 4) * 5;
  const delay = (index % 10) * 90;
  const duration = 2600 + (index % 5) * 220;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(fall, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
          Animated.timing(rotate, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
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
    };
  }, [decorationKey, delay, duration, fall, rotate, swing]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: x,
          top: y,
          opacity: 1,
          transform: [
            { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, height + 180] }) },
            { translateX: swing.interpolate({ inputRange: [0, 1], outputRange: [0, index % 2 ? -42 : 42] }) },
            { rotate: rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${index % 2 ? -720 : 720}deg`] }) },
          ],
        },
      ]}
    >
      <Text style={[styles.emoji, { fontSize: size }]}>{EMOJIS[index % EMOJIS.length]}</Text>
    </Animated.View>
  );
};

const SeasonalSplashEffects = ({ decoration }) => {
  const { width, height } = useWindowDimensions();
  if (!decoration) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {Array.from({ length: PARTICLE_COUNT }, (_, index) => (
        <EmojiParticle
          key={`${decoration.key}-${index}`}
          index={index}
          width={width}
          height={height}
          decorationKey={decoration.key}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 99999,
    elevation: 99999,
    overflow: 'hidden',
  },
  particle: { position: 'absolute' },
  emoji: { lineHeight: 38, includeFontPadding: false, textAlign: 'center' },
});

export default SeasonalSplashEffects;
