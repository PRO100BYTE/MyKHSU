import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function OnboardingNavigation({ onBack, onNext, backDisabled, busy, isLast, accent, textColor }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} disabled={backDisabled || busy} accessibilityRole="button" accessibilityState={{ disabled: backDisabled || busy }} style={[styles.button, (backDisabled || busy) && styles.disabled]}>
        <Text style={[styles.label, { color: textColor }]}>Назад</Text>
      </Pressable>
      <Pressable onPress={onNext} disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy }} style={[styles.button, { backgroundColor: accent }, busy && styles.disabled]}>
        <Text style={[styles.label, styles.primaryLabel]}>{isLast ? 'Начать' : 'Далее'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  button: { minHeight: 48, minWidth: 100, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 14, justifyContent: 'center', alignItems: 'center' },
  label: { fontFamily: 'Montserrat_600SemiBold', fontSize: 15 },
  primaryLabel: { color: '#fff' },
  disabled: { opacity: 0.4 },
});
