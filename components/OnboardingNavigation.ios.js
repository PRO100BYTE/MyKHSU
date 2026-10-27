import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import FallbackNavigation from './OnboardingNavigationFallback';

const nativeUI = requireOptionalNativeModule('ExpoUI') ? require('@expo/ui/swift-ui') : null;
const modifiers = nativeUI ? require('@expo/ui/swift-ui/modifiers') : null;

export default function OnboardingNavigation(props) {
  if (!nativeUI) return <FallbackNavigation {...props} />;
  const { onBack, onNext, backDisabled, busy, isLast, accent, theme } = props;
  const { Button, Host } = nativeUI;
  const { buttonStyle, buttonBorderShape, controlSize, tint, disabled } = modifiers;
  const hasGlass = Number.parseInt(Platform.Version, 10) >= 26;
  const common = [buttonBorderShape('capsule'), controlSize('large'), tint(accent)];
  return (
    <View style={styles.row}>
      <Host matchContents colorScheme={theme} ignoreSafeArea="all">
        <Button label="Назад" onPress={onBack} modifiers={[...common, buttonStyle(hasGlass ? 'glass' : 'bordered'), disabled(backDisabled || busy)]} />
      </Host>
      <Host matchContents colorScheme={theme} ignoreSafeArea="all">
        <Button label={isLast ? 'Начать' : 'Далее'} onPress={onNext} modifiers={[...common, buttonStyle(hasGlass ? 'glassProminent' : 'borderedProminent'), disabled(busy)]} />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 52, paddingHorizontal: 4, paddingVertical: 4 },
});
