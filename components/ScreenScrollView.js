import React, { createContext, forwardRef, useContext, useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ScreenScrollContext = createContext(false);

export function useScreenHeaderInset() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  // Keep in sync with App's header: top margin 6, vertical padding 12, text 18.
  const headerHeight = 24 + Math.max(20, Math.ceil(18 * 1.25 * fontScale)) + 2 * StyleSheet.hairlineWidth;
  return Platform.OS === 'ios' ? insets.top + 6 + headerHeight : 0;
}

const ScreenScrollView = forwardRef(function ScreenScrollView({
  underlap = true,
  headerInset,
  horizontal,
  contentContainerStyle,
  contentInset,
  contentOffset,
  scrollIndicatorInsets,
  children,
  ...props
}, ref) {
  const defaultHeaderInset = useScreenHeaderInset();
  const nested = useContext(ScreenScrollContext);
  const enabled = Platform.OS === 'ios' && underlap && !horizontal && !nested;
  const top = enabled ? (headerInset ?? defaultHeaderInset) : 0;
  const adjustedContentStyle = useMemo(() => {
    if (!enabled) return contentContainerStyle;
    const style = StyleSheet.flatten(contentContainerStyle) || {};
    const paddingTop = style.paddingTop ?? style.paddingVertical ?? style.padding ?? 0;
    return [contentContainerStyle, { paddingTop: top + Math.max(16, paddingTop) }];
  }, [enabled, top, contentContainerStyle]);
  const adjustedIndicatorInsets = useMemo(() => enabled ? {
    ...scrollIndicatorInsets,
    top: top + (scrollIndicatorInsets?.top ?? 0),
  } : scrollIndicatorInsets, [enabled, top, scrollIndicatorInsets]);

  return (
    <ScreenScrollContext.Provider value={nested || enabled}>
      <ScrollView
        {...props}
        ref={ref}
        horizontal={horizontal}
        contentContainerStyle={adjustedContentStyle}
        contentInset={contentInset}
        contentOffset={contentOffset}
        scrollIndicatorInsets={adjustedIndicatorInsets}
        {...(enabled ? {
          automaticallyAdjustContentInsets: false,
          contentInsetAdjustmentBehavior: 'never',
          automaticallyAdjustsScrollIndicatorInsets: false,
        } : {})}
      >
        {children}
      </ScrollView>
    </ScreenScrollContext.Provider>
  );
});

export default ScreenScrollView;
