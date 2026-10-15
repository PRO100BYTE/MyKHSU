import React, { createContext, forwardRef, useContext, useMemo } from 'react';
import { Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ScreenScrollContext = createContext(false);

const ScreenScrollView = forwardRef(function ScreenScrollView({
  underlap = true,
  headerInset,
  horizontal,
  contentInset,
  contentOffset,
  scrollIndicatorInsets,
  children,
  ...props
}, ref) {
  const insets = useSafeAreaInsets();
  const nested = useContext(ScreenScrollContext);
  const enabled = Platform.OS === 'ios' && underlap && !horizontal && !nested;
  const top = enabled ? (headerInset ?? insets.top + 62) : 0;
  const adjustedContentInset = useMemo(() => enabled ? {
    ...contentInset,
    top: top + (contentInset?.top ?? 0),
  } : contentInset, [enabled, top, contentInset]);
  const initialOffset = useMemo(() => contentOffset ?? (enabled ? {
    x: 0,
    y: -(top + (contentInset?.top ?? 0)),
  } : undefined), [contentOffset, enabled, top, contentInset?.top]);
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
        contentInset={adjustedContentInset}
        contentOffset={initialOffset}
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
