import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const RefreshStatusHint = ({ visible, glass, accentColor }) => {
  if (!visible) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityLabel="Обновление информации"
      style={[
        styles.container,
        {
          backgroundColor: glass.surfaceSecondary,
          borderColor: glass.border,
          shadowColor: glass.shadowColor,
        },
      ]}
    >
      <ActivityIndicator size="small" color={accentColor} />
      <Text style={[styles.text, { color: glass.text }]}>Обновление информации…</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 3,
  },
  text: {
    marginLeft: 8,
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
  },
});

export default RefreshStatusHint;
