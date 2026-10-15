import React, { useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'react-native-screens';

const SPECIAL_EFFECTS = {
  repeatedTabSelection: { popToRoot: false, scrollToTop: false },
};

/**
 * iOS UITabBarController with active-only React content.
 * tabs: [{ key, label, sfSymbol, selectedSfSymbol? }].
 * accentColor is a resolved native color, not a palette name.
 * Supply renderScreen(key), or children as a { [key]: ReactNode } mapping.
 * Non-iOS renders content only; keep the existing Android bar in the caller.
 */
export default function NativeTabBar({
  activeScreen,
  onTabPress,
  tabs = [],
  renderScreen,
  children,
  theme = 'light',
  accentColor,
  backgroundColor = 'transparent',
  showLabels = true,
  labelFontSize,
}) {
  const provenance = useRef(0);
  const validTabs = Array.isArray(tabs)
    ? tabs.filter((tab, index, list) => (
      tab && typeof tab.key === 'string' && tab.key.length > 0
      && list.findIndex((item) => item?.key === tab.key) === index
    ))
    : [];
  const selectedKey = validTabs.some((tab) => tab.key === activeScreen)
    ? activeScreen
    : validTabs[0]?.key;

  // A native tap already changes UIKit's state. Only a changed JS selection
  // needs a new request, based on the last acknowledged native provenance.
  const navStateRequest = useMemo(() => ({
    selectedScreenKey: selectedKey,
    baseProvenance: provenance.current,
  }), [selectedKey]);

  const appearance = useMemo(() => {
    const font = Number.isFinite(labelFontSize) && labelFontSize > 0
      ? { tabBarItemTitleFontSize: labelFontSize }
      : {};
    const itemAppearance = {
      normal: font,
      selected: {
        ...font,
        tabBarItemTitleFontColor: accentColor,
        tabBarItemIconColor: accentColor,
      },
    };
    return {
      stacked: itemAppearance,
      inline: itemAppearance,
      compactInline: itemAppearance,
    };
  }, [labelFontSize, accentColor]);

  const content = (key) => (
    typeof renderScreen === 'function' ? renderScreen(key) : children?.[key] ?? null
  );

  if (!selectedKey) return null;
  if (Platform.OS !== 'ios') return content(selectedKey);

  const handleTabSelected = ({ nativeEvent }) => {
    const { selectedScreenKey, provenance: nextProvenance, actionOrigin } = nativeEvent;
    if (nextProvenance < provenance.current) return;
    provenance.current = nextProvenance;
    if (actionOrigin === 'programmatic-js') return;
    if (!validTabs.some((tab) => tab.key === selectedScreenKey)) return;
    // Includes repeated native taps so the caller can refresh/pop its screen.
    onTabPress?.(selectedScreenKey);
  };

  return (
    <View style={styles.container}>
      <Tabs.Host
        navStateRequest={navStateRequest}
        onTabSelected={handleTabSelected}
        colorScheme={theme === 'light' ? 'light' : 'dark'}
        nativeContainerStyle={{ backgroundColor }}
        ios={{
          tabBarTintColor: accentColor,
          tabBarControllerMode: 'tabBar',
          tabBarMinimizeBehavior: 'never',
        }}
      >
        {validTabs.map((tab) => (
          <Tabs.Screen
            key={tab.key}
            screenKey={tab.key}
            title={showLabels ? (tab.label ?? tab.key) : ''}
            tabBarItemAccessibilityLabel={tab.label ?? tab.key}
            tabBarItemTestID={`native-tab-${tab.key}`}
            specialEffects={SPECIAL_EFFECTS}
            ios={{
              icon: tab.sfSymbol ? { type: 'sfSymbol', name: tab.sfSymbol } : undefined,
              selectedIcon: tab.sfSymbol && tab.selectedSfSymbol
                ? { type: 'sfSymbol', name: tab.selectedSfSymbol }
                : undefined,
              standardAppearance: appearance,
              overrideScrollViewContentInsetAdjustmentBehavior: false,
            }}
          >
            {tab.key === selectedKey ? content(tab.key) : null}
          </Tabs.Screen>
        ))}
      </Tabs.Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
